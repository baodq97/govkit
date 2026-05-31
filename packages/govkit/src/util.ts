import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Markdown docs in a directory, minus the ignore list. Non-recursive by design —
 *  governed docs live flat in their type dir. Shared by `verify` and `eval`. */
export function listMarkdown(dir: string, ignore: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md") && !ignore.includes(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/** Front-matter values are `unknown` (YAML may yield numbers/dates); normalize to a
 *  trimmed string for presence + comparison checks. */
export function str(value: unknown): string {
  return value != null ? String(value).trim() : "";
}
