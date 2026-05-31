import { parse as parseYaml } from "yaml";

export interface FrontMatter {
  data: Record<string, unknown>;
  body: string;
}

// A leading YAML front-matter block delimited by `---`. Tolerates CRLF — the
// cross-platform failure the legacy bash gate patched with repeated `tr -d '\r'`.
// Doing it once, correctly, here is the point of porting to a real language.
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const BOM = 0xfeff;

export function parseFrontMatter(content: string): FrontMatter | null {
  // Strip a UTF-8 BOM (Windows editors add it) before matching.
  const text = content.charCodeAt(0) === BOM ? content.slice(1) : content;
  const match = FRONT_MATTER.exec(text);
  if (!match) return null;
  const raw = match[1] ?? "";
  const parsed = parseYaml(raw) as unknown;
  const data =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return { data, body: text.slice(match[0].length) };
}
