---
id: US-0013
title: Expose the .claude/workflows/*.js orchestrations as / slash-commands via thin wrappers that degrade to the by-hand order
status: open
owner: TBD
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As a govkit operator, I want the four orchestration workflows
(`.claude/workflows/{sdlc,ground-first,gate-loop,review-changes}.js`) to appear in the `/`
menu and be model-invocable through thin command wrappers, so that I can launch an
orchestration by name instead of remembering it is a bare script — and so that when workflows
are globally disabled the wrapper still tells me the by-hand order instead of silently doing
nothing.

## Context

This is RFC-0032 Phase 3 (F-cmd), the ergonomics tail — deliberately last and deliberately
under-specified in the RFC because it is an affordance, not a correctness fix. The four
orchestration workflows live at `.claude/workflows/*.js` and are invoked as bare scripts. They
do **not** appear in the `/` menu and are not model-invocable, so the only way to reach them
today is to know the script exists and run it directly.

Claude Code command files (frontmatter `.md` under a `commands/` directory) are the mechanism
that surfaces an action in the `/` menu and makes it model-invocable, and they support
`context: fork` (run in a forked context — already used in this repo by the `spec-red-team` and
`substance-judge` skills), `background`, and `paths:` frontmatter. This slice adds one thin
command wrapper per workflow: the wrapper carries that frontmatter, invokes the matching
`.claude/workflows/*.js` orchestration, and — when the workflow cannot run — instructs the
same by-hand order the workflow's own header already documents.

**Grounded against govkit reality, not assumed.** Every one of the four workflow files opens
with the identical `MANDATORY FALLBACK` block: workflows are research-preview, globally
disableable (`disableWorkflows` / `CLAUDE_CODE_DISABLE_WORKFLOWS=1`), and **cannot be bundled
in a plugin** (there is no `workflows` field in `plugin.json`). `sdlc.js` lines 5-11 spell out
the fallback the wrapper must mirror: drive the same order by hand — invoke the `spec-author`
skill per artifact, then fan out implementers — because `govkit verify` + the PreToolUse/Stop
hook enforce every gate regardless; the workflow is an accelerant, not the source of truth. The
command wrapper inherits that contract: it is a convenience door onto the workflow, and it must
degrade to the by-hand instructions, never fail closed into a no-op.

Because the workflows are repo-local (`.claude/workflows/`) and are **not** plugin-distributable,
the wrappers are repo-local too (`.claude/commands/`), one per workflow, pairing 1:1 with the
scripts they front. This keeps the command↔workflow mapping coherent in this repo and keeps the
slice fully additive.

`Blocked by:` none. Independent of the other RFC-0032 slices (US-0006/0007/0008/0011) — it adds
new files only and touches none of theirs, so it is parallel-safe with all of them.

`Touches:` `.claude/commands/sdlc.md` (new), `.claude/commands/ground-first.md` (new),
`.claude/commands/gate-loop.md` (new), `.claude/commands/review-changes.md` (new). NEW command
files only — fully disjoint and additive; no existing file is edited, no workflow `.js` is
modified, no status is flipped.

## Testable-or-not

**Not automated-test-backed (testable=false).** The acceptance criteria are structural and
prose: each is verified by inspecting the four new command files (frontmatter keys present, the
workflow named, the by-hand fallback text present) and, for the surfacing claim, by a live
manual check that the command appears in `/` — this repo has no command-file linter or fixture
harness to assert these, so no automated test is claimed. Honest structural review, not a test
suite, is the proof.

## Acceptance criteria

- [ ] Four new command files exist — `.claude/commands/{sdlc,ground-first,gate-loop,review-changes}.md`
      — one per workflow in `.claude/workflows/`, and no existing file is edited (the diff is
      add-only).
- [ ] Each command file carries frontmatter with at least a `description` and, where the
      orchestration warrants it, an explicit `context: fork` and/or `background` value drawn
      from Claude Code's command frontmatter set (`context`, `background`, `paths`) — no invented
      keys.
- [ ] Each command body names and invokes its matching `.claude/workflows/*.js` workflow (e.g.
      the `sdlc` command drives `sdlc.js`), so the mapping is 1:1 and unambiguous.
- [ ] Each command body contains a by-hand fallback that mirrors that workflow's own
      `MANDATORY FALLBACK` header — the ordered list of subagents/skills to dispatch when the
      workflow does not run — so a reader following the command when workflows are disabled still
      gets the correct order (for `sdlc`: `spec-author` per artifact, then fan out implementers).
- [ ] No command file introduces a new agent type or a new skill: each dispatches only the
      subagents its workflow already dispatches (`swe-flow:reviewer`, `swe-flow:implementer`,
      `swe-flow:doc-keeper`, etc.), matching the workflow's `CONSTRAINTS` note.
- [ ] No command file flips a governed-doc `status:` or assigns an owner — the wrapper is an
      orchestration accelerant, and status transitions remain a human act (AGENTS.md § Agent
      constraints); the fallback text says so.
- [ ] `bun run verify` stays green — this slice adds only command `.md` files under
      `.claude/commands/` and edits no governed doc.

## Design & risks

Low-risk (additive, new files only), but the finding names one concrete failure mode a reviewer
should attack, so it is recorded here.

**Mechanism.** A thin command wrapper is a frontmatter `.md` file whose body (a) invokes the
existing `.claude/workflows/<name>.js` and (b) documents the by-hand order to run when that
invocation is unavailable. The frontmatter (`description`, and as appropriate `context: fork` /
`background` / `paths`) is what registers the command in the `/` menu and makes it
model-invocable. Nothing about the workflow's logic is reimplemented in the wrapper — it stays
thin so there is one source of truth (the `.js`) and the wrapper cannot drift from it.

**Failure mode to attack.** The wrapper that assumes the workflow always runs. Workflows are
research-preview and can be globally disabled; a wrapper that only shells the `.js` with no
fallback becomes a silent no-op the moment `CLAUDE_CODE_DISABLE_WORKFLOWS=1` is set — worse than
no command, because the operator believes an orchestration started. A reviewer should verify
each of the four wrappers degrades to the *correct* by-hand order (matching that workflow's own
header), not a generic apology. The second failure to attack is a wrapper drifting from its
workflow's dispatch set (inventing an agent type the `.js` never uses); the AC pinning the
wrapper to the workflow's existing subagents guards against it.

**Surfacing must be verified against reality.** The claim "a workflow can be surfaced as a `/`
command" is checked live before this slice closes — command files are a supported Claude Code
surface, but the wrapper only *fronts* the workflow; it does not make a disabled workflow run.
If a live check shows a workflow-invoking command cannot be registered at all, the wrapper still
ships as the by-hand runbook in the `/` menu (the fallback is the load-bearing content), which
is the graceful-degradation posture this slice commits to either way.

## Non-goals

- Making the workflows plugin-distributable or adding a `workflows` field to any `plugin.json` —
  Claude Code has no such field (recorded in every workflow's fallback header); this slice
  surfaces the repo-local workflows only.
- Bundling the command wrappers inside `plugins/*/commands/` — the workflows they front are
  repo-local and not shipped with the plugins, so a plugin-bundled wrapper could only ever carry
  the fallback text, not invoke the workflow; keep the wrappers next to the workflows they front.
- Changing any `.claude/workflows/*.js` behaviour, phase order, or dispatch set — the wrappers
  are thin fronts; the orchestration logic stays the single source of truth in the `.js`.
- The sibling Phase 3 ergonomics findings (F3 `skills:` preload, F7 live `!npx govkit verify`
  injection, F6 "Gotchas" section) — each is its own slice; this one is only F-cmd.
