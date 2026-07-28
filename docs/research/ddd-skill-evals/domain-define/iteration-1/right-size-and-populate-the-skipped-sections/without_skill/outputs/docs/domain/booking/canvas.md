---
id: DOMAIN-BCC-0001
title: Bounded context canvas — Booking
status: draft
owner: TBD
date: 2026-07-27
---

# Booking

**Treatment:** full canvas — owns the confirmation lifecycle, one invariant, and sits on hotspot 1.

## Purpose

Turns an issued quote into a committed movement: captures what the customer is handing over,
secures container capacity for it, and confirms. Confirmation is the point where the company takes
on the Guaranteed Consolidation promise.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `core` — "where the money is committed" | `context-map.md`, March session |
| business_role | *not recorded* | `business-model.md` has no Booking row |
| evolution_stage | *not recorded* | — |
| differentiation | *not recorded* | — |

**Carried, with a gap flagged.** Booking is the only context labelled in `context-map.md` that
`business-model.md` does not assess at all. Its `core` label has neither support nor contradiction
in the business model — unlike Consolidation and Invoicing, where the two artifacts actively
disagree (see `../bounded-contexts.md`). Do not read the absence as agreement.

## Inbound communication

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| `QuoteIssued` | event | Quoting | Customer/Supplier — Booking is downstream | `booking/model.yaml` → `{to: Quoting, downstream}`; timeline #2 |
| `RequestBooking` | command | Customer-facing channel (not modelled) | Unknown — no such context exists in the repo | **Assumption A1** — `BookingRequested` (timeline #3) implies an external trigger, but no artifact names its origin |
| `CapacityReserved` | event | Consolidation | Customer/Supplier — Booking is downstream; also **Shared Kernel** on `ConsignmentLine` | `booking/model.yaml` → `{to: Consolidation, downstream}`; timeline #4 |

## Outbound communication

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| *remaining capacity for departure* | **query** | Consolidation | Customer/Supplier — synchronous | `booking/model.yaml` note: "synchronous remaining-capacity check before reserving". Message name not stated in the repo |
| *reserve capacity* | **command** | Consolidation | Customer/Supplier | Implied by the same note plus `CapacityReserved`; **Assumption A2** — no artifact names this command |
| `BookingRequested` | event | published (no consumer recorded) | Open-host style publication | `booking/model.yaml`; timeline #3 |
| `BookingConfirmed` | event | Routing | Booking upstream; Routing **Conformist** — it "forwards it to the partner network unchanged" | `booking/model.yaml` → `{to: Routing, upstream}`; `context-map.md`; `routing/model.yaml` rationale |

The query-then-command pair against Consolidation is the shape behind hotspot 1: Booking reads
remaining capacity, decides, then tells Consolidation to reserve — but the invariant being
protected lives in Consolidation. Between the read and the write, another booking can take the
space. See OQ-3.

## Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | `booking/model.yaml` |
| Consignment | The goods a customer hands over as one unit | `booking/model.yaml` |
| ConsignmentLine | `lineId, volumeM3, weightKg, hazardClass` | `booking/model.yaml` |

Note: Invoicing defines Consignment as "a billable line on an invoice" (hotspot 2). Both are
correct inside their own context. Anything crossing the boundary must translate.

## Business decisions

| Rule | Source |
|---|---|
| A booking may only be confirmed once its capacity has been reserved | `booking/model.yaml` `invariants` |

That is the whole of it. No cancellation rule, no amendment rule, no hazardous-goods rule (despite
`hazardClass` on every line), no rule for what happens to a booking whose quote has expired between
issue and request. See open questions.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| A1 | A customer-facing channel outside these seven contexts originates the booking request | No artifact names a sales, portal or account context; the timeline starts at `QuoteRequested` with no actor | An eighth context appears mid-build with its own model |
| A2 | The capacity interaction is a query followed by a separate command, not one atomic call | `booking/model.yaml` says "synchronous remaining-capacity check **before** reserving" — two steps — but names neither message | If it is already one call, hotspot 1 has a different cause and OQ-3 is mis-framed |
| A3 | One booking maps to at most one container | `BookingConfirmed` carries a single `containerId` | Split consignments break the aggregate and the invariant |
| A4 | `departureId` is owned outside Booking | It appears in both Booking and Consolidation with no stated owner | Two contexts define departures differently |
| A5 | Booking is the context holding the Guaranteed Consolidation commitment | The premium is a booking-time commercial commitment (`business-model.md` revenue streams); no artifact assigns it | Nobody owns the promise the company charges 18% for — see OQ-6 |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Count of reserve-capacity rejections that follow a successful capacity query, per week | That the check-then-act pattern is safe (hotspot 1) — this is the near-miss counter for OQ-3 | Application counter on the Consolidation command handler; must be instrumented when the call is built |
| Double-commit incidents per quarter | That the March incident was a one-off | Ops incident log / issue tracker, label `capacity-conflict` |
| Booking confirmation latency p95 | That the synchronous cross-context call is affordable | APM span on the Booking → Consolidation call |
| Share of confirmed bookings sold with the Guaranteed Consolidation premium | Whether the premium is material enough to model explicitly | Booking database, once a premium flag exists — **it does not today** (OQ-6) |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-3 | Where is the no-overbooking check enforced — Booking, Consolidation, or a reservation both go through? Hotspot 1, "nobody agrees where the check should have happened" | First line of Booking code |
| OQ-4 | Is `ConsignmentLine` a shared kernel or two same-named entities? Booking's has `hazardClass`, Consolidation's has `stackable` | Aggregate boundary |
| OQ-6 | How does the premium reach Invoicing? Booking is where it is agreed; Invoicing has no edge to Booking | Invoicing design |
| B-1 | Can a booking be cancelled or amended after confirmation, and what happens to reserved capacity? No artifact mentions cancellation | Aggregate lifecycle |
| B-2 | What governs `hazardClass`? The attribute exists; no stated rule uses it. Are hazardous consignments refused, surcharged, or segregated in a container? | Consolidation's stacking rules too |
| B-3 | What happens if a quote expires between `QuoteIssued` and `BookingRequested`? Quoting owns "a quote cannot be accepted after its validity window", but Booking is the context doing the accepting | Cross-context rule ownership |
| A1 | Which context originates `RequestBooking`? | Context count |
