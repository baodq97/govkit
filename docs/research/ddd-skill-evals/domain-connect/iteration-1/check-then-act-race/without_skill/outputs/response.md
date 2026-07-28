I walked the booking scenario across all seven contexts — quote through to invoice — and typed
every message as a command, event or query. The split mostly holds. It fails in one place, and
that failure is already sitting in your discovery notes as an unexplained incident.

**Written to the repo (nothing in the model was modified):**
- `docs/domain/flows/booking-flow.md` — the 13-message flow, typed and numbered, with sources, plus nine findings
- `docs/domain/flows/boundary-proposals.md` — eight proposals for `domain-decompose` to apply

## The flow

Thirteen messages, M1–M13. Every one of them comes from a `model.yaml` or the discovery timeline —
I did not invent connective tissue to make the diagram read smoothly, and where the model has a
gap the flow says so.

Twelve are events moving one way downstream. Two are not, and they sit next to each other:

- **M4 — query — Booking → Consolidation:** "how much room is left on this departure?"
- **M5 — command — Booking → Consolidation:** "reserve it"

Neither has a name in the model. They exist as eleven words in a relationship note in
`booking/model.yaml`: *"synchronous remaining-capacity check before reserving"*.

## Verdict

Five of six internal seams are clean. Quoting → Booking, Consolidation → Customs, Customs →
Invoicing, Invoicing → Notifications are one-way event handoffs with genuinely different languages
on each side. Leave them alone.

Two do not survive the walk:

**Booking ↔ Consolidation is not a boundary — it is a split transaction.** M4 puts the capacity
decision in Booking; the invariant that decision is protecting is owned by Consolidation. Two
bookings for the same departure both pass M4 while there is still room, both issue M5, and
`committedM3` ends up over `capacityM3`. Nothing in the model closes that window — `ContainerLoad`
has no reservation, no version, no lock, and "synchronous" only describes the call style, not
atomicity.

That is hotspot #1 in your timeline: *"Two shipments were committed to the same container slot in
March; nobody agrees where the check should have happened."* The reason nobody agrees is that the
model does not say. M4 puts the check in Booking, the invariant puts it in Consolidation. This is
not a past incident — it is a live property of the design that reproduces under concurrent load on
any departure near full. And an overbooked container bumps a shipment, which breaks the Guaranteed
Consolidation promise — the +18% premium that is your one differentiated revenue stream.

The underlying problem is that **no-overbooking is a distributed invariant**: owned by
Consolidation, confirmed as a business rule by a planner, but enforced in Booking. Booking's own
invariant ("may only be confirmed once capacity has been reserved") is the other half of the same
rule. Two contexts, two transactions, no single owner. Two things corroborate it — the declared
relationship direction says Booking *consumes from* Consolidation while the traffic has Booking
*commanding* it, and `ConsignmentLine` is a Shared Kernel both sides write, with different
attributes on each side, feeding the very `committedM3` the invariant is measured against.

**Routing is not a bounded context.** M7 in, M8 out. `aggregates: []`, three tables, and the model
says outright it *"owns no rule of its own"*. It costs a hop, a deployment and a consistency
window and isolates nothing.

## Three more that block a build regardless of where the boundaries land

**No failure path exists anywhere.** `CapacityReserved` is the only outcome of M5 in the entire
model — no `CapacityRejected`, no rejection event of any kind in seven files. A booking that fails
to reserve has a status field, a blocking invariant, and no message that moves it. Rejection
becomes the *common* case as you push fill rate from 71% to 80%.

**`ShipmentRef` never travels.** The context map declares it shared across four contexts; it
appears in zero event payloads. `ContainerSealed` gives Customs a `containerId` when Customs needs
a `shipmentRef`. `DeclarationCleared` gives Invoicing a `declarationId` when Invoicing needs a
`customerId`. Every receiver has to reach back into an upstream database — three back-channels the
context map does not show, all preventable with a field that already exists.

**"Declaration before handover" is enforced nowhere, and your two sources contradict each other.**
The customs clerk stated the rule; the confirmed timeline has handover at #6 and declaration at
#8. Both are marked confirmed, by different people, in the same session. Either way M8 is emitted
by Routing, which owns no invariants, and `DeclarationSubmitted` has no subscriber. Nothing
connects them.

## Proposals — not applied

The headline fix: **delete the M4 query and make M5 a single atomic command**. Booking sends
`ReserveCapacity(bookingId, departureId, volumeM3, requestId)`; Consolidation checks and commits
in one transaction and answers `CapacityReserved` or `CapacityRejected`. The race stops being a
bug to defend against and becomes impossible — no locking, no retries, no distributed transaction.
Cost: Booking loses live remaining-capacity in the UI. Mitigation: an explicitly advisory
fill-rate read model that Booking may display but must never branch on.

I considered and rejected merging Booking into Consolidation. The seam is fine — different
languages, different lifecycles, different rates of change. Only the protocol across it is wrong,
and collapsing a sound boundary to fix one message pair would put a customer-facing commitment
inside the depot planners' whiteboard workflow.

All eight proposals are in `boundary-proposals.md`, prioritised, with trade-offs and alternatives.
They are model changes and belong to `domain-decompose` — I left your `docs/domain` model files
untouched and added only the two new files under `docs/domain/flows/`.

## Two things I need from humans before any of this lands

1. **Which comes first — handover or declaration?** Put the depot planner and the customs clerk in
   the same room. If the timeline is right, the invariant is aspirational and you have an
   unmanaged compliance exposure across nine ports, which is a bigger finding than anything else
   here.
2. **What happens to a rejected booking?** Auto-roll to the next departure, wait-list, or reject
   outright. This decides whether the atomic-command fix works as-is or needs a queue.

One thing out of scope that I am flagging rather than resolving: `Consolidation` is labelled
`supporting` while your business model names load consolidation as the single differentiating,
revenue-generating capability. It also owns the invariant in the finding above. That affects who
gets asked to fix this and what they can justify spending — it belongs to `domain-strategize`, not
to a message-flow review.
