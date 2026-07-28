---
id: DOMAIN-CONS-0001
title: Consolidation — aggregate design
status: draft
owner: TBD
date: 2026-07-27
supersedes: none
applies_to: docs/domain/consolidation/
---

## Scope

Aggregate boundaries for the **Consolidation** context only — enough for the team to start writing
code this week. Two aggregates, the commands they accept, and one decision that everything else
follows from: *what stays a transactional invariant and what becomes a corrective policy.*

Out of scope, deliberately: the stowage optimiser (still a whiteboard in Gothenburg), the sub-domain
re-classification argued below, and anything inside Booking, Customs or Routing. Cross-context
contract changes are listed as requirements on those teams, not designed here.

Not edited: `docs/domain/consolidation/model.yaml`, `docs/domain/context-map.md`. The repo README
marks those as intentionally inconsistent fixture inputs. Divergences are listed at the end.

---

## The decision

**The no-overbooking rule stays a transactional invariant inside one aggregate. The pre-cut-off
burst changes how we hold the lock — not whether we hold it.**

The tempting move under load is: accept every reservation, detect overflow afterwards, bump a
shipment. Reject it. That is exactly the March incident (discovery hotspot #1), and the bump is the
one failure the product forbids — *Guaranteed Consolidation* (+18% of the forwarding fee) is a
promise that the shipment gets its departure slot. There is no compensating action after a container
sails full. An eventually-consistent capacity rule here converts a rare technical race into a
recurring refund-and-apology.

The burst is real, but it is a *contention* problem, not a *correctness* problem. The fix is to make
the transaction that enforces the invariant small and fast, and to serialise per container.

---

## Aggregates

Two, both small. Boundaries and the reservation path: [`aggregates.d2`](aggregates.d2) →
[`aggregates.svg`](aggregates.svg). Machine-readable model for the team:
[`aggregates.yaml`](aggregates.yaml).

### 1. `ContainerLoad` — the consistency boundary of the capacity invariant

| | |
|---|---|
| **Root** | `ContainerLoad` |
| **Identity** | `containerId` |
| **Why this boundary** | It is the smallest thing that can answer *"does this fit?"* without consulting anything else. Capacity and committed volume must be decided in one transaction; nothing else must be. |

**Root state**

| Field | Note |
|---|---|
| `containerId`, `departureId`, `portCode` | identity + references |
| `cutOffAt` | **copied from `Departure` when the container is opened**, immutable thereafter — so a reservation never has to read a second aggregate |
| `capacityM3`, `capacityKg`, `allowedHazardClasses` | set at open |
| `committedM3`, `committedKg` | running totals, maintained on write — never recomputed by loading all lines |
| `state` | `Open → Sealed → Dispatched` (or `Cancelled`) |

**Child entity `CommittedLine`** (0..*): `lineId`, `bookingId`, `reservationId`, `volumeM3`,
`weightKg`, `stackable`, `hazardClass`, `service` (`Standard` \| `Guaranteed`), `state`
(`Held` \| `Confirmed` \| `Released`).

**Commands**

| Command | Result |
|---|---|
| `ReserveCapacity(reservationId, bookingId, lines[], service)` | `CapacityReserved` \| `CapacityRejected(reason)` |
| `ConfirmReservation(reservationId)` | `CapacityConfirmed` |
| `ReleaseReservation(reservationId, reason)` | `CapacityReleased` |
| `Seal()` | `ContainerSealed(containerId, fillRate)` |
| `Dispatch()` | `ContainerDispatched` |

`reservationId` is the idempotency key. A replay returns the original outcome — this matters,
because the burst is exactly when clients retry.

**Transactional invariants** (checked inside the aggregate, in the same transaction as the write)

| # | Invariant |
|---|---|
| I1 | `committedM3 ≤ capacityM3` and `committedKg ≤ capacityKg`, counting `Held` **and** `Confirmed` lines |
| I2 | No reservation accepted at or after `cutOffAt` (server clock read at commit time) |
| I3 | No reservation accepted unless `state = Open` |
| I4 | A container holding at least one `Guaranteed` line may not be rolled to a later departure — it seals and sails at cut-off whatever its fill rate |
| I5 | *(candidate, unconfirmed)* a line's `hazardClass` must be in `allowedHazardClasses` |

I4 is the premium promise expressed as code. It is the rule a fill-rate optimiser will want to
break; putting it on the aggregate means it cannot.

I5 came from the `hazardClass` attribute on Booking's `ConsignmentLine`, not from an interview.
Confirm with the planners before building it.

**Explicitly not in this aggregate:** which container a booking should go to (a domain service, see
below), stowage/stacking geometry, anything owned by Booking.

### 2. `Departure` — the sailing and its cut-off

| | |
|---|---|
| **Root** | `Departure` |
| **Identity** | `departureId` |
| **State** | `portCode`, `sailingRef`, `cutOffAt`, `departsAt`, `state` (`Open → CutOff → Sailed`), the set of `containerId`s opened for it |
| **Commands** | `OpenContainer`, `ExtendCutOff`, `CutOff`, `MarkSailed` |
| **Invariants** | J1 containers may only be opened while `state = Open`. J2 `cutOffAt` may only change while `state = Open`. |

`Departure` does **not** hold capacity totals and is never loaded on the reservation path. Its only
influence on a reservation is the `cutOffAt` value copied into each `ContainerLoad` at open time.

When a planner extends a cut-off, the new value reaches open containers through a policy, not a
transaction. During the propagation window the containers still enforce the *earlier* cut-off, so
the worst case is that a late booking is rejected a few seconds before it needed to be. That is the
safe direction — see the rule below.

### Not an aggregate: `ContainerSelection`

A stateless domain service. Given a departure and a consignment, it proposes an ordered list of
candidate containers (first fit by remaining volume, tie-broken by the highest resulting fill rate).
It runs **before** the lock and holds no state. The `ContainerLoad` is still free to reject; the
caller then tries the next candidate. Selection is advice, the aggregate is the authority.

### The rule that decides everything else

> **One reservation touches exactly one `ContainerLoad`, in one short transaction, with no I/O
> inside it.**

No cross-container transaction. Splitting a consignment across two containers, if the business
wants it, is two reservations run by a process manager: if the second is rejected, the first is
released. That degrades to under-fill, never to overbooking.

---

## Invariant, or corrective policy?

The test we applied to every rule:

> Enforce it transactionally when the failure is **irreversible and lands on the customer promise**.
> Use a corrective policy when the failure direction is **"we carried less than we could have"** —
> that costs margin, which is recoverable, not trust, which is not.

| Rule | Home | Enforcement | Why |
|---|---|---|---|
| Committed volume ≤ capacity | `ContainerLoad` | **transactional invariant** | A bump voids the Guaranteed premium. No compensation exists once the container sails. |
| No reservation after cut-off | `ContainerLoad` (copied `cutOffAt`) | **transactional invariant** | Physical and irreversible — the ship leaves. |
| A Guaranteed container seals at cut-off | `ContainerLoad` (I4) | **transactional invariant** | It *is* the promise. |
| A booking is only confirmed once capacity is reserved | Booking + Consolidation | corrective policy (reserve → confirm, TTL) | Failure leaves held capacity: recoverable. |
| Abandoned reservation frees its capacity | policy on `ReservationExpired` | corrective, eventual | Errs toward under-fill. |
| Cut-off extension reaches open containers | policy | corrective, eventual | Stale = stricter = rejects. Safe. |
| Average fill rate ≥ 80% | planning policy — **never** an invariant | corrective | Enforcing a fill target transactionally means holding a container back to fill it, which breaks I4. A goal is not an invariant. |
| Declaration submitted before carrier handoff | Customs / Routing | not ours | Different context; noted so nobody re-implements it here. |

**Reservation hold TTL, and the burst.** A long hold is dangerous precisely in the last hour: an
abandoned half-finished booking freezes capacity when demand peaks, producing false rejections and
under-fill. Proposal: `hold = clamp(default_hold, 60s, time_to_cutoff / 4)`. The number needs
commercial sign-off — it trades checkout friction against fill rate.

---

## The pre-cut-off burst

### What actually breaks

Throughput is not the first thing to fail. Serialised, the reservation transaction touches one row
plus one insert — call it 2–5 ms, so roughly 200–500 reservations/second **per container**. The
failure modes that arrive long before that ceiling:

1. **Retry storms** if we use naive optimistic concurrency on a large aggregate — conflicts rise
   with concurrency, and each retry adds load at the worst moment.
2. **Rejection cascades** — dozens of bookings racing for the last slot in the fullest container.
   All but one are rejected and must deterministically fall through to the next candidate.
3. **The cut-off instant** — a request that arrives at `cutOffAt − 50 ms` and commits at
   `cutOffAt + 30 ms`. Decide on the commit-time clock and say so in the contract; there is no
   ambiguity to argue about later.
4. **TTL expiry racing the cut-off**, as above.

### Options considered

| | Approach | Trade-off |
|---|---|---|
| A | Single aggregate, optimistic concurrency + retry | Simplest. Degrades worst exactly under burst — retry amplification. |
| **B** | **Single aggregate, small root, pessimistic row lock per container, one short transaction, no I/O inside** | **Recommended.** Reservations queue instead of colliding. Deterministic. Needs a bounded lock wait with fast-fail so a stuck transaction cannot stall a container. |
| C | Partition each container's capacity into K sub-buckets (sharded counters) | Buys throughput we have no evidence of needing, and strands capacity in each bucket — which fights the 71% → 80% fill goal directly. Premature. |
| D | Accept everything, detect overflow later, bump a shipment | Rejected. This is the March incident and it breaks the product. |

**Recommendation: B.** Revisit C only against a measurement — sustained reservations on a single
container above ~50/s, or p99 lock wait above 500 ms in the final hour.

### Measure before you tune

We have no burst numbers, only the observation that one exists. Cheapest measurement, from existing
Booking data, no new code in the domain: a histogram of booking creation time relative to
`cutOffAt`, grouped by departure and by target container, over the last 90 days. That yields peak
reservations/second on the hottest container. Our expectation is that it lands two orders of
magnitude under B's ceiling and the whole contention question closes. If it does not, C is on the
table with real numbers behind it.

---

## What other teams have to change

Two upstream contracts make the invariant unenforceable as they stand today.

1. **Booking's check-then-act must go.** Booking currently reads Consolidation's remaining capacity,
   then commands it to reserve. Between those two calls the answer changes — that gap is hotspot #1,
   the two shipments committed to one slot in March. Replace both calls with a single
   `ReserveCapacity` command that returns `CapacityReserved` or `CapacityRejected`. The
   remaining-capacity read may stay for planner screens, labelled advisory and stale, and must never
   be a decision input.
2. **`ConsignmentLine` must stop being a shared kernel.** Booking and Consolidation both write it
   today. An aggregate cannot guarantee a total it does not exclusively own. Consolidation owns
   `CommittedLine`, populated from the `ReserveCapacity` payload; Booking keeps its own
   `ConsignmentLine`. The wire payload becomes a published contract, not shared storage.

**Language.** Consolidation's "consignment" is a physical stack of pallets with a volume; Invoicing's
is a billable line (hotspot #2). Inside Consolidation the entity is `CommittedLine` and the inbound
DTO is `ReservedLine`. Neither context has to give up its own word, and the collision stops leaking
across the boundary.

---

## First slice — what the team starts on

One week, in this order:

1. **Measure** the burst as described above. Read-only, no domain code, unblocks the tuning question.
2. **`ContainerLoad` with I1, I2, I3** plus `ReserveCapacity` / `ConfirmReservation` /
   `ReleaseReservation`, per-container pessimistic lock, idempotent on `reservationId`. This is the
   whole point of the context; everything else can wait.
3. **The concurrency test** (below) as a gate on the slice.
4. **A load probe at 10× measured peak** on one container.

`Departure`, `Seal`, `Dispatch` and I4 land in slice 2. The optimiser stays on the whiteboard until
the capacity ledger is trustworthy.

**Acceptance tests**

- Given a container with 10 m³ free, when 50 concurrent `ReserveCapacity` commands of 1 m³ each
  arrive, then exactly 10 are accepted, `committedM3 = capacityM3`, and 40 carry an explicit
  rejection reason. No run of this test ever overflows.
- Given the same `reservationId` sent three times, then one `CapacityReserved`, one line, one total.
- Given a reservation committing at `cutOffAt + 1 ms`, then rejected with `PastCutOff`.
- Given a held reservation whose TTL expires, then its volume is free for the next reservation.
- Given a container with one `Guaranteed` line at cut-off and 44% fill, then `Seal` succeeds and a
  roll to the next departure is refused.

---

## Assumptions and open questions

| # | Item | Needs |
|---|---|---|
| 1 | Burst magnitude is unmeasured. Design assumes it sits far below B's ceiling; the design does not *depend* on that — B is correct either way. | the measurement above |
| 2 | `Guaranteed` means "no departure delay", **not** priority allocation — a premium booking does not preempt a standard one already holding capacity. | commercial director. This materially changes contention handling if wrong. |
| 3 | Reservation hold TTL near cut-off | commercial director |
| 4 | May one consignment be split across two containers? | depot planners |
| 5 | Who owns the case where a partner carrier refuses a sealed container (hotspot #3)? Consolidation is the natural home for the re-plan, but ownership is a human decision and no aggregate here models it yet. | planners + whoever owns partner relations |
| 6 | I5 (hazard-class compatibility) is inferred, not stated. | planners |

---

## Divergence from the existing domain docs

Flagged, not fixed — these files are inputs we do not own.

| Doc | Says | This design |
|---|---|---|
| `consolidation/model.yaml` | 1 aggregate, 5 tables | 2 aggregates; the tactical model needs a refresh once the slice lands |
| `consolidation/model.yaml` | `ConsignmentLine` inside `ContainerLoad` | `CommittedLine`, Consolidation-owned |
| `context-map.md` | Consolidation is `supporting`; `ConsignmentLine` is a Shared Kernel | Shared kernel removed. The `supporting` label also disagrees with `business-model.md`, which records consolidation as the one revenue-generating, custom-built, genuinely differentiating capability. Labelling the context that carries the premium promise as back-office is a staffing risk, and it is not ours to re-label — raise it with whoever owns the context map. |
