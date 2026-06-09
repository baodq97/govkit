import { parse as parseYaml } from "yaml";

export interface FrontMatter {
  data: Record<string, unknown>;
  body: string;
}

// A leading `---` block whose YAML failed to parse — distinct from "no block at all"
// (null). Carries the parser's one-line message (with line/column, relative to the
// front-matter block) so the gate reports a normal violation instead of crashing the
// whole run on the first malformed doc. (US-0002)
export interface FrontMatterError {
  error: string;
}

export function isParseError(fm: FrontMatter | FrontMatterError | null): fm is FrontMatterError {
  return fm !== null && "error" in fm;
}

// A leading YAML front-matter block delimited by `---`. Tolerates CRLF — the
// cross-platform failure the legacy bash gate patched with repeated `tr -d '\r'`.
// Doing it once, correctly, here is the point of porting to a real language.
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const BOM = 0xfeff;

export function parseFrontMatter(content: string): FrontMatter | FrontMatterError | null {
  // Strip a UTF-8 BOM (Windows editors add it) before matching.
  const text = content.charCodeAt(0) === BOM ? content.slice(1) : content;
  const match = FRONT_MATTER.exec(text);
  if (!match) return null;
  const raw = match[1] ?? "";
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    // The `yaml` parser throws YAMLParseError on malformed YAML (e.g. an unquoted `@`,
    // a reserved indicator). Surface it as a structured error so callers can report a
    // normal violation rather than letting the throw crash the run. The first message
    // line carries the parser's detail + "at line N, column M" within the block.
    const message =
      err instanceof Error ? (err.message.split("\n")[0] ?? err.message) : String(err);
    return { error: message };
  }
  const data =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return { data, body: text.slice(match[0].length) };
}
