# Nordic Freight — shipment lifecycle as domain message flows

Traced it, but not as one flow — and the reason is itself the first result.

## The lifecycle is not a use case

Quote through to invoice, drawn end to end, is **15 messages across 7 contexts and 2 external
systems**. That is well past the 5-to-9 rule, and past what a room can hold. An overflow that size
means one of three things; here it is the first — **several scenarios wearing one name**. Nobody
sits down to "do a shipment lifecycle": no single decision completes it and it spans days.

So I cut it at the two places the business actually pauses — the customer accepts a price, a planner
seals a container — and traced three scenarios by role:

| Flow | Scenario | Role | Messages | Contexts |
|---|---|---|---|---|
| 0001 | Quote accepted to booking confirmed | happy path | 9 | 4 |
| 0002 | Container sealed to customer invoiced | the money path (+18% premium) | 6 | 4 |
| 0003 | Partner carrier refuses a sealed container | failure path (hotspot 3) | 1 | 1 |

**The loop-back trigger does not fire.** No individual scenario exceeds nine messages, and no
context appears in all three flows — Consolidation appears in two and owns a real decision in each,
so it is not a god context either. The decomposition is *not* refuted by the counts. It is
challenged by five of twelve findings, which is a weaker and more useful claim, and the difference
is worth keeping.

## The two findings to read first

Both are absences, which is exactly why the context map cannot show them — a static map draws what
was modelled.

**F8 — the thing we are paid for has no message.** Guaranteed Consolidation (+18% of the forwarding
fee, the differentiating revenue stream in `business-model.md`) appears in none of the seven
`model.yaml` files and none of the 11 discovered events. Invoicing carries a `SurchargeSchedule`
aggregate that no message in the flow ever tells. The premium is sold in Booking and charged in
Invoicing with nothing modelled in between.

**F11 — nothing anywhere says no.** Across seven contexts, 11 domain events are modelled and **zero**
describe a negative outcome. The business stated three prohibitions and none has a refusal message:

| Stated rule | Message when violated |
|---|---|
| A quote cannot be accepted after its validity window | none |
| A container's committed volume must never exceed its capacity | none |
| A shipment cannot be handed to a carrier before its declaration is submitted | none |

Flow 0003 is one message long for this reason. `Routing → Partner Network` is the only arrow at the
point of failure and it points one way, so nothing in `docs/domain/` can even receive a refusal.

## What the flows located

- **F1 — check-then-act across a boundary.** Booking asks Consolidation for remaining capacity
  (msg 5), then commands it to take that capacity (msg 6). The gap is a race. This is discovery
  hotspot 1 — the two shipments on one slot in March — now a defect with two message numbers on it.
  Collapse the pair into one `ReserveCapacity` that Consolidation accepts or rejects.
- **F3 — Routing is a pass-through.** `BookingConfirmed` in (msg 8), `ShipmentHandedToCarrier` out
  (msg 9). No state change, no decision — its own model says `aggregates: []` and *"it owns no rule
  of its own"*, with the carrier fixed by the standing lane contract. Fold it into Booking as an
  outbound adapter, unless carrier selection is about to become a real decision.
- **F4 — an invariant nobody can enforce.** Customs requires the declaration before the carrier
  hand-off, but the confirmed timeline has `ShipmentHandedToCarrier` at #6 and `DeclarationSubmitted`
  at #8, and Routing has no relationship to Customs at all. Either the timeline is wrong or the rule
  needs a message.
- **F6/F7 — the event chain is a notification chain, not a data flow.** `ContainerSealed`
  `{containerId, fillRate}` cannot build a `Declaration{shipmentRef, portCode}`; `DeclarationCleared`
  `{declarationId, clearedAt}` cannot build an invoice `{customerId, total}`. Two contexts are fed a
  nudge and expected to produce a document. Where the missing data comes from today is worth asking:
  the usual answer is a direct database read.

**F3 and F10 are both pass-throughs and only one is a problem.** Notifications also decides nothing,
but it wraps a bought provider — a generic subdomain behind an adapter is a boundary worth keeping.
Routing wraps a step, and a step is not a capability. The test is whether the context decides, not
how thin it is.

## What I did not do

No boundary was redrawn, no `model.yaml` or `context-map.md` was touched. Where a flow proves a
boundary wrong it hands the change to `3-decompose` with the message numbers attached (F1, F2, F3,
F5, F6, F7). Where it reveals a fact nobody discovered — a refusal, a premium being sold — it goes
to `2-discover` to be confirmed by people rather than promoted from my own inference (F4, F8, F9,
F11, F12). I also declined to invent the obvious missing messages: there is no `PremiumCharged` and
no `CapacityRejected` in these flows, because nobody has said they exist.

## Written

- `docs/domain/message-flows/README.md` — index, counting checks, all 12 findings, statuses
- `docs/domain/message-flows/0001-quote-to-booking-confirmed.md`
- `docs/domain/message-flows/0002-sealed-to-invoiced.md`
- `docs/domain/message-flows/0003-carrier-refuses-sealed-container.md`

All `status: draft`, `owner: TBD`.

## Worth deciding

Three open questions block more than they look:

1. What fact marks the sale of the Guaranteed Consolidation premium, and who owns it? (F8)
2. Is there a deadline on invoicing after clearance — *within* n days, *after* n days, or a nightly
   run *every* 24h? Nothing in the model says, and those are three different systems.
3. When a carrier refuses, who acts first — the depot planner or the account manager? That answer
   decides which context owns the event, and it cannot be Routing if F3 is accepted.
