---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

# Domain message flows

Three scenarios walked message by message across the boundaries in `docs/domain/`, to find out
whether the split survives contact with a real business case. Grounding: the timeline behind these
flows was confirmed in an interview (11 elements, 10 confirmed, 1 candidate), so the events used
here are people's words, not names read off a context diagram. Two things are not grounded and are
marked wherever they appear: **the model declares zero commands**, so every command name below is
provisional; and `CustomerNotified` is still a discovery candidate.

## Flows

| id | Scenario | Role | Why this one | Msgs | Contexts |
|---|---|---|---|---|---|
| [DOMAIN-FLOW-0001](DOMAIN-FLOW-0001-book-consolidated-shipment.md) | Book a consolidated shipment on a departure | happy path | the design's own story, and the one the team is about to build first | 8 | Quoting, Booking, Consolidation, Routing |
| [DOMAIN-FLOW-0002](DOMAIN-FLOW-0002-sealed-cleared-and-invoiced.md) | Sealed container cleared and invoiced | money path | the Guaranteed Consolidation premium (+18%) is the revenue stream; coupling here has a price | 6 | Consolidation, Customs, Invoicing, Notifications |
| [DOMAIN-FLOW-0003](DOMAIN-FLOW-0003-departure-full-second-booking-refused.md) | Departure full — the second booking must be refused | failure path | hotspot #1, the March double-commit, replayed against the model as drawn | 8 (+2 gaps) | Booking, Consolidation |

Hotspot #3 — *who is responsible when a partner carrier refuses a sealed container* — was a
candidate fourth flow and could not be drawn: no message in the model expresses a carrier refusal.
That absence is itself recorded, in DOMAIN-FLOW-0003's open questions.

Ten of the eleven discovered events appear in a flow. `QuoteRequested` does not — it precedes the
booking scenario and is peripheral to all three, not a gap.

## Does the decomposition survive? — the two refutation conditions

Neither fires, and the check is worth stating rather than implying:

- **More than 9 messages in one scenario:** no. 8, 6, 8. The boundaries are not fragmenting a single
  capability across too many owners.
- **One context at every step:** no. Consolidation appears in all three flows, but it decides in each
  one (it owns capacity and sealing) — that is a boundary, not a hop. Booking is in every message of
  DOMAIN-FLOW-0003, but that flow has only two participants, so the count carries no signal.

So the split is not refuted. It is, however, wrong in three specific places, and one of them is on
the path the team is about to build.

## Findings

Ranked by what it costs to be wrong. Status is for a human to set.

| # | Flow | Smell | Evidence | Proposed change | Status |
|---|---|---|---|---|---|
| F1 | 0001 | Check-then-act across a boundary | msgs 4 then 5 — query for remaining capacity, then command to reserve, boundary crossed in between | Collapse into one `ReserveCapacity` command Consolidation accepts or rejects | proposed |
| F10 | 0003 | The race is reproducible | msgs 3, 4 both answer `remainingM3 = 12`; 5 commits A; 8 arrives at a full container | as F1 | proposed |
| F12 | 0003 | Invariant enforced on the wrong side | Booking reads capacity (3–4); Consolidation owns `committedM3`, `capacityM3` and the rule | Move the decision to Consolidation; Booking states a need and receives an outcome | proposed |
| F2 | 0001 | Distributed invariant | msgs 4–6 vs the Consolidation and Booking invariants | The capacity rule belongs to one aggregate: `ContainerLoad` | proposed |
| F6 | 0002 | The money never reaches the money context | `DeclarationCleared` = {declarationId, clearedAt}; `InvoiceIssued` = {invoiceId, customerId, total}. Nothing carries customer or price into Invoicing | Model the billable fact and give it an owner — probably published by Booking at confirmation | proposed |
| F3 | 0001 | Unenforceable ordering rule | msg 8; `routing/model.yaml` has no relationship to Customs | Routing must consume `DeclarationSubmitted`, or the hand-over belongs to the rule's owner | proposed |
| F11 | 0003 | No refusal exists anywhere in the domain | gaps G1, G2 after msg 8; zero rejection events across seven contexts | Discover and name the negative outcomes — they are events, not error codes | proposed |
| F7 | 0002 | Billing trigger contradicts the stated rule | msgs 1, 4, 5 vs *"the premium is charged whether or not the container ends up full"* | Decide: billing on commitment (Booking) or on fulfilment (Customs) | proposed |
| F9 | 0002 | Same word, two meanings, crossing the boundary | Booking UL *consignment = goods handed over* vs Invoicing UL *consignment = billable line*; hotspot #2 | Translate at the Invoicing edge; pick two distinct words first | proposed |
| F5 | 0001 | Shared Kernel arriving by payload | msgs 4, 5 carry `volumeM3`; `ConsignmentLine` is a two-writer Shared Kernel with two different shapes | Resolving F1 removes the shared write path | proposed |
| F8 | 0002 | Event used as a disguised command | msg 4 — one consumer that must act or nothing is ever invoiced | Accept the dependency as a command, or key Invoicing off a fact it owns | proposed |
| F4 | 0001 | Event with no traced consumer | msg 3 `BookingRequested` | Find the consumer or stop calling it published | proposed |

## Handed back

**To `3-decompose` (update mode) — boundary changes, proposed, not applied:**

1. Move the capacity decision into `ContainerLoad` (F1, F2, F10, F12). Remove the
   `RemainingCapacity?` query from the Booking→Consolidation relationship; replace the relationship
   note *"synchronous remaining-capacity check before reserving"* with a single accept/reject
   command. This is the one that must land before the team builds the booking path.
2. Give Invoicing an inbound relationship to whichever context owns the billable fact (F6, F7).
   Today Invoicing — 34 tables, 311 attributes, the largest system in the estate — is connected to
   the rest of the domain by exactly one arrow, and that arrow carries no money.
3. Connect Routing to the customs precondition, or move the hand-over decision (F3).

**To `2-discover` — confirm with people, do not infer:**

- The command vocabulary. Twelve events, zero commands; every command in these flows is provisional.
- The negative outcomes: capacity refused, booking rejected, carrier refusal (hotspot #3).
- When `CustomerNotified` fires — still a candidate.

`3-decompose`'s output is stale in the three places above until these are merged there.
