---
id: DOMAIN-BC-0002
title: Booking bounded context — canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: medium
---

# Booking bounded context

> Right-sizing: **medium canvas** — purpose, language, interface, business decisions, plus the
> assumptions / metrics / open-questions sections because this context is *contested*: it is one
> half of hotspot #1 (the March double-commit) and one half of the `ConsignmentLine` shared kernel.
> No interface critique in full, but questions 2 and 5 are answered because they bear on hotspot #1.
>
> Created by `domain-define` on 2026-07-27 from `booking/model.yaml`, `context-map.md`,
> `business-model.md` and `discovery/timeline.md`. No prior README existed.

## Purpose

Take a customer's decision to ship, turn it into a committed request for a named departure, and
hold that request until the slot behind it is secured.

Key actors: the exporter placing the booking, and the depot planner who sees the resulting demand.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` — *"where the money is committed"* | `context-map.md` (March; not revisited) |
| Business-model role | **unknown** — Booking does not appear in the capability table | `business-model.md` |
| Evolution | **unknown** — same reason | `business-model.md` |

Not re-derived here. The gap is itself a finding: every other context maps to a capability in
`business-model.md`, and Booking maps to none. Either it is the transactional face of the
consolidation capability (in which case its classification follows Consolidation's), or the
capability table is incomplete. `domain-strategize` owns that call.

## Domain roles

- **Draft context** — a booking is work-in-progress from `BookingRequested` until `BookingConfirmed`;
  the whole point of the status field is that the request is not yet real.
- **Execution context** — it then drives a workflow across Quoting, Consolidation and Routing.

The draft half is where the customer lives; the execution half is orchestration of other contexts.
Worth watching: a draft context that orchestrates tends to accumulate other contexts' rules.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Customer / frontend | direct user interaction | `RequestBooking` | command | — | **derived** — implied by `BookingRequested` (timeline #3); no flow document names the inbound message |
| Quoting | bounded context | `QuoteIssued` (quoteId, price, validUntil) | event | customer/supplier (Booking downstream) | `quoting/model.yaml`; timeline #2 |
| Consolidation | bounded context | `CapacityReserved` (containerId, bookingId, volumeM3) | event | shared kernel (`ConsignmentLine`) + customer/supplier | `consolidation/model.yaml`; timeline #4 |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Consolidation | bounded context | `GetRemainingCapacity` | query | customer/supplier | `model.yaml` note: *"synchronous remaining-capacity check before reserving"*. Name **derived** |
| Consolidation | bounded context | `ReserveCapacity` | command | customer/supplier | same note. Name **derived** |
| — | — | `BookingRequested` (bookingId, departureId, volumeM3) | event | — | `model.yaml`; timeline #3 |
| Routing | bounded context | `BookingConfirmed` (bookingId, containerId) | event | published language (**proposed**); Routing is a conformist in practice — it forwards this unchanged | `model.yaml`; timeline #5; `routing/model.yaml` |

### Swimlane view

| In | Decision made here | Out |
|---|---|---|
| `RequestBooking` | is there a valid quote for this lane? | `BookingRequested` |
| `CapacityReserved` | the booking is now real | `BookingConfirmed` |
| — | **is there room?** ← *this decision is made here today, on data read from Consolidation* | `ReserveCapacity` |

The third lane is the defect. Booking makes a capacity decision using Consolidation's state, while
Consolidation owns the invariant that decision must not break.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | Not used elsewhere |
| Consignment | The goods a customer hands over as one unit | **Yes** — Invoicing: *"a billable line on an invoice"*; Consolidation: a physical stack with volume and stackability. Hotspot #2 |
| `ShipmentRef` | Prefix + sequence identifying a shipment | Shared as a building block with Consolidation, Customs and Invoicing (`context-map.md`) |
| Departure | The sailing a booking is placed on | Consolidation binds a departure to a specific container; Booking treats it as a date/lane |

## Business decisions

**None with an attributed source.** `discovery/timeline.md` records three stated rules; all three
belong to Consolidation, Customs and Invoicing respectively. No rule owned by Booking was stated by
any participant.

For a context labelled core and described as *"where the money is committed"*, that is a finding,
not a formatting problem. The two rules in the model files that touch Booking are unattributed and
appear under *Assumptions* instead.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness under concurrency | Two bookings must never end up on the same container slot | — | hotspot #1; planner rule, 2026-05-25 | **yes** — but the invariant belongs to Consolidation; Booking's job is to stop deciding it |
| Availability | Can a customer book while Consolidation is unavailable? Today: no (confirm requires a reservation) | unknown | **inferred** from the two models | **yes if the business says yes** — booking would have to become provisional and confirmation asynchronous |
| Latency | How long may a customer wait between request and confirmation? | unknown | not asked; the commercial director could supply it | possibly — a synchronous reserve is only viable if the answer is "seconds" |
| Volume / growth | Bookings per departure across 9 → 11 ports | unknown | `business-model.md` names the port expansion, not the volumes | no |

## Assumptions

1. **(inherited, unattributed)** *"A booking may only be confirmed once its capacity has been
   reserved"* — a `model.yaml` invariant that nobody stated in discovery. If true it makes
   Consolidation a synchronous dependency of the revenue path.
2. **(domain, inferred)** A booking carries exactly one consignment. `BookingRequested` has a single
   `volumeM3`, while the aggregate holds many `ConsignmentLine`s — the interface and the model
   disagree about multiplicity.
3. **(domain, inferred)** `weightKg` and `hazardClass` are captured for the carrier or the
   declaration, not for load planning — they are collected here and never forwarded to
   Consolidation. Nobody confirmed why they are collected.
4. **(domain, inferred)** A quote is optional: `QuoteIssued` is an inbound event, but no stated rule
   says a booking requires a valid quote.
5. **(behaviour, inferred)** Customers do not cancel between reservation and confirmation. There is
   no cancellation message anywhere in the model.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Change coupling: PRs touching both `booking/` and `consolidation/` | The shared kernel and the check-then-act interface make these one unit of change, not two contexts | CI / VCS history |
| Failed / retried `ReserveCapacity` commands per week | How often Booking's capacity decision was already wrong when it acted | production telemetry (needs instrumenting) |
| Time from `BookingRequested` to `BookingConfirmed`, p95 | Whether the synchronous chain through Consolidation is acceptable to a customer | production |
| Bookings abandoned before confirmation | Whether the two-step commitment is costing revenue | production |
| Number of teams opening PRs against `booking/` | Whether the orchestration role is pulling other teams' rules in here | issue tracker / VCS |

## Open questions

1. Which capability in `business-model.md` does Booking belong to? It appears in none.
2. Does a booking require a valid quote, or can it be placed without one? Nobody stated a rule.
3. Why are `weightKg` and `hazardClass` captured here if nothing downstream consumes them?
4. Can a customer cancel, and what happens to the reserved slot? (Consolidation asks the same
   question from the other side.)
5. One consignment per booking or many? The event says one, the aggregate says many.
6. Should Booking hold a capacity decision at all, or send one command and accept a rejection?
   Hotspot #1 remains unresolved.

## Interface critique (partial — questions 2 and 5)

**Q2 — right types?** No. The `GetRemainingCapacity` query plus the `ReserveCapacity` command
should be a single command that Consolidation accepts or rejects. Booking then reacts to the
rejection instead of predicting it.

**Q5 — messages that belong elsewhere?** The capacity *decision* does. Booking should not be the
place where "is there room?" is answered. Removing that leaves Booking with a clean draft-to-
confirmed lifecycle, which is what its purpose says it is for.

**Perturbation tried:** giving Booking ownership of remaining capacity was considered on
Consolidation's canvas and rejected — it moves an invariant to a context that does not own
containers.

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F7 | No stated business rule is owned by Booking, though it is classified core | `domain-discover` (ask a planner / the commercial director) |
| F8 | Booking appears in no capability row of `business-model.md` | `domain-strategize` |
| F9 | `BookingRequested` (one volume) contradicts the aggregate (many consignment lines) | `domain-decompose` |
| F10 | No cancellation path exists anywhere between Booking and Consolidation | `domain-discover` |
