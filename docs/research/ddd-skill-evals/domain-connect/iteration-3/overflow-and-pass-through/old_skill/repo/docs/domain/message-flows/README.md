---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

## Why the lifecycle is three flows, not one

The request was for the end-to-end lifecycle, quote through to invoice, as one flow. Drawn that
way it is **15 messages across 7 contexts and 2 external systems** — well past the 5-to-9 rule,
and past the point where a room can hold it.

| # | Messages |
|---|---|
| 1–9 | `RequestQuote` · `RateForLane?` · `QuoteIssued` · `RequestBooking` · `RemainingCapacity?` · `ReserveCapacity` · `CapacityReserved` · `BookingConfirmed` · `ShipmentHandedToCarrier` |
| 10–15 | `SealContainer` · `ContainerSealed` · `DeclarationSubmitted` · `DeclarationCleared` · `InvoiceIssued` · `CustomerNotified` |

An overflow this size means one of three things, and here it is the first: **several scenarios
wearing one name.** A shipment's lifecycle is not a use case — nobody sits down to do it, no single
decision completes it, and it spans days. Split on the two places the business actually pauses (the
customer accepts a price; a planner seals a container) and **no individual scenario exceeds nine
messages**: 9, 6, 1.

That distinction matters for what happens next. The loop-back trigger — *more than 9 messages in
one scenario, or one context appearing at every step ⇒ go back and re-cut* — **does not fire.**
Neither condition holds once the lifecycle is cut into scenarios, and no context appears in all
three flows (Consolidation appears in two, and decides something it owns in each, so it is not a
god context either). The decomposition is not refuted by the counts. It is challenged by five of
the twelve findings below, which is a different and weaker claim, and the difference is worth
keeping.

## The flows

| Flow | Scenario | Role | Why this one |
|---|---|---|---|
| [0001](0001-quote-to-booking-confirmed.md) | Quote accepted to booking confirmed | happy path | the design's own story; every shipment starts here |
| [0002](0002-sealed-to-invoiced.md) | Container sealed to customer invoiced | the money path | carries the Guaranteed Consolidation premium, the +18% the business is paid for |
| [0003](0003-carrier-refuses-sealed-container.md) | Partner carrier refuses a sealed container | failure path | discovery hotspot 3, still unowned |

## Counting checks

| Count | Flow 0001 | Flow 0002 | Flow 0003 | Threshold |
|---|---|---|---|---|
| messages | 9 | 6 | 1 | > 9 |
| distinct contexts | 4 | 4 | 1 | > 4 |
| queries crossing a boundary | 2 | 0 | 0 | > 0 |
| busiest pair, messages exchanged | 3 (Booking↔Consolidation) | 1 | 0 | ≥ 5 |
| longest synchronous chain | 2 hops | 0 | 0 | > 2 |

## Findings

All `proposed`. None has been accepted, declined, or applied — `3-decompose` owns the model and
`2-discover` owns the events; nothing under `docs/domain/*/model.yaml` or `context-map.md` was
edited by this step.

| # | Flow | Smell | Evidence | Hand to | Status |
|---|---|---|---|---|---|
| F1 | 0001 | Check-then-act across a boundary | msgs 5→6; hotspot 1's March double-booking | `3-decompose` | proposed |
| F2 | 0001 | Distributed invariant — capacity rule half-held by Booking | msgs 5, 6, 7 vs both contexts' invariants | `3-decompose` | proposed |
| F3 | 0001 | **Pass-through — Routing** decides nothing | msgs 8→9; `aggregates: []`, "owns no rule of its own" | `3-decompose` | proposed |
| F4 | 0001 | Invariant nobody can enforce (declaration before carrier) | msg 9 vs timeline #6 before #8; no Routing↔Customs relationship | `2-discover` | proposed |
| F5 | 0001 | Shared Kernel by payload — `ConsignmentLine` | msg 6; two writers, two attribute sets | `3-decompose` | proposed |
| F6 | 0002 | `ContainerSealed` cannot support the declaration it triggers | msgs 2→3; no `shipmentRef` crosses to Customs | `3-decompose` | proposed |
| F7 | 0002 | `DeclarationCleared` cannot support the invoice it triggers | msgs 4→5; no price or customer reaches Invoicing | `3-decompose` | proposed |
| F8 | 0002 | **The premium we are paid for has no message** | absent from 7 models and 11 events | `2-discover` | proposed |
| F9 | 0002 | "Consignment" means two things, translated across an undrawn boundary | msg 5; hotspot 2 | `2-discover` | proposed |
| F10 | 0002 | Pass-through — Notifications, judged legitimate | msgs 5→6; generic bought adapter | keep, record | proposed |
| F11 | 0003 | **Happy-path-only model** — 0 of 11 events are negative outcomes | three stated prohibitions, no refusal message | `2-discover` | proposed |
| F12 | 0003 | Unowned failure on carrier refusal | msg 1 is the last modelled message | `2-discover`, then `3-decompose` | proposed |

Two of these are worth reading before the rest. **F8** — the differentiating revenue stream is
invisible in the model — and **F11** — nothing anywhere says no. Both are absences, which is why
neither shows on the context map: a static map can only draw what was modelled, and these findings
are about what was not.

**F3 and F10 are both pass-throughs and only one is a problem.** Notifications wraps a bought
provider, which is a boundary worth keeping; Routing wraps a step, and a step is not a capability.
The test is whether the context decides anything, not how thin it is.

## What was not done here

No boundary was redrawn and no `model.yaml` was touched. Where a flow proves a boundary wrong it
says so and hands the change to `3-decompose` with the message numbers attached; where a flow
reveals a fact nobody discovered — a refusal, a premium being sold — it goes to `2-discover` to be
confirmed by people rather than promoted from our own inference.
