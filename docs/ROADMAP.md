# govkit roadmap

> **Ungoverned by design.** This file is the *volatile* half of product planning — which slice
> ships next, in what order, at what priority. It churns monthly, so it lives **outside every
> governed type dir**: no front-matter, no `status`, no INDEX row, no `draft→approved` gate.
> Putting a monthly-churning list under a lifecycle gate manufactures the exact stale doc govkit
> exists to prevent (see [`the-flow.md`](./the-flow.md) § *The vision is governed; the roadmap is not*).
>
> The **stable** half — the north star, personas, non-goals, success metrics — is the charter in
> [`PRD-0001`](./product/PRD-0001-govkit-roadmap.md), ratified to `approved` and rarely moved. Read
> that first for *why*; this file is *what next*.

## Themes (R0–R7)

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
| **R7** | Learning flywheel | Deterministic gate-outcome journal (`--journal` JSONL sensor) + `govkit calibrate` (confusion-matrix precision/recall/F1 vs the labeled adversarial corpus, pinned baseline, FP>0 fails CI) as the no-key foundation; then an opt-in, keyed swe-flow `learning-distiller` that turns journal + escape-log into PROPOSED corpus fixtures / AGENTS.md rules via PR (never auto-applied; corpus append-only; every gate change must pass calibrate) | Evidence: 2026-07 deep-research sweep — OpenAI agentic-governance cookbook ("run evals on every policy repo change"), Anthropic hooks guidance (deterministic enforcement), Fowler SDD review (at the time, no tool had deterministic drift detection — since stale: VeriContext ships hash-based fail-closed doc↔code verification, catalogued as prior art in US-0005; govkit's differentiators remain calibrate + the labeled corpus + anchored FP-tolerant citations); RFC-0012 is the first slice. |

Running spine across all themes: a **friction log** (per consumer wave, classify each
`verify`/`eval` outcome as FP / FN / scope-escape) feeding the confusion matrix and the
adversarial corpus.

### R7 rationale — closing the loop

The running spine above is today manual: a human classifies each wave outcome and
hand-feeds the confusion matrix. R7 automates SENSE (the journal, deterministic core)
and DISTILL (the keyed plugin, proposal-only) while RATIFY stays human — proposals land
as PRs, never as applied changes. `calibrate` is the immune system that makes
self-improvement safe: a learning loop that can weaken its own gates would otherwise
learn to pass itself. The 2025-07 research finding was that the F1–F5 candidates map
onto R1/R2/R4/R5/R6 extensions; R7 is the only genuinely new theme.

## Sequencing

- **R0 (npm) goes first** — it unblocks the adoption measurement that R1/R6 depend on.
- **R5 (harness generator) is gated until n≥3** — n=2 unlocks generator *design*, not
  proven generality; it needs an external third usecase built outside the current
  author's DNA first (see the *author-DNA monoculture* risk in `PRD-0001`).

## Change history

| Date | Change |
|---|---|
| 2026-06-09 | Initial draft — first govkit roadmap, grounded in n=2 consumer evidence. |
| 2026-07-07 | R7 (learning flywheel) added from the harness/loop-engineering deep-research sweep (23 claims survived 3-vote adversarial verification); RFC-0011 (working-discipline skill) shipped and mapped to R4; RFC-0012 (journal + calibrate) drafted as R7's first slice. |
| 2026-07-29 | R7 evidence row corrected: the "no tool has deterministic drift detection" claim is stale — VeriContext (hash-based, fail-closed) verified as shipping prior art; catalogued in US-0005 rather than treated as a threat to R7 (calibrate + corpus remain uncontested). Field-verification session, web-sourced. |
| 2026-07-31 | Roadmap themes R0–R7 split out of PRD-0001 into this ungoverned file, per the vision/roadmap doctrine shipped in `the-flow.md`. PRD-0001 retains the stable charter (north star, personas, non-goals); no theme content lost, only relocated. |
