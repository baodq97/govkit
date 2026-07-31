#!/usr/bin/env node
// freeze-status-edit.mjs — the deterministic block script the gate-close skill shells from a
// skill-scoped PreToolUse hook (US-0010, RFC-0032 F-freeze). It DENIES any agent Edit|Write that
// would flip a governed-doc `status:` front-matter value or an INDEX.md Status-column cell, so
// "agents author, never approve/flip status" is a block at the tool boundary rather than a
// sentence in AGENTS.md a determined agent can walk past mid-run.
//
// WHY factored this way: the decision is the PURE function `decideFreeze(input)` — no filesystem,
// no process.exit — unit-tested in-memory (same discipline as findOrphans / stopHookCommandPin in
// scripts/check-sync.mjs). The impure CLI shim (read stdin, resolve the on-disk baseline, print the
// hook JSON) is a thin wrapper guarded by `import.meta.filename === process.argv[1]`, so importing
// the module for the test has ZERO side effects.
//
// SHAPE (critical): a DENY returns the MODERN Claude Code payload
//   { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny",
//     permissionDecisionReason: <names the frozen field> } }
// and NEVER the deprecated top-level `decision`/`reason` keys — a newer Claude Code silently
// ignores the deprecated shape, which is an UNDER-block, not a no-op (HOOKS-README deprecation).
//
// DOCUMENTED GAPS (accepted, stated not hidden). This hook is DEFENCE-IN-DEPTH: the always-on Stop
// gate re-checks the whole tree, so a miss here is caught at turn-end, never shipped.
//   1. The hook matcher is Edit|Write only — a status flip driven through Bash (`sed -i ...`) or any
//      other tool is NOT intercepted (the sanctioned authoring surface is Edit/Write).
//   2. INDEX mode does not skip ``` code fences, so an INDEX.md that documents its own format with a
//      fenced EXAMPLE table carrying a Status column could OVER-block an edit to that example (the
//      safe direction — it blocks, it never lets a real flip through). govkit's INDEX.md files carry
//      no fenced example tables.
//   3. INDEX cell parsing splits on `|` and does not decode an escaped `\|` or a pipe inside inline
//      code — a Status/Title cell containing a literal pipe can misalign that row's columns. Governed
//      titles carry no unescaped pipes (a markdown-table requirement anyway).
// See US-0010 "Under-block"/Non-goals and freeze-status-edit.test.mjs (incl. the replace_all cases).
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

// ---- pure decision ---------------------------------------------------------------------------

/**
 * Decide whether a normalized PreToolUse Edit|Write would flip a frozen field.
 * @param {{ tool_name?: string, tool_input?: object, baselineText?: string | null }} input
 * @returns {null | { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: string } }}
 *   null/undefined => ALLOW (never over-block); the modern deny payload => DENY.
 */
export function decideFreeze(input) {
  const toolName = input?.tool_name;
  // The hook matcher is Edit|Write; every other tool bypasses the hook entirely (documented gap).
  if (toolName !== "Edit" && toolName !== "Write") return null;

  const toolInput = input?.tool_input ?? {};
  const filePath = toolInput.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) return null;

  const scope = classifyPath(filePath);
  if (scope === "none") return null; // non-governed / non-INDEX file — never frozen.

  const baselineText = input?.baselineText;
  if (scope === "index") return decideIndex(toolName, toolInput, baselineText);
  return decideFrontMatter(toolName, toolInput, baselineText);
}

// Governance scope is decided from file_path ALONE (per the matrix):
//   docs/**/INDEX.md      -> "index"       (Status column located by the header row)
//   other docs/** files   -> "frontmatter" (the `status:` value in the leading --- YAML block)
//   anything else         -> "none"        (ALLOW even if it contains the substring "status:")
function classifyPath(filePath) {
  const segments = filePath.split(/[\\/]/).filter(Boolean);
  if (!segments.includes("docs")) return "none";
  return segments[segments.length - 1] === "INDEX.md" ? "index" : "frontmatter";
}

// ---- front-matter mode -----------------------------------------------------------------------

function decideFrontMatter(toolName, toolInput, baselineText) {
  // A NEW-file Write (or any edit with no baseline on disk) is authoring, not a flip: nothing to
  // freeze against. Never over-block the sanctioned act of opening a doc at its start status.
  if (baselineText == null) return null;

  const proposedText = proposeText(toolName, toolInput, baselineText);
  if (typeof proposedText !== "string") return null;

  const before = frontMatterStatus(baselineText);
  const after = frontMatterStatus(proposedText);
  // Only the leading `---` YAML `status:` value is the frozen field; a `status:` in prose or inside
  // a ``` code fence is invisible to frontMatterStatus, so editing it never trips the freeze.
  if (before === undefined || after === undefined || before === after) return null;

  return deny(
    `Frozen field: the governed-doc front-matter "status:" value would change ` +
      `("${before}" -> "${after}"). Agents author, never flip status — a status advance is an ` +
      `owner ratification (RFC-0027/RFC-0032 F-freeze). Apply the flip outside an active ` +
      `gate-close run, on the owner's authorization.`,
  );
}

// The `status:` VALUE in the leading `---` front-matter block only. Returns undefined when the file
// has no leading front matter or no top-level `status:` key. CRLF-tolerant (Windows checkouts are
// first-class); the trailing YAML comment and surrounding whitespace are stripped from the value.
function frontMatterStatus(text) {
  if (typeof text !== "string") return undefined;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return undefined;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return undefined; // unterminated front matter — treat as none, never guess.
  for (let i = 1; i < end; i++) {
    const m = /^status[ \t]*:(.*)$/i.exec(lines[i]); // top-level key only (no leading indent).
    if (m) return stripYamlValue(m[1]);
  }
  return undefined;
}

// Trim, and drop a trailing YAML line comment ( whitespace + `#` ... to end ) so an unchanged value
// gaining a comment reads as unchanged. `#` NOT preceded by whitespace (e.g. a URL fragment) stays.
function stripYamlValue(raw) {
  return raw.replace(/\s+#.*$/, "").trim();
}

// ---- INDEX mode ------------------------------------------------------------------------------

function decideIndex(toolName, toolInput, baselineText) {
  if (baselineText == null) return null; // authoring a brand-new INDEX — nothing to freeze against.

  // Locate the Status column by the HEADER row, never a fixed byte offset (rows realign freely).
  const statusIdx = statusColumnIndex(baselineText);
  if (statusIdx === -1) return null; // no identifiable Status column — do not over-block.

  const proposedText = proposeText(toolName, toolInput, baselineText);
  if (typeof proposedText !== "string") return null;

  // Compare the Status cell PER ROW, keyed by the row's first (ID) cell, so a realign that only
  // moves a non-status column leaves every Status cell equal and is allowed.
  const before = statusCellsByRow(baselineText, statusIdx);
  const after = statusCellsByRow(proposedText, statusIdx);
  for (const [id, beforeStatus] of before) {
    if (after.has(id) && after.get(id) !== beforeStatus) {
      return deny(
        `Frozen field: the INDEX "Status" column cell for row ${id} would change ` +
          `("${beforeStatus}" -> "${after.get(id)}"). Agents author, never flip status — an ` +
          `INDEX Status advance is an owner ratification (RFC-0027/RFC-0032 F-freeze).`,
      );
    }
  }
  return null;
}

// Index of the Status column among a header row's cells, or -1 if no header names a Status column.
function statusColumnIndex(text) {
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!isTableRow(line)) continue;
    const idx = rowCells(line).findIndex((c) => /^status$/i.test(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Map of first-cell (ID) -> Status cell for every data row. The header row maps "ID" -> "Status"
// identically on both sides, so it never registers as a change; separator rows are skipped.
function statusCellsByRow(text, statusIdx) {
  const map = new Map();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!isTableRow(line)) continue;
    const cells = rowCells(line);
    if (isSeparatorRow(cells)) continue;
    const id = cells[0];
    if (id !== undefined) map.set(id, cells[statusIdx]);
  }
  return map;
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

// Split a `| a | b | c |` row into trimmed content cells, dropping only the empties the outer pipes
// create (interior empty cells are preserved so column offsets stay honest).
function rowCells(line) {
  let parts = line.split("|");
  if (parts.length > 0 && parts[0].trim() === "") parts = parts.slice(1);
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts = parts.slice(0, -1);
  return parts.map((p) => p.trim());
}

// ---- shared helpers --------------------------------------------------------------------------

// The proposed post-edit text: for a Write it is the whole new body; for an Edit it is the baseline
// with old_string replaced by new_string. Honours `replace_all` — a standard Edit param that arrives
// in the PreToolUse payload: when true EVERY occurrence is replaced, so a status flip cannot hide
// behind an earlier match of the same token (e.g. `replace_all` on "open" when a title reads "open"
// above `status: open`). split/join and indexOf/slice are used (not String.replace) so `$` and other
// regex specials in the replacement are inserted literally.
function proposeText(toolName, toolInput, baselineText) {
  if (toolName === "Write") return toolInput.content;
  const oldStr = toolInput.old_string;
  if (typeof oldStr !== "string" || oldStr.length === 0) return undefined;
  const newStr = typeof toolInput.new_string === "string" ? toolInput.new_string : "";
  if (!baselineText.includes(oldStr)) return baselineText; // edit does not apply — no change (ALLOW).
  if (toolInput.replace_all) return baselineText.split(oldStr).join(newStr); // every occurrence.
  const at = baselineText.indexOf(oldStr);
  return baselineText.slice(0, at) + newStr + baselineText.slice(at + oldStr.length);
}

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

// ---- impure CLI shim -------------------------------------------------------------------------

// Resolve the current on-disk text of the target file, or null when it does not exist yet (a
// NEW-file Write). Absolute paths are read directly; relative paths are resolved against
// CLAUDE_PROJECT_DIR (then the payload cwd, then process.cwd()) — whichever exists first.
function resolveBaseline(filePath, cwd) {
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  const candidates = isAbsolute(filePath)
    ? [filePath]
    : [process.env.CLAUDE_PROJECT_DIR, cwd, process.cwd()]
        .filter((base) => typeof base === "string" && base.length > 0)
        .map((base) => resolve(base, filePath));
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // Miss is expected: the file may not exist yet (new-file Write) or this path variant is wrong.
      // Fall through to the next candidate; absence resolves to null (authoring), never a crash.
    }
  }
  return null;
}

function runCli() {
  let payload;
  try {
    const raw = readFileSync(0, "utf8"); // fd 0 = stdin, delivered by Claude Code as PreToolUse JSON.
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    // Fail OPEN: a block that fires on unreadable input would wedge the agent on unrelated edits.
    // Surface the reason on stderr (no silent catch) rather than emitting a bogus deny.
    process.stderr.write(
      `freeze-status-edit: unreadable/invalid PreToolUse JSON on stdin — allowing: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
    return;
  }
  const toolInput = payload.tool_input ?? {};
  const baselineText = resolveBaseline(toolInput.file_path, payload.cwd);
  const decision = decideFreeze({
    tool_name: payload.tool_name,
    tool_input: toolInput,
    baselineText,
  });
  // Modern hook contract: print the deny JSON on stdout (exit 0); print nothing on ALLOW.
  if (decision) process.stdout.write(`${JSON.stringify(decision)}\n`);
}

// Only run the CLI when executed directly — importing the module (the test) has no side effects.
if (import.meta.filename === process.argv[1]) runCli();
