---
name: 8-code
description: Event-model each use case into slices, then author one aggregate design canvas per aggregate the slices touch — deciding what stays consistent inside one transaction and what is repaired afterwards. Use whenever a context has a defined canvas and a first-pass model.yaml and needs its aggregates designed, invariants and corrective policies pinned, or throughput/size re-checked against a boundary — invoked by ddd-flow:design or directly. The last modelling step before the model becomes code; not for writing the implementation.
paths: docs/domain/**
---

# Code — what stays consistent in one transaction, and what gets repaired afterwards?

You already know event modelling, the aggregate design canvas, and the invariant-versus-corrective-
policy trade-off. This skill does **not** re-teach that — it gives only what a strong model gets
wrong by default here, plus the exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Aggregates**, **Right-size**,
and **Boundaries** sections govern this step (with the [8]-tagged **Grounding** and **Honesty**
rules). They are the rules, not the method — do not proceed without them.

## Consumes → produces
- **Read:** `docs/domain/<context>/README.md` (the context canvas — purpose, business decisions,
  quality attributes), `docs/domain/<context>/model.yaml` (first-pass aggregates/entities/VOs/events),
  and `docs/domain/message-flows/` (which commands cross in, and the throughput/client inputs).
- **Write:** one `docs/domain/<context>/aggregates/<Name>.md` canvas per aggregate the slices touch
  (the gate's evidence); optionally the phase-1 `event-model/README.md` and the `code-structure.md`
  structural contract.

## Output contract (what the gate parses — obey exactly)
Author every canvas to the aggregate-canvas shape in **`../../references/artifact-shapes.md`**. Obey
the budgets (aggregate canvas ≤150, `event-model/README.md` ≤200, `code-structure.md` ≤120) and the
one marker the gate parses: any `relax` / `eventual` / `not enforced` wording MUST be met by a
`## Corrective policies` section (check 10 `relaxed-without-policy`, HIGH).

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Never invent an invariant.** Take invariants only from stated business rules — inferring "an invoice
must have at least one line" because it sounds right manufactures a constraint the business never asked
for, and unlike a missing rule a fabricated one is enforced by the code and discovered by a customer.

## Done
Run `ddd_check` (grounding + structure gate); resolve blocking gaps; keep `open_questions` populated
honestly. Where a canvas contradicts `model.yaml`, **propose** the delta — `3-decompose` owns that
file, never hand-edit it here. Design stops at the structural contract — no skeleton classes.
