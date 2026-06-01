import { basename, isAbsolute, relative, resolve } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";
import { typeDir } from "../util";

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
  /**
   * A non-blocking reconciliation nudge (RFC-0008, item 3 — "feedback ngược sau implement").
   * Set when a write flips a doc INTO a terminal status while it carries a parent ref: the
   * moment you mark something shipped is the moment to re-read its design and confirm the doc
   * still reflects what shipped. This is single-file by construction — the hook has only the
   * content being written, not the parent doc, so it CANNOT judge chain-coherence (that is
   * `verify`'s cross-doc job); it only reminds. Never blocks.
   */
  remind?: string;
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

  const { ignore, base, types, root: docsRoot = "." } = cfg.docs;
  if (ignore.includes(basename(filePath))) return { block: false };

  for (const [typeName, def] of Object.entries(types)) {
    // RFC-0007: resolve through the SAME `typeDir` helper as every reader, so a non-`.`
    // docs.root is honored by the per-write gate too — not silently bypassed here.
    if (!isInside(typeDir(root, docsRoot, def.dir), filePath)) continue;
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
    // Governed and complete. One last, NON-blocking check: is this write flipping the doc into
    // a terminal (decided/shipped) status while it points at a parent? If so, nudge the author
    // to reconcile the parent — the proactive "feedback after implement" the CI gate delivers
    // only after the fact. Single-file: we read the parent's id from THIS doc, never load it.
    const status = String(fm.data.status ?? "").trim();
    const terminal = def.terminalStatuses ?? [];
    if (terminal.includes(status)) {
      const parents = (def.refs ?? [])
        .map((ref) => ({ key: ref.key, value: String(fm.data[ref.key] ?? "").trim() }))
        .filter((r) => r.value !== "");
      if (parents.length > 0) {
        const links = parents.map((p) => `${p.key}: ${p.value}`).join(", ");
        // RFC-0010: if THIS status also keys required as-built sections, fold that reminder in —
        // the same flip is the moment to write down what diverged. (verify enforces it; this only
        // nudges, and only on the Write path — the Edit-based flip is the inherited gap.)
        const needsAsBuilt = def.requiredSectionsByStatus?.[status];
        const asBuilt =
          needsAsBuilt && needsAsBuilt.length > 0
            ? ` Also fill its required as-built section(s) (${needsAsBuilt.join(", ")}) — ` +
              "record what diverged from the design, or affirm “None” (RFC-0010)."
            : "";
        return {
          block: false,
          remind:
            `govkit: ${basename(filePath)} is being marked '${status}' (a shipped/terminal ` +
            `state). Re-read its ${links} and confirm the design doc reflects what actually ` +
            `shipped — and that the parent is itself decided (accepted/superseded), or \`govkit ` +
            `verify\` will flag the chain (RFC-0008).${asBuilt}`,
        };
      }
    }
    return { block: false }; // governed and complete
  }
  return { block: false }; // not under any governed doc dir
}
