I traced it, and tracing it end-to-end as one flow is itself the headline result.

## The loop-back trigger fired

> **More than 9 messages in one scenario ⇒ go back and re-cut.**

Quote → invoice needs **13 messages across 7 contexts** (+1 external, +1 actor). That breaches both
counting thresholds (>9 messages, >4 contexts), so `docs/domain/` is stale as of now. The reason is
recorded rather than assumed — it is both causes at once:

- **two scenarios wearing one name** — messages 1–7 are commercial commitment (quote → booking
  confirmed), 8–13 are execution and settlement (handover → invoice → notification). The split falls
  on a real business boundary, and each half sits inside 5–9.
- **too many contexts on the path** — seven owners for one shipment lifecycle.

The god-context condition did **not** fire: no context appears at every step (busiest is Booking, 4
of 13). That negative matters — the problem is fragmentation, not a coordinator.

## What I wrote

`docs/domain/message-flows/` — four flows plus a README index carrying the consolidated findings with
a status column:

| id | Scenario | Msgs | Why |
|---|---|---|---|
| FLOW-0001 | Quote to invoice — full lifecycle | **13** | what you asked for; the happy path |
| FLOW-0002 | Guaranteed Consolidation premium, priced and billed | 6 | the path with money on it |
| FLOW-0003 | Two bookings race for the last slot | 7 | the failure path — hotspot 1, the March double-booking |
| FLOW-0004 | A partner carrier refuses a sealed container | 4 | fourth flow for hotspot 3 |

Every message is typed (command / event / query), every query carries its response after a `→`, and
the temporal rules are on the rows they constrain, not in the prose.

## The four findings I would act on first

**1. Pass-through — Routing decides nothing.** It receives `BookingConfirmed` and emits
`ShipmentHandedToCarrier` (FLOW-0001 msgs 7→8, FLOW-0004 msgs 1→2). Its own model says `aggregates: []`
and *"It owns no rule of its own"*. It appears in two flows and makes no decision in either. Either
fold the handover into Booking, or make it a real anti-corruption layer that owns carrier selection
**and** the refusal path — the second is what would give FLOW-0004 any messages past 4.

**2. Check-then-act across the capacity boundary — the March incident, located.** Booking asks
Consolidation for remaining capacity, then commands the reservation (FLOW-0001 4→5). In FLOW-0003 two
bookings both read "12 m³ free" and both reserve; message 7 breaches Consolidation's invariant.
The capacity rule is Consolidation's data and Consolidation's rule, but Booking performs the check.
Collapse the pair into one `ReserveCapacity` that Consolidation accepts or rejects.

**3. A rule that cannot be enforced even in principle.** Customs' invariant says a shipment cannot be
handed to a carrier before its declaration is submitted — yet the confirmed timeline has
`ShipmentHandedToCarrier` (msg 8) firing before `DeclarationSubmitted` (msg 10), and
`routing/model.yaml` has no Customs edge at all. The context that must not act never hears from the
context that owns the rule. Either the timeline order is wrong or the rule is routinely broken; both
are worth knowing, and the customs clerk can settle it in a minute.

**4. The revenue path has no message on it.** In FLOW-0002, `price` enters at message 2 and `total`
leaves at message 6, and nothing between them crosses into Invoicing — whose only inbound edge is
Customs, carrying `declarationId`, `portCode`, `clearedAt`. No money. The +18% premium that the
value proposition rests on is an invariant of no context: Quoting has no premium concept, Invoicing
has a `SurchargeSchedule` aggregate that emits nothing. Either a message exists that nobody wrote
down, or the money moves outside the model entirely.

Related, and visible only once the flows are drawn: **Consolidation is typed `supporting`** while
being the decision-maker in the paid flow and the holder of the capacity rule, and **Invoicing is
typed `core`** while `business-model.md` records it as commodity — *"nobody has ever chosen us
because of our invoices"* — carrying 311 attributes and 5 aggregates.

## What the model does not have

The whole model declares **11 events and not one of them is negative** — no rejection, no expiry, no
cancellation, no bump. FLOW-0003 stops at message 7 and FLOW-0004 at message 4 because the model
stops there, not because the scenarios are small. Four of Invoicing's five aggregates (`CreditNote`,
`DunningCase`, `PaymentAllocation`, `SurchargeSchedule`) emit nothing, so no flow can reach them —
the undoing half of the business is modelled as data with no behaviour. The Partner Network is a
sink: no message anywhere comes back from it, which is why hotspot 3 has no answer.

I did not invent any of these. The gaps are open questions with names attached, handed to
`2-discover` to confirm with people.

## Clean results, recorded

FLOW-0001 messages 9–13 are five events, no queries, each context deciding one thing it owns.
FLOW-0002 has zero boundary-crossing queries. The settlement half of the design is working — worth
recording so the next reviewer does not re-litigate it.

## Handoffs

Nine findings go to **`3-decompose`** (update mode) — the re-cut, the capacity collapse, the two
distributed invariants, Routing, the premium owner, the classification, the `consignment` homonym
across the `ConsignmentLine` Shared Kernel, and the fact that the model records events only. Four go
to **`2-discover`** — the refusal facts, the message that tells Invoicing what to charge, the
compensation events, and every open question in the flows.

Nothing was applied. No `model.yaml` and no context-map row was edited: a boundary redrawn by the
step that found the problem skips the reconciliation, stable ids and human edits that decomposition
owns.
