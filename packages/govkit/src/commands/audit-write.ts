import { existsSync } from "node:fs";
import { basename } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { isParseError, parseFrontMatter } from "../frontmatter";
import { effectiveRequired, governedTypeOf } from "../util";

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

  // RFC-0007: ONE resolver, the single-path dual of the walk every reader uses. It applies
  // docs.root, the ignore list AND the type's `recursive` flag together, so the hook cannot
  // claim a path the gate reports as ungoverned — a flat type governs its direct children, not
  // its whole subtree. The basename/ignore early-out that used to live here is part of that
  // one rule now, rather than a second copy of it.
  const governed = governedTypeOf(root, cfg, filePath);
  if (!governed) return { block: false }; // not under any governed doc dir
  const { type: typeName, def } = governed;

  // Shared with verify + adopt: the write-time hook must not block for a key the CI gate
  // deliberately exempts via `excludeBase` (it used to).
  const required = effectiveRequired(cfg.docs.base, def);
  const start = def.startStatus ?? "(see docs/AGENTS.md)";
  const fm = parseFrontMatter(content);
  if (!fm) {
    return {
      block: true,
      reason: `govkit: ${basename(filePath)} (${typeName}) is missing its YAML front-matter block.`,
      context: `Governed docs under ${def.dir} must open with a \`---\` block carrying: ${required.join(", ")}. Set owner: TBD (agents never self-assign) and status: ${start} for a new ${typeName}.`,
    };
  }
  // Present but unparseable (US-0002): block with the parser's message, not a thrown stack
  // trace — the same violation shape the verify gate emits for this doc.
  if (isParseError(fm)) {
    return {
      block: true,
      reason: `govkit: ${basename(filePath)} (${typeName}) has invalid YAML front-matter: ${fm.error}`,
      context: `Fix the \`---\` block so it parses (e.g. quote a value beginning with a reserved character like \`@\`: owner: "@handle"). Required keys: ${required.join(", ")}.`,
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
  // RFC-0024: born-at-non-startStatus provenance nudge. A Write that CREATES a governed doc (no
  // file on disk yet) at a status other than its type's startStatus skipped the draft→accept
  // provenance — agents author a new doc at startStatus; a human owner flips it forward in a
  // separate accept. Non-blocking BY DESIGN: provenance is honor-system (RFC-0012), the hook
  // sees only full Writes (not Edits/Bash), so this is a courtesy nudge, never a gate. An
  // overwrite (file exists) is left alone — that is an edit whose status TRANSITION a stateless
  // hook cannot judge; verify and the human own it. Guarded on startStatus so a status-less
  // type (e.g. an excludeBase runbook) never trips it.
  if (def.startStatus && status && status !== def.startStatus && !existsSync(filePath)) {
    return {
      block: false,
      remind:
        `govkit: ${basename(filePath)} is being created at status '${status}', not the start ` +
        `status '${def.startStatus}'. A new ${typeName} is authored at '${def.startStatus}'; a ` +
        `human owner flips it forward in a separate accept — status provenance is not ` +
        `gate-enforced (RFC-0012). Confirm this was authorized.`,
    };
  }
  return { block: false }; // governed and complete
}
