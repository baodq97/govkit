---
id: DOMAIN-BCC-0002
title: Bounded context canvas — Consolidation
status: draft
owner: TBD
date: 2026-07-27
---

# Consolidation

**Treatment:** full canvas — owns the system's hardest invariant and the capability the company
charges a premium for.

## Purpose

Decides which consignments travel in which container on which departure, and protects the promise
that a booked shipment actually leaves on its slot. This is the capability behind *"full-container
prices on part-load shipments"*.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `supporting` — "back-office load planning" | `context-map.md`, March session |
| business_role | revenue-generator | `business-model.md`, commercial director 2026-05-18 |
| evolution_stage | custom-built | same |
| differentiation | **yes** — "the premium customers pay for; a new entrant would need both the depot network and the planning know-how" | same (marked `proxy` — commercial director speaking for customers) |

**Conflict carried forward, not resolved.** This is the only capability in `business-model.md`
scoring custom-built **and** differentiated, it is attached to the only named premium revenue
stream (+18% of forwarding fee) and the only quantified company goal (fill 71% → 80%) — and it
carries the `supporting` label with 1 aggregate and 5 tables, against Invoicing's `core` and 34
tables. If both labels stand, the differentiated capability is the least-invested context in the
system while a commodity one is the most-invested.

Two reasons I did not re-label it: the differentiation evidence is one proxy interview deep
(`business-model.md` explicitly records that no customer took part), and classification is a
business decision. See OQ-1.

Supporting evidence for the differentiation claim, independent of the interview:
`consolidation/model.yaml` notes load planning "still happens partly on a whiteboard in the
Gothenburg depot; the four senior planners resolve conflicts by hand when the optimiser proposes an
infeasible stack", and `business-model.md` lists "the load-planning know-how of four senior
planners" as a key resource. Know-how held by four named people and no software is the
textbook profile of a differentiating capability that has never been invested in.

## Inbound communication

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| *remaining capacity for departure* | **query** | Booking | Customer/Supplier — Consolidation is upstream/supplier | `booking/model.yaml` note; message name not stated in the repo |
| *reserve capacity* | **command** | Booking | Customer/Supplier; also **Shared Kernel** on `ConsignmentLine` | Implied by the same note plus `CapacityReserved` — **Assumption A2** in the Booking canvas |

## Outbound communication

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| `CapacityReserved` | event | Booking | Consolidation upstream of Booking | `consolidation/model.yaml` → `{to: Booking, upstream}`; timeline #4 |
| `ContainerSealed` | event | Customs | Consolidation upstream of Customs; Customs is downstream/Conformist | `consolidation/model.yaml` → `{to: Customs, upstream}`; `context-map.md`; timeline #7 |

`ContainerSealed` carries `containerId, fillRate` — no shipment or declaration reference. Customs
works in `shipmentRef` (`customs/model.yaml`). Something has to translate; nothing in the repo
does. See C-2.

## Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| Container load | The set of consignments committed to one physical container on one departure | `consolidation/model.yaml` |
| Fill rate | Committed volume divided by container capacity | `consolidation/model.yaml` |
| ConsignmentLine | `lineId, volumeM3, stackable` | `consolidation/model.yaml` |

`stackable` is Consolidation's; `hazardClass` and `weightKg` are Booking's. Same entity name, two
different shapes, declared a shared kernel (OQ-4).

## Business decisions

| Rule | Source |
|---|---|
| A container's committed volume must never exceed its capacity | `consolidation/model.yaml` `invariants` |
| An overbooked container means a shipment is bumped and the Guaranteed Consolidation promise is broken | `discovery/timeline.md`, planner 2026-05-25 — the business consequence attached to the same rule |

Two statements, one rule. Nothing states how a container is chosen for a consignment, what makes a
stack feasible, when a container is sealed, or who may override the optimiser — even though
`model.yaml` records that planners override it by hand today. Those are the rules the four senior
planners hold and nobody has written down.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| C-1 | Capacity is committed in volume (`m³`) alone | Both `committedM3`/`capacityM3` and the invariant are volumetric, but Booking's line also carries `weightKg`, and containers have weight limits too | An entire second constraint is missing from the aggregate |
| C-2 | Consolidation can resolve a container to the shipments in it when Customs needs them | `ContainerSealed` carries no `shipmentRef`, and `ShipmentRef` is listed as shared across Booking/Consolidation/Customs/Invoicing in `context-map.md` | Customs cannot act on the event it is given |
| C-3 | Sealing is a distinct decision Consolidation owns, not a physical depot act recorded after the fact | `ContainerSealed` is emitted by Consolidation (timeline #7) but no rule says when | Determines whether Consolidation is a decision-maker or a recorder |
| C-4 | The whiteboard step is a gap to close, not a deliberate human-in-the-loop design | `model.yaml` notes describe it without judgement | Building a fully automatic optimiser removes the override the planners rely on |
| C-5 | "Guaranteed Consolidation" is a property of a booking that Consolidation must honour when planning | The premium "promises a departure slot even on a partly-filled container" (`business-model.md`), but no event or attribute carries the flag into Consolidation | The premium the company sells has no representation in the context that has to deliver it |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Average container fill rate, weekly | The 71% → 80% goal — the single quantified target in `business-model.md`; this is the metric the whole context exists to move | `ContainerSealed.fillRate` event stream (the payload already carries it); build the stream with the context |
| Count of bumped shipments per 1,000 departures, split premium / non-premium | That the no-overbooking invariant holds where it matters most | Ops incident log + booking status transitions; needs a distinct "bumped" status, which no `model.yaml` has today |
| Share of planned loads a planner overrides by hand | Whether the optimiser is trusted, and whether the whiteboard is shrinking | Override action logged in the planning tool — nothing captures this today; it must be built in from day one or the baseline is lost |
| Premium bookings that departed on their promised slot, % | Whether the Guaranteed Consolidation promise is actually kept | Join premium flag (OQ-6 / C-5) to departure records — **blocked** until the premium is represented at all |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-1 | Does `supporting` stand for the only capability the business model marks differentiated? | Investment and staffing |
| OQ-3 | Where is the no-overbooking check enforced? Hotspot 1 | Aggregate design |
| OQ-4 | Shared kernel or two entities? `stackable` vs `hazardClass` | Aggregate boundary |
| OQ-2 | A partner carrier refuses a **sealed** container — sealing is this context's last act. Does the container come back here to be re-planned, and who decides? Nobody agrees today | Recovery path; no event exists for it |
| C-2 | How does Customs resolve `containerId` → shipments? | Customs integration |
| CN-1 | What makes a stack feasible? The optimiser proposes infeasible stacks today and four people fix them by hand; the rules are undocumented | The core algorithm |
| CN-2 | Who may override a planned load, and does an override need a reason? | Audit and metric above |
| CN-3 | Does weight constrain a container alongside volume? | Invariant completeness |
| CN-4 | When is a container sealed — cut-off time, fill threshold, planner action? | `ContainerSealed` semantics |
