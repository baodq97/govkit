---
id: US-0012
title: Preload the canonical skill into genuinely-mirrored role agents via the skills:/tools frontmatter (kill embed drift)
status: open
owner: TBD
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As a maintainer of the swe-flow role agents, I want the agents whose embedded body is a true
summary of one canonical SKILL.md to preload that skill via the `skills:` front-matter field and
to carry `Skill` in their `tools` allowlist, so that under dispatch the canonical content is
injected at startup instead of the prose "invoke it if the Skill tool lists it" hint resolving to
nothing — which is the F3 drift that lets the embedded copy silently diverge from the skill.

## Context

This is RFC-0032 Phase 3 (F3), the preload seam — an ergonomics/drift fix, not a correctness gap
(the tree is green; the gate scores governed *docs*, not plugin *authoring*). Every swe-flow role
agent opens with a "Skill hint (load on demand)" block that tells the agent to invoke a named
canonical skill "if the Skill tool lists" it, and otherwise run the embedded procedure. But two
front-matter facts make that hint inert under dispatch (verified against the best-practice corpus,
claude-subagents.md rows 23/28):

1. `tools:` is an **exclusive allowlist when set** — "Comma-separated allowlist … inherits all
   tools if omitted". No swe-flow agent lists `Skill`, so under dispatch the Skill tool is not
   even available; the "invoke it if listed" hint can never be true.
2. `skills:` injects **"full content … at startup"** — the field that would make the canonical
   copy the live one. No agent uses it.

So the canonical-skill link is a dead sentence, the embedded copy is the only live procedure, and
it drifts from the SKILL.md it claims to summarize. RFC-0032 F3's chosen direction is to **preload
via `skills:` for the agents whose embedded copy genuinely mirrors a skill, and add `Skill` to
those agents' `tools` allowlist so the on-demand hint resolves** — explicitly **scoped to agents
with a real mirror, not blanket** (RFC-0032 rejects "add `Skill` everywhere and keep the prose",
and rejects "delete the embeds" — the embed stays as the offline fallback for standalone use).

### The census — which of the 11 agents genuinely mirror a canonical skill

The finding's guard: blanket-adding `skills:` to an agent that only *half*-mirrors a skill injects
misleading startup context (e.g. an orchestrator's procedure preloaded into the worker it fans
out). The mirror test applied below: (a) the agent declares a **single** canonical skill in its
Skill-hint block, (b) that skill **ships in this repo** (`plugins/swe-flow/skills/`), and (c) the
agent's **scope matches** the skill's scope — the agent body is a condensation of that one
SKILL.md, not a sub-component the skill dispatches, one of several conditional skills, or a
cross-cutting discipline the agent merely applies.

| Agent | Declared canonical skill | Mirror? | Verdict / reason |
|---|---|---|---|
| `distiller` | `swe-flow:distill-learnings` | **YES** | Same scope: agent IS the DISTILL step; embedded inputs/three-laws/output-contract condense the skill's procedure. **PRELOAD.** |
| `drafter` | `swe-flow:spec-author` | **YES** | Same scope: agent's 6-step embedded procedure (discover schema → write doc → self-validate) condenses spec-author. **PRELOAD.** |
| `red-teamer` | `swe-flow:spec-red-team` | **YES** | Near-verbatim: steelman → attack → self-refute → rank → kill criterion, 1:1 with the skill. **PRELOAD.** |
| `judge` | `swe-flow:substance-judge` | no | **Scope mismatch (orchestrator↔worker).** The skill body states "You orchestrate; the `swe-flow:judge` agent scores" — substance-judge fans out judges; the judge agent is the worker, not a summary of the orchestrator. Preloading the orchestration (corpus discovery, floor gate, RFC-0020 selftest, cross-model) is misleading context. EXCLUDE. |
| `implementer` | `swe-flow:working-discipline` | no | **Half-mirror.** working-discipline is a cross-cutting 21-checkpoint discipline ("NOT a procedure"), applicable by many roles; the implementer body is a fan-out contract (allowed paths, hard edges, gates, return). The body is not a condensation of the skill. EXCLUDE (see Design & risks — owner may opt to inject it on its own merit). |
| `test-author` | `superpowers:test-driven-development` | no | **Cross-plugin external skill**, not shipped in this repo. Preload would depend on the `superpowers` plugin being installed; out of scope for a swe-flow canonical mirror. EXCLUDE (flag). |
| `architect` | `ddd-flow:3-decompose` \| `swe-flow:api-designer` \| `swe-flow:data-model` | no | **Router across three conditional skills**, not a summary of any one. Preloading all three injects heavy, mostly-irrelevant context. EXCLUDE. |
| `doc-keeper` | none — "this agent is the canonical procedure" | no | Self-declared no mirror. EXCLUDE. |
| `reviewer` | none — "this agent is the canonical procedure" | no | Self-declared no mirror (the finding's cited example). EXCLUDE. |
| `verifier` | none — "this agent is the canonical procedure" | no | Self-declared no mirror. EXCLUDE. |
| `analyst` | (no Skill-hint block; "the one discipline that is yours, not a skill's") | no | Declares no canonical skill at all. EXCLUDE. |

**Result: exactly 3 agents get the preload — `distiller`, `drafter`, `red-teamer`.** The other 8
are excluded for a stated reason. `judge`, `implementer`, and `test-author` each *declare* a single
skill in prose but fail the scope/ships-here test; that prose "this file is its summary" line is
inaccurate for `judge` and `implementer` and should NOT be trusted as the preload signal.

`Blocked by:` none. Phase 3 is additive authoring metadata on top of the green tree; independent of
the other RFC-0032 slices (F3 is the **only** finding touching `agents/*.md` — disjoint from every
other slice, therefore parallel-safe with all of them).

`Touches:` `plugins/swe-flow/agents/distiller.md`, `plugins/swe-flow/agents/drafter.md`,
`plugins/swe-flow/agents/red-teamer.md` — **front-matter only** (add a `skills:` key; append
`Skill` to the existing `tools:` allowlist), one file per agent, disjoint. Reads the other 8
`agents/*.md` and the referenced `skills/*/SKILL.md` for the census (does not modify them).

## Testable-or-not

**Not backed by an automated test in this slice (testable = false).** The acceptance criteria are
structural/prose. The *presence* half (a given agent's front-matter carries `skills: [...]` and
`Skill` in `tools:`) is grep-checkable by inspection, but this slice adds **no** test file and **no**
new `skill-lint` rule — the load-bearing claim, "this agent *genuinely* mirrors that skill", is a
human judgment recorded in the census above, not something a deterministic gate asserts. So the
verification is code review against the census, not a red/green test. `bun run verify` stays green
because no governed doc changes; the edits are plugin authoring metadata only.

## Acceptance criteria

- [ ] `plugins/swe-flow/agents/distiller.md` front-matter gains `skills: [swe-flow:distill-learnings]`
      and `Skill` is appended to its existing `tools:` list (Read, Grep, Glob, Bash → + Skill).
- [ ] `plugins/swe-flow/agents/drafter.md` front-matter gains `skills: [swe-flow:spec-author]` and
      `Skill` is appended to its existing `tools:` list.
- [ ] `plugins/swe-flow/agents/red-teamer.md` front-matter gains `skills: [swe-flow:spec-red-team]`
      and `Skill` is appended to its existing `tools:` list.
- [ ] No `skills:` key is added to the other 8 agents (`analyst`, `architect`, `doc-keeper`,
      `implementer`, `judge`, `reviewer`, `test-author`, `verifier`) — the census records why each
      is excluded.
- [ ] For each of the 3 edited agents, `Skill` is **appended** to the existing `tools:` allowlist,
      never replacing it — the prior tools (Read/Grep/Glob/Bash/Write/Edit as present) are all still
      listed, so the exclusive-allowlist does not silently strip a tool the agent needs.
- [ ] The declared skill name in each `skills:` value resolves to a real skill dir under
      `plugins/swe-flow/skills/` (`distill-learnings`, `spec-author`, `spec-red-team`), matching the
      plugin-scoped name the agent already cites in its Skill-hint block.
- [ ] The embedded "Skill hint (load on demand)" prose block and the embedded procedure remain in
      each edited agent (the embed stays the offline fallback for standalone use — RFC-0032 rejects
      deleting it); only front-matter is added.
- [ ] `bun run verify` remains green — this is plugin authoring metadata, no governed-doc edit.

## Design & risks

Medium end of LOW-MED. The mechanism is two front-matter facts from claude-subagents.md: `skills:`
injects the named skill's **full content at startup** (independent of `tools`), and `tools:` is an
**exclusive allowlist** — so `Skill` must be present for the on-demand "invoke it if listed" hint to
have any effect. The failure modes a reviewer should attack:

- **Census over-reach (the primary attack).** For each of the 3 included agents, confirm the agent
  body really is a condensation of the named SKILL.md — not a worker the skill dispatches (the
  `judge`/substance-judge trap) nor a discipline it merely applies (the `implementer`/working-
  discipline trap). A wrongly-included agent gets misleading context injected every dispatch. The
  census table is the artifact to falsify.
- **Exclusive-allowlist strip.** Appending `Skill` to `tools:` is safe only if every prior tool is
  preserved. If the edit rewrites `tools:` and drops (say) `Bash` from `red-teamer`, the agent
  silently loses a capability it uses. Reviewer must diff the tool set, not just confirm `Skill`
  appears.
- **`disable-model-invocation` interaction.** Two of the three target skills carry
  `disable-model-invocation: true` (`distill-learnings`, `spec-red-team`; `substance-judge` too, but
  it is excluded). Preload via `skills:` injects content regardless of that flag, but the flag
  blocks *model* auto-invocation — so adding `Skill` to `tools` may leave a **dead on-demand hint**
  (the agent cannot Skill-invoke a model-invocation-disabled skill). Confirm which half is actually
  load-bearing: if only the startup injection works, the `Skill`-in-tools edit is cosmetic for those
  two and the value is the preload alone. This is worth a live check before claiming the hint
  resolves.
- **Name-format silent no-op.** If `skills:` expects bare names but is given plugin-scoped ones (or
  vice-versa), preload silently injects nothing and the drift persists undetected. Verify the
  accepted format against a working example, not by assumption.

## Non-goals

- Adding `skills:`/`Skill` to any agent that only half-mirrors or does not mirror a skill —
  `judge`, `implementer`, `test-author`, `architect`, and the four "canonical skill: none"/no-skill
  agents stay untouched. Injecting a skill an agent does not summarize is the failure this slice
  exists to avoid.
- Preloading the `superpowers:test-driven-development` skill into `test-author` — it is a cross-
  plugin dependency, not a swe-flow canonical mirror; wiring it would couple the agent to an
  external plugin's install state. Recorded, not done.
- Deleting or rewriting the embedded "Skill hint" prose or the embedded procedures — RFC-0032
  rejects removing the embeds (they are the offline fallback); this slice only adds front-matter.
- Rewriting the ddd-flow / api-designer / data-model router logic in `architect.md` into a preload —
  a three-way conditional is not a mirror.
- A new `skill-lint` rule that enforces "an agent that declares one mirrored skill must preload it"
  — that would be the deterministic follow-on to this census, but it is not in this slice's scope.
