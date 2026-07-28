# Nordic Freight — booking scenario walked through the boundaries

Short answer: **the split holds everywhere except the Booking ↔ Consolidation seam, and that seam
fails for a reason your team has already been bitten by.** There is also a second problem the flows
turned up that is arguably worse than a coupling smell: the model has no way to say *no*, and no way
to get the premium onto an invoice.

I traced three scenarios rather than one, because a single happy path can only confirm the design's
own story:

| Flow | Scenario | Why |
|---|---|---|
| [0001](../repo/docs/domain/message-flows/DOMAIN-FLOW-0001-book-a-part-load.md) | Book a part-load on a departure | the happy path — the main booking scenario you asked about |
| [0002](../repo/docs/domain/message-flows/DOMAIN-FLOW-0002-premium-billed.md) | Guaranteed Consolidation premium, sealed → cleared → billed | the path with money on it (+18%, your revenue stream) |
| [0003](../repo/docs/domain/message-flows/DOMAIN-FLOW-0003-last-slot-race.md) | Two bookings race for the last slot | the failure path, and discovery hotspot #1 |

Written to `docs/domain/message-flows/` with a README index. I did not touch any `model.yaml` —
boundary changes are proposals for `3-decompose` to merge, not edits for this step to make.

## 1. The seam that fails: Booking checks, Consolidation owns

The happy path (flow 0001) crosses Booking → Consolidation twice on the same data:

```
3. Booking → Consolidation   RemainingCapacity?  [qry]  {departureId, volumeM3} → remainingM3, containerId
4. Booking → Consolidation   ReserveCapacity     [cmd]  {bookingId, containerId, volumeM3}
```

That is **check-then-act across a boundary**. Nothing holds the capacity between messages 3 and 4,
so whatever message 3 established can be false by the time 4 lands. And the rule being checked —
*"a container's committed volume must never exceed its capacity"* — is written in
`consolidation/model.yaml`, not Booking's. One invariant, two contexts: it is unenforceable under
concurrency, by construction.

Flow 0003 replays this with two customers and 8 m³ of space left. Both queries (messages 2 and 4)
answer 8 m³ because nothing was held; both commands (5 and 7) commit 6 m³. Twelve cubic metres
against eight.

**That is your March incident.** Hotspot #1 in the discovery timeline says "two shipments were
committed to the same container slot; nobody agrees where the check should have happened". The flow
answers the question: the check should not exist. It should be a single `ReserveCapacity` command
that Consolidation accepts or **rejects**, with the capacity invariant enforced inside the
`ContainerLoad` aggregate. Nothing needs to move contexts — the data is already on the right side;
only the decision is on the wrong one.

I'd fix this before the team starts building. It is the cheapest of all the findings (one query
deleted, one rejection message named) and it is the only one with a production incident behind it.

## 2. The model cannot say no

Eleven events in the timeline. All eleven are success-shaped. There is no rejection, refusal,
cancellation, bump, or credit trigger anywhere in `docs/domain/`.

Flow 0003 simply stops at message 8, because there is no message to draw — and I won't invent one to
make the diagram look finished. That absence is on a product whose value proposition is a
*guaranteed* departure slot. Your planner even stated the compensation out loud ("a shipment is
bumped and the Guaranteed Consolidation promise is broken") and it appears in no model. An unnamed
compensation is not eventual consistency; it is an unhandled bug — and it has already shipped once.

Related: Notifications is reachable only from Invoicing. There is currently no route from a rejected
booking to the customer at all.

## 3. The premium never reaches the invoice

Flow 0002 is the scenario you are paid for, and it does not complete. Invoicing's only inbound
relationship is Customs, and the messages arriving carry `containerId`, `declarationId`, `portCode`,
`clearedAt` — no `bookingId`, no premium flag, no customer until Invoicing itself emits one. The
+18% Guaranteed Consolidation premium exists in the business model and nowhere in the domain model.

Whatever Invoicing does today, it is not learning it from a domain message. Booking needs to publish
a billable fact that Invoicing consumes. That is a missing relationship on the context map, not a
missing field.

Same flow, related: `shipmentRef` is listed as shared across four contexts but appears on zero
messages, so correlation between the hops is happening off the flow — shared table or human.

## 4. A contradiction worth 10 minutes with the customs clerk

Customs' invariant: *"a shipment cannot be handed to a carrier before its declaration is submitted."*

In flow 0001, Routing hands the shipment to the carrier off `BookingConfirmed` (message 7), and
Customs is not on the flow at all. The discovery timeline agrees: `ShipmentHandedToCarrier` is #6,
`DeclarationSubmitted` is #8. The happy path as modelled violates a stated core-domain rule. Either
the ordering is wrong or the invariant is in the wrong context; both are cheap to fix now and
expensive to fix after code exists.

## 5. What is actually working — worth saying

Consolidation → Customs → Invoicing → Notifications is four events, **zero queries**, no cycles, each
context deciding one thing it owns. The post-departure split is sound and I'd leave it alone. The
coupling in this model is concentrated entirely upstream of departure.

I also checked the two conditions that would refute the decomposition outright, and **neither
fired**: no scenario exceeded 9 messages (7 / 6 / 7), and no context appears at every step in a way
that makes it a hop. Booking is in 8/8 messages of flow 0003, but that flow has only two contexts by
construction, and both Booking and Consolidation genuinely decide things. So this is not a re-cut —
it is a repair on one seam.

One I deliberately did **not** call: Routing looks like a pass-through (its own model says it "owns
no rule of its own", and message 7 is the only thing it does). I'm holding that verdict, because
hotspot #3 — a partner carrier refusing a sealed container — has no messages at all yet, and that
responsibility is most likely Routing's. Discover it first, then decide whether Routing is a
boundary or a hop.

## What I'd do before building

1. **Collapse the check-then-act pair** (findings F1/F2/F13/F14/F17) — one command, Consolidation
   owns the invariant, `CapacityRefused` is a domain fact. This is the one with the incident behind it.
2. **Name the failure vocabulary with the business** (F15/F16) — refusal, rejection, bump, and
   whether the premium is refunded. Half an hour with a planner and the commercial director.
3. **Connect Booking to Invoicing** (F8/F9) — a billable fact plus `shipmentRef` on the messages.
4. **Settle the handover-vs-declaration ordering** (F4) with the customs clerk.

Seventeen findings in total, each with message numbers attached, in
`docs/domain/message-flows/README.md`. Three things I could not resolve without people, listed there
as open questions: the real command names (your model records events only), whether `CustomerNotified`
fires at all (it is still a *candidate* in discovery), and whether invoicing happens **after** each
clearance or **every** cycle — those are three different systems and nobody has said which.
