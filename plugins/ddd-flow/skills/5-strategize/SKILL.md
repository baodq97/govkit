---
name: 5-strategize
paths: docs/domain/**
description: Assess which bounded contexts deserve the investment and decide build vs buy vs outsource, plotting each on a Core Domain Chart in the ddd-flow modelling loop. Use whenever a decomposed domain needs its contexts ranked by complexity against differentiation, a build/buy call, or an investment-mismatch check — invoked by ddd-flow:design or directly. Proposes reclassification deltas but never edits model.yaml (3-decompose owns that); not for drawing boundaries.
---

# Strategize — which parts deserve the investment, and what do we buy vs build?

You already know Core Domain Charts, the complexity/differentiation axes, quadrant readings, and
build/buy/outsource strategy. This skill does **not** re-teach that — it gives only what a strong
model gets wrong by default here, plus the exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Grounding**, **Boundaries**,
**Right-size**, and **Honesty** sections govern this step. They are the rules, not the method — do
not proceed without them.

## Consumes → produces
- **Read:** each `docs/domain/<context>/model.yaml` (aggregates, invariants, events — the
  **complexity** axis), `docs/domain/business-model.md` (`differentiation`, `evolution_stage`,
  revenue — the **differentiation** axis), and `docs/data/` + `docs/domain/message-flows/` where
  they exist (model mass and cross-context coupling, to sharpen complexity).
- **Write:** `docs/domain/core-domain-chart.md`.

## Output contract (what the gate parses — obey exactly)
Author `core-domain-chart.md` to the shape and line budget in **`../../references/artifact-shapes.md`**
(Budget 150; ddd_check reads no content markers here, so a well-formed placement table and staying
under budget are the contract). Every `Qnn`/`Hnn` you cite must already be defined in
`business-model*.md` or `discovery/`.

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Differentiation comes from business evidence, never from the model.** A big model means the team
spent effort there, not that customers value it — that inference is exactly the bias this step
exists to break; a y value you cannot source from `business-model.md` stays `unknown`, which is a
real, informative answer. Same discipline on x: complexity is what the domain *requires*, not effort
spent or headcount.

## Done
Run `ddd_check`; resolve blocking gaps; keep `open_questions` populated honestly (an `unknown` y
with the question it needs beats a confident guess). Reconcile against each context's
`subdomain_type` and hand disagreements to `3-decompose` as proposed deltas — never edit
`model.yaml` here. Record the date and the bet behind each placement; fresh doc stays
`status: draft`, `owner: TBD`.
