---
id: US-0010
title: F-freeze — a skill-scoped PreToolUse hook that blocks agent status edits (status front-matter + INDEX status columns)
status: done
owner: baodq97
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As a govkit maintainer, I want the gate-close skill to register a session/skill-scoped PreToolUse
hook that DENIES any agent `Edit`/`Write` which would change a `status:` front-matter value or an
INDEX status-column cell, so that "agents author, never approve/flip status" is a deterministic
block at the tool boundary instead of a sentence in `AGENTS.md` that a determined agent can walk
past mid-run.

## Context

This is RFC-0032 Phase 2 (F-freeze), the authority seam. Today the rule "agents author, never
approve/flip status" is enforced only by `AGENTS.md` prose and the honor-system ratification tiers
in `govkit.yml` — the deterministic gate (`govkit verify`) is stateless and structurally cannot see
a status transition (RFC-0012), so nothing at the tool boundary stops an agent from editing a
`status:` line directly. RFC-0032 names the fix: Claude Code supports a skill-scoped `hooks:` block
in `SKILL.md` front-matter (claude-skills.md front-matter table, `hooks` row) plus a
`${CLAUDE_SKILL_DIR}` env var (HOOKS-README) — machinery this repo already exercises elsewhere via
`context: fork` (spec-red-team, substance-judge), so it is not new ground.

The chosen direction (RFC-0032 F-freeze, "promote into always-on `settings.json`" REJECTED) is the
"/freeze" pattern: a gate skill registers a PreToolUse hook (matcher `Edit|Write`) that shells a
small deterministic node/mjs script bundled with the skill (`${CLAUDE_SKILL_DIR}`). The script
returns the MODERN block shape — `hookSpecificOutput.permissionDecision: "deny"` — NOT the
deprecated top-level `decision`/`reason` keys (HOOKS-README deprecation table); emitting the
deprecated shape risks a newer Claude Code silently ignoring the block, which is an under-block, not
a no-op.

**Host skill (resolving the finding's "gate-close and/or gate-loop").** The skill-scoped `hooks:`
block can only live in a real `SKILL.md`. `gate-loop` is a Workflow (`.claude/workflows/gate-loop.js`)
with no `SKILL.md`; `gate-close` is the physical skill (`plugins/swe-flow/skills/gate-close/SKILL.md`)
and it is the skill that invokes the gate-loop workflow. So the hook rides `gate-close`, and because
`gate-close` is the pre-flip close-out ritual, the freeze is active for exactly the window where an
agent is reasoning about flips — the window in which an incidental status Edit is most tempting and
most wrong.

**Blast radius — why agent/skill-scoped, never global.** The sanctioned act the hook must NOT block
is a HUMAN editing a status column, or the main agent applying an owner-authorized flip. The freeze
is therefore agent/skill-scoped: it is active only while the gate-close skill is running and clears
when that context ends (the next message), and it is NEVER promoted to the always-on
`settings.json` PreToolUse gate. Human override is structural, not a flag: because the hook lives in
the skill and not in `settings.json`, a human (or the main agent in a fresh turn, acting on the
owner's ratification) editing a status line OUTSIDE an active gate-close run is never intercepted. A
global PreToolUse rule would fight the very human it exists to serve — that is the rejected option.

**Testable.** Yes. The block decision is factored as a PURE function — `decideFreeze(...)` — that
takes a normalized proposed edit (tool name, tool_input, and, for a whole-file `Write` or an INDEX
row, the current on-disk text passed in by the impure CLI shim) and returns `deny`/`allow` with the
frozen field named. The pure function is unit-tested in-memory with no filesystem and no
`process.exit` (the same discipline as `findOrphans`/`stopHookCommandPin` in
`scripts/check-sync.mjs`). The impure shim (read stdin, read the baseline file for a `Write`, print
the hook JSON) stays a thin wrapper.

`Blocked by:` none. The skill-scoped-hook contract this slice relies on is a corpus fact recorded in
RFC-0032; there is no artifact dependency on the Phase 1 plugin Stop hook (that hook is
plugin/session-always-on; this one is skill-scoped and independent).

`Touches:`
- `plugins/swe-flow/skills/gate-close/freeze-status-edit.mjs` — NEW: the deterministic block script
  bundled with the skill, resolved at runtime via `${CLAUDE_SKILL_DIR}`. Exports the pure
  `decideFreeze(...)`; its CLI reads the PreToolUse payload from stdin and emits the
  `hookSpecificOutput.permissionDecision: "deny"` shape.
- `plugins/swe-flow/skills/gate-close/SKILL.md` — add a `hooks:` PreToolUse block (matcher
  `Edit|Write`) to the front-matter that shells the bundled script.
- `plugins/swe-flow/skills/gate-close/freeze-status-edit.test.mjs` — NEW: unit tests pinning the
  pure `decideFreeze(...)` function.
- `package.json` — wire the new test into the `check` chain so the gate runs it.
- `scripts/check-sync.mjs` — extend Check D's reachability guard so the skill-dir test is proven
  wired to the gate (Check D scans `scripts/` non-recursively today, so a skill-dir test would not
  otherwise be covered by the orphan guarantee). Include only if the wiring guard is extended; no
  new root↔template mirror pair is needed (plugin skills ship via the marketplace, not `template/`).

## Acceptance criteria

- [ ] `decideFreeze(...)` returns `deny` for an `Edit` whose `old_string`→`new_string` changes a
      `status:` front-matter value (e.g. `status: open` → `status: done`), naming the frozen field
      in the reason.
- [ ] `decideFreeze(...)` returns `allow` for an `Edit` to the SAME governed doc that changes a
      non-status line (e.g. a word in the Context section) while the `status:` line is byte-identical
      — no over-block just because the file contains a `status:` line.
- [ ] `decideFreeze(...)` returns `deny` for an `Edit` to `docs/**/INDEX.md` that changes the Status
      column cell of a table row (e.g. `| ... | open | ... |` → `| ... | done | ... |`), where the
      Status column is located by the header row, not by a fixed offset.
- [ ] `decideFreeze(...)` returns `allow` for an `Edit` to an `INDEX.md` row that changes only a
      non-status column (Title/Owner/Date) with the Status cell unchanged.
- [ ] `decideFreeze(...)` returns `deny` for a whole-file `Write` whose proposed content differs from
      the passed-in current text ONLY in the `status:` value; returns `allow` when the `status:` line
      is unchanged between current and proposed content.
- [ ] `decideFreeze(...)` returns `allow` for a `Write` that CREATES a new file (no current text /
      baseline absent) at the type's start status — authoring a new doc is the sanctioned act, not a
      flip.
- [ ] `decideFreeze(...)` returns `allow` for an `Edit`/`Write` to a non-governed, non-INDEX file
      (an arbitrary source file) — zero false-positive outside status lines and INDEX status cells.
- [ ] The emitted top-level hook payload is the modern shape
      `{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny",
      permissionDecisionReason: <string> } }` and contains NEITHER a top-level `decision` NOR a
      top-level `reason` key (asserted on the serialized object).
- [ ] A denied decision carries a human-readable `permissionDecisionReason` that names the specific
      frozen field (the `status:` key or the INDEX Status column) so the operator sees why the edit
      was refused.
- [ ] The new test file is executed by `bun run check` (wired via `package.json`, and — if Check D
      is extended — proven reachable-from-the-gate by `scripts/check-sync.mjs`), so a future edit
      that unwires it fails the gate.
- [ ] `gate-close/SKILL.md` front-matter carries a `hooks:` PreToolUse block whose matcher is
      `Edit|Write` and whose command resolves the bundled script through `${CLAUDE_SKILL_DIR}` (not a
      hard-coded path); the block is present ONLY in the skill, never added to
      `packages/govkit/templates/settings.default.json`.
- [ ] `bun run verify` remains green — this is plugin/authoring + script change, no governed-doc
      `status:` is flipped by this slice.

## Design & risks

MED-HIGH risk: the hook must actually BLOCK an agent status flip, and it must NOT over-block the
human/main-agent it is meant to serve. The concrete mechanism and the failure modes a reviewer
should attack:

- **Mechanism.** `gate-close/SKILL.md` gains a `hooks: { PreToolUse: [{ matcher: "Edit|Write",
  hooks: [{ type: "command", command: "node \"${CLAUDE_SKILL_DIR}/freeze-status-edit.mjs\"" }] }] }`
  block. The script reads the PreToolUse JSON from stdin; for an `Edit` it diffs `old_string` vs
  `new_string`; for a `Write` it reads the current file as the baseline and diffs `status:`; for an
  `INDEX.md` target it parses the header to find the Status column and compares that cell. The pure
  `decideFreeze(...)` decides; the shim prints `permissionDecision: "deny"` on a hit and nothing (or
  `"allow"`) otherwise.

- **Over-block (false deny) — the reviewer's first attack.** A PreToolUse hook cannot see "human vs
  agent" directly; the only scoping is that the hook is registered by the skill and clears when the
  skill context ends. So the reviewer must attack: does an ordinary edit to a governed doc that
  merely CONTAINS a `status:` line (editing prose, adding an AC) get denied? The fix is that
  `decideFreeze` keys on the actual changed `status:` value / Status cell, not on "the file is a
  governed doc". Attack every reformat that must NOT trip it: whitespace-only front-matter reflow, a
  `status:` line with a trailing comment, an INDEX table whose columns are realigned but whose Status
  cell is unchanged.

- **Sanctioned-flip interaction — the sharpest over-block.** The owner-authorized flip (RFC-0027) is
  itself an Edit to the `status:` line. The design relies on that flip landing OUTSIDE an active
  gate-close run: the skill produces the packet with the freeze active and cannot itself flip; the
  main agent applies the ratified flip in a fresh turn where the skill-scoped hook is no longer
  registered. The reviewer must attack the lifecycle claim: if the hook is still registered when the
  authorized flip is attempted, the freeze blocks the very act it is meant to permit. This is why the
  human-override / clear-on-next-message behaviour is an integration check, not a pure-function AC.

- **Under-block (bypass) — the reviewer's second attack.** A `Write` that overwrites the whole file
  changes status while `old_string` never mentions it — handled by reading the baseline for `Write`.
  But the matcher is `Edit|Write` only: a status flip driven through `Bash` (`sed -i` on the line) is
  NOT intercepted. That is an accepted limitation (the sanctioned authoring surface is `Edit`/`Write`;
  arbitrary `Bash` writes are a broader concern the always-on Stop gate already re-checks), and it
  must be RECORDED here, not silently assumed. Also attack: multiple `status:` occurrences in one
  file, a `status:` substring inside a code fence, and an INDEX row whose Status cell value happens to
  equal another column's value.

- **Blast radius / human override.** The hook is agent/skill-scoped and NEVER promoted to
  `settings.json`. A human editing a status column outside a gate-close run is structurally never
  intercepted; the override during a run is to end the skill / act in a fresh turn. Removing the
  `hooks:` block (or the skill) reverts to today's prose-only behaviour with no state migration.

## Non-goals

- Promoting the freeze into the always-on `settings.json` PreToolUse gate — rejected in RFC-0032
  (F-freeze): the freeze is agent-scoped, and a global rule would block the human editing a status
  column, which is the sanctioned act. This slice keeps the block skill-scoped and self-clearing.
- Intercepting status flips driven through `Bash`/`MultiEdit` or any tool outside the `Edit|Write`
  matcher — the sanctioned authoring surface is `Edit`/`Write`; broader tool coverage is out of scope
  and the gap is recorded above, not hidden.
- Enforcing the freeze inside a consumer's own repo via the `govkit` CLI — this is plugin/skill
  authoring for the swe-flow surface, not a consumer-facing `govkit` subcommand.
- Structuring the owner-decision points as `AskUserQuestion` — that is F9's slice (also RFC-0032
  Phase 2), separate from this freeze.
