---
id: RFC-0032
title: Plugin-contract conformance — make the three plugins obey Claude Code's skill/agent/hook contracts
status: implemented
owner: baodq97
date: 2026-07-31
governs:
  - packages/govkit/templates/settings.default.json
  - scripts/skill-lint.mjs
  - plugins/ddd-flow/skills
  - plugins/swe-flow/agents
  - plugins/ddd-flow/.claude-plugin/plugin.json
  - plugins/swe-flow/.claude-plugin/plugin.json
  - plugins/design-flow/.claude-plugin/plugin.json
  - AGENTS.md
---

> Drafted at `status: draft`, `owner: TBD`. An audit compared govkit's plugin authoring against a
> version-pinned Claude Code best-practice corpus; every finding below is grounded with a file
> reference on both sides. The flip to accepted is the owner's.

## Summary

govkit ships three Claude Code plugins — `swe-flow` (the SDLC authoring chain), `ddd-flow` (the
domain-modelling loop), `design-flow` (the experience loop). They are authored to an *earlier*
mental model of the plugin/skill/agent/hook contract than Claude Code now exposes. The gap is not
cosmetic: in two places (F1, F2) the plugins do work Claude Code would do deterministically for
them, and in one of those (F1) a consumer can end up with authoring surfaces and **zero
enforcement**.

This RFC governs a deduped, grounded finding set and adopts a four-phase rollout that puts the two
correctness fixes first and the ergonomics last. It does **not** rewrite the plugins here — it
records the direction, the seams, and the alternatives rejected, then hands each phase to the
drafter/implementer.

### Diagnosis (measured on this repo, before any change)

```
$ bun run verify
govkit verify: OK — 64 doc(s) checked, 0 violations.
```

The tree is green; nothing here is a bug-fix against a red gate. These are conformance gaps the
gate does not (and structurally cannot) see, because the gate scores governed *docs*, not plugin
*authoring*. Counts that scope the change:

- **`plugins/ddd-flow/skills/`**: 10 skill dirs — `1-understand … 8-code` (8 numbered steps),
  `design` (the orchestrator), `view` (the live surface). The 9 non-orchestrator skills (the 8
  numbered steps plus `view`) carry a one-line "what it writes" description and nothing else
  (verified on `1-understand/SKILL.md` and `3-decompose/SKILL.md`: a `name` + a folded
  `description`, no other front-matter key).
- **`plugins/swe-flow/agents/`**: 11 role agents. Spot-checked `architect.md` — `tools: Read,
  Grep, Glob, Bash, Write, Edit` (no `Skill`), no `skills:` key, and a prose "Skill hint (load on
  demand)" block that tells the agent to invoke a canonical skill "if the Skill tool lists" it.
- **`AGENTS.md`**: 178 lines, loaded whole every session, no per-path split.
- **`scripts/skill-lint.mjs`**: `lintSurface()` enforces `name`, `description`, a 1024-char
  budget, and cosine-collision only — no check that a description is trigger-shaped.
- **The deterministic gate travels only through `govkit init`.** It is templated at
  `packages/govkit/templates/settings.default.json` (SessionStart session-freshness, PreToolUse
  `npx --yes govkit audit-write --root "${CLAUDE_PROJECT_DIR}"`, Stop `npx --yes govkit check
  --hook --root "${CLAUDE_PROJECT_DIR}"`). None of the three `plugins/*/.claude-plugin/plugin.json`
  files carries a `hooks` block, and there is no `plugins/*/hooks/hooks.json`.

## The findings this RFC governs

| ID | Class | State | One-line |
|---|---|---|---|
| **F1** | correctness | missing | Enforcement rides only on `init` → consumer `settings.json`; a marketplace install that skips `init` gets authoring surfaces with no gate. |
| **F2** | correctness | missing | The 9 ddd-flow step skills (the 8 numbered steps plus `view`) have no trigger phrasing and no invocation guard — auto-discoverable, cannot win routing, can mis-fire outside the orchestrator. |
| **F5** | systemic | missing | `skill-lint.mjs` never checks that a description is trigger-shaped — the systemic cause of F2. |
| **F-freeze** | enforcement | partial | "agents author, never flip status" is prose in `AGENTS.md`, not a deterministic block. |
| **F9** | enforcement | missing | Owner decisions (artifact-type pick, ratification) are prose; no skill uses `AskUserQuestion`. |
| **F8** | context economy | missing | `AGENTS.md` (178 lines) loads whole every session; no `.claude/rules/*.md` per-path split. |
| **F3** | drift | missing | swe-flow agents reference a canonical skill in prose but never list `Skill` in `tools` nor preload via `skills:` — the link is inert under dispatch, the embed can drift. |
| **F-cmd / F7 / F6** | ergonomics | missing/partial | workflows not exposed as `/` commands; gate skills don't inject live `!npx govkit verify` state; no "Gotchas" section fed by LEARNING-LOOP. |

### Naming the seams (what crosses a boundary, by type — not by file path)

- **The enforcement seam (F1).** Today the only carrier of the PreToolUse/Stop gate is the
  consumer's `settings.json`, written once by `init`. The contract Claude Code offers is a
  *plugin-scoped* hook resolved through `${CLAUDE_PLUGIN_ROOT}` (HOOKS-README, "Plugin hooks"
  row) — an always-on carrier that rides with plugin-enable state instead of with an `init` run.
- **The routing seam (F2/F5).** A skill's *description + `when_to_use`* is the input to Claude's
  auto-discovery; *`disable-model-invocation` / `user-invocable` / `paths`* are the guards that
  bound *when* it may activate (claude-skills.md frontmatter table). The step skills expose the
  first and none of the second, so the router sees 9 sibling candidates with no orchestration
  signal.
- **The preload seam (F3).** An agent's `tools` is an **exclusive allowlist when set**
  (claude-subagents.md: "Comma-separated allowlist … Inherits all tools if omitted"); `skills:`
  injects "full content … at startup" (same table). A prose "invoke the skill if listed" line is
  neither — under dispatch it resolves to nothing.
- **The authority seam (F-freeze/F9).** Status columns in an INDEX and `status:` front-matter are
  the human-gate boundary. A skill-scoped `hooks:` block (claude-skills.md `hooks` row) with
  `${CLAUDE_SKILL_DIR}` can make "agent may not edit this" a PreToolUse *block*, not a sentence.

## Alternatives + trade-offs

This is the load-bearing section. Each finding's design turns on a rejected option.

### F1 — how enforcement should reach a plugin-only consumer

The finding: a consumer who enables `swe-flow@govkit` from the marketplace but never runs
`govkit init` gets the skills and agents with **no** PreToolUse/Stop gate, because the gate lives
only in `settings.default.json` and `init` is what writes it.

- **(a) Ship a plugin-bundled hook that shells the identical Stop command `npx --yes govkit check
  --hook --root "${CLAUDE_PROJECT_DIR}"`** — the same command the settings template already runs,
  relocated into the plugin so it rides with plugin-enable rather than with an `init` run.
  (`${CLAUDE_PLUGIN_ROOT}` is *not* used: the command resolves the engine through `npx` and roots
  on `${CLAUDE_PROJECT_DIR}`, so byte-identity with the template — not a plugin-local path — is
  what any dedup would key on.) **Rejected as incomplete-on-its-own but recommended as the
  direction**, with two honestly-recorded trade-offs: a plugin hook is *always-on when the plugin
  is enabled*, so it can double-fire against the identical hook in a consumer that also ran
  `init`. Claude Code's documented dedup ("Identical hook handlers … run only once", HOOKS-README
  dedup section) is scoped to *settings locations*; the corpus does **not** confirm that a
  `[Plugin]`-source hook dedups against a `[Project]`/`[Local]`-source hook. **This must be
  verified live in Phase 1.** If it dedups, keeping the command byte-identical to the template is
  the correctness requirement that lets it collapse; if it does not, both fire — but because the
  command is idempotent (same `npx`-resolved engine, same flags, same verdict) a double-fire is
  duplicate work, not a contradiction. Either way `npx --yes govkit` from the plugin still needs
  the engine resolvable on PATH/registry, so this narrows the gap but does not make the plugin
  fully self-contained.
- **(b) Bundle a gate binary inside the plugin** so enforcement is self-contained with no `npx`
  dependency. **Rejected.** It violates govkit's founding invariant that *consumers pin the
  engine and never copy the source* (PRD-0001 / RFC-0001): a bundled binary is a second,
  drifting copy of the gate, and the trust story (one keyless engine, one version) collapses the
  moment the plugin's copy and the pinned `npx` version disagree. Heavy, and wrong on principle.
- **(c) Do nothing — document "you must run `init`".** **Rejected.** It is already the de-facto
  behaviour and the finding is precisely that the most-attractive adoption path (enable the
  plugin) delivers surfaces without the gate. Documenting a sharp edge is not sanding it.

**Chose (a) over (b)** because "narrow the gap with the same command, deduped" preserves the
single-engine invariant, where "bundle a binary" buys self-containment by breaking it.

### F2 / F5 — bounding the step skills, and preventing recurrence

- **Mark the 9 step skills orchestrator-only** — `disable-model-invocation: true` (still
  user-typable via `/`) is the primary guard against auto-routing mis-fire; `paths:
  docs/domain/**` is added as scoping belt-and-suspenders, not an independent guard — it narrows
  *where* the skill could ever apply but does not itself suppress auto-invocation the way
  `disable-model-invocation` does — so `ddd-flow:design` stays the single router and the steps
  cannot mis-fire on unrelated files. **Chosen.**
- **Rejected: give each step its own rich `when_to_use` trigger set.** Nine skills competing to
  win the same domain-modelling request is the mis-fire this finding is about; richer triggers
  deepen the collision instead of resolving it. The orchestrator already owns the triggers.
- **Rejected: `user-invocable: false` (pure background knowledge).** Too far — an operator
  legitimately types `/ddd-flow:3-decompose` to resume mid-loop; hiding it from the `/` menu
  removes a real affordance. `disable-model-invocation` blocks *auto*-routing while keeping the
  manual door open, which is exactly the intent.
- **F5 is the systemic fix:** add a `skill-lint.mjs` rule that a non-orchestrator skill's
  `description`/`when_to_use` is trigger-shaped (or the skill declares `disable-model-invocation`).
  **Chosen and sequenced first** — it auto-flags F2 rather than trusting a reviewer to notice, so
  the lint catches the next terse skill before it ships.

### F3 — making the canonical-skill link live under dispatch

- **Preload via `skills:` for the agents whose embedded copy genuinely mirrors a skill**, and add
  `Skill` to those agents' `tools` allowlist so the on-demand hint resolves. **Chosen, but scoped
  to agents with a real mirror** — not blanket.
- **Rejected: add `Skill` to `tools` everywhere and keep the prose hint.** `tools` is an
  exclusive allowlist; widening it without preloading still leaves the embed as the live copy and
  the "canonical" skill as a link the agent may or may not follow — the drift stays.
- **Rejected: delete the embedded copies and rely on the skill alone.** The embeds are the
  fallback that makes an agent work when the skill is *not* installed (the plugin agents are used
  standalone too). Removing them trades drift for a hard dependency. `skills:` preload gets the
  canonical content injected at startup while the embed remains the offline fallback.

### F8 — splitting the root contract

- **Move path-scoped rules into `.claude/rules/*.md` with `paths:` frontmatter** so a session
  loads only the rules for the paths it touches, shrinking the always-on 178-line `AGENTS.md`.
  **Chosen for the mechanical, path-local rules.**
- **Caveat, recorded honestly:** the corpus also suggests `<important if="…">` tags to resist
  rule-drift as files grow, but that pattern rests on a **third-party source (hlyr.dev), not an
  official Claude Code doc**. Treated as nice-to-have, explicitly **not** load-bearing — adopt the
  official `.claude/rules/*.md` + `paths:` mechanism; leave `<important>` out of the required
  scope.
- **Rejected: leave `AGENTS.md` whole.** The 178-line load is paid every session regardless of
  what the session touches; the authority split and change-class table are genuinely global (they
  stay in `AGENTS.md`), but the per-surface rules are not and should load lazily.

### F-freeze / F9 — prose → deterministic human-gate

- **A gate skill (gate-close / gate-loop) registers a session-scoped PreToolUse hook** (skill
  `hooks:` block + `${CLAUDE_SKILL_DIR}`) that blocks agent Edits to INDEX status columns and
  `status:` front-matter — the "/freeze" pattern. **Chosen as direction** — `context: fork` is
  already in use (spec-red-team, substance-judge), so the skill-scoped-hook machinery is not new
  ground for this repo.
- **F9: structure the owner decisions (artifact-type pick, ratification) as `AskUserQuestion`**
  rather than prose prompts, reinforcing the human-gate at the point of decision.
- **Rejected: promote the freeze into the always-on `settings.json` gate.** The freeze is
  *agent-scoped* — a human editing a status column is the sanctioned act the gate must not block.
  A session/skill-scoped hook that clears on the next message is the right blast radius; a global
  PreToolUse rule would fight the human it exists to serve.

## Decision / recommendation

Adopt the finding set and the four-phase rollout, with the F1 direction fixed to **option (a)**
(plugin hook shelling the *identical* `npx --yes govkit check --hook --root
"${CLAUDE_PROJECT_DIR}"`, byte-identical to the template — with cross-source hook dedup to be
confirmed in Phase 1, not assumed) and the F8 scope fixed to **the official `.claude/rules/*.md` +
`paths:` mechanism only** (the `<important>` tag deferred as non-load-bearing). Each phase ships
as its own governed change; this RFC is the umbrella direction, not the diff.

## Impact / rollout / phases

- **Phase 0 — F5 (skill-lint trigger rule).** Cheapest, and it auto-flags F2. A new rule in
  `lintSurface()` (`scripts/skill-lint.mjs`): a non-orchestrator skill must be trigger-shaped or
  declare `disable-model-invocation`. Runs in `bun run check`; scores this repo's plugins only.
- **Phase 1 — F2 + F1 (correctness core).** F2: add `disable-model-invocation: true` +
  `paths: docs/domain/**` to the 9 ddd-flow step skills (the 8 numbered steps plus `view`). F1:
  add the plugin-scoped hook to `plugins/*/.claude-plugin/plugin.json` (or a `hooks/hooks.json`)
  shelling the identical `npx --yes govkit check --hook --root "${CLAUDE_PROJECT_DIR}"`, deduped
  against the `settings.json` gate. Behaviour change: a plugin-only consumer now gets the Stop
  gate.
- **Phase 2 — F-freeze + F9 + F8 (prose → deterministic).** The freeze skill-hook, the
  `AskUserQuestion` owner-decision points, and the `.claude/rules/*.md` split of `AGENTS.md`.
- **Phase 3 — F3 + F-cmd + F7 + F6 (ergonomics).** `skills:` preload + `Skill` in `tools` for
  mirrored agents; expose `.claude/workflows/*.js` as `/` commands; inject live
  `!npx govkit verify` state into gate skills; add a LEARNING-LOOP-fed "Gotchas" section.
  Deliberately last and deliberately under-specified — these are affordances, not correctness.

**Rollback** is per-phase and additive-only: Phase 0/2/3 are new authoring metadata (delete to
revert); Phase 1's plugin hook is removable, and because it is byte-identical to the settings
gate, removing it returns a consumer to today's behaviour with no state migration.

## Open questions / risks

- **F1 double-fire.** Two open sub-questions, not one: (1) whether Claude Code's dedup spans
  *sources* at all — does a `[Plugin]`-source hook dedup against a `[Project]`/`[Local]`-source
  hook, or only against another hook within the same settings location? Unconfirmed in the
  corpus; must be checked live in Phase 1. (2) If it does span sources, the plugin hook and the
  `settings.json` gate must stay byte-identical for dedup to collapse them — a future edit to one
  and not the other reintroduces a double-fire. Mitigation to decide in Phase 1 — a
  `check-sync.mjs` mirror pair (the same guard RFC-0031 uses for its template pair) pinning the
  plugin hook command to the settings template — but note this mirror pair only helps *if* dedup
  spans sources; it does not resolve sub-question (1).
- **F1 self-containment.** Even with (a), `npx govkit` must be resolvable; the plugin is not
  fully standalone. Is "narrows the gap, still needs the engine on npx" acceptable, or does a
  consumer expect enable-and-go? Recorded, not resolved.
- **F2 `paths:` breadth.** `docs/domain/**` matches the ddd surface, but a consumer with a
  remapped `--docs-root` (RFC-0007) moves that tree. Should the glob be config-derived rather than
  literal? Defer to Phase 1 detail.
- **F8 caveat.** `<important if="…">` is third-party-sourced; do not let it become load-bearing in
  review. The `.claude/rules/*.md` split stands on an official doc; the tag does not.
- **F3 scope.** "agents whose embed genuinely mirrors a skill" needs a census in Phase 3 — not
  every role agent has a canonical skill twin, and preloading a skill an agent only half-mirrors
  would inject misleading context.

## As-built

> **F2 AMENDED 2026-08-01 — the guard is withdrawn; the trigger-shaped description replaces it.**
> Owner-directed in session, implemented on `optimize/ddd-flow-thin`, tracked in `US-0015`
> (`US-0007` moves to `superseded`).
>
> F2 chose `disable-model-invocation: true` to make `ddd-flow:design` "the single router". Two
> things falsify that reasoning:
>
> 1. **The key does not buy orchestrator-only, it buys human-slash-command-only.** It blocks *all*
>    model invocation including the orchestrator's own `Skill` call, so under F2 as written `design`
>    could not invoke the steps it routes to — leaving it to paraphrase their work inline, which is
>    the one thing `design`'s first hard rule forbids, because the step skills carry provenance and
>    grounding rules that do not survive paraphrase.
> 2. **The mis-fire it was bought to prevent does not occur without it.** A 44-utterance × 3-router
>    eval, ground truth taken from `steps.yml` rather than from the descriptions under test, scored
>    **129/132** with **24/24 on negatives** — no ddd-flow skill claimed a PRD, a failing test, a
>    release, a review, a migration or a CI problem. Full method and limits:
>    `docs/research/ddd-flow-thin-eval/RESULTS.md` §6.
>
> The rejected alternative *"give each step its own rich trigger set"* is therefore now the chosen
> one, and its stated objection — "nine skills competing to win the same request deepens the
> collision" — is measured as not occurring at this surface size. **F5 stands unchanged and is what
> makes this safe**: the lint still requires every non-orchestrator description to be trigger-shaped
> *or* guarded, so the two shapes remain interchangeable and neither can ship untriggerable.
>
> Honest bound: the eval covers ddd-flow in isolation. Cross-plugin negatives against the ~30 skills
> a live session carries are untested, and by the rule of three 0/8 clean negatives bounds the true
> false-claim rate at ≲37%, not zero. This licenses the withdrawal; it does not prove the guard was
> unnecessary. Re-open if a mis-route is observed in a live session.
>
> One more finding from the same work, recorded because it changes how F5's sibling check should be
> read: `skill-lint`'s description-collision warning is a **lexical proxy that did not track
> measured mis-routing** — its two warned ddd-flow pairs produced zero routing errors, while the one
> pair that did confuse sat below the warn floor. Kept as a copy-paste guard, with that caveat
> written into the script.

All four phases shipped, each slice authored then adversarially verified (a workflow per phase;
the lead integrated shared state and ran the full `bun run check` before every commit).

- **Phase 0 — F5.** `scripts/skill-lint.mjs` now errors when a non-orchestrator skill's description
  is neither trigger-shaped nor `disable-model-invocation`-guarded (US-0006).
- **Phase 1 — F2, F1.** The 9 ddd-flow step skills are `disable-model-invocation: true` +
  `paths: docs/domain/**` (US-0007). `swe-flow` ships the Stop gate as a plugin hook
  (`plugins/swe-flow/hooks/hooks.json`) pinned byte-identical to the settings template by a new
  `check-sync` `stopHookCommandPin` (US-0008).
- **Phase 2 — F8, F-freeze, F9.** `AGENTS.md` split into path-scoped `.claude/rules/*.md` with a
  new `scripts/agents-rules.test.mjs` content-preservation gate (US-0009). `gate-close` carries a
  skill-scoped PreToolUse `decideFreeze` hook denying agent status flips (US-0010). `spec-author`
  and `gate-close` route owner decisions through `AskUserQuestion` (US-0011).
- **Phase 3 — F3, F-cmd, F7, F6.** `skills:`-preload on the 3 mirror agents (US-0012); four
  `.claude/commands/*.md` workflow wrappers (US-0013); live `!npx govkit verify --json` state +
  `LEARNING-LOOP` Gotchas in the gate/authoring skills (US-0014).

Commits: `6fd8a11` (F5+F2), `83c3d2b`/`a43a0ea` (F1+probe), `f584aa7` (F8), `040197c` (F9/F3/F-cmd),
`d7312c5` (F-freeze), `6249e39` (F7+F6). All six US at `done`.

## Deviations from design

What the implementation learned that the design did not foresee — each an adversarial-verify or
live-probe finding, none a silent change:

1. **F1 dedup is NOT available (measured, not assumed).** A live `claude -p --debug` probe proved a
   `[Plugin]`-source and a `[Project]`-source byte-identical Stop hook BOTH fire — no cross-source
   dedup (CC 2.1.220). Design accepts the idempotent double-fire (same verdict, duplicate work); the
   `check-sync` mirror pair survives for byte-identity honesty, not to collapse the hooks.
2. **`AGENTS.md` is not mirror-pinned (F8 premise corrected).** Only the two consumer template copies
   are mirrored; the root is not. Each new consumer rule file therefore needs its own 3-artifact
   lockstep + init scaffold entry, and a new `agents-rules.test.mjs` guards content-preservation —
   a gate the RFC did not call for but the split requires to be safe.
3. **F-freeze `replace_all` under-block (found + fixed).** `decideFreeze` first modelled only the
   first match, so a `replace_all` Edit could hide a status flip behind an earlier token. Fixed to
   honour `replace_all`; INDEX code-fence / pipe-in-cell recorded as accepted over-block limitations
   (defence-in-depth — the Stop gate backstops).
4. **F9 was inert as first written.** `spec-author`'s exclusive `allowed-tools` omitted
   `AskUserQuestion`, so the instruction could never fire; the tool was added to the allowlist.
5. **F7 adds no `allowed-tools` (footgun avoided).** A SKILL.md body `!command` is a documented
   preprocessing feature needing no tool grant; the RFC's implied `allowed-tools` entry would have
   been the exact exclusive-allowlist trap F3 warns about, so it was dropped (US-0014 AC reconciled).
6. **F3 census: 3 of 11 agents.** Only `distiller`/`drafter`/`red-teamer` genuinely mirror one skill;
   the rest were excluded rather than blanket-preloaded.
7. **F-cmd: `gate-loop` has no `SKILL.md`.** It is a deterministic workflow; the wrappers front the
   `.claude/workflows/*.js` and degrade to the by-hand order when workflows are disabled.
