---
id: PRD-0001
title: govkit product vision
status: approved
owner: baodq97
date: 2026-06-09
---

# PRD-0001 — govkit product vision

> **This is the stable charter — the north star, personas, non-goals.** The *volatile* half —
> which slice ships next, in what order, at what priority — lives ungoverned in
> [`docs/ROADMAP.md`](../ROADMAP.md), per the vision/roadmap split in
> [`the-flow.md`](../the-flow.md). Do not add sequencing or theme priority here; it belongs there.

## Problem / context

govkit shipped its emergent v1 — RFC-0001…0010 are all `implemented` — but the repo
carries **no forward roadmap and no PRD**: `docs/product/` did not exist before this
doc. The project is at a clean inflection point between "v1 grew by RFC" and a
deliberate next phase.

What makes this roadmap unusual is its evidence base. govkit now has **two real
consumers** that exercise it end-to-end — `customs-platform` (TypeScript / NestJS SaaS,
34 PRs, wave harness) and `alert-triage-agent` (Python / no-framework agent, US-backlog
harness). Most governance tools roadmap from imagination; govkit can roadmap from n=2
friction evidence. This PRD anchors every theme to a concrete consumer signal rather
than a guess.

## Persona / audience

- **Primary — the maker.** govkit is the real artifact; `customs-platform` and
  `alert-triage-agent` are proving grounds whose friction measures govkit quality.
  Goal: develop govkit to its maximum.
- **Secondary — future external consumers** who run `govkit init`, **pin** govkit and
  **install** the swe-flow plugin (never copy engine source).
- **Constraint persona — non-Claude CI contributors** who must run every gate with
  **no API key**. This invariant outranks any feature.

## Success metrics / north star

North star = **govkit's confusion matrix on real artifacts**:
- **FP (false block)** → 0 — a gate that blocks a legitimate doc drives `--no-verify`
  and erodes trust, which is the product.
- **FN (gaming / stub escape)** — every known vector catalogued in the adversarial
  corpus (`packages/govkit/eval/`); the corpus, not rule count, is the compounding asset.
- **Scope-escape** — governance-worthy change that no gate touches — shrinking over time.

Supporting signals: **feature adoption by consumers** (not self-use), and **generality
proven at n≥3** dissimilar usecases (today n=2). Quantified anchor from the proving
grounds: alert-triage's quality loop lifted its judge mean from 73.8 to 84.1 and cut
verify-hook false flags from 10 to 3 cases — that eval loop is the measurement template
this roadmap generalizes into govkit.

## Scope — capabilities, not sequencing

This charter fixes *what govkit is for* and *what would make it fail*; it deliberately does not
fix *what ships next*. The theme roadmap (R0–R7 — publish, generality, substance-judge, init
scaffold, glue plugins, harness generator, adoption loop, learning flywheel), the evidence behind
each, the running friction-log spine, and their sequencing all live in the ungoverned
[`docs/ROADMAP.md`](../ROADMAP.md), because priority order churns monthly and a governed doc that
churns monthly is the stale doc govkit exists to prevent.

What stays fixed here: the confusion-matrix north star, the three personas (maker / external
consumer / no-key CI contributor), and the non-goals below. A theme is only in scope for the
product at all if it serves the north star and violates no non-goal.

## Non-goals

- Coupling the deterministic, no-API-key core to any LLM or plugin layer — this kills
  the CI invariant and the product.
- Generating harness **rules** — the generator emits structure only; rules stay earned
  per usecase through friction and retro.
- Trusting the harness generator before it is validated on an n≥3 usecase built outside
  the current author's DNA.
- A drift-free monorepo scaffold — only the governance contract can be drift-free; the
  code scaffold diverges the moment a consumer writes code.

## Reference data — where the evidence lives

- **Inside govkit:** `docs/rfc/RFC-0001…0010` (the past roadmap + rationale), `RFC-0001`
  (the two-trust-layers thesis and honest boundary), `LEARNING-LOOP.md` (self-dogfood
  friction), `packages/govkit/eval/` (the adversarial corpus / trust anchor),
  `govkit.yml` (the config schema), `README.md`.
- **Proving grounds:** `customs-platform/docs/known-traps.md` (~30 KT friction) +
  `.claude/harness-metrics.md` + retros; `alert-triage-agent/docs/evals/` (quality-loop
  reports, cross-model run) + its tmem scenes.
- **Generality dataset:** the `diff` of the two consumers' `govkit.yml`.
- **External concepts:** loop / harness-engineering (Osmani, Fowler,
  awesome-harness-engineering), Lean Startup build–measure–learn.

## Open questions / risks

- **Author-DNA monoculture.** n=2 are dissimilar in stack and domain but share one
  author, one week, one meta-taste (doc-chain-first, never-self-flip,
  ubiquitous-language, adversarial-eval). n=2 unlocks generator *design*, not proven
  generality — R5 needs an external n=3 first. (Sequencing consequences of this risk live in
  [`docs/ROADMAP.md`](../ROADMAP.md) § *Sequencing*.)
- **govkit over-fitting itself.** The advanced chain features were built for govkit's own
  repo and adopted by neither consumer — R6 must measure adoption, not self-use.

## Change history

| Date | Change |
|---|---|
| 2026-06-09 | Initial draft — first govkit roadmap, grounded in n=2 consumer evidence. |
| 2026-07-07 | R7 (learning flywheel) added from the harness/loop-engineering deep-research sweep (23 claims survived 3-vote adversarial verification); RFC-0011 (working-discipline skill) shipped and mapped to R4; RFC-0012 (journal + calibrate) drafted as R7's first slice. |
| 2026-07-29 | R7 evidence row corrected: the "no tool has deterministic drift detection" claim is stale — VeriContext (hash-based, fail-closed) verified as shipping prior art; catalogued in US-0005 rather than treated as a threat to R7 (calibrate + corpus remain uncontested). Field-verification session, web-sourced. |
| 2026-07-31 | Split into charter + roadmap: the R0–R7 theme table, running spine, R7 rationale, and sequencing moved verbatim to the ungoverned `docs/ROADMAP.md`; this doc retitled *govkit product vision* and reduced to the stable charter, per the vision/roadmap doctrine in `the-flow.md`. No content lost — relocated. |
