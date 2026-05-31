import { basename, isAbsolute, relative, resolve } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";

// The JSON a PreToolUse hook receives on stdin (Claude Code 2.1.x). Only the
// fields this gate uses are typed; the rest is ignored.
export interface HookInput {
  tool_name?: string;
  tool_input?: { file_path?: string; content?: string; new_string?: string };
  cwd?: string;
  hook_event_name?: string;
}

export interface AuditDecision {
  block: boolean;
  reason?: string;
  context?: string;
}

function isInside(dir: string, file: string): boolean {
  const rel = relative(resolve(dir), resolve(file));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

// Per-write governance gate, the interactive twin of `govkit verify`. Governs
// only full-content Writes to a governed doc dir; Edits carry partial content
// (new_string) so they defer to CI's full `govkit verify`. Any uncertainty
// (non-Write, non-doc, no govkit.yml, unparseable input) DEFERS — the gate only
// ever BLOCKS a clearly-bad write, never auto-approves and never crash-blocks.
export function auditWrite(input: HookInput, root: string, config?: GovkitConfig): AuditDecision {
  if (input.tool_name !== "Write") return { block: false };
  const filePath = input.tool_input?.file_path;
  const content = input.tool_input?.content;
  if (typeof filePath !== "string" || typeof content !== "string") return { block: false };
  if (!filePath.endsWith(".md")) return { block: false };

  let cfg: GovkitConfig;
  try {
    cfg = config ?? loadConfig(root);
  } catch {
    // No govkit.yml = repo not governed by govkit; defer to the normal flow.
    return { block: false };
  }

  const { ignore, base, types } = cfg.docs;
  if (ignore.includes(basename(filePath))) return { block: false };

  for (const [typeName, def] of Object.entries(types)) {
    if (!isInside(resolve(root, def.dir), filePath)) continue;
    const required = [...new Set([...base.required, ...def.required])];
    const start = def.startStatus ?? "(see docs/AGENTS.md)";
    const fm = parseFrontMatter(content);
    if (!fm) {
      return {
        block: true,
        reason: `govkit: ${basename(filePath)} (${typeName}) is missing its YAML front-matter block.`,
        context: `Governed docs under ${def.dir} must open with a \`---\` block carrying: ${required.join(", ")}. Set owner: TBD (agents never self-assign) and status: ${start} for a new ${typeName}.`,
      };
    }
    const missing = required.filter((key) => {
      const value = fm.data[key];
      return value === undefined || value === null || String(value).trim() === "";
    });
    if (missing.length > 0) {
      return {
        block: true,
        reason: `govkit: ${basename(filePath)} (${typeName}) is missing required front-matter: ${missing.join(", ")}.`,
        context: `Add the missing key(s) before writing. Type '${typeName}' requires: ${required.join(", ")}; start status: ${start}; owner: TBD.`,
      };
    }
    return { block: false }; // governed and complete
  }
  return { block: false }; // not under any governed doc dir
}
