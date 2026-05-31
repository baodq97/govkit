import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { type DocType, type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";

export type ViolationKind = "frontmatter" | "index";

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

function listMarkdown(dir: string, ignore: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md") && !ignore.includes(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function checkFrontMatter(file: string, required: string[]): string[] {
  const fm = parseFrontMatter(readFileSync(file, "utf8"));
  if (!fm) return ["missing YAML front-matter (expected a leading `---` block)"];
  const problems: string[] = [];
  for (const key of required) {
    const value = fm.data[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      problems.push(`missing or empty required front-matter key: ${key}`);
    }
  }
  return problems;
}

// INDEX sync: every doc must have a row in its dir's INDEX.md, and the row's
// status must match the doc's front-matter status. A stale INDEX is a rule
// violation, not a nit (root AGENTS.md). Heuristic line-match for v1 — it catches
// the two real failure modes (missing row, stale status) without a full table parser.
function checkIndex(root: string, typeName: string, def: DocType, ignore: string[]): Violation[] {
  const dir = join(root, def.dir);
  const docs = listMarkdown(dir, ignore);
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
    const fm = parseFrontMatter(readFileSync(doc, "utf8"));
    if (!fm) continue; // already flagged by the front-matter check
    const id = fm.data.id != null ? String(fm.data.id).trim() : "";
    const status = fm.data.status != null ? String(fm.data.status).trim() : "";
    if (!id) continue;
    const row = lines.find((line) => line.includes(id));
    if (!row) {
      problems.push(`${id} (${basename(doc)}) has no row in INDEX.md`);
    } else if (status && !row.includes(status)) {
      problems.push(`${id} INDEX row status is stale (front-matter status: ${status})`);
    }
  }
  return problems.length > 0 ? [{ file: indexPath, type: typeName, kind: "index", problems }] : [];
}

// The read-only governance gate: front-matter completeness + INDEX sync across
// every governed doc type. Pure w.r.t. its inputs (reads fs, returns a result) so
// the CLI owns printing/exit codes and tests own assertions. CI calls this with
// no API key; the PreToolUse hook (`audit-write`) is its per-write twin.
export function runVerify(opts: VerifyOptions): VerifyResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { ignore, base, types } = config.docs;
  const violations: Violation[] = [];
  let checked = 0;

  for (const [typeName, def] of Object.entries(types)) {
    const required = [...new Set([...base.required, ...def.required])];
    for (const file of listMarkdown(join(opts.root, def.dir), ignore)) {
      checked++;
      const problems = checkFrontMatter(file, required);
      if (problems.length > 0) {
        violations.push({ file, type: typeName, kind: "frontmatter", problems });
      }
    }
    violations.push(...checkIndex(opts.root, typeName, def, ignore));
  }
  return { ok: violations.length === 0, checked, violations };
}
