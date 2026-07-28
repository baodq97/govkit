# Booking — does the design hold up?

**Short answer: don't freeze it yet.** The interface as written describes a happy path across a
boundary that is still contested in three places, and one of those contests already caused a
production incident (the March double-commit). Freezing now makes the unresolved question a
permanent answer.

I ran the Bounded Context Canvas v5 + Quality Storming over Booking and wrote it to
`docs/domain/booking/README.md` (there was no canvas before — `3-decompose` emitted `model.yaml`
only). Booking alone got the full treatment; it's the context you asked about and the only one
declared `core`. Neighbours are cited, not canvassed.

## First, a caveat that shapes everything below

**No message flows are traced in this repo.** `4-connect` hasn't run, so the inbound/outbound
sections are derived from `model.yaml` relationships plus the ordering in the discovery timeline —
not from observed use. You cannot establish *who initiates* a collaboration from these artifacts,
and inbound-vs-outbound is exactly the distinction a frozen interface commits you to. If you want
one thing before the freeze, it's that trace.

## The four findings that would make me hold the freeze

**1. The capacity check is a read-then-act race, and it's the March incident.**
`model.yaml` describes the Consolidation collaboration as a *"synchronous remaining-capacity check
before reserving"* — a query followed by a command, across a boundary. Two bookings can both read
"space available" before either reserves. Hotspot 1 says two shipments were committed to the same
slot in March and *"nobody agrees where the check should have happened"*. The design still doesn't
agree.

Fix: one command, `ReserveCapacity(bookingId, departureId, volumeM3)`, that Consolidation accepts or
rejects. Booking's invariant ("confirm only once capacity is reserved") then holds by reacting to
`CapacityReserved` rather than by asking first. Cost: confirmation becomes asynchronous, so you need
a pending state and a timeout policy — neither exists today.

**2. The widest coupling isn't in the message list at all.**
`ConsignmentLine` is declared a **Shared Kernel that both Booking and Consolidation write**. The two
definitions have already diverged — Booking's carries `hazardClass`, Consolidation's carries
`stackable`. Freezing a public interface while a mutable entity is shared behind it freezes the
wrong surface: the real contract is the one nobody wrote down.

This is also where hotspot 2 physically lives. Finance means "billable line" by *consignment*,
operations means "physical stack of pallets" — and the shared entity spans both meanings under one
class name. Resolve the word before you freeze anything that uses it.

**3. `BookingConfirmed` publishes Consolidation's internals.**
Its payload is `(bookingId, containerId)`. `containerId` is the root identity of Consolidation's
`ContainerLoad`. Two costs: every subscriber to a Booking event becomes coupled to Consolidation's
container model through Booking, and Booking cannot confirm until load planning has assigned a
container. Consolidation's own `CapacityReserved` already carries `containerId` — let it. Booking
should publish `(bookingId, departureId, shipmentRef)`.

**4. The interface has no vocabulary for failure.**
Two events, both success. Yet the planner's stated rule says overbooking means *"a shipment is
bumped"*, and hotspot 3 says nobody knows who's responsible when a carrier refuses a sealed
container. Invoicing charges the premium whether or not the container fills — it has no event to
react to when a booking goes wrong. Also missing: the inbound **command** that creates a booking.
`model.yaml` declares `domain_events` only, so the command surface of this "public interface" is
currently undefined.

On size — the interface isn't too big, it's too thin: 2 events and 0 commands against 9 tables, 54
attributes and a 22-attribute entity, with a 3-field widest payload. The freeze risk here is
under-specification.

## Two things I'd move, one I wouldn't

- **Capacity reservation → a command Consolidation owns.** Kills the race. Recommended.
- **`ConsignmentLine` ownership → Booking, read-only projection to Consolidation.** Turns the shared
  kernel into customer/supplier, and stops `hazardClass` being dropped on the only path to Customs
  (Consolidation→Customs, and Consolidation's line doesn't carry it — a compliance attribute is
  currently lost in transit). Recommended.
- **Confirmation → Consolidation.** Also removes the race, but puts the commercial commitment inside
  a back-office `supporting` context. Rejected — recording it because a design that's never been
  perturbed has never been tested.

## Two governance findings I did not act on

- **Booking's classification can't be carried.** `business-model.md` has no capability row for
  Booking, so business-model role and evolution stage are unavailable. It's labelled `core` in
  `context-map.md` on the basis of "where the money is committed" — and that table says it hasn't
  been revisited since March. Meanwhile the one capability the business model marks as
  *differentiating* is load consolidation, which sits in **Consolidation**, classified `supporting`.
  Booking and the business model are using different definitions of core. That's for `5-strategize`;
  I didn't re-classify.
- **Booking↔Routing points both ways.** `model.yaml` says `{ to: Routing, type: upstream }`;
  `context-map.md` says `Booking --publishes to--> Routing`. One of them flips a message between
  inbound and outbound. That's for `3-decompose`.

## How you'd find out you were wrong

Four metrics, all collectable:

| Metric | Prediction | Source |
|---|---|---|
| Change coupling Booking↔Consolidation | < 25% of PRs touching `booking/` also touch `consolidation/`, over 3 months | VCS |
| Duplicate slot commitments | 0/month after the fix; any recurrence falsifies it | incident tracker |
| Queries on the Booking→Consolidation edge | → 0 | gateway logs |
| Confirmations blocked by Consolidation downtime | tells you if the sync dependency is a real constraint | production |

## The count that is the verdict

Eight open questions on a core context. Three of them are hotspots raised in discovery and still
unanswered; two are direct contradictions between artifacts. And neither session that produced this
evidence had a customer present — nor did the discovery session have anyone responsible for the
product (two planners, a customs clerk, a finance analyst, three engineers). Which messages this
context accepts is a product commitment; right now no one who owns that commitment has seen it.

Unblock in this order: trace the flows (`4-connect`), settle what "consignment" means, decide where
the capacity check lives. The rest of the interface follows from those three.
