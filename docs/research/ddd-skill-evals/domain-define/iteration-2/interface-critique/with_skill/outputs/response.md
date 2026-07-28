# Booking — does the design hold up? No. Do not freeze the interface yet.

I ran loop 3 (Define) over Booking: Bounded Context Canvas v5 + Quality Storming + the five
interface-critique questions. The canvas is written to `docs/domain/booking/README.md` (181 lines,
core budget). Booking is the only context I canvassed — Consolidation, Customs and Invoicing got
nothing, deliberately, except one note that Consolidation needs its own canvas before Booking's
contract can settle.

## Two blockers

**1. Half the interface has never been observed.** There is no `docs/domain/flows/` in the repo —
message flows have not been traced. `ddd_context.py` reports **zero traced messages** across the
Booking boundary. Everything I could write in the inbound/outbound table came off `model.yaml`,
`context-map.md` and the discovery timeline, which means it is model-derived, not observed. Concretely:
**two of three inbound messages have no name on disk** (the booking request from Quoting, and the one
from the customer front end). You would be freezing a contract whose inbound half is unnamed.

**2. The interface encodes the March double-booking rather than fixing it.** `booking/model.yaml`
records a *"synchronous remaining-capacity check before reserving"*. That is check-then-act across a
context boundary: Booking reads Consolidation's remaining capacity, then decides to commit. It is not
atomic. Hotspot #1 in the discovery timeline is exactly this failing — *"two shipments were committed
to the same container slot in March; nobody agrees where the check should have happened"*. The
canvas answers where: the invariant *"a container's committed volume must never exceed its capacity"*
belongs to Consolidation, and `CapacityReserved` already exists there as its outcome event. The fix
is one outbound **command** that Consolidation accepts or rejects, not a query followed by a decision
on Booking's side. Freeze now and this defect becomes a permanent property of the contract.

## Interface critique — the six findings, by cost to unfreeze

| # | Q | Finding |
|---|---|---|
| 1 | Q4 internals | **The Shared Kernel is the real interface.** `ConsignmentLine` is an entity inside Booking's aggregate *and* inside Consolidation's `ContainerLoad`, with different attributes (`weightKg, hazardClass` vs `stackable`), and `context-map.md` says **both write it**. Two aggregates writing one entity means neither can enforce its invariant. Freezing two events freezes this much larger surface with them. |
| 2 | Q2 type | The capacity interaction is query-then-act; it should be one command. See blocker 2. |
| 3 | Q4 internals | **`BookingConfirmed` leaks a neighbour's internals** — payload carries `containerId`, the root key of Consolidation's `ContainerLoad`. Every consumer of Booking's published language becomes coupled to Consolidation's container model, and nothing on disk shows a consumer that needs it: Routing's own event is `[bookingId, carrierId]`. |
| 4 | Q3 size | **The interface is too small, not too big.** Two events, no named inbound messages, no negative path — nothing on disk covers rejection, cancellation, amendment or departure change, although the invariant implies confirmation can fail. |
| 5 | Q1 names | `BookingRequested` / `BookingConfirmed` cohere. `Consignment` does not cohere across the map: Booking says "goods a customer hands over as one unit", Invoicing says "a billable line". Hotspot #2 is finance and ops colliding on this word, and it is still open. |
| 6 | Q5 placement | `hazardClass` on Booking's `ConsignmentLine` — the regulated context is Customs. Nothing shows Booking using it. A question, not a claim. |

**Perturbation I ran** (the "move something and see what improves" test): moved `ConsignmentLine`
wholly into Consolidation, leaving Booking a requested-volume value object. It makes the capacity
invariant enforceable in one aggregate, gives hotspot #1 an owner, and drops the Shared Kernel to
Building Blocks (`ShipmentRef` only). Cost: Booking can no longer answer "what is in this booking"
without querying Consolidation, and the customer's consignment stops being the planner's stacking
unit — which hotspot #2 says is already the case in practice.

**Perturbation I rejected:** moving the capacity decision *into* Booking. It makes the reservation
atomic, but puts fill-rate optimisation — the one differentiating capability in the business model —
behind the Booking boundary.

## Two things upstream of the interface

**Booking's "core" label is unsupported.** `context-map.md` calls it core ("where the money is
committed"), but `business-model.md` has **no capability row for Booking at all**, and
`core-domain-chart.md` does not exist. Meanwhile the one capability marked *differentiating* in the
business model is **load consolidation**, which `context-map.md` classifies **supporting**. So the
stated differentiator sits behind a supporting boundary, and the context you are about to freeze is
called core on a line that, by the map's own admission, "has not been revisited since the first
modelling session in March". I did not re-classify — that is a finding for `5-strategize`.

**The model covers about a fifth of Booking.** Declared mass is 9 tables / 54 attributes; the model
names 3 types and 10 attributes. Roughly 80% of the implementation's attributes are unmodelled, and
any of them may already be public surface. That alone makes "freeze the public interface" premature —
you do not yet know what the public surface is.

## Quality storming — one attribute that changes the model

- **Concurrency** — two bookings must never commit the same slot (planner, 2026-05-25). This is an
  invariant, therefore an aggregate boundary, therefore blocker 2.
- **Availability** — can Booking confirm while Consolidation is down? Today's synchronous check says
  no. Nobody has stated whether that is acceptable; the commercial director could. If the answer is
  "it must", that forbids the synchronous dependency and changes the model again.
- **Auditability** — the premium is charged whether or not the container fills (finance analyst), so
  what was promised at booking time has to be reconstructible. No retention number stated.

## Verification metrics (so you can find out you were wrong)

Two are falsifiable predictions with dates, in the canvas: **under 25% of PRs touching `booking/`
also touch `consolidation/` by 2026-10-31** (CI/VCS — the Shared Kernel predicts it is high today),
and **zero double-commit incidents per quarter** once the reserve interaction is one command
(incident log). Plus planner manual overrides per week, origin of `ConsignmentLine` writes, and the
count of consumers actually reading `containerId` — if that last one is zero, finding 3 is free to fix.

## Open questions — seven, five of them on the interface

Rejection/unavailability behaviour; cancellation and amendment; whose "consignment"; is Booking core;
the unmodelled 44 attributes; hotspot #3 (carrier refuses a sealed container — does anything come
back to Booking?); and **who owns this interface as a product commitment** — no product owner
attended either discovery session. That last one matters here specifically: which messages a context
accepts is a commitment somebody has to own, and right now nobody does.

Seven open questions on a context being called core is the short answer to "does the design hold up".

## What I'd do before freezing

1. Run `4-connect` to trace the flows — name the inbound messages. Cheapest, unblocks everything.
2. Turn the capacity check into one command; assign the invariant to Consolidation.
3. Resolve `ConsignmentLine` — one writer, or two differently-named concepts.
4. Drop `containerId` from `BookingConfirmed`, or record the consumer that needs it.
5. Get the classification settled in `5-strategize`, and get a product owner on the interface.

I did not edit `model.yaml` or `context-map.md` — those belong to `3-decompose`. The three proposed
deltas are listed at the bottom of the canvas.
