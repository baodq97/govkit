# Nordic Freight — does the split hold up?

Short answer: **the decomposition is not refuted, but the booking path is wrong in a way that will
ship the March bug again.** I walked three scenarios through the boundaries and wrote them up under
`docs/domain/message-flows/`. I did not touch the model itself — boundary changes are proposed back
to decomposition, not applied here.

## What I traced, and why those three

| Flow | Role | Why |
|---|---|---|
| [0001 — Book a consolidated shipment](../repo/docs/domain/message-flows/DOMAIN-FLOW-0001-book-consolidated-shipment.md) | happy path | the design's own story, and what the team builds first |
| [0002 — Sealed, cleared and invoiced](../repo/docs/domain/message-flows/DOMAIN-FLOW-0002-sealed-cleared-and-invoiced.md) | money path | the Guaranteed Consolidation premium (+18%) is the revenue stream |
| [0003 — Departure full, second booking refused](../repo/docs/domain/message-flows/DOMAIN-FLOW-0003-departure-full-second-booking-refused.md) | failure path | hotspot #1, the March double-commit, replayed against the model as drawn |

A fourth candidate — hotspot #3, *who owns it when a partner carrier refuses a sealed container* —
could not be drawn at all. No message in the model expresses a carrier refusal. That absence is
recorded rather than papered over.

## The verdict on the split

Both refutation conditions were checked explicitly and neither fires:

- **No scenario exceeded 9 messages** (8, 6, 8). The boundaries are not fragmenting one capability
  across too many owners.
- **No context appears at every step.** Consolidation is in all three flows, but it decides in each
  one — that is a boundary, not a hop.

So the cut is sound in shape. It is wrong in three specific places.

## The three that matter

**1. The booking path contains a check-then-act race — build this differently or ship the March bug
again.** In flow 0001, Booking asks Consolidation for remaining capacity (msg 4), then commands it
to reserve (msg 5), with the boundary crossed in between. Flow 0003 replays it with two customers:
both queries answer `remainingM3 = 12`, the first reserve succeeds, the second arrives at a full
container. `booking/model.yaml` already declares this out loud — *"synchronous remaining-capacity
check before reserving"*.

This answers hotspot #1's *"nobody agrees where the check should have happened"*: the check happens
in Booking, the data and the invariant live in Consolidation. Fix: one `ReserveCapacity` command
that Consolidation accepts or rejects, with the decision inside `ContainerLoad` and no capacity read
crossing the boundary.

**2. The money never reaches the money context.** `DeclarationCleared` carries
`{declarationId, clearedAt}`. `InvoiceIssued` carries `{invoiceId, customerId, total}`. Nothing in
between delivers a customer, a price or the premium. Invoicing's only declared relationships are
Customs and Notifications — it is not connected to Booking or Quoting at all. The largest system in
the estate (34 tables, 311 attributes, 51% of all modelled mass) hangs off the domain by one arrow
that carries no money.

There is a second-order problem underneath it: the only path into Invoicing runs through sealing and
clearance, but finance says *"the premium is charged whether or not the container ends up full"*.
That rule bills on commitment; the model bills on fulfilment. Somebody has to decide which.

**3. A confirmed business rule has no message anywhere.** *"A shipment cannot be handed to a carrier
before its declaration is submitted"* — Customs owns it, Routing breaks it. Routing reacts to
`BookingConfirmed` and hands over; it has no relationship to Customs at all, in the flow or in the
model. Today nothing prevents the hand-over.

## The thing that jumps out across all three

**The domain has no word for "no".** Seven contexts, twelve events, zero rejections, zero
cancellations, zero refusals. It also has **zero commands** — every command name in these flows is
provisional, named after the event it produces, and flagged as such. A model with no negative
outcome is not a clean design; it is a design where nobody asked what happens when the answer is no,
and it will be built as HTTP error codes that never reach a customer, a planner, or finance.

Twelve findings in total, ranked with evidence and message numbers in
[`docs/domain/message-flows/README.md`](../repo/docs/domain/message-flows/README.md).

## What I'd do before the team starts

1. **Move the capacity decision into `ContainerLoad`** (findings F1, F2, F10, F12). This is the one
   that must land before anyone writes booking code. Hand to `3-decompose` in update mode.
2. **Give Invoicing an inbound relationship to whoever owns the billable fact** (F6, F7), and settle
   with finance what an invoice is raised *against* — booking, declaration, or container.
3. **Connect Routing to the customs precondition, or move the hand-over decision** (F3).
4. **Take the negative outcomes back to the planners** (`2-discover`): capacity refused, booking
   rejected, carrier refusal. Confirm the command vocabulary while you have them in the room —
   nobody has ever named one.

One caveat on grounding: the events are solid — the timeline came from an interview, 10 of 11
elements confirmed. The commands are not. Don't let anyone build against the provisional names.

Two more things the flows surfaced that belong to other steps, so I left them there: "consignment"
means a billable line in Invoicing and a stack of pallets in Booking (hotspot #2 — any message
closing the Invoicing gap will carry that word across the boundary and mean two things), and
`ConsignmentLine` is currently a two-writer Shared Kernel with two different shapes. Fixing finding
1 removes the shared write path as a side effect.
