---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

## Verdict

Three scenarios walked message by message across the boundaries in `docs/domain/context-map.md`.
**Neither refuting condition fired.** No flow exceeds 9 messages (8, 6, 2), and no context appears
at every step — Booking is absent from FLOW-0002, Invoicing from FLOW-0001 and FLOW-0003. The set
of contexts is defensible; the split does not need re-cutting wholesale.

**Three seams do not hold.** Booking↔Consolidation is a check-then-act race on the invariant the
company's promise depends on (F1/F2). Routing hands shipments to carriers with no path to Customs,
so the happy path breaks a confirmed regulatory rule (F4). Invoicing has no inbound message that
could carry the Guaranteed Consolidation premium, so the revenue stream the business is built on
cannot be billed through these boundaries (G1). And the model has no word for *no*.

## The flows

| Flow | Scenario | Role | Why this one |
|---|---|---|---|
| [FLOW-0001](0001-book-a-part-load-shipment.md) | Book a part-load shipment onto a departure | happy path | the design's own story, and the scenario the team asked about |
| [FLOW-0002](0002-premium-billed-on-a-sealed-container.md) | Guaranteed Consolidation premium billed on a sealed container | money path | the +18% premium is the revenue stream the business model calls differentiating |
| [FLOW-0003](0003-the-departure-is-full.md) | The departure is full | failure path | hotspot 1 (the March double-commit) is a failure path, and failure is where the missing messages live |

Hotspot 3 — *a partner carrier refuses a sealed container* — was **not drawn**: Routing has no
refusal message and no relationship to any context that could re-plan, so tracing it would mean
inventing the flow. It is an open question in FLOW-0003 instead.

## Counting checks

| Check | Threshold | 0001 | 0002 | 0003 |
|---|---|---|---|---|
| messages | > 9 | 8 | 6 | 2 (floor breach — see H1) |
| distinct contexts | > 4 | 4 | 4 | 2 |
| boundary-crossing queries | > 0 | **1** (msg 4) | 0 | **1** (msg 2) |
| busiest pair, one flow | ≥ 5 | Booking↔Consolidation: 3 | Customs→Invoicing: 1 | 1 |
| longest synchronous chain | > 2 hops | 1 | 0 | 1 |

No chatty pair; every boundary-crossing query in the model is the same query, and F1 is about it.
FLOW-0002 is clean in shape — four contexts, six messages, no queries; its findings are about
payloads and language, not coupling.

## Consolidated findings — `proposed` / `accepted` / `declined`; nothing here has been applied

| # | Flow | Smell | Evidence | Status |
|---|---|---|---|---|
| F1 | 0001 | Check-then-act across a boundary | msgs 4→5; `booking/model.yaml` note *"synchronous remaining-capacity check before reserving"* | proposed |
| F2 | 0001 | Distributed invariant (container capacity) | msgs 4–6; invariant in Consolidation, decision in Booking | proposed |
| F3 | 0001 | Missing rejection on msg 5 | no negative event in any model | proposed |
| F4 | 0001 | Ordering invariant violated by the happy path | msgs 7→8 vs Customs invariant; timeline #6 precedes #8 | proposed |
| F5 | 0001 | Shared Kernel through a payload (`ConsignmentLine`) | msgs 3, 5; two attribute sets, both written | proposed |
| G1 | 0002 | Revenue rule has no message | msgs 2–5 payloads; Invoicing's only inbound is Customs | proposed |
| G2 | 0002 | `Consignment` means two things on one flow | Booking vs Invoicing definitions; hotspot 2 | proposed |
| G3 | 0002 | `CustomerNotified` unconfirmed and load-bearing | msg 6; discovery marks it *candidate* | proposed |
| G4 | 0002 | `DeclarationCleared` too thin for Invoicing's invariant | msg 4 contents vs that invariant | proposed |
| G5 | 0002 | `DeclarationSubmitted` has no consumer | msg 3; no such edge on the context map | proposed |
| H1 | 0003 | No rejection vocabulary anywhere | 11 declared events, none negative | proposed |
| H2 | 0003 | The F1 race has no named compensation | planner's confirmed bump rule vs absent message | proposed |
| H3 | 0003 | The refusal may not be Booking's to make | msg 2 returns data so Booking can decide | proposed |

## Handed back to `3-decompose` — proposed with evidence, not applied

| # | Proposed change | From |
|---|---|---|
| PC-1 | Collapse the capacity query and `ReserveCapacity` into one command Consolidation accepts or rejects; move the capacity invariant wholly to `ContainerLoad`; drop Booking's capacity rule and its synchronous-check note | F1, F2, F3, H3 |
| PC-2 | Give Routing an upstream on Customs (or relocate the ordering invariant) so `ShipmentHandedToCarrier` cannot precede `DeclarationSubmitted` — this also gives msg 3 its consumer | F4, G5 |
| PC-3 | Split `ConsignmentLine` into one type per context; trim the reservation payload to the decision | F5 |
| PC-4 | Add a path from Booking or Quoting to Invoicing carrying the sold premium | G1 |
| PC-5 | Rename one `Consignment`; declare the survivor Published Language at the Customs→Invoicing seam | G2 |
| PC-6 | Add `shipmentRef` to `DeclarationCleared`, or draw the query Invoicing needs instead | G4 |

**Noted, not a flow finding:** Invoicing is 34 tables / 311 attributes / 5 aggregates, yet across
three flows receives one event and emits one. No message evidence points at it — sizing is `3-decompose`'s call.

## Handed back to `2-discover` — absences, not inferences; no name below is in any model

| # | Question | Who |
|---|---|---|
| D-1 | What the business says when capacity is short — refusal, next departure, waitlist — and its name | planners, commercial director |
| D-2 | Who chooses which shipment is bumped on an over-commit, and what the customer is owed | planners, finance |
| D-3 | Hotspot 3 — who owns a carrier's refusal of a sealed container | depot planners |
| D-4 | When `CustomerNotified` fires (still *candidate* since 2026-05-25) | commercial director |
| D-5 | Who enforces the quote validity window at booking time | Quoting owner |
| D-6 | Whether invoicing is per shipment, per container or per period — *within* / *after* / *every* are three different systems, none confirmed | finance analyst |
| D-7 | Which context prices the Guaranteed Consolidation premium | commercial director, finance |

**Provenance.** Built on `discovery/timeline.md` — interview mode, 10 confirmed events and 1
candidate, planners plus a customs clerk and a finance analyst in the room. Grounded, not
speculative. **No customer took part**, so every exporter step is proxy — and D-1 is exactly what a
customer would have answered.
