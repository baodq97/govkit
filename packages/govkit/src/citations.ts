import { type Dirent, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import type { GovkitConfig } from "./config";
import { toPathspec, typeDir } from "./util";

// ── ANCHORED citation resolution (`govkit verify --check-citations`) ─────────────────────────
// A governed doc that says "the tier is assigned once (verify.ts:645)" is making a CHECKABLE
// claim about code. The obvious checker — "does that file have 645 lines?" — is worse than no
// checker at all: on this repo's own design corpus it scored zero errors while a citation had
// already gone stale, because a +34-line edit to `govkit.yml` pushed the cited block down and
// SOMETHING still occupied the old line. A positional check certifies staleness.
//
// So resolution is ANCHORED, in three ordered steps, and each step has its own failure name
// because each needs a different repair:
//   1. path      — the cited file must resolve from the repo root  → `path-missing`
//   2. line      — the cited span must lie inside it               → `line-beyond-eof`
//   3. anchor    — a code-ish token from the CITING LINE must appear within ±3 lines of the
//                  cited span                                       → `anchor-not-found`
// One generic "bad citation" message would leave the reader to re-derive which of the three it
// was, and the fix for a moved block is not the fix for a renamed file.

/** The three ways an anchored resolution can fail. Ordered as they are attempted, so the name
 *  also says how far the resolver got before it stopped. */
export const CITATION_FAILURES = ["path-missing", "line-beyond-eof", "anchor-not-found"] as const;
export type CitationFailure = (typeof CITATION_FAILURES)[number];

/** The forms this resolver declines to judge. Both are REPORTED with counts and never folded
 *  into the resolved total — a silent skip reads as coverage, which is the exact failure mode
 *  the positional checker had. */
export const CITATION_SKIPS = ["no-anchor", "ambiguous-path"] as const;
export type CitationSkip = (typeof CITATION_SKIPS)[number];

/** How far from the cited span the anchor may sit. Small enough that a moved block is caught
 *  (the stale citation this was built for is off by 34 lines), wide enough to absorb the
 *  one-or-two-line drift every live corpus carries between edits. */
export const ANCHOR_WINDOW = 3;

/**
 * How far ABOVE the cited span the anchor may sit and still count. This is the enclosing-symbol
 * form (`calibrate.ts:118-124 (runCalibrate)` — the citation points into a body and names the
 * declaration that opens it), which a ±3 window would fail on every occurrence.
 *
 * 120 is measured twice over, not chosen:
 *   • the longest top-level FUNCTION in this repo's own source is 91 lines (`scoreArtifact` in
 *     commands/eval.ts), so 120 covers every legitimate enclosing citation with headroom;
 *   • in a 366-citation probe over the design corpus, EVERY citation that needed more than 120
 *     was vouched for by an unrelated comment mention rather than by its declaration — e.g.
 *     `config.ts:417 (loadConfig)` finds the word `loadConfig` in a comment 224 lines above
 *     while `loadConfig` itself sits BELOW the citation, at 439. Raising the cap to unbounded
 *     buys 28 extra passes and every one of them is a false pass.
 */
export const ENCLOSING_LOOKBACK = 120;

/** File extensions the citation pass reads a governed tree for. A claim about code is a claim
 *  regardless of which file in the artifact carries it: a named design tree's `model.yaml` is
 *  the machine-readable half of the same artifact its `README.md` heads, and most of this
 *  repo's own citations live in that half. Deliberately NOT the whole tree — an image or a
 *  lockfile has no citing sentence to take an anchor from. */
const CITATION_SOURCE_EXTENSIONS = new Set([".md", ".yaml", ".yml"]);

/** Directories the bare-basename index never descends. Build output and vendored trees would
 *  make `verify.ts` ambiguous against a copy of itself, and `.git` is not source. */
const INDEX_SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);

/** Hard cap on the basename index walk. A citation checker must not become the slowest thing in
 *  the gate on a monorepo that vendors a universe; past the cap bare basenames simply stop
 *  resolving, which surfaces as reported `path-missing`, never as a silent pass. */
const INDEX_FILE_CAP = 20_000;

/**
 * One `path:line` claim, already split from any multi-target form (`util.ts:60,70` yields two).
 * `start`/`end` are 1-based inclusive; a single-line citation has `start === end`.
 */
export interface Citation {
  /** Repo-relative forward-slash path of the file making the claim. */
  from: string;
  /** 1-based line in the citing file. */
  fromLine: number;
  /** The reference exactly as written, e.g. `verify.ts:541-547`. */
  raw: string;
  /** The path half, as written — a bare basename or a repo-relative path. */
  target: string;
  start: number;
  end: number;
  /** Code-ish tokens lifted from the citing line; ANY of them near the cited span passes. */
  anchors: string[];
}

export type CitationOutcome =
  | { readonly state: "resolved"; readonly citation: Citation; readonly file: string }
  | { readonly state: "skipped"; readonly citation: Citation; readonly reason: CitationSkip }
  | {
      readonly state: "failed";
      readonly citation: Citation;
      readonly reason: CitationFailure;
      /** The one-sentence explanation, already naming the resolved file and the numbers. */
      readonly detail: string;
    };

/** Run totals. Every bucket is always present (zero, not absent) so a consumer never has to
 *  special-case an unpopulated key, and `found === resolved + skipped + failed` always holds. */
export interface CitationSummary {
  /** Files in the governed tree that were read for citations. */
  files: number;
  found: number;
  resolved: number;
  skipped: number;
  skippedBy: Record<CitationSkip, number>;
  failed: number;
  failedBy: Record<CitationFailure, number>;
}

// A path half (`packages/govkit/src/util.ts`, `verify.ts`) followed by `:` and one or more line
// targets. The extension must START with a letter so a version (`1.2:3`) is not a citation, and
// the lookbehind refuses a match preceded by `/` or `@` so a URL authority (`//example.com:80`)
// is not one either. `RFC-0027:134-143` carries no dot and is therefore not matched at all —
// a doc-id reference is `checkReferences`' business, not this pass's.
const CITATION_SOURCE = String.raw`(?<![\w@/-])([\w.-]+(?:\/[\w.-]+)*\.[A-Za-z]\w{0,5}):(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)`;

/** Walk form. Only ever driven through `String.matchAll`, which iterates over a CLONE — so this
 *  shared instance carries no `lastIndex` between calls, and neither does a nested walk. */
const CITATION_SCAN = new RegExp(CITATION_SOURCE, "g");

/** Predicate twin, deliberately NOT `/g`. `.test()` on a global regex advances `lastIndex`, and
 *  the anchor filter below tests one regex while the extractor walks with it: sharing a single
 *  `/g` instance across those two made the extractor restart its line forever. Two instances,
 *  one source string, so the two can never disagree about what a citation is. */
const CITATION_TEST = new RegExp(CITATION_SOURCE);

/** A backtick span, the dominant anchor carrier in this corpus (`` `ratification:` ``). */
const BACKTICK_SCAN = /`([^`]+)`/g;

/**
 * Is this token shaped like a code SYMBOL rather than an English word? The trailing-symbol
 * anchor form (`util.ts:33 listMarkdown`) sits in running prose, so `verify.ts:554 and
 * eval.ts:225` would otherwise donate the anchor "and" — a token that appears near every line
 * of every file and would turn the check into a rubber stamp. camelCase, PascalCase and
 * SCREAMING_SNAKE all pass; a lowercase word does not.
 */
function isSymbolShaped(token: string): boolean {
  if (!/^[A-Za-z_][\w.]*$/.test(token) || token.length < 3) return false;
  return /[A-Z_]/.test(token);
}

/**
 * Anchors for one citation, drawn from the CITING LINE only — a predictable, statable scope, so
 * a doc author can see exactly what the checker will look for. Two sources, both deliberately
 * code-ish:
 *   • the symbol the citation names right after itself: `util.ts:33 listMarkdown`,
 *     `packages/govkit/src/util.ts:60 (stripNonProse)`.
 *   • every backtick span on the line that is not itself a citation: `` `ratification:` ``,
 *     `` `drift --ack` ``.
 * ANY anchor near the span passes. Leniency is the right bias here: a false failure on a correct
 * citation is what gets an opt-in check switched off, and a corpus that is 99% correct has far
 * more to lose from noise than from one missed staleness.
 */
function anchorsFor(line: string, match: RegExpMatchArray): string[] {
  const anchors: string[] = [];
  const after = line.slice((match.index ?? 0) + match[0].length);
  const symbol = /^`?[\s,;]*\(?([A-Za-z_][\w.]*)\)?/.exec(after);
  if (symbol?.[1] && isSymbolShaped(symbol[1])) anchors.push(symbol[1]);
  for (const span of line.matchAll(BACKTICK_SCAN)) {
    const text = (span[1] ?? "").trim();
    if (text.length < 3) continue;
    // A backticked citation is the claim, not evidence for it — and a line whose only backticks
    // are citations is exactly the unanchored case, which must stay a reported skip.
    if (CITATION_TEST.test(text)) continue;
    if (!anchors.includes(text)) anchors.push(text);
  }
  return anchors;
}

/** Expand one line-target list (`60,70`, `39-40,72-73`) into spans. */
function spans(targets: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const part of targets.split(",")) {
    const [a, b] = part.split("-");
    const start = Number.parseInt(a ?? "", 10);
    if (!Number.isFinite(start) || start < 1) continue;
    const end = b === undefined ? start : Number.parseInt(b, 10);
    out.push({ start, end: Number.isFinite(end) && end >= start ? end : start });
  }
  return out;
}

/**
 * Blank out fenced code and HTML comments while KEEPING every line number. Same rule as
 * `stripNonProse` — a signal inside a fence is not the document's own — and the measured reason
 * it is needed here: this repo's `US-0002`/`US-0003` paste a Node stack trace into a fence, and
 * `at loadConfig (.../dist/cli.js:7380:11)` is terminal output, not a claim about a file in this
 * repo. Unmasked it produced five `path-missing` false positives on a corpus with zero real ones,
 * which is precisely how an opt-in check gets switched off in its first week.
 * It cannot reuse `stripNonProse`: that one collapses a block to a single space, and this pass
 * reports the LINE a citation was made on.
 */
function maskNonProse(text: string): string {
  const blanks = (match: string): string => "\n".repeat((match.match(/\n/g) ?? []).length);
  return text
    .replace(/```[\s\S]*?```/g, blanks)
    .replace(/~~~[\s\S]*?~~~/g, blanks)
    .replace(/<!--[\s\S]*?-->/g, blanks);
}

/** Every citation one file's text makes. Pure — takes text, not a path — so a test can pin the
 *  extraction rules without touching a disk. */
export function extractCitations(text: string, from: string): Citation[] {
  const found: Citation[] = [];
  const lines = maskNonProse(text).split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    for (const m of line.matchAll(CITATION_SCAN)) {
      const target = m[1] ?? "";
      const anchors = anchorsFor(line, m);
      for (const span of spans(m[2] ?? "")) {
        found.push({ from, fromLine: i + 1, raw: m[0], target, ...span, anchors });
      }
    }
  }
  return found;
}

/** Directory entries, or none. An unreadable directory contributes no candidates — the citations
 *  that would have resolved through it surface as reported `path-missing`, never as a crash. */
function readEntries(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return []; // safe to skip: absence of candidates is a reported outcome, not a failure
  }
}

/** Lazy basename → repo-relative paths index, built once per run and only when a bare basename
 *  needs it. Names only: no file is read to build it. */
export class BasenameIndex {
  private map: Map<string, string[]> | null = null;

  constructor(private readonly root: string) {}

  get(name: string): string[] {
    if (this.map === null) this.map = this.build();
    return this.map.get(name) ?? [];
  }

  private build(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    let seen = 0;
    const walk = (dir: string): void => {
      if (seen >= INDEX_FILE_CAP) return;
      const entries = readEntries(dir);
      for (const entry of entries) {
        if (seen >= INDEX_FILE_CAP) return;
        if (entry.isDirectory()) {
          if (!INDEX_SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          seen++;
          const list = map.get(entry.name);
          const rel = toPathspec(this.root, join(dir, entry.name));
          if (list) list.push(rel);
          else map.set(entry.name, [rel]);
        }
      }
    };
    walk(this.root);
    return map;
  }
}

/**
 * Candidate files for one citation's path half, most-preferred first. A path WITH a separator is
 * repo-relative and has exactly one answer. A BARE basename is resolved by a stated preference
 * order rather than by guessing:
 *   1. the repo root — `README.md`, `AGENTS.md`, `govkit.yml`, `package.json` are cited bare and
 *      always mean the root one (this repo has 275 `README.md` files; only one is the subject).
 *   2. the citing file's own directory — a sibling is the next most plausible referent.
 *   3. a UNIQUE match anywhere in the repo — every `*.ts` this corpus cites is unique.
 * Anything left over is genuinely ambiguous and is skipped by name, not resolved by coin-flip.
 */
function candidates(root: string, citation: Citation, index: BasenameIndex): string[] {
  if (citation.target.includes("/")) {
    const rel = citation.target;
    return existsSync(join(root, rel)) && isFile(join(root, rel)) ? [rel] : [];
  }
  const out: string[] = [];
  const rootFile = join(root, citation.target);
  if (existsSync(rootFile) && isFile(rootFile)) out.push(citation.target);
  const sibling = join(root, dirname(citation.from), citation.target);
  if (existsSync(sibling) && isFile(sibling)) {
    const rel = toPathspec(root, sibling);
    if (!out.includes(rel)) out.push(rel);
  }
  if (out.length > 0) return out;
  return index.get(citation.target);
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false; // safe to treat as absent: an unstatable path is not a resolution
  }
}

/** Resolve ONE citation. Split out from the walk so a test can drive every branch with a
 *  hand-built Citation, and so the three failure names each have one origin. */
export function resolveCitation(
  root: string,
  citation: Citation,
  index: BasenameIndex,
  lineCache: Map<string, string[]>,
): CitationOutcome {
  const found = candidates(root, citation, index);
  if (found.length === 0) {
    return {
      state: "failed",
      citation,
      reason: "path-missing",
      detail:
        `'${citation.target}' does not resolve from the repo root ` +
        `(no root file, no sibling of ${citation.from}, no unique match in the repo)`,
    };
  }
  if (found.length > 1) {
    return { state: "skipped", citation, reason: "ambiguous-path" };
  }
  const rel = found[0] as string;
  let lines = lineCache.get(rel);
  if (lines === undefined) {
    lines = readFileSync(join(root, rel), "utf8").split(/\r?\n/);
    lineCache.set(rel, lines);
  }
  // A trailing newline yields one empty final element; a citation to it is past the content.
  const total =
    lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  if (citation.end > total) {
    return {
      state: "failed",
      citation,
      reason: "line-beyond-eof",
      detail: `${rel} has ${total} line(s); the citation reaches line ${citation.end}`,
    };
  }
  // A LIVE anchor is one that (a) is not just the cited file's own name — `govkit.yml` vouching
  // for `govkit.yml:1-4` is circular — and (b) occurs SOMEWHERE in the cited file. (b) is the
  // rule the measurement forced: 39 of 366 anchored citations in the probe corpus had an anchor
  // that appears nowhere in the target at all (an English word from a backtick span, a doc id
  // like `PRD-0001:38-39`, an example value like `waived: 1`). That is evidence the ANCHOR is
  // wrong, not that the citation is — failing on it is a pure false positive, so a dead anchor
  // is discarded instead.
  const base = rel.split("/").pop() ?? rel;
  const whole = lines.join("\n").toLowerCase();
  const live = citation.anchors.filter(
    (a) => a !== base && a !== citation.target && whole.includes(a.toLowerCase()),
  );
  // Unanchored is a SKIP, never a pass: path + line alone is the positional check that certified
  // a stale citation as correct. Saying "resolved" here would re-import that exact lie.
  if (live.length === 0) {
    return { state: "skipped", citation, reason: "no-anchor" };
  }
  const hits: number[] = [];
  for (const [i, line] of lines.entries()) {
    const lower = line.toLowerCase();
    if (live.some((a) => lower.includes(a.toLowerCase()))) hits.push(i + 1);
  }
  // TWO ways to hold, because this corpus writes citations two ways and both are legitimate:
  //   • POINT — `util.ts:33 listMarkdown`: the symbol is AT the line. ±ANCHOR_WINDOW.
  //   • ENCLOSING — `calibrate.ts:118-124 (runCalibrate)`: the citation points INSIDE a body and
  //     names the declaration above it. Measured: 62 of the corpus's citations are this form, and
  //     a strict ±3 window fails every one of them.
  // The lookback is deliberately one-sided (above only). Code GROWS, so the staleness that
  // actually happens is content pushed DOWN — the +34-line `govkit.yml` edit that motivated this
  // check — and requiring the anchor at-or-above catches exactly that.
  const anchored = hits.some(
    (h) =>
      (h >= citation.start - ANCHOR_WINDOW && h <= citation.end + ANCHOR_WINDOW) ||
      (h <= citation.start && citation.start - h <= ENCLOSING_LOOKBACK),
  );
  if (anchored) return { state: "resolved", citation, file: rel };
  const span = citation.end === citation.start ? "" : `-${citation.end}`;
  return {
    state: "failed",
    citation,
    reason: "anchor-not-found",
    detail:
      `[${live.join(", ")}] is in ${rel} at line(s) ${hits.slice(0, 5).join(", ")}` +
      `${hits.length > 5 ? ", …" : ""}, none of them at or within ${ENCLOSING_LOOKBACK} lines ` +
      `above ${rel}:${citation.start}${span} — the cited block moved; re-cite it at its ` +
      `current line`,
  };
}

/** Mirror of `listMarkdown`'s membership rule, widened to the citation source extensions.
 *  It cannot simply call that walk: `listMarkdown` is the GOVERNED-DOC walk and is `.md`-only
 *  by contract (every reader of it decides front-matter questions), while this pass reads the
 *  governed TREE. Same `ignore` semantics, including matching subdirectory NAMES, so a subtree
 *  opts out of both in one place. */
function listCitationSources(dir: string, ignore: string[], recursive: boolean): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const subdirs: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      CITATION_SOURCE_EXTENSIONS.has(extname(entry.name)) &&
      !ignore.includes(entry.name)
    ) {
      files.push(join(dir, entry.name));
    } else if (recursive && entry.isDirectory() && !ignore.includes(entry.name)) {
      subdirs.push(join(dir, entry.name));
    }
  }
  for (const sub of subdirs) files.push(...listCitationSources(sub, ignore, true));
  return files;
}

/** One citing file's failures, ready for the caller to shape into its own finding type. */
export interface CitationReport {
  /** Absolute path of the citing file. */
  file: string;
  /** The governed type whose tree it was found under. */
  type: string;
  failures: Extract<CitationOutcome, { state: "failed" }>[];
}

export interface CitationRun {
  summary: CitationSummary;
  reports: CitationReport[];
}

/** Resolve every citation the governed tree makes. Pure w.r.t. its inputs (reads fs, returns a
 *  result) like the rest of the gate, so `verify` owns violation shaping and the CLI owns
 *  printing. Deterministic and no-key — but OPT-IN: a new rule earns its severity with evidence
 *  before it blocks anyone, so nothing calls this unless `--check-citations` was passed. */
export function runCitations(root: string, config: GovkitConfig): CitationRun {
  const { ignore, types, root: docsRoot = "." } = config.docs;
  const index = new BasenameIndex(resolve(root));
  const lineCache = new Map<string, string[]>();
  const summary: CitationSummary = {
    files: 0,
    found: 0,
    resolved: 0,
    skipped: 0,
    skippedBy: { "no-anchor": 0, "ambiguous-path": 0 },
    failed: 0,
    failedBy: { "path-missing": 0, "line-beyond-eof": 0, "anchor-not-found": 0 },
  };
  const reports: CitationReport[] = [];
  for (const [typeName, def] of Object.entries(types)) {
    const dir = typeDir(root, docsRoot, def.dir);
    for (const file of listCitationSources(dir, ignore, def.recursive ?? false)) {
      summary.files++;
      const rel = toPathspec(root, file);
      const failures: Extract<CitationOutcome, { state: "failed" }>[] = [];
      for (const citation of extractCitations(readFileSync(file, "utf8"), rel)) {
        summary.found++;
        const outcome = resolveCitation(resolve(root), citation, index, lineCache);
        if (outcome.state === "resolved") {
          summary.resolved++;
        } else if (outcome.state === "skipped") {
          summary.skipped++;
          summary.skippedBy[outcome.reason]++;
        } else {
          summary.failed++;
          summary.failedBy[outcome.reason]++;
          failures.push(outcome);
        }
      }
      if (failures.length > 0) reports.push({ file, type: typeName, failures });
    }
  }
  return { summary, reports };
}
