---
id: DOMAIN-CTX-CONS-0001
title: Consolidation — context summary
status: draft
owner: TBD
date: 2026-07-27
---

# Consolidation

> **Bounded Context Canvas: not run.** `domain-define` has not been run for this context, so there
> is no canvas here — no stated business decisions, no quality attributes, no inbound/outbound
> communication table. This file currently carries only the aggregate summary produced by
> `domain-code`. The invariants below come from `docs/domain/discovery/timeline.md` with
> attribution; none was inferred from the missing canvas.

## Aggregates

| Aggregate | Root | Canvas | Enforced invariants | Corrective policies | Conflict risk |
|---|---|---|---|---|---|
| `ContainerLoad` | `ContainerLoad` | [aggregates/ContainerLoad.md](aggregates/ContainerLoad.md) | 1 — committed volume ≤ capacity | 0 (deliberately; see below) | medium overall, **high in the hour before departure cut-off** |

One aggregate, because one rule has been stated and it is scoped to one container on one departure.
`Departure` was considered and rejected: it would serialise every booking on a sailing onto a single
instance, at exactly the hour the burst arrives.

## The decision worth knowing

The capacity rule stays **enforced inside the aggregate**, not relaxed into detect-and-repair, even
though the pre-cut-off burst is what makes relaxing tempting. Two reasons:

- repairing an overcommit means bumping a consignment, which breaks the Guaranteed Consolidation
  promise the customer paid +18% for;
- there is no corrective policy to relax *into* — nobody has stated who gets bumped, whether the
  premium is refunded, or who is notified. A relaxed invariant with no named corrective policy is an
  unhandled defect, not eventual consistency.

Cost accepted: optimistic-lock conflicts and retries concentrated in the cut-off hour. Mechanism: a
`version` on `ContainerLoad` plus a bounded application-layer retry that re-reads and re-evaluates
the rule.

Consequence for Booking: its synchronous remaining-capacity call is **advisory** (a query for the
UI). The reservation is the decision and it may reject. Check-then-act across the boundary is what
produced the March double-commit (hotspot 1).

## Right-sizing note

`context-map.md` labels this context `supporting`, which would earn a transaction script and no
canvas. `business-model.md` records container fill as the differentiator, custom-built, and the
source of the premium. This context was treated as **core** on that evidence; the label contradiction
is routed to `domain-strategize`, not resolved here.

## Blocking questions

Seven open questions (cut-off semantics, overcommit repair, cancellation/release, containers per
departure, arrival profile, stacking/hazard rules, sealing ownership) are listed with named owners at
the end of the `ContainerLoad` canvas. Q1–Q4 should be answered before implementation starts; the
rest can run alongside.
