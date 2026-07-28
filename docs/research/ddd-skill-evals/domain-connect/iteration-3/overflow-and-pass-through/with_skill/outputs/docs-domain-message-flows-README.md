---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

## The flows

| id | Scenario | Why this one | Messages | Contexts |
|---|---|---|---|---|
| [FLOW-0001](DOMAIN-FLOW-0001-quote-to-invoice.md) | Quote to invoice — the full lifecycle | the happy path, and the trace that was asked for: how the contexts fit together end to end | **13** | 7 + 1 external |
| [FLOW-0002](DOMAIN-FLOW-0002-guaranteed-consolidation-premium.md) | Guaranteed Consolidation premium, priced and billed | the path with money on it — the +18% premium is the revenue stream the value proposition rests on | 6 | 6 |
| [FLOW-0003](DOMAIN-FLOW-0003-container-full-at-reservation.md) | Two bookings race for the last slot | the failure path, and hotspot 1 — the March double-booking nobody could place | 7 | 2 |
| [FLOW-0004](DOMAIN-FLOW-0004-carrier-refuses-sealed-container.md) | A partner carrier refuses a sealed container | fourth flow for a known hotspot (3) — the argument the team is already having | 4 | 4 + 1 external |

FLOW-0001 answers the request. FLOW-0002 and 0003 are the money path and the failure path, which the
end-to-end trace covers only in passing; 0004 was added because a hotspot pointed at it. Grounding:
all 11 events come from a confirmed interview timeline (10 confirmed, 1 candidate), so these flows
are built on discovery, not on context names.

## The loop-back trigger fired

> **More than 9 messages in one scenario ⇒ go back and re-cut.**

FLOW-0001 needs **13 messages across 7 contexts** to get one customer from a price to an invoice.
Both counting thresholds are breached (>9 messages, >4 contexts), and the reason is recorded rather
than assumed: it is two scenarios wearing one name — commitment (1–7) and execution/settlement
(8–13) — *and* a lifecycle fragmented across seven owners. `docs/domain/` is stale as of this
trigger. The god-context condition did **not** fire: no context appears at every step (busiest is
Booking, 4 of 13).

## Consolidated findings

| # | Flow | Smell | Evidence | Proposed change | Status |
|---|---|---|---|---|---|
| 1 | 0001 | Overflow + fragmented path | 13 messages, 7 contexts | re-cut; trace "Sell & commit" (1–7) and "Ship & settle" (8–13) separately | proposed |
| 2 | 0001, 0003 | Check-then-act across a boundary | 0001: 4→5; 0003: 2→5 and 4→7 | one `ReserveCapacity` that Consolidation accepts or rejects | proposed |
| 3 | 0001, 0003 | Distributed invariant — capacity | check in Booking, data and rule in Consolidation | the rule belongs to `ContainerLoad` alone | proposed |
| 4 | 0001, 0004 | Distributed invariant — declaration before handover, unenforceable | 0001: 8 before 10; Routing has no Customs edge | trigger the handover from a Customs fact | proposed |
| 5 | 0001, 0004 | **Pass-through — Routing** | 0001: 7→8; 0004: 1→2; `aggregates: []`, "owns no rule of its own" | fold into Booking, or give Routing carrier selection and the refusal path | proposed |
| 6 | 0003, 0004 | No refusal message anywhere | 11 events, none negative; 0003 stops at 7, 0004 at 4 | discover the rejection facts with people, then model them | proposed |
| 7 | 0002 | Revenue path has no message | `price` at 2, `total` at 6, nothing in between reaches Invoicing | find the message that tells Invoicing what to charge | proposed |
| 8 | 0002 | Premium rule owned by no context | "charged whether or not the container fills" is nobody's invariant | assign it to the context owning `SurchargeSchedule` | proposed |
| 9 | 0002 | Classification contradicts the money | Consolidation `supporting` but revenue-generating; Invoicing `core` but commodity | re-run subdomain classification | proposed |
| 10 | 0001 | Homonym across a Shared Kernel | "consignment" = goods (Booking) vs billable line (Invoicing); `ConsignmentLine` written by two contexts | one Published Language, or rename per context | proposed |
| 11 | 0001 | Event as disguised command | 11→12 and 12→13: single mandatory consumer | make the dependency explicit | proposed |
| 12 | 0004 | Compensation aggregates emit nothing | Invoicing: 5 aggregates, 1 event | discover the missing facts | proposed |
| 13 | 0001 | Model records events only | 11 events, 0 commands, 1 query hidden in a relationship note | record commands and queries in the model | proposed |
| 14 | 0001, 0002 | **Clean result** — settlement half is event-driven | 0001: 9–13 five events, no queries; 0002: 0 boundary-crossing queries | none — recorded so it is not re-litigated | proposed |

## Two check results worth reading as deliberate

`QuoteRequested` and `BookingRequested` appear in no flow: both are drawn as the actor commands that
record them (`RequestQuote`, `RequestBooking`), so the fact is traced even though the event name is
not. Four traced events reach an actor or an external system rather than a context — three of those
are correct terminations; the fourth, `DeclarationSubmitted`, has no consumer at all and is an open
question in FLOW-0001 and FLOW-0004.

## Handoffs

**To `3-decompose` (update mode)** — findings 1, 2, 3, 4, 5, 8, 9, 10, 13. None of them has been
applied here: no `model.yaml` and no context map row was edited by this step. The re-cut in finding 1
is the one that makes the rest cheaper to do together.

**To `2-discover`** — findings 6, 7, 12, and every open question in the four flows. These are facts
the business has and the model does not; inferring them here would produce a design validated
against fiction. The largest single gap: what the business does when the answer is no.

## What this step did not do

It did not redraw a boundary, move Routing, merge Booking with Consolidation, or name a rejection
event. Where a flow proved a boundary wrong it wrote the evidence and the proposed change and left
the model to the step that owns it.
