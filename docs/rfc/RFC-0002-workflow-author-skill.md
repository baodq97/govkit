---
id: RFC-0002
title: Workflow-author — a skill that scaffolds reusable dynamic workflows
status: draft
owner: TBD
date: 2026-05-31
---

> Records a shipped decision for a new public, LLM-facing surface (root `AGENTS.md`
> § Lifecycle: the swe-flow `workflow-author` skill + the generated
> `.claude/workflows/*.js` contract). Status stays `draft`; the owner flips it to
> `accepted` on consensus — never an agent. Written *after* the skill shipped because
> the gate did not require it (see § Governance scope) — this RFC closes that loop by
> hand, the way config-not-code intends.

## Summary

govkit ships **one** hand-authored orchestration script, `.claude/workflows/sdlc.js`,
that drives PRD → RFC → ADR → US → Code. It is the most valuable artifact in the repo
and also the least reusable: a team that wants its *own* repeatable flow (a review
pipeline, a migration sweep, a doc-gap hunt) has nothing but copy-paste-and-hand-edit.

This RFC records the decision to ship **`workflow-author`** — a swe-flow skill that
turns a plain description of a repeatable, multi-step process into a deterministic
`.claude/workflows/<name>.js` script. The skill **composes what already exists** (the
`swe-flow:implementer` / `reviewer` / `doc-keeper` agents and the `govkit verify` gate)
into one of three proven shapes — **pipeline**, **fan-out in dependency waves**, and
**loop-until-done** — and embeds a mandatory by-hand fallback header. It is
*config-not-code applied to the flow itself*: a team governs its own orchestration
instead of forking `sdlc.js`.

## Motivation

A governance engine that can only run the workflow its authors imagined is a template,
not a platform. The trending agent harnesses (revfactory/harness, affaan-m/ECC,
obra/superpowers) all reach for the opposite extreme — they *generate whole agent teams
and coordination taxonomies*, which is the over-engineering this repo deliberately
avoids. The lean middle is: do not generate agents, **compose the three that exist**.
The skill's load-bearing rule — **"compose, never invent"** — is what keeps it a small
orchestration generator instead of a meta-framework. If a process genuinely needs a new
specialist agent, the skill stops and says so rather than inventing one.

## Design

- **One skill, one reference.** `SKILL.md` carries the trigger description, the
  "compose, never invent" rule, and the non-negotiables; `references/authoring-workflows.md`
  carries the runtime API, the three shape skeletons (each `node --check`-valid), the
  mandatory fallback header, and a deterministic validation checklist. Matches the
  one-reference shape of the sibling design skills.
- **Project-scoped output, never bundled.** Workflows write to `.claude/workflows/` in
  the consumer repo. `plugin.json` has **no** `workflows` field — verified — so a
  workflow cannot ship inside the plugin. The skill states this and writes to the repo.
- **Determinism stays in govkit.** A generated workflow wires `npx govkit verify` (or a
  `swe-flow:reviewer` gate) at each checkpoint; it never reimplements the gate in JS, and
  a reviewer verdict controls **flow only** — it never flips a `status:` or assigns an
  owner. The workflow is an accelerant; govkit + the PreToolUse hook remain the source of
  truth whether the workflow runs or is disabled.
- **Dogfooded.** The skill generated `.claude/workflows/review-changes.js` (the pipeline
  shape) as its own first example, which passes `node --check` and the full structural
  checklist.

## Governance scope — the Loop-1 finding this RFC closes

Running `govkit verify` + `govkit eval` on this repo after the skill shipped reported
`OK — 2 doc(s) checked` and said **nothing** about the new skill, the new workflow, or
the three manifest version bumps. That silence is correct, not a bug: `govkit.yml`
governs four doc dirs (`docs/product|rfc|adr|issues`) and the plugin surface is outside
its scope by design. The decision recorded here is to **keep it that way** and govern
plugin-surface changes through the existing doc chain (this RFC) rather than teaching the
engine to crawl `plugins/`. Extending the gate to scan skills would couple the
deterministic no-key core to the LLM-facing layer it is meant to stay independent of —
the exact over-reach this project rejects.

## Impact and rollout

- **Backward-compatible.** Purely additive: a new skill file, a new reference, a new
  example workflow. No engine change, no `govkit.yml` change, so every existing consumer
  is unaffected and the no-API-key invariant is untouched (`git status -- packages/govkit`
  is empty for this change).
- **Adoption.** A consumer with the swe-flow plugin installed invokes the skill, gets a
  validated `.claude/workflows/<name>.js`, and runs it from `/workflows`. The manual
  fallback in every generated header means a disabled-workflows environment degrades to a
  documented by-hand sequence, not a broken flow.
- **Migration risk:** low. The only new failure mode is a generated workflow that
  references the plugin when it is not installed — the skill checks for this and refuses
  to emit a broken dispatch.

## Alternatives

| Option | Why rejected |
|---|---|
| Generate agent *teams* per request (the harness/ECC approach) | Heavyweight and the over-engineering this repo avoids; a team is far more than a flow. Composing three fixed agents covers the real need. |
| Hand-edit `sdlc.js` per new flow | Not reusable, not versioned, and silently drifts; every team re-derives the runtime gotchas (`meta` literal, no top-level `return`, phase realization). |
| Teach `govkit verify` to scan `plugins/` for ungoverned skills | Couples the deterministic no-key core to the LLM-facing layer it must stay independent of; record surface changes through the doc chain instead. |
| Bundle workflows inside the plugin | Impossible — `plugin.json` has no `workflows` field. Workflows are project-scoped by the platform. |

## Open questions

- **Skill-to-workflow round-trip.** Should `workflow-author` also offer to *run* the
  workflow it just wrote, or stay strictly at "ready to run" to keep authoring and
  execution separate? Current design stops at handoff.
- **A fourth shape.** The three shapes cover the cases seen so far; a genuinely new
  topology (a tournament bracket, a self-repair loop) would need its own skeleton and
  validation — deferred until a real flow demands it, not built speculatively.
- **Scaffolding on init.** Should `npx govkit init` drop a starter workflow the way it
  drops INDEX files? Today it does not, which is a deliberate risk to revisit: a starter
  may help adoption or may become stale boilerplate.

## Recommendation

Ship `workflow-author` as recorded: one skill plus one reference, composing the existing
swe-flow agents and the `govkit verify` gate into three proven shapes, dogfooded by
`review-changes.js`, and **no engine change**. Govern this and future plugin-surface
changes through the doc chain (this RFC), keeping the deterministic core independent of
the LLM-facing layer. Defer the run-it round-trip, a fourth shape, and init-scaffolding
to future work, each behind its own decision.
