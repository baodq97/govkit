---
id: DOMAIN-BC-0001
title: Booking — bounded context canvas
status: draft
owner: TBD
date: 2026-07-27
---

## Purpose

Booking is where a customer's intent to ship becomes a commitment we owe them: a named
consignment, on a named departure, that we have promised to carry. Everything before Booking is
a conversation; everything after it is an obligation.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Domain role | core (per `context-map.md`) | context-map.md, unrevisited since March |
| Business model | revenue-generator — the forwarding margin is earned on a booking, and the Guaranteed Consolidation premium is charged against one | business-model.md |
| Evolution | custom-built | inferred, not confirmed |

Contested. The business model names *load consolidation* as the differentiator, and
Consolidation owns the invariant that makes a booking safe. Booking's claim to `core` rests on
"where the money is committed", which is a moment in a process rather than a capability. See
open question OQ-5.

## Domain roles

- **Commitment recorder** — turns a request into a promise with a name.
- **Saga initiator** — asks Consolidation to underwrite that promise with capacity.

Booking makes no capacity decision, no pricing decision, and no carrier decision. Its own rule
set is thin.

## Inbound communication

| From | Message | Kind | Notes |
|---|---|---|---|
| Customer / sales | Request a booking against a departure | command | entry point; the payload is the consignment |
| Quoting | *(nothing)* | — | `model.yaml` declares Booking downstream of Quoting, but no quote identity or acceptance is received. See F9. |
| Consolidation | Remaining capacity for a departure | **query** | synchronous read of another context's state. See F1. |
| Consolidation | `CapacityReserved` | event | the answer Booking waits on before confirming |

## Outbound communication

| To | Message | Kind | Notes |
|---|---|---|---|
| Consolidation | Reserve capacity | command | issued after the query above; the pair is the problem |
| (broadcast) | `BookingRequested` {bookingId, departureId, volumeM3} | event | |
| (broadcast) | `BookingConfirmed` {bookingId, containerId} | event | consumed by Routing, which forwards it to partner carriers unchanged |
| Consolidation | `ConsignmentLine` writes | **shared entity** | declared Shared Kernel in `context-map.md`; both contexts write it |
| Consolidation, Customs, Invoicing | `ShipmentRef` | shared value object | shared as a code building block, never published on an event. See F4. |

No message exists for a booking that is refused, cancelled, amended, or bumped.

## Ubiquitous language

| Term | Meaning inside Booking | Conflict |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | — |
| Consignment | The goods a customer hands over as one unit | **Invoicing uses the same word for a billable invoice line.** Finance and operations already disagree (discovery hotspot 2). |
| ConsignmentLine | One line of that handover: volume, weight, hazard class | Consolidation has a different `ConsignmentLine` (volume, stackable) under the same name |
| ShipmentRef | prefix + sequence | Customs keys its declarations on this; Booking never emits it |

## Business decisions

| Rule | Enforced where | Confirmed |
|---|---|---|
| A booking may only be confirmed once its capacity has been reserved | stated in Booking, decided in Consolidation | yes — planner, 2026-05-25 |
| A container's committed volume must never exceed its capacity | **Consolidation** | yes — planner |
| The Guaranteed Consolidation premium is charged whether or not the container fills | Invoicing | yes — finance analyst |

## Assumptions (unverified — recorded so they can be shot down)

| # | Assumption | If wrong |
|---|---|---|
| A1 | A booking references exactly one departure and one container | multi-container and split bookings break the whole event payload set |
| A2 | Volume is the only dimension capacity is checked against | weight and stackability are already in the model but never sent to Consolidation |
| A3 | Bookings are not amended after confirmation | any post-confirmation volume change silently invalidates a capacity reservation |
| A4 | A refused booking is handled by a human outside the system | the refusal path never becomes a contract, and side-channels grow |
| A5 | `bookingId` is stable and safe to expose to partner carriers via Routing | an internal id becomes an external identifier by accident |
| A6 | The Booking/Consolidation boundary itself is settled | freezing an interface across a boundary under review locks in the wrong seam |

## Verification metrics

- Bookings confirmed that were later bumped (target: zero — this is the Guaranteed Consolidation promise).
- Double-committed container slots per quarter (baseline: at least one, March 2026).
- Time from `BookingRequested` to `BookingConfirmed`.

## Open questions

| # | Question | Who can answer |
|---|---|---|
| OQ-1 | Who mints `ShipmentRef`, and at which moment? Customs depends on it and Booking never publishes it. | customs clerk + planner |
| OQ-2 | What are the legal values of `Booking.status`? Consumers will branch on it. | Booking owner |
| OQ-3 | What happens to a booking when capacity is refused — and who tells the customer? | commercial director |
| OQ-4 | Can a customer amend volume after confirmation, and does that re-enter the capacity check? | depot planners |
| OQ-5 | Is Booking really core, or is it a thin commitment step around Consolidation's capability? | commercial director |
| OQ-6 | Who is accountable when a partner carrier refuses a sealed container (discovery hotspot 3)? | unassigned |

No customer has taken part in any session so far. Every statement about what customers value in
this canvas is the commercial director speaking on their behalf.
