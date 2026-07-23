---
id: RFC-0025
title: Gate loop and the swe-flow role plane
status: implemented
owner: TBD
date: 2026-07-23
governs:
  - plugins/swe-flow/agents
  - plugins/swe-flow/skills/gate-close
  - plugins/swe-flow/skills/work-breakdown
  - .claude/workflows/gate-loop.js
  - scripts/skill-lint.mjs
parent: PRD-0001
---

> Gives swe-flow one reusable engineering loop — PROPOSE → VERIFY → RECONCILE → RED-TEAM →
> RATIFY — that runs at every gate in the govkit chain, so a status flip is always backed by
> evidence produced by agents that did not author the thing being flipped. At slice- and
> release-close the loop adds a **verify-for-real** station: an independent verifier builds or
> packs the real artifact and runs the same entrypoint a consumer runs, in a clean scratch dir,
> so "it works" is proven by a real exit code, not asserted from a summary. The loop is **not**
> encoded in skills. Per the two-tier stance proven in `mandat`: Tier-1 skills stay atomic and
> dependency-free; the chain lives in Tier 2 — one parameterized workflow (`gate-loop.js`)
> dispatching plugin-namespaced role agents. Drafted at `status: draft`; the accept is the owner's.

## Summary

The govkit chain (PRD → RFC → ADR → Issue → Code) is a sequence of *gates*, and every gate ends
in a human status flip. Today those flips rest on whatever the authoring agent asserts about its
own work: the deterministic gate (`govkit verify`/`eval`) proves a doc is *well-formed*, never
that its claim is *true of the code that shipped*. The consumer `mandat` had to hand-write five
role agents, a slice-close skill, and a slice-close workflow just to get one evidence-backed flip
— and its `LEARNING-LOOP.md` logged 25 escapes in 4 days, **0** catchable by the deterministic
gate.

This RFC generalizes `mandat`'s field-proven pattern into swe-flow itself: **one engineering loop
per gate**, five stations, the same five at every gate — only the actors and the artifact change.

```
PROPOSE ──► VERIFY ──► RECONCILE ──► RED-TEAM ──► RATIFY
 author      re-run      is the doc     attack the    ONE packet
 role        the gate    still true     advance       → human
 agent       from        of the code?                  authorizes
             scratch                                   → separate
                                                       accept commit
```

At slice- and release-close the loop inserts a **Live** verify-for-real station between VERIFY and
RED-TEAM: a `verifier` agent builds or packs the shipped artifact and runs it the way a consumer
does, in a clean scratch dir, reporting real exit codes. A release gate cannot be ratified on a
re-run of the repo's own gate alone.

**The one architectural commitment: the loop is not a skill.** Per the two-tier stance proven in
`mandat` — Tier-1 skills stay atomic and dependency-free; a skill never chains to another skill —
the chain lives entirely in Tier 2: one parameterized workflow (`.claude/workflows/gate-loop.js`)
that dispatches plugin-namespaced role agents (`swe-flow:<name>`). This RFC adds 6 role agents,
upgrades 2 existing ones, ships the workflow to `template/` plus this repo, adds two skills, adds
one governed release doc type, and makes the whole plugin surface machine-checked by a new
`scripts/skill-lint.mjs` in `bun run check`. No engine change, no `govkit verify`/`eval` change,
no new CLI subcommand — the deterministic gate stays keyless.

## Motivation

Every gap below is measured against the `mandat` consumer, whose journal (51 runs, 51 green, 0
violations) and escape log (25 escapes, 0 gate-catchable) are the evidence base.

| # | Gap | Measurement |
|---|---|---|
| M1 | `spec-author` and `spec-red-team` ship as skills with **no agent** → a workflow cannot dispatch them | mandat hand-wrote `spec-drafter` + `red-teamer` wrappers |
| M2 | swe-flow has *steps*, no *roles* — no BA, no SA | mandat hand-wrote `ba-analyst` + `sa-architect` |
| M3 | No pre-flip evidence loop; owner is interrupted per-doc | mandat hand-wrote `mandat-slice-close` (skill + workflow) |
| M4 | `reviewer` trusts the gate ran; never proves the gate *can fail*; no per-finding severity | mandat set `gate-verifier` to `model: opus` and added "prove gates can actually fail" |
| M5 | `workflow-author` description exceeds the 1024-char injection limit | 1082 chars with single-space folding |
| M6 | `spec-author` ↔ `spec-red-team` description collision | cosine 27.7%; prompt "spec this out into an RFC" ranks red-team 0.24 vs author 0.23 |
| M7 | Agents are Claude-Code-only; no degraded path when the plugin is absent | mandat's agents carry a "Skill hint … otherwise run this embedded procedure" block |
| M8 | Plugin surface (agents/skills) is not synced to README or the manifests | `plugins/swe-flow/README.md` is hand-maintained; nothing checks it |
| M9 | verify was read-only — no station executed the real artifact | mandat live-only defects (LEARNING-LOOP 23-25) |

## Design

### Station rules — invariant across every gate

1. **PROPOSE** writes at `startStatus` only. Never advanced.
2. **VERIFY** is run by an agent that did not author (writer ≠ scorer, structurally). It re-runs
   the gate; it never reads a summary. It must demonstrate the gate is capable of failing.
3. **RECONCILE** proposes exact replacement text; it never applies and never flips.
4. **RED-TEAM** is read-only by construction and is never the doc's author.
5. **RATIFY** is the human's. The loop returns a packet; the lead recommends; the owner authorizes
   once, and the flip lands in a **separate accept commit** citing the in-session authorization.

The **Live** station (slice/release close only) is a sixth actor sitting between VERIFY and
RED-TEAM: it *executes* the shipped artifact rather than re-running the source gate. It is
read-only on the repo checkout — every command runs in a scratch dir it creates and discards — and
it marks nothing "proven" without a command that actually ran.

### E2E coverage: before → after

| Gate | Artifact | Author today | Author after | Loop today | Loop after |
|---|---|---|---|---|---|
| G0 Discover | `/goal` | `goal-define` skill | unchanged | — | — |
| G1 PRD | PRD `draft`→`approved` | — | `swe-flow:analyst` | none | gate-loop |
| G2 RFC | RFC `draft`→`accepted` | — | `swe-flow:architect` | none | gate-loop |
| G3 ADR | ADR `proposed`→`accepted` | — | `swe-flow:architect` | none | gate-loop |
| G4 US + AC | US `open`→`in-progress` | — | `swe-flow:analyst` | none | gate-loop |
| G5 Code | diff | `swe-flow:implementer` | + `swe-flow:test-author` | `review-changes.js` | + `swe-flow:verifier` |
| G6 Slice close | US `→done`, RFC `→implemented` | — | gate-loop | none | gate-loop |
| G7 Distill | proposals | `swe-flow:distiller` | unchanged | — | — |
| G8 Release | REL `draft`→`released` | — | `swe-flow:drafter` | none | gate-loop (release preset) |

`drafter` is the narrow mechanical writer dispatched by `analyst`/`architect` when the decisions
are already made — least-privilege dispatch, per mandat escape #2 ("dispatched to
general-purpose … a subagent wandered into dependency internals").

### The role plane — 5 → 11 agents

The pre-plan surface is 5 agents (`implementer`, `reviewer`, `doc-keeper`, `distiller`, `judge`).
This RFC adds 6 role agents and sorts the whole set into three classes by what an agent is *for*.
The taxonomy is itself the mitigation for the fewest-concepts risk of a wider surface: an agent
that does not slot cleanly into author / score / upkeep does not belong.

| Class | Agents | Role |
|---|---|---|
| **Author** | `analyst`, `architect`, `drafter`, `test-author`, `implementer` | produce the artifact |
| **Score** | `reviewer`, `verifier`, `red-teamer`, `judge` | judge it without having authored it |
| **Upkeep** | `doc-keeper`, `distiller` | keep the record and the corpus true |

The six new agents:

- **`analyst`** (BA role, `sonnet`) — turns an approved PRD or accepted RFC into precise, testable
  acceptance criteria with stable ids (`AC-<parent>.<n>`), flagging ambiguity and gaps. Its one
  discipline that is not a skill's: *every requirement is testable or it is a gap*. Closes half of
  M2 and the AC half of the mandat escape log ("the spec was the bug, the implementation was
  faithful").
- **`architect`** (SA role, `opus`) — turns an approved PRD or design brief into a governed ADR/RFC
  carrying contracts, state machines, and I/O seams. It diagnoses on the repo first (a census, a
  probe, a measured number) before proposing, and records at least two rejected alternatives with
  reasons. Closes the other half of M2.
- **`drafter`** (mechanical writer, `sonnet`) — writes ONE governed doc from a brief plus binding
  decisions: discovers the schema from `govkit.yml` at run time, writes the doc and its INDEX row
  at the type's `startStatus`, self-validates with the gate, stops at "ready for review". Never
  decides scope, never flips, never self-assigns an owner. Makes `spec-author` dispatchable
  (half of M1).
- **`red-teamer`** (adversary, `opus`) — the loop's fourth station made dispatchable: an
  independent adversarial pass over ONE doc before its status advances, returning a decision brief
  (`flip-as-is` / `flip-after-reconcile` / `blocked`) with the exact reconciled text when a status
  is only honest after a rewording. Never authors, never edits, never touches INDEX.md. Makes
  `spec-red-team` dispatchable (other half of M1).
- **`verifier`** (live evidence, `opus`) — the verify-for-real station. Distinct from `reviewer`:
  the reviewer judges and re-runs the repo's own gate; the verifier *builds or packs the shipped
  artifact* and *runs the consumer entrypoint* in a clean scratch dir, inducing one failure where
  cheap to prove the check is fallible. Returns an evidence contract
  (`{ liveVerdict, ranCommands, claims, notMeasured }`) in which a claim is `proven` only when a
  `ranCommands` entry carries a real exit code and output tail. Closes M9.
- **`test-author`** (RED half of TDD, `sonnet`) — writes a FAILING test that pins a requirement
  before any implementation, discovering the repo's real test command (never assuming `npm test`)
  and proving the test red against the current code; the demonstrated failure is the deliverable.
  Gives the implementer an executable definition of done at G5.

### Upgrades to existing agents

- **`reviewer`** gains three things (closes M4): a **prove-the-gate-can-fail** section — a green
  gate is only evidence if it could have gone red, so the reviewer names one check and the
  condition that would trip it, induces it where cheap, and reports `gateProvenFallible: boolean`;
  a **trust-nothing-you-did-not-run** rule — a stated rationale never downgrades a finding's
  severity; and **per-finding severity** (`Critical` / no-prefix / `Nit:` / `Optional:` / `FYI`)
  with the list ordered by leverage, not by file.
- **`implementer`** gains a **return-status contract** (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` /
  `NEEDS_CONTEXT`) plus `filesWritten` and `verifierShouldRun` (the discovered-not-executed command
  list the verifier consumes), and a **path-handoff rule**: work moves between agents as file paths
  the receiver reads itself, never stale pasted content. The `WRITE FILES ONLY` fan-out hard edge
  is untouched.
- **Every existing agent** (`implementer`, `doc-keeper`, `distiller`, `judge`) gains a
  `## Skill hint (load on demand)` block: invoke the named canonical skill if the harness lists it,
  otherwise run the embedded procedure, which is complete on its own. Closes M7 — the plugin's
  agents degrade gracefully when the plugin is absent.

### The workflow — `gate-loop.js`

The loop is a single fan-out-in-waves workflow shipped to `.claude/workflows/gate-loop.js`
(dogfood) and `template/.claude/workflows/gate-loop.js` (byte-identical consumer copy — workflows
cannot ship inside a plugin, and the two copies are kept identical by `check-sync.mjs`). It takes
`args.verifyCmd` (REQUIRED — the repo's real gate, never guessed), `args.changeSummary`,
`args.flips`, and two selectors that gate the Live station:

- **`args.gate`** ∈ `'doc' | 'slice' | 'release'` (default `'slice'`). A `'release'` gate
  **requires** `args.live` and throws without it — a release can never be ratified on the source
  gate alone.
- **`args.live`** = `{ scenario, expectations }`. When absent on a doc/slice gate the Live phase is
  skipped (`liveVerdict: 'skipped'`) rather than faked.

Three phases run: **Verify** (parallel: `swe-flow:reviewer` gate re-run ‖ `swe-flow:doc-keeper`
drift reconcile), **Live** (`swe-flow:verifier`, skipped or required per the `gate` selector), and
**RedTeam** (one `swe-flow:red-teamer` per flip candidate). The workflow assembles one packet —
`{ gate, live, reconcile, redTeam, humanGates }` — and surfaces it via `log()`, never a top-level
`return` (which fails `node --check` on an ESM script; the same convention as `sdlc.js`). Each
agent result is validated against an explicit JSON schema so a malformed agent return is caught at
the workflow boundary, not by the human. Closes M3.

### The skills — `gate-close` and `work-breakdown`

- **`gate-close`** is the Tier-2 orchestrator (the only place the chain is named): it tells the
  operator *when* to run the loop (after the change has landed and been committed — never mid-edit,
  which yields a false BLOCK), how to read the packet (a `BLOCK` verdict or
  `gateProvenFallible: false` stops everything; `live.liveVerdict: fail` or any refuted claim stops
  a release), and how to land each flip as a **separate accept commit** citing the owner's
  authorization. At a release gate the ledger entry's `check` string is generated from the
  verifier's `ranCommands` — turning `docs/ledger.json` `check` from testimony into a re-runnable
  command.
- **`work-breakdown`** is a Tier-1, dependency-free slicing skill: vertical slices over horizontal
  layers, an XS–XL sizing ladder (XL means "break it down further"), four break triggers, and how
  to record blocking order. Because govkit has no `blockedBy` reference field today (the schema
  resolves `parent` only), it deliberately models slice dependencies as prose in the user-story
  body rather than inventing a front-matter key.

### The governed release doc type — `rel`

A new `rel` type in `govkit.yml` (`idPrefix REL`, `dir docs/releases`, `startStatus draft`,
`statuses [draft, released, superseded]`) makes a release note a first-class gated artifact with a
`parent` ref that resolves to a real RFC. It reuses RFC's `requiredSectionsByStatus` forcing
pattern: a REL at `released` must carry `What shipped` / `Migration` / `Rollback` /
`Post-publish smoke`, inert until the flip. A minimal eval rubric (`substance` + `nofiller`) gives
releases the same stub-and-filler floor every other type gets — added because `eval.ts:164`
`continue`s past a rubric-less type, so an unlisted `rel` would silently skip the floor.

### The surface check — `scripts/skill-lint.mjs`

A deterministic, keyless, dependency-free repo-local check wired into `bun run check` (not a
`govkit` CLI subcommand — it scores govkit's own plugin, never a consumer's docs). It validates
front-matter shape, enforces the ≤1024-char description budget agents inject into the system
prompt (catches M5), and runs an all-pairs cosine collision matrix over descriptions (warn ≥50%,
error ≥75% — catches M6). Its `lintSurface(root)` export is reused by `scripts/check-sync.mjs`,
which asserts every agent/skill on disk is at least named in `plugins/swe-flow/README.md` and
that the plugin manifest and the marketplace entry stay byte-identical on version and description
(catches M8) — `skill-lint.mjs` itself does not read the README or either manifest.

## Alternatives considered

- **(a) Chain skills to each other via `next:` front-matter.** Rejected: mandat's field-proven
  stance is that Tier-1 skills never depend on each other — a skill that assumes another skill ran
  is brittle across harnesses and impossible to invoke atomically. The chain belongs in Tier 2, in
  a workflow that composes agents.
- **(b) One mega-agent per gate.** Rejected by least-privilege dispatch: mandat escape #2 recorded
  a general-purpose subagent wandering into dependency internals. A gate is a set of *distinct*
  roles (author, independent verifier, adversary) with structurally different tool grants and the
  writer ≠ scorer separation; folding them into one agent destroys exactly the independence the
  loop exists to provide.
- **(c) Copy mandat's workflow verbatim into `template/` with no role agents.** Rejected: the
  workflow runtime can only dispatch plugin-namespaced agents (`swe-flow:<name>`), and it cannot
  dispatch a project's `.claude/agents/`. A workflow that names agents which do not exist as plugin
  agents is dead on arrival for any consumer. The agents must ship in the plugin first.

## Impact / rollout

- **Surface:** 5 → 11 agents (6 new: `analyst`, `architect`, `drafter`, `red-teamer`, `verifier`,
  `test-author`; 2 upgraded: `reviewer`, `implementer`; 4 existing gain the skill-hint block). Two
  new skills (`gate-close`, `work-breakdown`). One new governed doc type (`rel`) with its INDEX and
  a minimal eval rubric.
- **Repo check:** one new step, `scripts/skill-lint.mjs`, prepended to the `bun run check` chain;
  `check-sync.mjs` gains a surface-set assertion and a `gate-loop.js` byte-identity assertion. Both
  are repo-local and keyless.
- **`template/` gains a workflow:** `template/.claude/workflows/gate-loop.js`, byte-identical to the
  dogfood copy, so a fresh consumer scaffolds with the loop.
- **No engine change, no `govkit verify`/`eval` change, no new CLI subcommand.** The deterministic
  gate stays keyless; nothing in this plan enters the no-key CI path. The only `govkit.yml` change
  is additive (the `rel` type + its rubric). Manifest `version` bumps to `0.8.0`.
- **Rollout order:** the linter ships first (Task 2) so every later surface addition is policed as
  it lands; the two description defects it finds are fixed and the linter wired into the gate (Task
  3); then the agents, the workflow, the skills, and the release type; finally the manifest sync
  and a dogfood run of the loop against this very RFC.
- **Rollback** is per-surface: deleting an agent file, a skill dir, or the workflow copies, and
  reverting the `govkit.yml` and `package.json` additions. No migration, no state, no data.

## Open questions / risks

- **Does an 11-agent surface violate fewest-concepts?** The author/score/upkeep taxonomy is the
  test — an agent that does not slot cleanly into one class does not ship — and the linter's
  manifest-sync check plus the collision matrix keep the surface honest and non-overlapping. Risk
  accepted; revisit if two agents' descriptions collide ≥50% after this lands.
- **Does `analyst` overlap `goal-define`?** Boundary: `goal-define` structures a *request* (a rough
  ask into a runnable goal); `analyst` produces *testable acceptance criteria from an already
  approved artifact*. Different inputs, different outputs; `goal-define` is `analyst`'s optional
  upstream, not its twin.
- **Does `verifier` overlap `reviewer`?** Boundary: the reviewer re-runs the repo's own gate and
  *judges*; the verifier *executes the shipped artifact* in a scratch dir and reports real exit
  codes. Kept distinct so a green source gate can never stand in for a real-artifact run. Risk: the
  two descriptions could collide — mitigated by the linter's collision matrix.
- **`blockedBy` / `supersededBy` refs are deferred.** This plan models slice dependencies as prose
  in the user-story body precisely because no `blockedBy` field exists yet; adding one is a
  `govkit.yml` schema change and wants its own RFC and lifecycle gate.
- **The workflow cannot self-test end to end without a live dispatch.** Task 12 dogfoods the loop on
  this RFC, but the deterministic guarantees stop at `node --check` and the schema literals; any
  friction the real run surfaces is recorded in `LEARNING-LOOP.md`, not patched silently.

## As-built

Shipped on branch `rfc-0025-gate-loop` (merged to main at `b1e57af`), all gates green
(`bun run check` exit 0; live-verified in a scratch consumer — pack → install → init/verify
green → induced verify exit 1 / hook exit 2 → restore green; tarball engine-only):

- 6 new role agents (`analyst`, `architect`, `drafter`, `red-teamer`, `verifier`, `test-author`)
  + `reviewer`/`implementer` contract upgrades + skill-hint degradation blocks across the class —
  11 agents total in the author/score/upkeep taxonomy.
- `.claude/workflows/gate-loop.js` (Verify → Live → RedTeam; `gate` ∈ doc|slice|release;
  release requires a live scenario) + byte-identical `template/` copy, drift-gated by
  `check-sync.mjs`.
- `gate-close` + `work-breakdown` skills; `workflow-author` description trimmed under 1024;
  `spec-red-team` de-collided.
- `rel` doc type (`docs/releases`, draft→released, as-shipped required sections) + minimal rubric.
- `scripts/skill-lint.mjs` (+5 `node --test` cases) wired into `bun run check`.
- Plugin v0.8.0 manifests + README taxonomy, surface-sync gated.

## Deviations from design

- The workflow surfaces its packet via `log()`, never a top-level `return` (ESM `node --check`
  constraint; house convention shared with `sdlc.js`).
- Agent count grew 5 → 11, not the plan v1's 5 → 9 (verifier + test-author joined via M9).
- Tasks 2–11 landed on the branch while RFC-0025 was still `draft`; the accept was retroactive,
  authorized in-session and recorded in the plan's deviation note (main never saw code before
  the accept).
- Dispatch caveat: `swe-flow:*` role agents resolve from the INSTALLED plugin — consumers need
  plugin ≥ 0.8.0 for `gate-loop.js` to dispatch them (learning-loop Round 17, F7).
- M5's measured description length differed between plan (1082) and audit evidence (1029) —
  folding-dependent; the lint measures joined length and is now the single source.
