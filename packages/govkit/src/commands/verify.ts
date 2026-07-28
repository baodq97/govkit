import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { type CitationSummary, runCitations } from "../citations";
import {
  classifyWaivers,
  type DocType,
  type GovkitConfig,
  loadConfig,
  summarizeWaivers,
  type ViolationKind,
  type ViolationTier,
  type Waiver,
  type WaiverState,
  type WaiverSummary,
  waiverCovers,
} from "../config";
import { isParseError } from "../frontmatter";
import {
  effectiveRequired,
  headingLines,
  matches,
  str,
  stripNonProse,
  toPathspec,
  typeDir,
  walkGovernedDocs,
} from "../util";

// The canonical kind list (and these two types) live in config.ts so loadConfig can
// validate `tiers:` keys against it without a config↔verify import cycle; re-exported
// here because verify is the kinds' natural home for consumers.
export type { ViolationKind, ViolationTier };

export interface Violation {
  file: string;
  type: string;
  kind: ViolationKind;
  problems: string[];
  /** Risk tier (RFC-0014), assigned once in runVerify from `config.tiers` (default
   *  blocking). Advisory violations are reported but never fail the gate. */
  tier: ViolationTier;
  /**
   * Set when an ACTIVE waiver covered this finding: it is still REPORTED (this object is still in
   * `violations`, and a human-readable waiver line is appended to `problems` so any printer shows
   * it) but it does not fail the gate. Absent ⇒ the violation counts toward the verdict as before.
   * A `waiver`-kind violation can never carry this — a waiver may not waive the report of a
   * broken waiver, which would make the mechanism self-concealing.
   */
  waivedBy?: Waiver;
}

/** A violation as the individual checks emit it — the tier is not theirs to decide;
 *  runVerify assigns it centrally from config so no check can forget the mapping. */
type Finding = Omit<Violation, "tier">;

export interface VerifyResult {
  ok: boolean;
  checked: number;
  violations: Violation[];
  /** Waiver accounting for this run — `waived` is `waivers.applied`. Always present (all-zero
   *  when nothing is configured) so a consumer never has to special-case its absence. */
  waivers: WaiverSummary;
  /** Set only when `checkCitations` was requested (RFC-pending, opt-in). Carries the resolved /
   *  skipped / failed accounting for the whole run, so the report can never state a citation
   *  verdict without the denominator it was measured against. Absent ⇒ the pass did not run. */
  citations?: CitationSummary;
  /** Set only when `changed` scoping was applied — names the base ref and how many
   *  governed docs fell in the changed set, so output is never silently scoped. */
  scoped?: { ref: string; changedDocs: number };
}

export interface VerifyOptions {
  root: string;
  config?: GovkitConfig;
  /** `--changed` adoption mode (RFC-0004): absolute paths of new-or-modified governed
   *  docs. When provided, the full scan still runs (so cross-doc checks stay correct),
   *  but the REPORT is scoped — see scopeToChanged. `ref` is recorded for output only. */
  changed?: { files: Set<string>; ref: string };
  /** The instant waiver expiry is judged against. Injected so a test can prove the boundary
   *  without waiting for it; defaults to now. Nothing else in verify reads a clock. */
  now?: Date;
  /**
   * OPT-IN (`--check-citations`): resolve every `path:line` reference the governed tree makes
   * into the code it claims to describe. Deliberately not default and deliberately OUT of the
   * no-key CI gate: it is a brand-new rule with no calibration history, and the repo rule is
   * that a rule earns its severity with evidence before it blocks anyone. Off ⇒ the pass does
   * not run at all and `citations` is absent, so an unflagged run is byte-identical to before.
   */
  checkCitations?: boolean;
}

interface Doc {
  file: string;
  type: string;
  data: Record<string, unknown>;
  /** Prose body (front-matter stripped). Only the required-section check (RFC-0010) reads it. */
  body: string;
}

// `TBD` is a LEGAL value (owner: TBD is mandated until a human assigns ownership —
// agents must never self-assign), so it is deliberately NOT a placeholder token.
const PLACEHOLDER_TOKENS = new Set([
  "REPLACE_ME",
  "REPLACEME",
  "CHANGEME",
  "CHANGE_ME",
  "TODO",
  "FIXME",
  "XXX",
  "PLACEHOLDER",
  "YOUR-NAME",
  "YOUR_NAME",
]);

function checkFrontMatter(data: Record<string, unknown>, required: string[]): string[] {
  const problems: string[] = [];
  for (const key of required) {
    if (str(data[key]) === "") {
      problems.push(
        `missing or empty required front-matter key: ${key} — add \`${key}: <value>\` ` +
          `to the leading \`---\` block`,
      );
    }
  }
  return problems;
}

// A required value is a placeholder if it's an angle-bracket stub (`<your name>`)
// or a known template token — i.e. the doc was scaffolded but never filled in.
function checkPlaceholder(data: Record<string, unknown>, required: string[]): string[] {
  const problems: string[] = [];
  for (const key of required) {
    const value = str(data[key]);
    if (value === "") continue; // empty is the front-matter check's job, not this one
    if (/<[^>]*>/.test(value) || PLACEHOLDER_TOKENS.has(value.toUpperCase())) {
      problems.push(
        `unresolved placeholder in '${key}': ${value} — replace it with a real value ` +
          `(owner: TBD is the one legal sentinel until a human takes ownership)`,
      );
    }
  }
  return problems;
}

function checkStatus(data: Record<string, unknown>, def: DocType): string[] {
  if (!def.statuses || def.statuses.length === 0) return [];
  const status = str(data.status);
  if (status === "" || def.statuses.includes(status)) return []; // empty → front-matter's job
  return [`status '${status}' is not one of [${def.statuses.join(", ")}]`];
}

function checkIdConvention(file: string, data: Record<string, unknown>, def: DocType): string[] {
  if (!def.idPrefix) return [];
  const id = str(data.id);
  if (id === "") return []; // empty → front-matter's job
  const problems: string[] = [];
  if (!id.startsWith(`${def.idPrefix}-`)) {
    problems.push(`id '${id}' must start with '${def.idPrefix}-'`);
  }
  // The filename half is opt-out per type (`idFilenameConvention: false`): a design tree names
  // its files after the concept (`context-map.md`, a per-context `README.md`) while the id stays
  // a numbered handle, and there the convention would reject every legitimate file. The prefix
  // check above still runs, and ids stay globally unique — the doc is still addressable by id.
  if (def.idFilenameConvention === false) return problems;
  const name = basename(file);
  if (name !== `${id}.md` && !name.startsWith(`${id}-`)) {
    problems.push(`filename '${name}' must be '${id}.md' or start with '${id}-'`);
  }
  return problems;
}

// RFC-0023 (G2): an id sits inside a markdown link cell (`[US-0001](./US-0001-x.md)`), so match
// it as a bounded TOKEN anywhere in the row — bounded by a non-id char so `US-1` never matches a
// `US-10` row. Replaces the substring `line.includes(id)` that silently false-passed.
function idRowPattern(id: string): RegExp {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9-])${esc}(?![A-Za-z0-9-])`);
}

// RFC-0023 (KT-0004): an INDEX cell may carry YAML-style surrounding quotes (`"@handle"`) while
// the front-matter value is parser-unquoted (`@handle`). Strip ONE matching surrounding quote
// pair (single or double) before comparing, so the two agree — without making quotes a wildcard
// (`"@a"` still ≠ `@b`). Mirrors the consumer bash gate's quote-stripping.
function stripQuotes(s: string): string {
  return s.replace(/^(['"])(.*)\1$/, "$2");
}

// RFC-0023 (G2/G3): a synced column value (status, owner, …) occupies its OWN table cell, so we
// require some cell to equal it exactly after trimming + quote-stripping — this is why `done`
// inside a title cell no longer false-passes a `status` sync. Replaces `row.includes(status)`.
function rowHasCell(row: string, value: string): boolean {
  return row.split("|").some((cell) => stripQuotes(cell.trim()) === value);
}

// INDEX sync: every doc must have a row in its dir's INDEX.md, and the row's
// status must match the doc's front-matter status. A stale INDEX is a rule
// violation, not a nit (root AGENTS.md). Heuristic line-match for v1 — it catches
// the two real failure modes (missing row, stale status) without a full table parser.
function checkIndex(dir: string, typeName: string, docs: Doc[], def: DocType): Finding[] {
  if (def.index === false) return []; // RFC-0023 (G1): type keeps no INDEX
  if (docs.length === 0) return [];

  const indexPath = join(dir, "INDEX.md");
  if (!existsSync(indexPath)) {
    return [
      {
        file: indexPath,
        type: typeName,
        kind: "index",
        // scopeToChanged filters index problems on this exact "missing INDEX.md" prefix.
        problems: [
          `missing INDEX.md for ${docs.length} ${typeName} doc(s) — create it with one ` +
            `row per doc (id, title, status)`,
        ],
      },
    ];
  }

  const lines = readFileSync(indexPath, "utf8").split(/\r?\n/);
  const problems: string[] = [];
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (!id) continue;
    // The pattern depends only on the id — compile once per doc, not once per INDEX line.
    const idPattern = idRowPattern(id);
    const row = lines.find((line) => idPattern.test(line));
    // scopeToChanged keys per-doc index problems on the leading doc id — keep it first.
    if (!row) {
      problems.push(
        `${id} (${basename(doc.file)}) has no row in INDEX.md — add a row carrying the ` +
          `id and its status`,
      );
      continue;
    }
    // RFC-0023 (G3): sync each configured key as a bounded cell. Default is status-only (the
    // pre-RFC-0023 behavior); a missing/empty `sync` falls back to the default rather than
    // crashing on a non-iterable (US-0003 fail-soft).
    const sync = def.index ? (def.index.sync ?? ["status"]) : ["status"];
    for (const key of sync) {
      const value = str(doc.data[key]);
      if (value === "") continue;
      if (!rowHasCell(row, value)) {
        problems.push(
          `${id} INDEX row ${key} is stale or missing (front-matter ${key}: ${value}) — ` +
            `update the row to '${value}'`,
        );
      }
    }
  }
  return problems.length > 0 ? [{ file: indexPath, type: typeName, kind: "index", problems }] : [];
}

// Globally-unique ids across ALL governed docs. A duplicate id breaks every
// cross-reference (chain links, INDEX rows) so it's flagged once per colliding id.
function checkDuplicateIds(docs: Doc[]): Finding[] {
  const byId = new Map<string, Doc[]>();
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (!id) continue;
    const group = byId.get(id);
    if (group) group.push(doc);
    else byId.set(id, [doc]);
  }
  const violations: Finding[] = [];
  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.file.localeCompare(b.file));
    const [first, ...rest] = sorted;
    if (!first) continue;
    violations.push({
      file: first.file,
      type: first.type,
      kind: "duplicate",
      problems: [`duplicate id '${id}' — also declared in: ${rest.map((d) => d.file).join(", ")}`],
    });
  }
  return violations;
}

// Chain referential-integrity (RFC-0003): the cross-artifact edge a single-doc gate misses.
// For every doc that declares a configured `refs` key with a NON-EMPTY value, that value must
// resolve to a known doc id anywhere in the chain — else a dangling reference (a `parent`
// pointing at an id that was renamed or never existed). Resolve-only: empty/absent values are
// optional links and skipped; `ref.type` is recorded in config but not enforced here; a ref is
// a single scalar id (arrays are a future extension). The id universe (`ids`) comes from the
// shared `collectGovernedIds` collector — the same set the ledger's spec resolution
// (RFC-0016) uses, so the two can never disagree on which ids exist (duplicate detection
// keeps an id→docs Map for collision reporting — a different shape, not shared) — same
// deterministic, no-key category as INDEX-sync / unique-ids.
function checkReferences(docs: Doc[], types: Record<string, DocType>, ids: Set<string>): Finding[] {
  const violations: Finding[] = [];
  for (const doc of docs) {
    const refs = types[doc.type]?.refs;
    if (!refs || refs.length === 0) continue;
    const problems: string[] = [];
    for (const ref of refs) {
      const value = str(doc.data[ref.key]);
      if (value === "") continue; // empty → optional link, not a dangling one
      if (!ids.has(value)) {
        problems.push(`reference '${ref.key}: ${value}' does not resolve to any known doc id`);
      }
    }
    if (problems.length > 0) {
      violations.push({ file: doc.file, type: doc.type, kind: "reference", problems });
    }
  }
  return violations;
}

// Chain-status COHERENCE (RFC-0008): the "feedback after implement" gate. A doc that has
// reached a TERMINAL state (its type's `terminalStatuses`) must not depend on a parent whose
// design was never decided — you cannot ship a thing whose RFC is still draft/rejected. For
// every terminal doc with a configured `parent`-style ref, resolve the parent BY ID and require
// the parent be terminal too. Precision that keeps this zero-false-positive:
//   • child-type with no `terminalStatuses`  → exempt (the non-breaking floor).
//   • child not in a terminal status         → nothing decided yet, skip.
//   • parent ref empty                        → optional link, skip.
//   • parent id does not resolve              → dangling; that's checkReferences' job, not ours.
//   • parent-type with no `terminalStatuses`  → "terminal" is undefined for it, cannot judge, skip.
// Only when the parent resolves to a doc whose type DOES define terminal states and whose status
// is NOT among them do we flag. "Terminal" is a SET (accepted ∪ superseded), so done-under-
// superseded passes — only a pre-decision/rejected parent fails. Same deterministic, no-key,
// cross-doc class as checkReferences; reported on the child (the doc that jumped ahead).
function checkCoherence(docs: Doc[], types: Record<string, DocType>): Finding[] {
  const byId = new Map<string, Doc>();
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (id && !byId.has(id)) byId.set(id, doc);
  }
  const isTerminal = (doc: Doc): boolean => {
    const term = types[doc.type]?.terminalStatuses;
    return !!term && term.length > 0 && term.includes(str(doc.data.status));
  };
  const violations: Finding[] = [];
  for (const doc of docs) {
    const def = types[doc.type];
    if (!isTerminal(doc)) continue; // exempt type, or child not yet decided
    const refs = def?.refs;
    if (!refs || refs.length === 0) continue;
    const problems: string[] = [];
    for (const ref of refs) {
      const value = str(doc.data[ref.key]);
      if (value === "") continue; // optional link
      const parent = byId.get(value);
      if (!parent) continue; // dangling → checkReferences reports it
      const pdef = types[parent.type]?.terminalStatuses;
      if (!pdef || pdef.length === 0) continue; // parent type cannot be judged
      if (!isTerminal(parent)) {
        problems.push(
          `'${str(doc.data.id)}' is ${str(doc.data.status)} but its ${ref.key} '${value}' is ` +
            `${str(parent.data.status)} — not a decided/terminal state ` +
            `(one of [${pdef.join(", ")}])`,
        );
      }
    }
    if (problems.length > 0) {
      violations.push({ file: doc.file, type: doc.type, kind: "coherence", problems });
    }
  }
  return violations;
}

// Status-conditional required sections (RFC-0010): the forcing function that makes an as-built /
// deviations note a REQUIRED ritual at the moment implementation meets the design — but only then.
// For a doc whose type declares `requiredSectionsByStatus` AND whose current status is a KEY in
// that map, every configured heading pattern for that status must match some real heading in the
// body. Precision that keeps this zero-false-positive:
//   • type with no `requiredSectionsByStatus`        → exempt (the non-breaking floor).
//   • doc's status is not a key in the map           → skip (the conditional — e.g. an `accepted`
//                                                       RFC is silent; only `implemented` requires).
// Keyed to a post-implementation status, NOT to `terminalStatuses` (which includes `accepted`,
// before any divergence exists) — the decoupling is the fix for the caught flaw where the gate
// would fire at accept-time, forcing a dishonest "None", then never re-fire. Headings are matched
// after `stripNonProse`, so a `## As-built` inside a code fence does not satisfy the requirement.
// Per-doc check (reported on the doc itself), so `--changed` scopes it like frontmatter/status.
function checkRequiredSections(docs: Doc[], types: Record<string, DocType>): Finding[] {
  const violations: Finding[] = [];
  for (const doc of docs) {
    const byStatus = types[doc.type]?.requiredSectionsByStatus;
    if (!byStatus) continue; // exempt type
    const required = byStatus[str(doc.data.status)];
    if (!required || required.length === 0) continue; // status not keyed → not yet required
    const headings = headingLines(stripNonProse(doc.body));
    const problems: string[] = [];
    for (const pattern of required) {
      const present = headings.some((h) => matches(`(?:${pattern})`, h));
      if (!present) {
        problems.push(
          `status '${str(doc.data.status)}' requires a section heading matching ` +
            `/${pattern}/ — not found (add it, or affirm "None")`,
        );
      }
    }
    if (problems.length > 0) {
      violations.push({ file: doc.file, type: doc.type, kind: "section", problems });
    }
  }
  return violations;
}

// ANCHORED citation resolution (opt-in, `--check-citations`). A governed doc that cites
// `verify.ts:645` is asserting something about code, and that assertion rots silently: the
// measured incident this exists for is a citation that went stale inside the round that wrote
// it, because a +34-line edit pushed the cited block down while SOMETHING still occupied the old
// line. Resolution therefore anchors on a token from the citing sentence rather than on the line
// number alone (see citations.ts for the three-step rule and the three failure names).
// ONE violation per citing FILE carrying one problem per failure — the same grouping checkIndex
// uses, and for the same reason: a doc with nine moved citations is one repair, not nine reports.
// Reported on the citing file, so `--changed` scopes it like any other per-doc check.
function checkCitations(
  root: string,
  config: GovkitConfig,
): { findings: Finding[]; summary: CitationSummary } {
  const { summary, reports } = runCitations(root, config);
  const findings = reports.map((report) => ({
    file: report.file,
    type: report.type,
    kind: "citation" as const,
    problems: report.failures.map(
      (f) => `line ${f.citation.fromLine} cites \`${f.citation.raw}\` — ${f.reason}: ${f.detail}`,
    ),
  }));
  return { findings, summary };
}

// The waiver config is itself governed. Every waiver that is NOT in force gets said out loud, on
// `govkit.yml`, as one `waiver`-kind violation carrying one problem per broken entry:
//   • MALFORMED (missing a mandatory field, or naming a rule the gate never emits) — it suppresses
//     nothing. A waiver that silently fails to parse would be the worst of both worlds: the author
//     believes the finding is excused, the gate believes nothing was ever asked.
//   • EXPIRED — it suppresses nothing either, and it is named so the output SAYS the waiver
//     expired rather than letting the finding reappear as if from nowhere. If the underlying
//     finding was fixed in the meantime this entry is the only thing left, and deleting two lines
//     of YAML clears it — that is the intended forcing function against dead accepted debt.
// Blocking like every other kind, and demotable the same way (`tiers: { waiver: advisory }`) for a
// repo that wants the reminder without the red.
function checkWaivers(root: string, states: WaiverState[]): Finding[] {
  const problems: string[] = [];
  for (const state of states) {
    if (state.state === "malformed") {
      problems.push(...state.problems);
    } else if (state.state === "expired") {
      const { rule, scope, expires, authorized_by } = state.waiver;
      problems.push(
        `waivers[${state.index}] for rule '${rule}' on '${scope}' EXPIRED on ${expires} ` +
          `(authorized_by ${authorized_by}) — it no longer suppresses anything; fix the finding, ` +
          `or record a fresh authorization with a new expires date`,
      );
    }
  }
  if (problems.length === 0) return [];
  return [{ file: join(root, "govkit.yml"), type: "waivers", kind: "waiver", problems }];
}

// Apply the ACTIVE waivers to an already-tiered violation list. Marking, never filtering: a waived
// violation stays in `violations` (so every printer, `--json` consumer and the journal still see
// it) and gains a human-readable line explaining who signed it and when it dies — visibility is
// the whole price of the escape hatch. Only `passes` changes its mind about it. Two guards:
//   • a `waiver`-kind violation is never waivable — no self-concealing waivers.
//   • matching is rule×scope, on the repo-relative forward-slash path, so a scope means the same
//     thing on every OS and in every clone.
function applyWaivers(root: string, violations: Violation[], states: WaiverState[]): Violation[] {
  const active = states.flatMap((s) => (s.state === "active" ? [s.waiver] : []));
  if (active.length === 0) return violations;
  return violations.map((v) => {
    if (v.kind === "waiver") return v;
    const rel = toPathspec(root, v.file);
    const waiver = active.find((w) => waiverCovers(w, v.kind, rel));
    if (!waiver) return v;
    return {
      ...v,
      waivedBy: waiver,
      problems: [
        ...v.problems,
        `waived by ${waiver.authorized_by} until ${waiver.expires} — ${waiver.reason} ` +
          `(reported, not blocking; the finding returns the day the waiver expires)`,
      ],
    };
  });
}

/** The human summary of a report: `3 violations, 1 blocking, 1 waived, 1 advisory, 1 waiver
 *  expiring within 14 days`. Lives beside the counting rule rather than in the CLI printer, so the
 *  numbers have ONE home and can be asserted without spawning a process.
 *
 *  The head term counts what the printer is about to LIST, and the breakdown says why the verdict
 *  came out the way it did. A report that lists a violation may never head itself "0 violations":
 *  the header contradicting its own body is exactly how a signed-for finding read as a clean run.
 *  The three buckets partition `violations` — `waived` is taken from the printed list rather than
 *  from `waivers.applied` (identical by construction, see runVerify's `applied` counting rule) so
 *  the line can only ever describe the entries beneath it. */
export function verifySummaryLine(result: VerifyResult): string {
  const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
  const { expired, expiringSoon, malformed, horizonDays } = result.waivers;
  const waived = result.violations.filter((v) => v.waivedBy !== undefined).length;
  const advisory = result.violations.filter(
    (v) => v.tier === "advisory" && v.waivedBy === undefined,
  ).length;
  const parts = [plural(result.violations.length, "violation")];
  if (result.violations.length > 0) {
    // `blocking` is the residue of the partition, and it is exactly what flips `ok` — so a reader
    // can check the arithmetic against the entries printed below.
    parts.push(`${result.violations.length - waived - advisory} blocking`);
    if (waived > 0) parts.push(`${waived} waived`);
    if (advisory > 0) parts.push(`${advisory} advisor${advisory === 1 ? "y" : "ies"}`);
  }
  if (expired > 0) parts.push(`${plural(expired, "waiver")} expired`);
  if (malformed > 0) parts.push(`${plural(malformed, "waiver")} malformed`);
  if (expiringSoon > 0) {
    // Not a violation of its own — the one count here that has no entry below it, so it is stated
    // even on a clean report: an exception about to die is news before the finding returns.
    parts.push(`${plural(expiringSoon, "waiver")} expiring within ${horizonDays} days`);
  }
  if (result.citations) parts.push(citationLine(result.citations));
  return parts.join(", ");
}

/** The citation pass's own accounting, appended to the summary ONLY when the pass ran (so an
 *  unflagged run's line is byte-identical to before it existed).
 *
 *  All four totals are always stated — found, resolved, skipped, failed — because the whole point
 *  of this check is that a number without its denominator lies: the positional checker it replaces
 *  reported "0 errors" over a corpus that already carried a stale citation. `found = resolved +
 *  skipped + failed` holds by construction, so a reader can audit the line against itself, and the
 *  skipped/failed breakdowns name WHICH form was skipped and WHICH way it failed — a silent skip
 *  reads as coverage, and one generic failure name sends the reader to the wrong repair. */
function citationLine(c: CitationSummary): string {
  const breakdown = (by: Record<string, number>): string => {
    const named = Object.entries(by)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => `${name} ${n}`);
    return named.length > 0 ? ` (${named.join(", ")})` : "";
  };
  return (
    `citations: ${c.found} found in ${c.files} file(s), ${c.resolved} resolved, ` +
    `${c.skipped} skipped${breakdown(c.skippedBy)}, ${c.failed} failed${breakdown(c.failedBy)}`
  );
}

// RFC-0004 adoption scoping: keep ONLY the violations a changed set is responsible for,
// so an existing repo can adopt govkit without retrofitting its whole backlog first. The
// load-bearing rule is "scope the REPORT, never the SCAN" — runVerify already scanned ALL
// docs to build global state, so cross-doc checks are correct; here we filter what is
// emitted. Per-doc violations (frontmatter, status, id, placeholder, and RFC-0010 `section` —
// a missing required section is the changed doc's OWN concern) are kept only for a changed
// file. An INDEX violation is kept when a changed doc shares its type (a changed
// doc can make an unchanged INDEX stale). Global-integrity violations — `duplicate` and
// `reference` — are ALWAYS kept: a new doc duplicating an UNTOUCHED doc's id (the colliding
// pair's reported file may be the untouched one) or pointing at a dangling id must never be
// masked. Masking a real new violation is the exact "looks-enforced-but-isn't" leak govkit
// exists to prevent, so the no-mask floor wins over tighter scoping for these kinds.
// `coherence` (RFC-0008) joins that always-kept set: a child going terminal under an
// untouched-but-undecided parent implicates the UNTOUCHED parent, the exact masking case.
function scopeToChanged(
  violations: Violation[],
  scanned: { file: string; type: string }[],
  docs: Doc[],
  changed: Set<string>,
): Violation[] {
  // `changedTypes` comes from the SCANNED superset (so an unparseable changed doc still
  // marks its type changed → its own INDEX/frontmatter concern surfaces); `changedIds`
  // comes from parsed docs only (an unparseable doc has no id to contribute).
  const changedTypes = new Set<string>();
  const changedIds = new Set<string>();
  for (const s of scanned) {
    if (changed.has(s.file)) changedTypes.add(s.type);
  }
  for (const doc of docs) {
    if (!changed.has(doc.file)) continue;
    const id = str(doc.data.id);
    if (id) changedIds.add(id);
  }
  const scoped: Violation[] = [];
  for (const v of violations) {
    if (
      v.kind === "duplicate" ||
      v.kind === "reference" ||
      v.kind === "coherence" ||
      v.kind === "waiver"
    ) {
      // Global integrity — always reported, never masked. `waiver` joins them because it is
      // reported on `govkit.yml`, which is never a governed `.md` and so could never be in the
      // changed set: scoped by file it would vanish on every `--changed` run, quietly hiding a
      // broken or expired exception — the one thing this mechanism may never do.
      scoped.push(v);
    } else if (v.kind === "index") {
      // An INDEX check emits ONE violation per type listing EVERY doc missing/stale, so
      // keeping it whole would flood untouched legacy docs' rows through --changed (the
      // very backfill the flag exists to defer). Filter its problems to the changed docs:
      // a per-doc problem opens with the doc id (`ADR-0001 (...) has no row` / `... stale or missing`);
      // the file-level `missing INDEX.md` problem names no id and is the changed doc's own
      // concern, so it's kept when this type has a changed doc.
      if (!changedTypes.has(v.type)) continue;
      const problems = v.problems.filter(
        (p) => p.startsWith("missing INDEX.md") || changedIds.has(p.split(" ")[0] ?? ""),
      );
      if (problems.length > 0) scoped.push({ ...v, problems });
    } else if (changed.has(v.file)) {
      scoped.push(v); // per-doc check (frontmatter, status, id, placeholder)
    }
  }
  return scoped;
}

// The read-only governance gate: structural quality control across every governed
// doc — front-matter completeness, status-enum, id convention, INDEX sync, globally
// unique ids, no unresolved placeholders, and chain referential-integrity. Pure w.r.t. its inputs (reads fs,
// returns a result) so the CLI owns printing/exit codes and tests own assertions.
// CI calls this with no API key; `audit-write` is its per-write twin; `eval` is the
// graded quality layer that runs ON TOP of a passing gate.
export function runVerify(opts: VerifyOptions): VerifyResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { base, types, root: docsRoot = "." } = config.docs;
  const violations: Finding[] = [];
  const allDocs: Doc[] = [];
  // Every file scanned, parseable or not, with its type. `allDocs` EXCLUDES docs that fail
  // front-matter parse (they early-out below), so it can't answer "what changed" for the
  // --changed scope — an unparseable changed doc would read as 0. This superset can. (RFC-0004)
  const scannedFiles: { file: string; type: string }[] = [];
  let checked = 0;

  // The per-doc findings are bucketed per TYPE during the shared walk, then flattened below in
  // type order with each type's INDEX check after its own docs — the exact report order the
  // hand-written per-type loop produced, kept stable so no consumer sees a reshuffled report.
  interface TypeBucket {
    /** RFC-0023 (G1): a type may drop base keys it has no lifecycle for (e.g. a status-less
     *  runbook). Effective required = (base.required − excludeBase) ∪ def.required. */
    required: string[];
    docs: Doc[];
    findings: Finding[];
  }
  const byType = new Map<string, TypeBucket>();

  // The shared corpus walk (util.walkGovernedDocs) owns WHICH files this gate checks —
  // `def.recursive` (default false) is the type's layout switch, and every other reader walks
  // through the same generator, so no reader governs a different corpus.
  walkGovernedDocs(opts.root, config, ({ file, typeName, def, fm }) => {
    let bucket = byType.get(typeName);
    if (!bucket) {
      bucket = { required: effectiveRequired(base, def), docs: [], findings: [] };
      byType.set(typeName, bucket);
    }
    checked++;
    scannedFiles.push({ file, type: typeName });
    if (!fm) {
      bucket.findings.push({
        file,
        type: typeName,
        kind: "frontmatter",
        problems: ["missing YAML front-matter (expected a leading `---` block)"],
      });
      return;
    }
    // A block that is present but unparseable (US-0002): report the parser's message as
    // one normal violation and keep scanning the remaining docs — never crash the run.
    if (isParseError(fm)) {
      bucket.findings.push({
        file,
        type: typeName,
        kind: "frontmatter",
        problems: [`invalid YAML front-matter: ${fm.error} (line/column within the block)`],
      });
      return;
    }
    const doc: Doc = { file, type: typeName, data: fm.data, body: fm.body };
    bucket.docs.push(doc);
    allDocs.push(doc);

    const fmProblems = checkFrontMatter(fm.data, bucket.required);
    if (fmProblems.length > 0) {
      bucket.findings.push({ file, type: typeName, kind: "frontmatter", problems: fmProblems });
    }
    const statusProblems = checkStatus(fm.data, def);
    if (statusProblems.length > 0) {
      bucket.findings.push({ file, type: typeName, kind: "status", problems: statusProblems });
    }
    const idProblems = checkIdConvention(file, fm.data, def);
    if (idProblems.length > 0) {
      bucket.findings.push({ file, type: typeName, kind: "id", problems: idProblems });
    }
    const placeholderProblems = checkPlaceholder(fm.data, bucket.required);
    if (placeholderProblems.length > 0) {
      bucket.findings.push({
        file,
        type: typeName,
        kind: "placeholder",
        problems: placeholderProblems,
      });
    }
  });

  for (const [typeName, def] of Object.entries(types)) {
    const bucket = byType.get(typeName);
    if (bucket) violations.push(...bucket.findings);
    violations.push(
      ...checkIndex(typeDir(opts.root, docsRoot, def.dir), typeName, bucket?.docs ?? [], def),
    );
  }

  violations.push(...checkDuplicateIds(allDocs));
  // The id universe is exactly the docs this run already walked and parsed — building the set
  // from `allDocs` replaces a second full corpus walk (re-read + re-parse of every file) that
  // `collectGovernedIds` would do to arrive at the same ids.
  const governedIds = new Set(allDocs.map((d) => str(d.data.id)).filter((id) => id !== ""));
  violations.push(...checkReferences(allDocs, types, governedIds));
  violations.push(...checkCoherence(allDocs, types));
  violations.push(...checkRequiredSections(allDocs, types));

  // Opt-in and last among the checks: it is the only one that reads files OUTSIDE the governed
  // corpus (the code a doc cites), and the only one whose severity is not yet calibrated. Off by
  // default, so `citations` stays absent and an unflagged run is byte-identical to before.
  const citations = opts.checkCitations ? checkCitations(opts.root, config) : undefined;
  if (citations) violations.push(...citations.findings);

  // Waivers are classified ONCE, against ONE instant, before anything is judged: a run that
  // read the clock per-violation could put the same waiver in force for one finding and expired
  // for the next. `checkWaivers` then reports every entry that is NOT in force as a normal
  // violation, so a broken or dead exception is loud in exactly the output it was meant to quiet.
  const waiverStates = classifyWaivers(config, opts.now ?? new Date());
  violations.push(...checkWaivers(opts.root, waiverStates));

  // Risk tiers (RFC-0014): the tier is assigned ONCE here — kind → config.tiers, default
  // blocking, so a config without `tiers:` behaves exactly as before. One list with a tier
  // field, deliberately NOT two arrays: every consumer (print, --json, journal, --changed
  // scoping) sees the same violations, and `ok` is simply "zero BLOCKING violations" —
  // advisories are reported, never verdict-flipping.
  const tiers = config.tiers ?? {};
  const tiered: Violation[] = violations.map((v) => ({ ...v, tier: tiers[v.kind] ?? "blocking" }));
  // Waiving is the SECOND, independent way a blocking violation stops flipping the verdict, and
  // it composes with tiers rather than competing: `tier` says how the RULE is treated everywhere,
  // `waivedBy` says this one finding was signed for. Both leave the violation in the list.
  const marked = applyWaivers(opts.root, tiered, waiverStates);
  const passes = (vs: Violation[]): boolean =>
    !vs.some((v) => v.tier === "blocking" && v.waivedBy === undefined);

  // `applied` is counted on what is REPORTED, not on what was scanned: under `--changed` a waiver
  // covering an out-of-scope doc excused nothing in this run, and saying "2 waived" over a report
  // that shows neither would be the summary lying about its own body.
  const reported = opts.changed
    ? scopeToChanged(marked, scannedFiles, allDocs, opts.changed.files)
    : marked;
  const waivers = summarizeWaivers(
    waiverStates,
    reported.filter((v) => v.waivedBy !== undefined).length,
  );

  if (opts.changed) {
    return {
      ok: passes(reported),
      checked,
      violations: reported,
      waivers,
      ...(citations ? { citations: citations.summary } : {}),
      scoped: {
        ref: opts.changed.ref,
        changedDocs: scannedFiles.filter((s) => opts.changed?.files.has(s.file)).length,
      },
    };
  }
  return {
    ok: passes(reported),
    checked,
    violations: reported,
    waivers,
    ...(citations ? { citations: citations.summary } : {}),
  };
}
