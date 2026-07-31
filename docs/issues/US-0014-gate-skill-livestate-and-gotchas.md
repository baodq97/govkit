---
id: US-0014
title: F7 + F6 — inject live gate-verify state into the gate-close skill, and add LEARNING-LOOP-seeded Gotchas sections to the gate + spec-author skills
status: done
owner: baodq97
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As a govkit maintainer running the gate-close ritual, I want the gate-close skill to open from the
repo's REAL current gate verdict (injected live at invocation) and I want the gate and authoring
skills to carry a "Gotchas" section drawn from the escapes we have actually logged, so that the
agent reasons from ground truth instead of a reconstructed guess, and the recurring gate-failure
modes we keep re-learning are written down where the operator meets them instead of re-discovered
one escape at a time.

## Context

This is RFC-0032 Phase 3 (F7 + F6), the ergonomics band — deliberately last and deliberately
under-specified in the RFC ("these are affordances, not correctness"). Two findings are **combined
into one slice** because both are prose/front-matter edits to the same gate-skill SKILL.md files;
splitting them would produce two slices that each edit `gate-close/SKILL.md`, which by
work-breakdown's own rule (any touched-file overlap → merge or serialize) is not parallel-safe with
each other. Merging is the correct call, not a shortcut.

- **F7 — live gate state.** Today `gate-close/SKILL.md` tells the agent to reconstruct the gate
  picture by reading `package.json` for `verifyCmd` and invoking the `gate-loop` workflow, then
  interpreting the returned packet. The gate skill never sees the actual current verdict until it
  runs the workflow. The RFC direction (F7 row of the finding table, §"F-cmd / F7 / F6") is to
  inject live ground-truth at invocation via a `!`-prefixed command block that runs a **read-only**
  `npx govkit verify --json` (the repo's real verify), so the skill body opens from the real gate
  state rather than a reconstruction.

- **F6 — Gotchas.** A "Gotchas" section is the highest-signal skill content (Thariq): the failure
  modes a practitioner hits, written where they are hit. `LEARNING-LOOP.md` is govkit's own escape
  log — 24 rounds of recorded gate escapes. This slice seeds a `## Gotchas` section into the gate +
  authoring skills from that log, capturing the recurring classes the finding names — **front-matter
  drift**, **status-flip mistakes**, **premature drift-ack** — each traced to the round that
  recorded it, so the distiller can extend them going forward.

**Correction to the finding's tentative pointer (`{gate-close,gate-loop,spec-author}/SKILL.md`).**
There is no `gate-loop/SKILL.md`. `gate-loop` is a deterministic Node workflow at
`.claude/workflows/gate-loop.js` (also `template/.claude/workflows/gate-loop.js`) that assembles and
logs the packet and flips nothing. It has no `SKILL.md`, and both mechanisms here are SKILL-file
features a workflow cannot carry: a `!command` live-state block is injected into a skill/command
prompt at load, and a Gotchas section is agent-facing SKILL prose. So F7 lands **only** in
`gate-close/SKILL.md` (the physical gate skill that invokes the workflow), and Gotchas lands in
`gate-close/SKILL.md` + `spec-author/SKILL.md`. `gate-loop.js` is out of scope. (This is the same
skill-vs-workflow correction US-0011 made for the ratification prompt.)

**F7 scope note — why not spec-author too.** `spec-author/SKILL.md` already runs `npx govkit verify`
as an explicit, in-process step (§Process step 6). A `!command` pre-injection there would show a
verdict measured before the artifact is even written, so it adds noise, not signal. F7's live-state
injection is scoped to `gate-close` alone; `spec-author` gets only the Gotchas section (F6).

**Sequencing / overlap — MUST be flagged (work-breakdown: any overlap → not parallel-safe).**

- `gate-close/SKILL.md` is a **three-way** collision: US-0010 (F-freeze — adds a `hooks:` block to
  the front-matter), US-0011 (F9 — the `AskUserQuestion` ratification prompt in `## Acting on the
  packet`), and this slice (F7 `!command`/`allowed-tools` front-matter + F6 Gotchas prose). Three
  slices editing one file are not parallel-safe — they land one-at-a-time, each rebasing on the
  prior, OR merge into a single gate-close editing pass at integration. This slice's front-matter
  edit (F7) and US-0010's front-matter edit (F-freeze `hooks:`) touch the SAME region — the skill's
  front-matter block — so their collision is sharper than the prose edits and must be merged with
  care, not blind-rebased.
- `spec-author/SKILL.md` is a **two-way** collision: US-0011 (artifact-type pick, `## Picking the
  type` / step 2 region) and this slice (F6 Gotchas, a new trailing section). Disjoint regions, so a
  rebase is cheap — but the shared file is still not parallel-safe and the collision is surfaced,
  not folded silently.

`Blocked by:` none in artifact terms — no upstream slice must ship first. Soft ordering only: this
is Phase 3 ergonomics, RFC-0032 puts it last, after the Phase 0/1 correctness slices
(US-0006/US-0007/US-0008, done) and Phase 2 (US-0010/US-0011). The only real constraint is the
same-file serialization on `gate-close/SKILL.md` and `spec-author/SKILL.md` stated above.

**Touches:**
- `plugins/swe-flow/skills/gate-close/SKILL.md` — F7: add a `!`-prefixed live-state block that runs
  read-only `npx govkit verify --json` at invocation, plus the front-matter declaration the
  `!command` contract requires (an `allowed-tools` / shell entry scoped to that one read-only
  command). F6: add a `## Gotchas` section seeded from `LEARNING-LOOP.md`.
- `plugins/swe-flow/skills/spec-author/SKILL.md` — F6 only: add a `## Gotchas` section seeded from
  `LEARNING-LOOP.md` (authoring-side escapes). No F7 here (it already self-validates in-process).
- Reads (does not modify): `LEARNING-LOOP.md` as the seed source for both Gotchas sections;
  RFC-0032's pinned Claude Code contract corpus as the source of truth for the exact `!command`
  front-matter shape.
- **NOT touched:** `.claude/workflows/gate-loop.js` (a deterministic workflow — no `SKILL.md`,
  cannot carry a `!command` block or agent-facing Gotchas prose); there is no `gate-loop/SKILL.md`.

## Testable? No — structural, verified by inspection and one manual run.

This slice edits only SKILL.md front-matter and body prose; it ships no code and no unit or
integration test wired into `bun run check`. `govkit verify` scores governed docs and `skill-lint`
lints skill *surface* metadata (name, description, char budget, trigger-shape) — neither asserts the
`!command` block, the `allowed-tools` scope, or the Gotchas prose these edits add. So every
acceptance criterion below is verified by **reading the two edited SKILL.md files**, plus **one
manual execution** of the injected `!command` to confirm it exits clean and read-only (the mitigation
for the MED risk that a bad `!command` errors at skill load). The automated check here is only the
negative one: `bun run check` stays green because no governed doc and no surface metadata that the
lint asserts on has changed in a way that trips a rule.

## Acceptance criteria

- [ ] `gate-close/SKILL.md` gains a `!`-prefixed live-state block that runs a **read-only** verify —
      `npx govkit verify --json` (the repo's real verify command) — injected at skill invocation, so
      the skill body opens from the actual current gate verdict instead of instructing the agent to
      reconstruct it. The command performs no write, no status flip, no network mutation.
- [x] **No `allowed-tools` grant is added (reconciled during implementation).** A SKILL.md
      `!command` body block is a documented preprocessing feature — it executes at load, BEFORE
      Claude sees the content, and requires no tool grant (confirmed against
      code.claude.com/docs/en/skills, via claude-code-guide). Adding an `allowed-tools` key would be
      the exact exclusive-allowlist footgun RFC-0032 F3 cites: a tool left off is silently
      unavailable. So gate-close deliberately adds NONE and keeps its inherited
      `Workflow`/`Read`/`Edit`/`Bash` toolset. (This supersedes the original two criteria that
      mandated a scoped `allowed-tools` entry — the body `!command` makes it unnecessary and unsafe.)
- [ ] The live-state block **degrades gracefully at load**: in a repo where `npx govkit` is
      unresolved or `govkit.yml` is absent, the injected command does not hard-error the skill load —
      the fallback (skill still loads; the agent falls back to running the gate-loop workflow, as it
      does today) is documented in the skill next to the block. Verified by one manual run in a repo
      without govkit installed.
- [ ] `gate-close/SKILL.md` gains a `## Gotchas` section seeded from `LEARNING-LOOP.md` that captures
      at least the three recurring gate-close failure modes the finding names, each citing its
      LEARNING-LOOP round: (a) **status-flip mistakes** — acting on an unchecked or red gate (a
      merge/flip is an act-on-green like any other, Round 22; a captured-but-unchecked exit code is
      as good as no gate, Round 17 F9); (b) **premature drift-ack** — a green over UNSTAGED edits
      certifies the *previous* state, so stage first or re-run after landing (Round 23), and a
      commit-sha ack is orphaned by squash (Round 1 addendum); (c) **front-matter / INDEX-status
      drift** between the doc and its INDEX row.
- [ ] `spec-author/SKILL.md` gains a `## Gotchas` section seeded from `LEARNING-LOOP.md` capturing the
      authoring-side recurring escapes: writing an advanced `status:` instead of the type's start
      status, a doc↔INDEX status/front-matter drift that fails verify, and inventing acceptance
      criteria or decisions the design source never states. Each gotcha traces to its source.
- [ ] Every gotcha is **attributed to its LEARNING-LOOP source** (round / lesson id) so a reader can
      trace it to a real escape, and the US records that the distiller (`distill-learnings` / the
      DISTILL step, RFC-0017) is the mechanism that extends these sections going forward — Gotchas are
      seeded here, not frozen here.
- [ ] The slice records which skills receive a Gotchas section in this pass — **`gate-close` and
      `spec-author`** — and states explicitly that `gate-loop` does NOT (it is a Node workflow with no
      `SKILL.md`), so a later reader does not mistake the omission for a miss.
- [ ] `.claude/workflows/gate-loop.js` is unchanged, and no `gate-loop/SKILL.md` is created — F7's
      `!command` and F6's Gotchas are skill-file features a deterministic workflow cannot host.
- [ ] `bun run check` stays green: no governed doc changed, and the `skill-lint` surface rules
      (name / description / char budget / trigger-shape) still pass with the added `allowed-tools`
      front-matter and Gotchas prose. `bun run verify` remains green — this is plugin/skill authoring,
      no governed-doc `status:` is flipped.

## Design & risks

**MED RISK** — a bad `!command` can error at skill load, and an `allowed-tools` declaration can
silently narrow the skill's own tool set. Prose-only for F6, but F7 touches executable front-matter,
so the concrete mechanism and the failure modes a reviewer should attack:

- **Mechanism (F7).** `gate-close/SKILL.md` gains a `!`-prefixed block that Claude Code executes at
  skill load and injects the output of `npx govkit verify --json` into the skill's opening context,
  plus the front-matter permission the `!command` contract requires (an `allowed-tools` / shell entry
  scoped to that read-only verify). The exact front-matter key/shape is pinned against RFC-0032's
  version-pinned Claude Code contract corpus before writing it — getting the key wrong is itself the
  load-error failure mode below, so this is verified, not assumed (the same "confirm the contract
  first" discipline US-0008/US-0010 applied to their hook contracts).

- **Load-error (the finding's named MED risk) — the reviewer's first attack.** The `!command` runs on
  EVERY gate-close invocation. If it errors — `govkit` unresolved on PATH, `govkit.yml` absent, a
  non-zero verify exit surfaced as a load failure, or a slow/hanging invocation — the skill can fail
  to load or open with a misleading injected error. The mechanism must be a read-only command that
  fails soft: the skill still loads and the agent falls back to the workflow path. Attack: run the
  skill in a repo with no `govkit.yml`, in a repo where `npx govkit` is not installed, and against a
  repo whose gate is currently RED (a real BLOCK is DATA the skill should show, not a load crash).

- **Allowlist narrowing — the second attack.** `gate-close` today declares NO `allowed-tools`, so it
  inherits all tools (it invokes `Workflow`, `Read`, `Edit`, `Bash`). Adding `allowed-tools` for the
  `!command` converts it to an **exclusive** allowlist (RFC-0032 F3 preload seam: "Comma-separated
  allowlist … Inherits all tools if omitted"). A narrow `allowed-tools: Bash(npx govkit verify:*)`
  would strip the skill of `Workflow`/`Read`/`Edit` and break the very ritual it exists to run.
  Attack: confirm the skill can still dispatch the gate-loop workflow and land the accept commits
  after the front-matter edit.

- **Stale-at-load trust — the third attack.** The injected verdict is measured at skill LOAD; the
  working tree can move before the flip. Trusting the injected green as ground truth at flip time is
  exactly the Round-23 escape (a green over unstaged edits is about the previous state). The Gotchas
  section must itself carry this caution, and the live block is framed as an OPENING read, not a
  substitute for the packet's post-integration full-gate re-run.

- **Gotchas drift — the fourth attack.** A hand-maintained Gotchas section drifts from `LEARNING-LOOP.md`
  as new rounds land (the single-source lesson, Round 17 F3). Mitigation recorded, not built: each
  gotcha cites its round so drift is auditable, and the distiller (`distill-learnings`) is named as
  the forward-feeding mechanism — this slice seeds the section, it does not promise to keep it live by
  hand.

- **Rollback.** Both edits are additive authoring metadata/prose: delete the `!command` block +
  `allowed-tools` entry and the two `## Gotchas` sections to return to today's behaviour, with no
  state migration.

## Non-goals

- Injecting live state into `spec-author/SKILL.md` — it already runs `npx govkit verify` in-process
  (§Process step 6); a pre-write `!command` there measures a verdict before the artifact exists. F7
  is scoped to `gate-close` alone.
- Editing `.claude/workflows/gate-loop.js` or creating a `gate-loop/SKILL.md` — the workflow is
  deterministic Node with no agent-facing prompt and cannot host a `!command` block or a Gotchas
  section.
- Building an automated pipeline that regenerates Gotchas from `LEARNING-LOOP.md` on every distiller
  run — this slice SEEDS the sections and names the distiller as the forward-feeder; wiring the
  auto-feed is a separate future slice, not this one.
- Adding Gotchas to skills beyond the gate + spec-author set — F6 starts with these; extending it to
  the rest of the swe-flow surface is out of scope here.
- The F9 `AskUserQuestion` ratification prompt (US-0011) and the F-freeze `hooks:` block (US-0010) —
  those are separate Phase-2 slices that also touch `gate-close/SKILL.md`; this slice only adds the
  live-state block and the Gotchas prose, and its overlap with them is flagged above for
  integration-time sequencing.
