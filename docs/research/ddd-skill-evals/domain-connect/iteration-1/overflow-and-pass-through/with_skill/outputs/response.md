Traced it — but not as one flow. Laid out message by message, quote-to-invoice needs **15 domain
messages across 7 contexts and 2 external systems**: 1.7× the 9-message working limit and nearly 2×
the 4-context threshold. One picture that size shows everything and lets you see nothing, so I split
it at the two business seams the lifecycle already has and recorded the overflow as the first
finding.

The good news up front: both seams are events (`BookingConfirmed`, `DeclarationCleared`), and exactly
**one query crosses a boundary in the entire lifecycle**. No context appears in all three flows, so
there is no coordinator god context. The joints of this model are sound.

## The three flows

| id | Use case | Contexts | Msgs |
|---|---|---|---|
| DOMAIN-FLOW-0001 | Quote → confirmed booking | Quoting, Booking, Consolidation | 7 |
| DOMAIN-FLOW-0002 | Confirmed booking → cleared carrier handover | Booking, Routing, Consolidation, Customs (+ Partner Network) | 6 |
| DOMAIN-FLOW-0003 | Cleared declaration → invoice + notification | Customs, Invoicing, Notifications | 3 |

The split falls on business boundaries — commitment, movement/clearance, settlement — not on
arbitrary chunks that fit a diagram. That is the benign reading of an overflow; the other readings
(too many contexts, chatty pairs) apply only in one spot each, and both are named below.

## The two findings worth your afternoon

**F-B3 — a confirmed rule that no message enforces.** `customs/model.yaml` owns *"a shipment cannot
be handed to a carrier before its declaration is submitted."* In flow 0002 the handover (msg 2)
fires on `BookingConfirmed` (msg 1), while `DeclarationSubmitted` is msg 5 — the handover precedes
the declaration on every run. Customs lists relationships only to Consolidation and Invoicing; there
is no modelled path from Customs to Routing at all. So either a manual step nobody modelled is
holding the line, or the rule is being broken routinely and the exposure is regulatory. One question
to the customs clerk decides which. This is the one I would chase first.

**F-A1 — check-then-act on the paid path.** Flow 0001, messages 4 then 5: Booking queries
Consolidation for remaining capacity, then commands it to reserve. The no-overbooking invariant
belongs to Consolidation; the decision to proceed is taken in Booking, in the gap between the two
messages. That gap is the March double-commit (hotspot #1) — now located, with two message numbers on
it. Fix: collapse into one `ReserveCapacity` command Consolidation accepts or rejects, and name the
rejection (`CapacityRejected`) as domain vocabulary rather than an error code.

## The rest, briefly

- **F-B1 — Routing is a pass-through.** It receives `BookingConfirmed` and emits a structurally
  equivalent `ShipmentHandedToCarrier`, adding a `carrierId` the standing lane contract already
  determines. Its own model says so: `aggregates: []`, *"owns no rule of its own."* Either delete the
  hop or give it a real decision (carrier refusal — hotspot #3 — is the obvious candidate). What is
  not tenable is the current neither.
- **F-A4 + F-C1 — the money never crosses the model.** The quote issues `{quoteId, price,
  validUntil}`, but the `Booking` entity has no `quoteId` and no price, and Invoicing relates only to
  Customs and Notifications. Nothing carries price or the 18% Guaranteed Consolidation premium into
  the invoice. I did not draw the missing messages — the gap is the finding, and the first question
  is whether a shared database is quietly doing this job.
- **F-C2 — `DeclarationCleared` carries `{declarationId, clearedAt}`**, no `shipmentRef`, though
  `Declaration` holds one and Invoicing's invariant needs it. Cheapest fix on the list, and it is the
  same correlator flow 0002 needs.
- **F-C3 — flow 0003 is 3 messages long against a 34-table Invoicing model.** Below the 5-message
  floor. Do not read it as a clean boundary; credit notes, dunning and payment allocation have no
  message anywhere. Worth one more flow before judging.
- **F-C4 — `CustomerNotified` is still a candidate event.** It is drawn because it is in the model,
  not because anyone confirmed it. Handed to `domain-discover`, not promoted here.

Also unresolved and consequential: **when** the invoice fires. "Within 24 hours of clearance",
"after clearance" and "every billing cycle" are three different businesses with three different
designs, and nothing in `docs/domain/` says which one you run. The finance analyst can settle it in a
sentence.

## Written

```
docs/domain/message-flows/
  README.md                                              index, counting checks, 13 consolidated findings
  DOMAIN-FLOW-0001-quote-to-confirmed-booking.md
  DOMAIN-FLOW-0002-confirmed-booking-to-cleared-handover.md
  DOMAIN-FLOW-0003-cleared-declaration-to-invoice.md
```

All `status: draft`, `owner: TBD`. No boundary was redrawn and no `model.yaml` was touched — every
finding is a proposal with message numbers attached, for `domain-decompose` (update mode) to merge or
decline. Three items (F-B3, F-C1, the carrier-refusal path) are blocked on people, and are recorded
as questions with a named owner rather than resolved by drawing a plausible message.
