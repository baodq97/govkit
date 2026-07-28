Consolidation aggregate design is in `docs/domain/consolidation/` — `aggregate-design.md` (rationale
and decisions), `aggregates.yaml` (the model the team codes against), `aggregates.d2` + `.svg`
(boundaries and the reservation path).

## The decision the burst forces

**The no-overbooking rule stays a transactional invariant inside one aggregate. The pre-cut-off burst
changes how we hold the lock, not whether we hold it.**

The tempting move under load is to accept every reservation, detect overflow afterwards, and bump a
shipment. That is the March incident, and the bump is the one failure the product forbids —
Guaranteed Consolidation at +18% is a promise of the departure slot, and nothing compensates it once
the container has sailed. The burst is a contention problem, not a correctness one.

## Two aggregates

**`ContainerLoad`** — the consistency boundary for capacity. Root holds `capacityM3/Kg`,
`committedM3/Kg` as running totals, and `cutOffAt` copied from the departure at open time so a
reservation never reads a second aggregate. `CommittedLine` children (`Held → Confirmed →
Released`). Transactional invariants: committed ≤ capacity; no reservation at/after cut-off; only
while `Open`; a container holding a Guaranteed line seals at cut-off whatever its fill rate.
`ReserveCapacity` is idempotent on `reservationId` — the burst is exactly when clients retry.

**`Departure`** — cut-off, sailing, the set of opened containers. Never on the reservation path.

**`ContainerSelection`** is a stateless domain service, not an aggregate. It proposes candidate
containers *before* the lock; the aggregate stays the authority and may reject.

One rule everything else follows from: **one reservation touches exactly one `ContainerLoad`, in one
short transaction, with no I/O inside it.**

## Invariant vs corrective policy

The test: enforce transactionally when failure is irreversible and lands on the customer promise; use
a corrective policy when the failure direction is "we carried less than we could have" — that costs
margin, which is recoverable, not trust, which is not.

Corrective, deliberately: reservation TTL expiry, release on abandoned booking, cut-off-extension
propagation (a stale container enforces the *earlier* cut-off, so it rejects slightly early — safe).
The 80% fill target is a planning goal and never an invariant; enforcing it transactionally means
holding a container back to fill it, which breaks the Guaranteed promise.

## The burst, concretely

Options weighed: optimistic concurrency + retry (degrades worst exactly at peak — retry
amplification); **pessimistic per-container row lock with a tiny transaction (recommended)** —
reservations queue instead of colliding; capacity partitioned into sub-buckets (buys throughput we
have no evidence of needing and strands capacity per bucket, fighting the 71% → 80% fill goal).

Serialised, the transaction is one row plus one insert, so roughly 200–500 reservations/second per
container. Throughput is unlikely to be what breaks. What breaks first: retry storms, rejection
cascades onto the last free slot, the cut-off instant itself (decide on the commit-time clock and put
it in the contract), and reservation TTLs racing the cut-off — a long hold freezes capacity precisely
when demand peaks, so hold near cut-off should shrink.

We have no numbers, only your observation that a burst exists. Cheapest measurement, from existing
Booking data with no new domain code: booking creation time relative to `cutOffAt`, grouped by
departure and container, last 90 days. If peak lands where I expect, the tuning question closes.

## Blocking on other teams

Two contracts make the invariant unenforceable as they stand:

1. Booking reads remaining capacity, then commands a reserve. Between the two calls the answer
   changes — that gap is the March double-commit. Collapse both into one `ReserveCapacity` command
   returning accept/reject. Keep the capacity read for planner screens only, labelled stale.
2. `ConsignmentLine` is a shared kernel that Booking and Consolidation both write. An aggregate
   cannot guarantee a total it does not exclusively own. Consolidation owns `CommittedLine`, fed from
   the command payload.

Also: Consolidation's "consignment" (a stack of pallets) and Invoicing's (a billable line) are
different things. Inside Consolidation the entity is `CommittedLine`, so neither team gives up its
word and the collision stops crossing the boundary.

## Start here

Measure the burst; build `ContainerLoad` with the three capacity/cut-off invariants and the
reserve/confirm/release commands; gate it on the concurrency test (50 concurrent 1 m³ reservations
against 10 m³ free → exactly 10 accepted, 40 with explicit reasons, zero overflow, ever); load-probe
at 10× measured peak. `Departure`, sealing and the Guaranteed-seals-at-cut-off rule land in slice 2.
The optimiser stays on the whiteboard until the capacity ledger is trustworthy.

## Needs an answer from the business

- Does Guaranteed grant priority allocation, or only a no-delay departure? I assumed no preemption;
  if that is wrong it changes contention handling materially.
- How long may a half-finished booking hold capacity in the final hour?
- May one consignment be split across two containers?
- Who owns the case where a partner carrier refuses a sealed container? Still unassigned, and no
  aggregate here models it.

I left `model.yaml` and `context-map.md` alone and listed the divergences at the end of the design
doc. One is worth raising beyond this design: the context map calls Consolidation `supporting`, while
the business model records it as the only revenue-generating, custom-built, genuinely differentiating
capability you have. Staffing the context that owns the premium promise as back-office is a risk, but
re-labelling it is not my call.
