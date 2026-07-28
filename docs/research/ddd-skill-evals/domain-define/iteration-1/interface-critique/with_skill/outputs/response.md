**Verdict: don't freeze it yet.** Three things in the current interface would become expensive the
moment a consumer depends on them, and one thing that should be in the interface is missing entirely.

I filled a full Bounded Context Canvas for `Booking` and ran the five interface-critique questions
over it. Written to `docs/domain/booking/README.md` — `domain-decompose` never left a first-pass
canvas there, so this is a first write, not a merge.

## What breaks if you freeze today

**1. The capacity query is the wrong message type (Q2 — the blocker).**
`booking/model.yaml` describes a *"synchronous remaining-capacity check before reserving"*: a query,
then a command. The invariant being checked — *"a container's committed volume must never exceed its
capacity"* — belongs to `Consolidation`'s `ContainerLoad` aggregate, not to Booking. Read-then-act
across a boundary is exactly the mechanism behind hotspot 1 in your discovery timeline: two shipments
in the same slot in March, *"nobody agrees where the check should have happened"*. The canvas answers
that: the check happens where the invariant lives. Collapse both messages into one `ReserveCapacity`
command that `Consolidation` accepts or rejects atomically.

Related: once that command answers synchronously, its response and the `CapacityReserved` event carry
the same fact on two paths. Pick one — and which one you pick depends on an unanswered question (see
below).

**2. Two messages on this interface have no name.** The capacity read and the reserve command exist
only as a prose note. There are no traced message flows in the repo at all. You cannot freeze a
contract at a level of detail nobody has written down.

**3. Booking publishes other contexts' internals (Q4).** `BookingConfirmed` carries
`[bookingId, containerId]`. `containerId` is `Consolidation`'s aggregate root identity, and
`routing/model.yaml` says `Routing` forwards that message to the external partner network unchanged —
so a `Consolidation` internal id reaches a third party through Booking's public event. Nothing in
`Routing` suggests it needs a container; verify, then drop the field.

Worse on the same question: `ConsignmentLine` is a Shared Kernel that **both contexts write**
(`context-map.md`), and they model it differently — `[lineId, volumeM3, weightKg, hazardClass]` here
against `[lineId, volumeM3, stackable]` in `Consolidation`. Same name, two shapes, two writers. The
sharing is nominal; the coupling is not.

**4. The message that should exist doesn't (Q5).** Your stated revenue stream is the Guaranteed
Consolidation premium — +18% for a promised departure slot. No context models it. `Invoicing` charges
it, `Consolidation` honours it, and the moment a customer elects it is the moment they commit, which
is here. A context justified as *"where the money is committed"* whose interface carries no message
about the thing customers pay a premium for either has the wrong justification or an incomplete
interface. Adding a premium field to `BookingRequested` after the freeze is a breaking change to every
consumer.

## What's actually fine

The interface is **not too big** (Q3) — about six messages for one responsibility. The problem runs the
other way: 9 tables, 54 attributes, a 22-attribute entity, and exactly one owned rule. The swimlane
makes it plain — three lanes, one decision, and that decision is *"did the other context say yes"*.
Quote validity is Quoting's rule; capacity is Consolidation's. What's left reads like an orchestrator.
Not fatal, but it undercuts the `core` label, and it means pressure will build to expose the data
rather than the decisions.

Naming (Q1) is coherent within the lifecycle pair, but the lifecycle is incomplete: no rejected,
amended or cancelled message. Hotspot 3 — a partner carrier refusing a sealed container — has nothing
to land on.

## Two things I could not fill, and they matter

**Strategic classification is two-thirds empty.** `context-map.md` says `core` on a March judgement it
admits has not been revisited, and `business-model.md` has no row for Booking at all — its capability
table covers six other capabilities and skips this one. Business-model role and evolution stage are
both unknown. I carried the classification rather than re-deriving it; the disagreement is a finding
for `domain-strategize`, not something to settle on this canvas.

**Four model-changing quality attributes are `unknown`, for the same reason.** Can you accept a booking
while `Consolidation` is down? How long will a customer wait before abandoning? Both decide synchronous
versus asynchronous confirmation — and therefore the model, and therefore the interface. Neither has an
answer because **no customer has attended any session**, stated in both `business-model.md` and
`timeline.md`. Freezing a contract on top of four unknowns that each move the model is the risk this
exercise exists to surface.

Also worth knowing: Booking's only invariant — *"a booking may only be confirmed once its capacity has
been reserved"* — appears in `model.yaml` and was **not restated by anyone in discovery**. One owned
rule, unconfirmed.

## Move experiments run

- **Adopt** — capacity decision moves wholly into `Consolidation` (one command, accept/reject). Cost:
  no more "is there room?" before committing, so the journey becomes request → accept/reject. Cheap,
  because no customer has validated the current journey either.
- **Adopt** — break the `ConsignmentLine` shared kernel; Booking owns the customer-declared line,
  `Consolidation` derives its planning line. Cost: apparent duplication plus a translation. This is the
  change that makes the boundary real.
- **Rejected, but instructive** — move the confirmation lifecycle into `Consolidation` and make Booking
  a front end. `customerId` exists only here, and `Consolidation` has no commercial vocabulary. What
  survives the move is the customer commitment, which argues the premium election belongs here.

## Before the freeze

Answer three questions: where the Guaranteed Consolidation premium is elected; whether a booking can be
accepted while `Consolidation` is down; and what the customer actually waits for. Then instrument two
metrics — pull requests touching both `booking/` and `consolidation/` (change coupling on the shared
kernel), and reserve rejections that follow a capacity read saying there was room (the March race, made
observable). Both come from tools you already have; both would change a decision.

Nine open questions on a context labelled `core`, three of which change the interface itself. The full
canvas, the assumptions ledger, the metrics table and six proposed deltas to `model.yaml` are in
`docs/domain/booking/README.md`. I left `model.yaml` alone — `domain-decompose` owns it.
