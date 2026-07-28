---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-27
---

# Domain message flows

The CONNECT step: the decomposition in `docs/domain/` walked through with concrete business
scenarios, message by message, to find the coupling a static context map cannot show. Findings here
are **proposals**. This step does not redraw boundaries — `domain-decompose` owns the model, and
`domain-discover` owns confirming events with people.

## Flows traced, and why these

| Flow | Scenario | Why chosen | Contexts | Messages | Queries crossing a boundary |
|---|---|---|---|---|---|
| [DOMAIN-FLOW-0001](DOMAIN-FLOW-0001.md) | Book a part-load shipment onto a departure | Commercial weight: this is the scenario the Guaranteed Consolidation premium (+18%) is sold against | Booking, Consolidation, Routing, + Partner Network | 7 | 1 |
| [DOMAIN-FLOW-0002](DOMAIN-FLOW-0002.md) | Sealed container cleared, invoiced and notified | Most boundary crossings — four of seven contexts, and the only path that reaches Invoicing | Consolidation, Customs, Invoicing, Notifications | 6 | 0 |
| [DOMAIN-FLOW-0003](DOMAIN-FLOW-0003.md) | Two bookings race for the last slot | Known pain: discovery hotspot #1, the March double-commit, *"nobody agrees where the check should have happened"* | Booking, Consolidation | 8 | 4 |

**Not traced, and why:** quote issuing (single context, crosses no boundary — teaches nothing); a
partner carrier refusing a sealed container (discovery hotspot #3 — there is no modelled path for
it at all, so there is nothing to draw; it is recorded as open question O4 instead). Add a flow if
you think a fourth scenario would move a boundary.

## Consolidated findings

Status column: `proposed` — written here, not yet acted on. A human accepts or declines; the
accepted ones go to `domain-decompose` (update mode) or `domain-discover`.

| # | Flow | Smell | Evidence | Proposed change | Hand to | Status |
|---|---|---|---|---|---|---|
| F1 | 0001, 0003 | Check-then-act across a boundary | 0001 #2–#3; 0003 #2/#4 return 20 m³ and #5/#7 both act on it | Collapse the query+command pair into one `ReserveCapacity` command Consolidation accepts or rejects | domain-decompose | proposed |
| F2 | 0001, 0003 | Distributed invariant | Booking invariant *"confirmed once capacity reserved"* vs Consolidation invariant *"committed volume must never exceed capacity"*; `ConsignmentLine` Shared Kernel written by both | Move rule + state + decision into `ContainerLoad`; resolve `ConsignmentLine` to one writer | domain-decompose | proposed |
| F3 | 0001 | Pass-through | 0001 #5→#6: Routing forwards `BookingConfirmed` to the carrier; `aggregates: []`, *"owns no rule of its own"* | Delete the hop, or give Routing the declaration gate (F4). Prefer F4 | domain-decompose | proposed |
| F4 | 0001, 0002 | Invariant with nothing enforcing it | 0001 #6 hands to carrier; `DeclarationSubmitted` only occurs at 0002 #3, later. No Customs↔Routing edge on the map | Routing subscribes to `DeclarationSubmitted` and gates the hand-off | domain-decompose | proposed |
| F5 | 0001 | Message lacks the receiver's decision data | 0001 #5 carries {bookingId, containerId}; #6 needs carrierId | Name Routing's lane/contract read model, or the missing message. Moot if F3 deletes the hop | domain-decompose | proposed |
| F6 | 0002 | **Clean flow — the split works here** | 0002 #2–#6: five messages, four contexts, all events, zero queries, nothing blocked on anything | None. Keep this boundary set; do not re-litigate it | — | proposed (record) |
| F7 | 0002 | Payload cannot support the receiver's decision | 0002 #2 `ContainerSealed {containerId, fillRate}` vs `Declaration` keyed on shipmentRef, portCode | Extend the event, not a query — do not put a synchronous hop into the clean spine | domain-decompose | proposed |
| F8 | 0002 | Context triggered by data it cannot act on | 0002 #4 `DeclarationCleared {declarationId, clearedAt}` → #5 `InvoiceIssued {invoiceId, customerId, total}`; Invoicing's only inbound edge is Customs | A commercial fact (price, customer, premium) must reach Invoicing. Add the relationship and name the message | domain-decompose + domain-discover | proposed |
| F9 | 0002 | Language collides across the boundary | `Consignment` = goods handed over (Booking) vs billable line (Invoicing); `ShipmentRef` shared across four contexts. Discovery hotspot #2 | Whatever message closes F8 is Published Language with an explicit mapping, not a shared shape | domain-decompose | proposed |
| F10 | 0002 | Event with no subscriber | 0002 #3 `DeclarationSubmitted` goes nowhere | Subscribe Routing (same edge as F4) | domain-decompose | proposed |
| F11 | 0003 | The rejection has no name | 0003 #8: the flow ends where the business says a shipment is bumped, and no event models it | Get the business name and the compensating action from the planners — do not invent it | domain-discover | proposed |
| F12 | 0003 | Chatty pair | 0003: 8 of 8 messages Booking↔Consolidation, 4 of them queries | **Do not merge.** The chattiness is an artifact of F1; re-count after F1 lands (8 → 3) | — | proposed (no action) |

## Open questions

| # | Question | Who can answer |
|---|---|---|
| O1 | What does the business call a refused reservation, who is told, and is the premium refunded or re-planned? Blocks the shape of the F1 fix | Depot planners + commercial director |
| O2 | Who checks quote validity at booking time — a Booking read model built from `QuoteIssued`, or an undrawn query to Quoting? | Booking engineers + commercial director |
| O3 | Does anything consume `ShipmentHandedToCarrier`? | Finance analyst, planners |
| O4 | Who owns the shipment when a partner carrier refuses a sealed container (hotspot #3)? No modelled path exists | Planners |
| O5 | Does `CustomerNotified` fire on `InvoiceIssued`, on booking confirmation, or both? Still a candidate event | Owner of the notification templates |
| O6 | Invoice *within* 24h of clearance, *after* 24h, or *every* 24h? Three different rules, three different designs, none stated | Finance analyst |
| O7 | Is the premium billed when the shipment is bumped? | Finance analyst + commercial director |
| O8 | How often does the slot race actually occur? Decides whether eventual consistency is acceptable — but the compensation still needs a name either way | Planners |

## Out of scope for this step

Two things the flows brushed against that belong to `domain-strategize`, not here:

- Consolidation owns the invariant behind the premium the business charges for, and is labelled
  `supporting` with 1 aggregate; Invoicing is labelled `core` with 5 aggregates and 34 tables while
  the business model records *"nobody has ever chosen us because of our invoices"*.
- Four of seven contexts are labelled `core`.

Recorded, not decided. Message flows can show where the work happens; they cannot rank subdomains.
