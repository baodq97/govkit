import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { type DocType, type GovkitConfig, loadConfig } from "../config";
import { isParseError, parseFrontMatter } from "../frontmatter";
import { headingLines, listMarkdown, matches, str, stripNonProse, typeDir } from "../util";

export type ViolationKind =
  | "frontmatter"
  | "index"
  | "status"
  | "id"
  | "duplicate"
  | "placeholder"
  | "reference"
  | "coherence"
  | "section";

export interface Violation {
  file: string;
  type: string;
  kind: ViolationKind;
  problems: string[];
}

export interface VerifyResult {
  ok: boolean;
  checked: number;
  violations: Violation[];
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
      problems.push(`missing or empty required front-matter key: ${key}`);
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
      problems.push(`unresolved placeholder in '${key}': ${value}`);
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
  const name = basename(file);
  if (name !== `${id}.md` && !name.startsWith(`${id}-`)) {
    problems.push(`filename '${name}' must be '${id}.md' or start with '${id}-'`);
  }
  return problems;
}

// INDEX sync: every doc must have a row in its dir's INDEX.md, and the row's
// status must match the doc's front-matter status. A stale INDEX is a rule
// violation, not a nit (root AGENTS.md). Heuristic line-match for v1 — it catches
// the two real failure modes (missing row, stale status) without a full table parser.
function checkIndex(dir: string, typeName: string, docs: Doc[], def: DocType): Violation[] {
  if (def.index === false) return []; // RFC-0011 (G1): type keeps no INDEX
  if (docs.length === 0) return [];

  const indexPath = join(dir, "INDEX.md");
  if (!existsSync(indexPath)) {
    return [
      {
        file: indexPath,
        type: typeName,
        kind: "index",
        problems: [`missing INDEX.md for ${docs.length} ${typeName} doc(s)`],
      },
    ];
  }

  const lines = readFileSync(indexPath, "utf8").split(/\r?\n/);
  const problems: string[] = [];
  for (const doc of docs) {
    const id = str(doc.data.id);
    const status = str(doc.data.status);
    if (!id) continue;
    const row = lines.find((line) => line.includes(id));
    if (!row) {
      problems.push(`${id} (${basename(doc.file)}) has no row in INDEX.md`);
    } else if (status && !row.includes(status)) {
      problems.push(`${id} INDEX row status is stale (front-matter status: ${status})`);
    }
  }
  return problems.length > 0 ? [{ file: indexPath, type: typeName, kind: "index", problems }] : [];
}

// Globally-unique ids across ALL governed docs. A duplicate id breaks every
// cross-reference (chain links, INDEX rows) so it's flagged once per colliding id.
function checkDuplicateIds(docs: Doc[]): Violation[] {
  const byId = new Map<string, Doc[]>();
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (!id) continue;
    const group = byId.get(id);
    if (group) group.push(doc);
    else byId.set(id, [doc]);
  }
  const violations: Violation[] = [];
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
// a single scalar id (arrays are a future extension). Builds its own id Set for membership
// (duplicate detection keeps an id→docs Map for collision reporting — a different shape, not
// shared) — same deterministic, no-key category as INDEX-sync / unique-ids.
function checkReferences(docs: Doc[], types: Record<string, DocType>): Violation[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (id) ids.add(id);
  }
  const violations: Violation[] = [];
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
function checkCoherence(docs: Doc[], types: Record<string, DocType>): Violation[] {
  const byId = new Map<string, Doc>();
  for (const doc of docs) {
    const id = str(doc.data.id);
    if (id && !byId.has(id)) byId.set(id, doc);
  }
  const isTerminal = (doc: Doc): boolean => {
    const term = types[doc.type]?.terminalStatuses;
    return !!term && term.length > 0 && term.includes(str(doc.data.status));
  };
  const violations: Violation[] = [];
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
function checkRequiredSections(docs: Doc[], types: Record<string, DocType>): Violation[] {
  const violations: Violation[] = [];
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
    if (v.kind === "duplicate" || v.kind === "reference" || v.kind === "coherence") {
      scoped.push(v); // global integrity — always reported, never masked
    } else if (v.kind === "index") {
      // An INDEX check emits ONE violation per type listing EVERY doc missing/stale, so
      // keeping it whole would flood untouched legacy docs' rows through --changed (the
      // very backfill the flag exists to defer). Filter its problems to the changed docs:
      // a per-doc problem opens with the doc id (`ADR-0001 (...) has no row` / `... stale`);
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
  const { ignore, base, types, root: docsRoot = "." } = config.docs;
  const violations: Violation[] = [];
  const allDocs: Doc[] = [];
  // Every file scanned, parseable or not, with its type. `allDocs` EXCLUDES docs that fail
  // front-matter parse (they early-out below), so it can't answer "what changed" for the
  // --changed scope — an unparseable changed doc would read as 0. This superset can. (RFC-0004)
  const scannedFiles: { file: string; type: string }[] = [];
  let checked = 0;

  for (const [typeName, def] of Object.entries(types)) {
    // RFC-0011 (G1): a type may drop base keys it has no lifecycle for (e.g. a status-less
    // runbook). Effective required = (base.required − excludeBase) ∪ def.required.
    const excluded = new Set(def.excludeBase ?? []);
    const effectiveBase = excluded.size
      ? base.required.filter((k) => !excluded.has(k))
      : base.required;
    const required = [...new Set([...effectiveBase, ...def.required])];
    const typeDocs: Doc[] = [];
    const dir = typeDir(opts.root, docsRoot, def.dir);

    for (const file of listMarkdown(dir, ignore)) {
      checked++;
      scannedFiles.push({ file, type: typeName });
      const fm = parseFrontMatter(readFileSync(file, "utf8"));
      if (!fm) {
        violations.push({
          file,
          type: typeName,
          kind: "frontmatter",
          problems: ["missing YAML front-matter (expected a leading `---` block)"],
        });
        continue;
      }
      // A block that is present but unparseable (US-0002): report the parser's message as
      // one normal violation and keep scanning the remaining docs — never crash the run.
      if (isParseError(fm)) {
        violations.push({
          file,
          type: typeName,
          kind: "frontmatter",
          problems: [`invalid YAML front-matter: ${fm.error} (line/column within the block)`],
        });
        continue;
      }
      const doc: Doc = { file, type: typeName, data: fm.data, body: fm.body };
      typeDocs.push(doc);
      allDocs.push(doc);

      const fmProblems = checkFrontMatter(fm.data, required);
      if (fmProblems.length > 0) {
        violations.push({ file, type: typeName, kind: "frontmatter", problems: fmProblems });
      }
      const statusProblems = checkStatus(fm.data, def);
      if (statusProblems.length > 0) {
        violations.push({ file, type: typeName, kind: "status", problems: statusProblems });
      }
      const idProblems = checkIdConvention(file, fm.data, def);
      if (idProblems.length > 0) {
        violations.push({ file, type: typeName, kind: "id", problems: idProblems });
      }
      const placeholderProblems = checkPlaceholder(fm.data, required);
      if (placeholderProblems.length > 0) {
        violations.push({
          file,
          type: typeName,
          kind: "placeholder",
          problems: placeholderProblems,
        });
      }
    }

    violations.push(...checkIndex(dir, typeName, typeDocs, def));
  }

  violations.push(...checkDuplicateIds(allDocs));
  violations.push(...checkReferences(allDocs, types));
  violations.push(...checkCoherence(allDocs, types));
  violations.push(...checkRequiredSections(allDocs, types));

  if (opts.changed) {
    const scoped = scopeToChanged(violations, scannedFiles, allDocs, opts.changed.files);
    return {
      ok: scoped.length === 0,
      checked,
      violations: scoped,
      scoped: {
        ref: opts.changed.ref,
        changedDocs: scannedFiles.filter((s) => opts.changed?.files.has(s.file)).length,
      },
    };
  }
  return { ok: violations.length === 0, checked, violations };
}
