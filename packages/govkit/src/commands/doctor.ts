import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { isParseError } from "../frontmatter";
import { typeDir, walkGovernedDocs } from "../util";

/**
 * The orientation command (Adoption context). Every other command answers "is this corpus
 * legal?"; doctor answers the question that comes BEFORE it — "where am I, what is governed
 * here, and what do I run next" — in ONE call, because the reader is an agent that pays a tool
 * call for every look around the repo. Read-only and always exit 0 by construction: a map that
 * could fail CI would be gated on, and the gate/advisory split exists to stop exactly that.
 */

/** How govkit.yml resolved. A discriminated union, not a nullable config: "absent" and
 *  "present but broken" lead to different next actions, and collapsing them loses that. */
export type DoctorConfigState =
  | { readonly kind: "missing" }
  | { readonly kind: "invalid"; readonly problem: string }
  | { readonly kind: "loaded" };

export interface DoctorType {
  name: string;
  /** Repo-relative, forward-slashed — the path a caller can paste back into a command. */
  dir: string;
  docs: number;
  /** Docs with NO `---` block at all — adopt's exact lane (adopt.ts runAdopt, the trigger
   *  predicate that mirrors verify's "missing YAML front-matter" condition). */
  missingFrontMatter: number;
  /** Docs whose block is PRESENT but unparseable. Counted apart from `missingFrontMatter` on
   *  purpose: adopt deliberately skips these and leaves them to the gate, so folding the two
   *  together would recommend a migration that is a guaranteed no-op for them. */
  malformedFrontMatter: number;
  startStatus?: string;
  statuses?: string[];
}

/** A markdown directory sitting beside a governed type dir but named by no `docs.types` entry.
 *  Reported, never acted on: "looks like a doc dir" is a guess, and governing 800 research
 *  notes because they are markdown is a worse outcome than an unreported directory. */
export interface DoctorUngoverned {
  dir: string;
  markdown: number;
  /** The count stopped at the scan cap — the real number is at least `markdown`. */
  capped: boolean;
}

/** The ONE thing to do next. A closed union so a new state cannot be added without deciding
 *  what it recommends, and so `govkit doctor` can never print two competing suggestions. */
export type NextActionKind =
  | "scaffold"
  | "fix-config"
  | "adopt"
  | "repair-frontmatter"
  | "install-hook"
  | "author-first-doc"
  | "run-gate";

export interface NextAction {
  kind: NextActionKind;
  /** The literal command to run, when the action IS one. Absent when the fix is a human edit. */
  command?: string;
  /** The MEASUREMENT that made this the recommendation, plus what the command does. Never
   *  repeats `command` — the printer joins them, so a caller gets one line, not an echo. */
  detail: string;
}

export interface DoctorResult {
  root: string;
  config: DoctorConfigState;
  /** `docs.root` (RFC-0007) as configured; `"."` when unset. */
  docsRoot: string;
  types: DoctorType[];
  totalDocs: number;
  missingFrontMatter: number;
  malformedFrontMatter: number;
  hook: { installed: boolean; path: string };
  ungoverned: DoctorUngoverned[];
  next: NextAction;
}

export interface DoctorOptions {
  root: string;
}

/** Stop counting an ungoverned tree here. Only the ORDER OF MAGNITUDE matters for a report a
 *  human reads to decide whether a directory belongs under governance. */
const UNGOVERNED_SCAN_CAP = 200;
const UNGOVERNED_SCAN_DEPTH = 3;
/** Directories never worth naming as a candidate doc dir. */
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git"]);

const HOOK_SETTINGS = join(".claude", "settings.json");

function posix(path: string): string {
  return path.split(/[\\/]/).join("/");
}

/** Directory entries, or none. doctor reports on repos it does not own — an unreadable dir is
 *  a fact about that repo, never a reason for the map to fail. */
function entriesOf(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Bounded markdown count for a candidate directory. Depth- and count-capped so pointing doctor
 *  at a repo with a huge notes tree stays a cheap, constant-ish call. BOTH caps set `capped` —
 *  a depth-truncated count printed as an exact number would be a quiet undercount, and the one
 *  thing this report must not do is understate how much markdown is sitting ungoverned. */
function countMarkdown(dir: string, depth: number): { count: number; capped: boolean } {
  let count = 0;
  let capped = false;
  for (const entry of entriesOf(dir)) {
    if (count >= UNGOVERNED_SCAN_CAP) return { count, capped: true };
    if (entry.isFile() && entry.name.endsWith(".md")) count++;
    else if (entry.isDirectory() && !entry.name.startsWith(".") && !SKIP_DIRS.has(entry.name)) {
      if (depth === 0) {
        capped = true; // a subtree we chose not to walk — say so rather than count it as zero
        continue;
      }
      const sub = countMarkdown(join(dir, entry.name), depth - 1);
      count += sub.count;
      capped = capped || sub.capped;
      if (count >= UNGOVERNED_SCAN_CAP) {
        return { count: Math.min(count, UNGOVERNED_SCAN_CAP), capped: true };
      }
    }
  }
  return { count, capped };
}

/**
 * Markdown dirs that sit where governed docs live but are governed by nothing. Scoped to the
 * PARENTS of the configured type dirs (`docs/` when types are `docs/adr`, `docs/rfc`, …) rather
 * than the whole repo: a candidate is a directory someone already chose to file docs beside, and
 * a repo-wide walk would surface every README in the tree.
 */
function findUngoverned(root: string, config: GovkitConfig): DoctorUngoverned[] {
  const docsRoot = config.docs.root ?? ".";
  const governed = new Set<string>();
  const parents = new Set<string>();
  for (const def of Object.values(config.docs.types)) {
    const dir = typeDir(root, docsRoot, def.dir);
    governed.add(resolve(dir));
    parents.add(dirname(resolve(dir)));
  }
  const found: DoctorUngoverned[] = [];
  for (const parent of parents) {
    // A parent that is itself a governed type dir has no "beside" to look at.
    if (governed.has(parent) || !existsSync(parent)) continue;
    for (const entry of entriesOf(parent)) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const dir = join(parent, entry.name);
      if (governed.has(resolve(dir))) continue;
      const { count, capped } = countMarkdown(dir, UNGOVERNED_SCAN_DEPTH);
      if (count > 0) found.push({ dir: posix(relative(root, dir)), markdown: count, capped });
    }
  }
  return found.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * The single recommendation ladder, in urgency order, and the ONE place that decides it —
 * `govkit init`'s footer reads this same function, so the two surfaces cannot disagree about
 * what a repo should do next (a next-step that contradicts doctor is worse than none).
 * Ungoverned dirs are deliberately NOT on this ladder: "looks like docs" is a guess, and a
 * recommendation has to be one govkit is willing to be wrong about out loud.
 */
function recommendNext(result: Omit<DoctorResult, "next">): NextAction {
  if (result.config.kind === "missing") {
    return {
      kind: "scaffold",
      command: "govkit init",
      detail: "no govkit.yml here; scaffolds the schema, the doc dirs and the write-time hook",
    };
  }
  if (result.config.kind === "invalid") {
    return {
      kind: "fix-config",
      detail: `fix govkit.yml, then re-run \`govkit doctor\` — ${result.config.problem}`,
    };
  }
  if (result.missingFrontMatter > 0) {
    return {
      kind: "adopt",
      command: "govkit init --adopt",
      detail: `${result.missingFrontMatter} governed doc(s) have NO front-matter block; previews one for each (add --apply to write)`,
    };
  }
  // Ranked BELOW adopt and kept separate from it: adopt refuses to touch a doc that already has
  // a block (it must never prepend a second one), so recommending it here would send the reader
  // to a command that prints "nothing to migrate" and changes nothing. A broken block is a hand
  // repair, and saying so is the only honest recommendation.
  if (result.malformedFrontMatter > 0) {
    return {
      kind: "repair-frontmatter",
      detail: `${result.malformedFrontMatter} doc(s) have a MALFORMED \`---\` block — \`govkit init --adopt\` deliberately skips those; run \`govkit verify\` to see the parser error and fix the YAML by hand`,
    };
  }
  if (!result.hook.installed) {
    return {
      kind: "install-hook",
      command: "govkit init",
      detail: `no write-time hook in ${posix(result.hook.path)}; init adds it and skips every file that already exists`,
    };
  }
  if (result.totalDocs === 0) {
    const first = result.types[0];
    const where = first ? `${first.dir}/` : "a configured doc dir";
    const status = first?.startStatus ?? "draft";
    return {
      kind: "author-first-doc",
      detail:
        `nothing governed yet — add a doc under ${where} with front-matter ` +
        `(id, title, status: ${status}, owner: TBD, date), then run \`govkit check\``,
    };
  }
  return {
    kind: "run-gate",
    command: "govkit check",
    detail: `${result.totalDocs} doc(s) governed, config and hook in place; this is the no-API-key gate CI runs`,
  };
}

/**
 * Read-only survey of a repo. NEVER throws: a missing or malformed govkit.yml is the most
 * useful thing doctor can report, so it is captured as state rather than raised — the caller
 * that wants a gate calls `verify`.
 */
export function runDoctor(opts: DoctorOptions): DoctorResult {
  const root = resolve(opts.root);
  const hookPath = join(root, HOOK_SETTINGS);
  // Substring, not a parsed shape: the consumer scaffold wires `npx --yes govkit audit-write`
  // and this repo wires `node dist/cli.js audit-write`. Both are the hook; the command name is
  // the only stable part, so that is what is matched.
  let hookInstalled = false;
  if (existsSync(hookPath)) {
    try {
      hookInstalled = readFileSync(hookPath, "utf8").includes("audit-write");
    } catch {
      hookInstalled = false;
    }
  }
  // One helper for every early return: the survey is empty until a config says what to survey,
  // and `next` is derived from the survey, never hand-written per branch.
  const withNext = (config: DoctorConfigState): DoctorResult => {
    const partial: Omit<DoctorResult, "next"> = {
      root,
      config,
      docsRoot: ".",
      types: [],
      totalDocs: 0,
      missingFrontMatter: 0,
      malformedFrontMatter: 0,
      hook: { installed: hookInstalled, path: HOOK_SETTINGS },
      ungoverned: [],
    };
    return { ...partial, next: recommendNext(partial) };
  };

  if (!existsSync(join(root, "govkit.yml"))) {
    return withNext({ kind: "missing" });
  }

  let config: GovkitConfig;
  try {
    config = loadConfig(root);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return withNext({ kind: "invalid", problem: message.split("\n", 1)[0] ?? message });
  }

  const docsRoot = config.docs.root ?? ".";
  const types: DoctorType[] = [];
  let totalDocs = 0;
  let missingFrontMatter = 0;
  let malformedFrontMatter = 0;
  // The SAME walk verify uses (util.walkGovernedDocs), per-type `recursive` included — a doctor
  // that counted a different corpus than the gate would be a map of a repo nobody runs.
  const counts = new Map<string, { docs: number; missing: number; malformed: number }>();
  walkGovernedDocs(root, config, ({ typeName, fm }) => {
    const c = counts.get(typeName) ?? { docs: 0, missing: 0, malformed: 0 };
    counts.set(typeName, c);
    c.docs++;
    // Two buckets, not one. `verify` reports both as kind `frontmatter`, but ADOPT treats them
    // oppositely — it scaffolds a block where there is none and refuses to touch one that
    // exists — so a recommendation that merged them would send half the cases to a no-op.
    if (!fm) c.missing++;
    else if (isParseError(fm)) c.malformed++;
  });
  for (const [name, def] of Object.entries(config.docs.types)) {
    const c = counts.get(name) ?? { docs: 0, missing: 0, malformed: 0 };
    totalDocs += c.docs;
    missingFrontMatter += c.missing;
    malformedFrontMatter += c.malformed;
    types.push({
      name,
      dir: posix(relative(root, typeDir(root, docsRoot, def.dir))),
      docs: c.docs,
      missingFrontMatter: c.missing,
      malformedFrontMatter: c.malformed,
      ...(def.startStatus ? { startStatus: def.startStatus } : {}),
      ...(def.statuses ? { statuses: def.statuses } : {}),
    });
  }

  const partial: Omit<DoctorResult, "next"> = {
    root,
    config: { kind: "loaded" },
    docsRoot,
    types,
    totalDocs,
    missingFrontMatter,
    malformedFrontMatter,
    hook: { installed: hookInstalled, path: HOOK_SETTINGS },
    ungoverned: findUngoverned(root, config),
  };
  return { ...partial, next: recommendNext(partial) };
}
