---
id: PRD-0001
title: govkit roadmap & product vision
status: draft
owner: TBD
date: 2026-06-09
---

# PRD-0001 — govkit roadmap & product vision

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

## Scope — roadmap themes (R0–R6)

Sequenced by leverage and dependency. Each theme cites the consumer evidence that
justifies it.

| # | Theme | Deliverable | Evidence (where it came from) |
|---|---|---|---|
| **R0** | Publish to npm | `npx govkit` resolves from the registry; retire vendored tarball / private install | Both consumers vendored or `gh auth switch`-installed govkit (n=2 onboarding wall) |
| **R1** | Generality hardening | `govkit.yml` fully parameterizes the diverging surface (status vocabularies, extra required keys, extra doc types); add a 3rd dissimilar usecase | `diff govkit.yml` customs↔alert: kernel (shared) vs config-surface (diverged) |
| **R2** | Substance-judge plugin (Layer 3) | Productize the keyed, opt-in eval judge govkit defers to today: pinned judge, cross-model run, scoring anchors, deepeval-compatible | alert-triage already built a working reference impl (`docs/evals/`); RFC-0001 defers this layer |
| **R3** | `init` scaffold (kit) | `govkit init` emits governance (pinned, drift-free) **and** a pluggable monorepo template (copied, consumer-owned) as two distinct outputs | ADR-0001, `template/`; need to absorb sibling `monorepo-template` without baking one stack |
| **R4** | Glue / loop plugins | One-person-company automation layer; strictly one-directional (plugins consume govkit, govkit never consumes a plugin) | customs `.claude/` wave harness; loop/harness-engineering discourse |
| **R5** | Harness generator | Meta-plugin that emits per-usecase skill/agent **structure** + a product-domain glossary; never fabricates rules | n=2 kernel defines what is generatable; **gated until n≥3** |
| **R6** | Adoption-driven feature loop | Make RFC-0008/0009/0010 opt-in with onboarding that pulls real consumer need; measure features by consumer adoption | Both consumers needed as-built honesty yet adopted it by hand, not via RFC-0010 |

Running spine across all themes: a **friction log** (per consumer wave, classify each
`verify`/`eval` outcome as FP / FN / scope-escape) feeding the confusion matrix and the
adversarial corpus.

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
  generality — R5 needs an external n=3 first.
- **Sequencing.** R0 (npm) unblocks adoption measurement that R1/R6 depend on; do it
  first.
- **govkit over-fitting itself.** The advanced chain features were built for govkit's own
  repo and adopted by neither consumer — R6 must measure adoption, not self-use.

## Change history

| Date | Change |
|---|---|
| 2026-06-09 | Initial draft — first govkit roadmap, grounded in n=2 consumer evidence. |
