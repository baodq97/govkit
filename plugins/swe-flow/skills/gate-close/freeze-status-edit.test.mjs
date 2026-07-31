// RED test for US-0010 (RFC-0032 F-freeze). Pins the not-yet-implemented pure function
// `decideFreeze` that the skill-scoped PreToolUse hook shells to decide whether a proposed
// Edit|Write would flip a governed-doc `status:` or an INDEX Status-column cell.
//
// The implementer creates ./freeze-status-edit.mjs and `export function decideFreeze(input)`.
// This file only pins behaviour — it must NOT be satisfied by any change here; it goes green only
// when the module exists and the matrix below holds. Runs fully in-memory: no filesystem, no
// process.exit (same discipline as findOrphans / stopHookCommandPin in scripts/check-sync.mjs).
//
// ============================================================================================
// INPUT-SHAPE CONTRACT (decideFreeze(input)) — the implementer MUST match this exactly.
// ============================================================================================
// `input` is the normalized PreToolUse payload PLUS the on-disk baseline the impure CLI shim
// reads before calling. The minimal shape that lets the whole matrix be decided:
//
//   {
//     tool_name: "Edit" | "Write" | <other>,   // hook matcher is Edit|Write; other tools => ALLOW
//     tool_input: {
//       file_path: string,          // repo-relative (or absolute) path of the target file
//       // Edit only:
//       old_string?: string,        // the exact text being replaced
//       new_string?: string,        // its replacement
//       // Write only:
//       content?: string,           // the whole proposed file body
//     },
//     baselineText: string | null,  // current on-disk text of file_path, ALWAYS supplied by the
//                                   // shim when the file exists (used to locate the INDEX header
//                                   // row and to diff a whole-file Write); null/undefined when the
//                                   // file does not yet exist (a NEW-file Write).
//   }
//
// RETURN:
//   * ALLOW  -> null (or undefined). Never over-block.
//   * DENY   -> the MODERN Claude Code hook payload, and ONLY the modern shape:
//         {
//           hookSpecificOutput: {
//             hookEventName: "PreToolUse",
//             permissionDecision: "deny",
//             permissionDecisionReason: <string that NAMES the frozen field>,
//           }
//         }
//     It MUST NOT carry a top-level `decision` or `reason` key — the deprecated shape a newer
//     Claude Code silently ignores, which would be an UNDER-block, not a no-op.
//
// GOVERNANCE / SCOPE (decided from file_path alone, per the matrix):
//   * `docs/**/INDEX.md`          -> INDEX mode: locate the Status column by the HEADER row (never
//                                    a fixed byte offset) and compare that cell.
//   * other governed docs under `docs/**` -> front-matter mode: compare the `status:` VALUE in the
//                                    leading `---` YAML block only (a `status:` in prose or inside a
//                                    ``` code fence is NOT the frozen field).
//   * anything else               -> ALLOW: non-governed / non-INDEX files are never frozen, even
//                                    when they happen to contain the substring "status:".
//
// SKILL-SCOPED, not global: the `hooks:` block lives ONLY in gate-close/SKILL.md front-matter and
// shells this script via ${CLAUDE_SKILL_DIR}; it is NEVER added to settings.default.json. The freeze
// is active only for the gate-close run and clears on the next message, so an owner-authorized flip
// applied OUTSIDE an active run is not intercepted (an integration property, not a decideFreeze AC).
//
// DOCUMENTED GAP (accepted, stated not hidden): a status flip driven through Bash (`sed -i ...`) or
// any tool outside the Edit|Write matcher bypasses this hook entirely — see the final test.
// ============================================================================================

import assert from "node:assert/strict";
import { test } from "node:test";
import { decideFreeze } from "./freeze-status-edit.mjs";

// ---- fixtures -------------------------------------------------------------------------------

const GOVERNED = "docs/rfc/RFC-0032-freeze-authority-seam.md";
const INDEX = "docs/issues/INDEX.md";
const SOURCE = "plugins/swe-flow/skills/gate-close/freeze-status-edit.mjs";
const NONGOV_YAML = "config/app.yaml"; // non-governed, deliberately contains a `status:` line

const governedDoc = (status, body = "Some context prose with no front-matter markers.") =>
  `---\nid: RFC-0032\ntitle: F-freeze\nstatus: ${status}\nowner: TBD\ndate: 2026-07-31\n---\n\n# F-freeze\n\n${body}\n`;

const indexDoc = (rows) =>
  `# Issue Index\n\n| ID | Title | Status | Owner | Date |\n|---|---|---|---|---|\n${rows.join("\n")}\n`;

const ROW_US0010 = "| [US-0010](./US-0010-x.md) | F-freeze | open | TBD | 2026-07-31 |";
const ROW_US0011 = "| [US-0011](./US-0011-x.md) | AskUser | done | baodq97 | 2026-07-31 |";
// A row where Title, Status, Owner and Date ALL equal "open" — forces column-by-header, not
// value-matching, when deciding which cell is the Status cell.
const ROW_AMBIG = "| [US-0099](./US-0099-x.md) | open | open | open | open |";

// ---- assertion helpers ----------------------------------------------------------------------

function assertAllow(result) {
  assert.ok(
    result === null || result === undefined,
    `expected ALLOW (null/undefined), got ${JSON.stringify(result)}`,
  );
}

function assertModernDeny(result, fieldRe) {
  assert.ok(result && typeof result === "object", "DENY must return a payload object");
  // Modern shape ONLY: the deprecated top-level keys must be absent (asserted on the object AND on
  // its serialized round-trip, per the AC).
  assert.ok(!("decision" in result), "DENY must NOT carry a deprecated top-level `decision` key");
  assert.ok(!("reason" in result), "DENY must NOT carry a deprecated top-level `reason` key");
  const hso = result.hookSpecificOutput;
  assert.ok(hso && typeof hso === "object", "DENY must carry hookSpecificOutput");
  assert.equal(hso.hookEventName, "PreToolUse");
  assert.equal(hso.permissionDecision, "deny");
  assert.equal(typeof hso.permissionDecisionReason, "string");
  assert.match(hso.permissionDecisionReason, fieldRe, "reason must NAME the frozen field");
  const serialized = JSON.parse(JSON.stringify(result));
  assert.ok(!("decision" in serialized), "serialized DENY must NOT contain `decision`");
  assert.ok(!("reason" in serialized), "serialized DENY must NOT contain `reason`");
  assert.deepEqual(serialized, result, "payload must survive JSON round-trip unchanged");
}

// ================================ DENY rows ==================================================

// DENY (1): an Edit that changes a status: front-matter VALUE in a governed doc.
test("DENY (1): Edit changes the status: front-matter value in a governed doc", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "status: open",
      new_string: "status: implemented",
    },
    baselineText: governedDoc("open"),
  });
  assertModernDeny(result, /status/i);
});

// DENY (2): an Edit that changes an INDEX.md Status-column CELL (column found via the header row).
test("DENY (2): Edit changes an INDEX Status-column cell (column located by header, not offset)", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: INDEX,
      old_string: ROW_US0010,
      new_string: "| [US-0010](./US-0010-x.md) | F-freeze | done | TBD | 2026-07-31 |",
    },
    baselineText: indexDoc([ROW_US0010, ROW_US0011]),
  });
  assertModernDeny(result, /status/i);
});

// DENY (3): a whole-file Write whose ONLY difference from the on-disk baseline is the status: line.
test("DENY (3): whole-file Write whose only diff from baseline is the status: line", () => {
  const result = decideFreeze({
    tool_name: "Write",
    tool_input: { file_path: GOVERNED, content: governedDoc("done") },
    baselineText: governedDoc("open"),
  });
  assertModernDeny(result, /status/i);
});

// ================================ ALLOW rows (must NOT over-block) ============================

// ALLOW (a): a non-status edit to a doc that merely CONTAINS a status: line.
test("ALLOW (a): non-status edit to a governed doc that merely contains a status: line", () => {
  const baselineText = governedDoc("open", "The original context prose.");
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "The original context prose.",
      new_string: "The revised context prose with more detail.",
    },
    baselineText,
  });
  assertAllow(result);
});

// ALLOW (b): whitespace/front-matter reflow with an UNCHANGED status value.
test("ALLOW (b): front-matter whitespace reflow with an unchanged status value", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: { file_path: GOVERNED, old_string: "status: open", new_string: "status:   open" },
    baselineText: governedDoc("open"),
  });
  assertAllow(result);
});

// ALLOW (c): a status: line gaining a trailing comment, value unchanged.
test("ALLOW (c): status: line with a trailing comment, value unchanged", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "status: open",
      new_string: "status: open  # unchanged, just annotated",
    },
    baselineText: governedDoc("open"),
  });
  assertAllow(result);
});

// ALLOW (d): an INDEX realign whose Status cell is unchanged (a non-status column moves).
test("ALLOW (d): INDEX row edit that changes a non-status column, Status cell unchanged", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: INDEX,
      old_string: ROW_US0010,
      new_string: "| [US-0010](./US-0010-x.md) | F-freeze | open | baodq97 | 2026-07-31 |",
    },
    baselineText: indexDoc([ROW_US0010, ROW_US0011]),
  });
  assertAllow(result);
});

// ALLOW (e): a NEW-file Write at the type's start status (no baseline on disk).
test("ALLOW (e): NEW-file Write at the start status (baseline absent)", () => {
  const result = decideFreeze({
    tool_name: "Write",
    tool_input: { file_path: GOVERNED, content: governedDoc("open") },
    baselineText: null,
  });
  assertAllow(result);
});

// ALLOW (f): ANY non-governed, non-INDEX file — an arbitrary source file.
test("ALLOW (f): Edit to a non-governed, non-INDEX source file", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: SOURCE,
      old_string: "const start = 1;",
      new_string: "const start = 2;",
    },
    baselineText: "const start = 1;\n",
  });
  assertAllow(result);
});

// ALLOW (f, sharper): a real status: value change in a NON-governed file — proves the freeze gates
// on the governed path, not merely on the substring "status:".
test("ALLOW (f): a status: value change in a NON-governed file is not frozen", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: NONGOV_YAML,
      old_string: "status: open",
      new_string: "status: closed",
    },
    baselineText: "service: api\nstatus: open\n",
  });
  assertAllow(result);
});

// ALLOW (Write, unchanged status): a whole-file Write that rewrites prose but leaves status: alone.
test("ALLOW: whole-file Write that changes prose but leaves the status: line unchanged", () => {
  const result = decideFreeze({
    tool_name: "Write",
    tool_input: {
      file_path: GOVERNED,
      content: governedDoc("open", "New prose; status untouched."),
    },
    baselineText: governedDoc("open", "Old prose."),
  });
  assertAllow(result);
});

// ================================ EDGE CASES ================================================

// Multiple status: occurrences — changing a NON-front-matter one is allowed.
test("EDGE: multiple status: occurrences — editing the prose occurrence is allowed", () => {
  const baselineText = governedDoc(
    "open",
    "Historically the status: draft label was misused here.",
  );
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "the status: draft label",
      new_string: "the status: rejected label",
    },
    baselineText,
  });
  assertAllow(result);
});

// Multiple status: occurrences — changing the FRONT-MATTER one still denies.
test("EDGE: multiple status: occurrences — editing the front-matter one still denies", () => {
  const baselineText = governedDoc(
    "open",
    "Historically the status: draft label was misused here.",
  );
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: { file_path: GOVERNED, old_string: "status: open", new_string: "status: done" },
    baselineText,
  });
  assertModernDeny(result, /status/i);
});

// A status: inside a code fence must not trip the freeze.
test("EDGE: a status: change inside a code fence does not trip the freeze", () => {
  const fenced = "Example front-matter:\n\n```yaml\nstatus: open\n```\n";
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "```yaml\nstatus: open\n```",
      new_string: "```yaml\nstatus: done\n```",
    },
    baselineText: governedDoc("open", fenced),
  });
  assertAllow(result);
});

// An INDEX cell whose value equals another column's value — changing a NON-status cell is allowed.
test("EDGE: INDEX row where Status equals another column — editing the Title cell is allowed", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: INDEX,
      old_string: ROW_AMBIG,
      new_string: "| [US-0099](./US-0099-x.md) | opened | open | open | open |",
    },
    baselineText: indexDoc([ROW_AMBIG]),
  });
  assertAllow(result);
});

// ...and changing the Status cell of that same ambiguous row still denies (column by header index).
test("EDGE: INDEX row where Status equals another column — editing the Status cell denies", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: INDEX,
      old_string: ROW_AMBIG,
      new_string: "| [US-0099](./US-0099-x.md) | open | done | open | open |",
    },
    baselineText: indexDoc([ROW_AMBIG]),
  });
  assertModernDeny(result, /status/i);
});

// A governed doc with no status change, edited elsewhere (an AC line) — allowed.
test("EDGE: governed doc with no status change, edited elsewhere, is allowed", () => {
  const baselineText = governedDoc("open", "Acceptance criteria: the gate stays green.");
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "Acceptance criteria: the gate stays green.",
      new_string: "Acceptance criteria: the gate stays green and fast.",
    },
    baselineText,
  });
  assertAllow(result);
});

// ================================ DOCUMENTED GAP ============================================

// A status flip driven through Bash (or any tool outside the Edit|Write matcher) is NOT intercepted.
// The hook never fires for such tools, so the pure function treats them as out of scope -> ALLOW.
// This is an ACCEPTED, STATED limitation (US-0010 "Under-block" + Non-goals), not a defect — the
// always-on Stop gate re-checks the tree. Pinned here so the gap is visible, never silently assumed.
test("DOCUMENTED GAP: a Bash sed status flip is NOT intercepted (accepted bypass)", () => {
  const result = decideFreeze({
    tool_name: "Bash",
    tool_input: { command: "sed -i 's/status: open/status: done/' docs/rfc/RFC-0032-x.md" },
    baselineText: null,
  });
  assertAllow(result);
});

// ================================ replace_all under-block ======================================
// A replace_all Edit is the sharpest under-block: a status flip can hide behind an EARLIER match of
// the same token. `replace_all` is a standard Edit param delivered in the PreToolUse payload, and the
// matcher (Edit|Write) explicitly covers it — modelling only the first occurrence would ALLOW the
// real flip. These pin that every occurrence is modelled, in BOTH front-matter and INDEX modes.

// DENY: replace_all "open"->"done" where a front-matter field ABOVE status: also reads "open".
test("DENY: replace_all Edit flips status: even when an earlier field matches the same token", () => {
  const baseline = `---\nid: RFC-0032\ntitle: open\nstatus: open\nowner: TBD\ndate: 2026-07-31\n---\n\n# x\n`;
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: { file_path: GOVERNED, old_string: "open", new_string: "done", replace_all: true },
    baselineText: baseline,
  });
  assertModernDeny(result, /status/i);
});

// DENY: replace_all on an INDEX where an earlier (Title) cell shares the flipped token.
test("DENY: replace_all Edit flips an INDEX Status cell hidden behind a matching Title cell", () => {
  const row = "| [US-0010](./US-0010-x.md) | open task | open | TBD | 2026-07-31 |";
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: { file_path: INDEX, old_string: "open", new_string: "done", replace_all: true },
    baselineText: indexDoc([row]),
  });
  assertModernDeny(result, /status/i);
});

// ALLOW: replace_all that does NOT touch any status value stays allowed (no over-block).
test("ALLOW: replace_all Edit that changes only a non-status token is allowed", () => {
  const result = decideFreeze({
    tool_name: "Edit",
    tool_input: {
      file_path: GOVERNED,
      old_string: "F-freeze",
      new_string: "F-thaw",
      replace_all: true,
    },
    baselineText: governedDoc("open", "F-freeze body mentions F-freeze twice."),
  });
  assertAllow(result);
});
