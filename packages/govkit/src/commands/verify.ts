import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { type DocType, type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";
import { listMarkdown, str } from "../util";

export type ViolationKind =
  | "frontmatter"
  | "index"
  | "status"
  | "id"
  | "duplicate"
  | "placeholder"
  | "reference";

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
}

export interface VerifyOptions {
  root: string;
  config?: GovkitConfig;
}

interface Doc {
  file: string;
  type: string;
  data: Record<string, unknown>;
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
function checkIndex(root: string, typeName: string, def: DocType, docs: Doc[]): Violation[] {
  const dir = join(root, def.dir);
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

// The read-only governance gate: structural quality control across every governed
// doc — front-matter completeness, status-enum, id convention, INDEX sync, globally
// unique ids, no unresolved placeholders, and chain referential-integrity. Pure w.r.t. its inputs (reads fs,
// returns a result) so the CLI owns printing/exit codes and tests own assertions.
// CI calls this with no API key; `audit-write` is its per-write twin; `eval` is the
// graded quality layer that runs ON TOP of a passing gate.
export function runVerify(opts: VerifyOptions): VerifyResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { ignore, base, types } = config.docs;
  const violations: Violation[] = [];
  const allDocs: Doc[] = [];
  let checked = 0;

  for (const [typeName, def] of Object.entries(types)) {
    const required = [...new Set([...base.required, ...def.required])];
    const typeDocs: Doc[] = [];

    for (const file of listMarkdown(join(opts.root, def.dir), ignore)) {
      checked++;
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
      const doc: Doc = { file, type: typeName, data: fm.data };
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

    violations.push(...checkIndex(opts.root, typeName, def, typeDocs));
  }

  violations.push(...checkDuplicateIds(allDocs));
  violations.push(...checkReferences(allDocs, types));
  return { ok: violations.length === 0, checked, violations };
}
