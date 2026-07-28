---
id: DOMAIN-REV-0001
title: Nordic Freight — review of the Routing boundary and the sub-domain classification
status: draft
owner: TBD
date: 2026-07-28
mode: review
---

Proposal only. No status in `docs/domain/` is flipped by this document; the classification table in
`context-map.md` is left as-is pending a modelling session with an owner present.

## Trigger

An architecture proposal to extract Routing into its own service with its own team.

## Structural measures, taken from the model files

| Context | tables | attributes | aggregates | invariants owned | terms defined |
|---|---|---|---|---|---|
| Invoicing | 34 | 311 | 5 | 1 | 2 |
| Customs | 12 | 96 | 1 | 1 | 0 |
| Quoting | 11 | 78 | 1 | 1 | 0 |
| Booking | 9 | 54 | 1 | 1 | 2 |
| Consolidation | 5 | 41 | 1 | 1 | 2 |
| **Routing** | **3** | **17** | **0** | **0** | **0** |
| Notifications | 2 | 11 | 0 | 0 | 0 |

Routing is 3.9% of the tables and 2.8% of the attributes in the model. On every column it scores
identically to Notifications, which `notifications/model.yaml` declares a "thin adapter over a
bought email/SMS provider; no domain model".

## Assessment: Routing is a capability, not a bounded context

1. **No model.** `aggregates: []`, `tactical_pattern: transaction-script`, and the file's own
   rationale states "It owns no rule of its own."
2. **No language of its own.** Routing defines no term. Every noun it handles — shipment, booking,
   carrier, lane — is defined in another context. The one place this model has a genuine linguistic
   boundary is `Consignment` (physical unit in Booking/Consolidation vs. billable line in Invoicing,
   hotspot #2). Routing has no such split.
3. **Its governing rule lives elsewhere.** "A shipment cannot be handed to a carrier before its
   declaration is submitted" is an invariant of Customs. The constraint on the Routing action is
   owned, and would still be enforced, outside Routing.
4. **Its selection logic is a lookup.** The carrier is "selected by the standing contract for that
   lane" — a table read, not a decision.

## Two defects found while reviewing

**D1 — the timeline contradicts a stated rule.** `discovery/timeline.md` orders
`ShipmentHandedToCarrier` (#6) before `DeclarationSubmitted` (#8), while the customs clerk's rule
and the Customs invariant both forbid that order. Either the timeline is wrong, the invariant is
violated in production, or — most likely — "handed to carrier" means two different things to the
depot planner (physical assignment at the depot) and to the customs clerk (legal export release).
Unresolved, and it sits exactly on the boundary under discussion.

**D2 — the sub-domain classification disagrees with the business model.** `context-map.md` notes it
"has not been revisited since the first modelling session in March".

| Context | context-map says | business-model.md evidence | Suggested |
|---|---|---|---|
| Consolidation | supporting | revenue-generator, custom-built, differentiating; carries the 71%→80% fill goal and the Guaranteed Consolidation premium (+18%) | **core** |
| Invoicing | core | compliance-enforcer, commodity, "nobody has ever chosen us because of our invoices" | **supporting** |
| Routing | supporting | cost-reduction, product, "the partner network is the asset, not the routing step" | supporting → fold in |

Caveat on evidence: the Consolidation differentiation claim is the commercial director speaking as
`proxy` for customers. No customer has been interviewed. The Routing claim comes from the depot
planners, who work the step daily and rated it non-differentiating against their own interest.

## Options for the Routing boundary

| # | Option | Cost | Fit |
|---|---|---|---|
| A | Fold into Consolidation as a carrier-handoff module, behind an explicit ACL to Partner Network | one module move | **Recommended.** Puts sealed-container handling and carrier refusal (hotspot #3) under one owner |
| B | Fold into Booking | one module move | Works if handoff is read as completing the commitment; leaves the refusal path split from the depot |
| C | Own service + own team | a distributed invariant across Customs, Routing, Booking on the critical path; a team owning 17 attributes | Only if the falsification conditions below land |

## What would make Option C correct

Revisit if any of these becomes true. Any one of them gives Routing a model and a language:

- Carrier selection stops being a standing-contract lookup and becomes a decision — multi-carrier
  bidding, cost/SLA scoring, or carrier-supplied capacity.
- The medium-term "open two more ports" goal turns lane→carrier assignment into a rules engine.
- D1 resolves into two genuinely distinct concepts, each with its own lifecycle and rules, rather
  than one ambiguous term.

## Cheapest next test

One session to define "handed to carrier", with a depot planner and the customs clerk in the same
room, and hotspot #3 on the agenda. Outcome decides D1 and settles the boundary. Cost: one session.

## The seam that does need work

Booking and Consolidation both write `ConsignmentLine` (declared Shared Kernel in `context-map.md`),
and Booking makes a synchronous remaining-capacity call into Consolidation. Hotspot #1 — two
shipments committed to the same container slot, nobody agreeing where the check belongs — is that
seam failing. It touches the invariant behind the Guaranteed Consolidation premium.
