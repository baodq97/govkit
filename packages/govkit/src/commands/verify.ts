import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";

export interface Violation {
  file: string;
  type: string;
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

function checkFile(file: string, required: string[]): string[] {
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

// The first ported `verify.sh` check: every governed doc must carry complete
// front-matter for its type. Pure with respect to its inputs (reads fs, returns
// a result) so the CLI owns printing + exit codes and tests own assertions.
export function runVerify(opts: VerifyOptions): VerifyResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { ignore, base, types } = config.docs;
  const violations: Violation[] = [];
  let checked = 0;

  for (const [typeName, def] of Object.entries(types)) {
    const required = [...new Set([...base.required, ...def.required])];
    for (const file of listMarkdown(join(opts.root, def.dir), ignore)) {
      checked++;
      const problems = checkFile(file, required);
      if (problems.length > 0) violations.push({ file, type: typeName, problems });
    }
  }
  return { ok: violations.length === 0, checked, violations };
}
