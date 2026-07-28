Consolidation gets **one aggregate**, and the burst you mentioned is what settled the two decisions that matter.

**Written**
- `docs/domain/consolidation/aggregates/ContainerLoad.md` — full Aggregate Design Canvas (draft, owner TBD)
- `docs/domain/consolidation/README.md` — context summary (there was no README; `domain-define` has not been run for this context, and the file says so rather than pretending a canvas exists)

## `ContainerLoad` — one container on one departure

**Boundary.** Scoped to exactly the one rule the business has stated: *"a container's committed volume must never exceed its capacity"* (planner, 2026-05-25). `Departure` was considered and rejected — it would serialise every booking on a sailing onto one instance, at precisely the hour your burst arrives. Capacity-in-`Booking` was rejected too: that is the March incident. Booking does a synchronous remaining-capacity check and then commands the reservation, and check-then-act across a boundary is not enforcement. Hotspot 1 ("nobody agrees where the check should have happened") is that gap, not a bug in either service.

**The invariant stays enforced. No corrective policies — deliberately.**

The burst is exactly the pressure that makes relaxing the rule attractive: enforce it and you get optimistic-lock conflicts concentrated in the busiest hour. I'm not taking that trade, for two reasons:

1. The repair is a paid-for promise being broken. Repairing an overcommit means bumping a consignment, and Guaranteed Consolidation charges +18% to promise a slot. The planner's own phrasing of the rule names the consequence. Enforcing costs a retry; relaxing costs revenue and trust.
2. There is no corrective policy to relax *into*. Nobody has stated who gets bumped, whether the premium is refunded, or who is notified. A relaxed invariant with no named corrective policy isn't eventual consistency — it's an unhandled defect with a schedule. I won't write that policy on the business's behalf.

What exists today is an undocumented manual repair: four senior planners fixing conflicts by hand in Gothenburg. Four questions for the commercial director and the planners are in the canvas; until they're answered, the rule stays inside the transaction.

Cost accepted: a `version` column on `ContainerLoad` and a bounded application-layer retry that re-reads and re-evaluates the rule. Consequence for Booking: its remaining-capacity call becomes **advisory** — a query for the UI. The reservation is the decision and it may reject. Booking's own invariant already assumes it can handle rejection, so nothing else there needs to change.

**Throughput stays `unknown`.** I did not put numbers on the burst. What I recorded is its shape — many bookings converging on a small set of container loads in one hour — plus who can supply the figures: planners for bookings-per-departure and the arrival profile, Booking's production logs for the concurrent request rate. The highest-value unknown is **how many containers are open per departure**: if it's one, per-container scoping buys nothing and the retry rate at cut-off is the first thing to measure.

**Size:** small. ~1 event per consignment plus the seal, lifetime bounded by the departure. No snapshots, archival is natural — the name already carries the time-scoping heuristic.

## Three things the canvas exposed that block a clean start

- **Release/cancellation has no command and no event.** If a booking is cancelled after `CapacityReserved`, nothing returns the volume — committed volume drifts up permanently, which works directly against the 71%→80% fill goal. No cancellation event exists anywhere in the timeline, so I raised it rather than inventing `ReleaseCapacity`.
- **`ConsignmentLine` is declared a Shared Kernel that both Booking and Consolidation write.** Two contexts writing one entity can't both keep one transaction per aggregate, and their versions already carry different attributes. Routed to loop 2 — the implementer must not resolve it by sharing a class.
- **Mass gap:** `model.yaml` claims 5 tables / 41 attributes for a model with two entities and seven attributes. Either the figures cover something we haven't seen, or there's structure in the database with no model behind it. Worth an hour before coding — unmodelled structure is where unstated rules hide.

**Right-sizing flag:** the context map labels Consolidation `supporting`, which under right-sizing earns a transaction script and no canvas at all. The business model contradicts that flatly — container fill is the differentiator, custom-built, the source of the premium. I filled the canvas as if core and routed the label to `domain-strategize` rather than editing it.

**Handoff:** `data-model` takes `ContainerLoad` + `ConsignmentLine`, the identity scheme and the `version` column, and is told the capacity rule **cannot** be a check constraint — it sums across rows and needs read-then-decide, so it stays in the aggregate. `api-designer` takes `ReserveCapacity` and `SealContainer` with rejection as a modelled outcome, the remaining-capacity read marked explicitly as advisory, and `CapacityReserved` as the published contract.

This is design only — canvases and the structural contract, no classes. Seven open questions with named owners are at the end of the canvas; Q1–Q4 (cut-off semantics, overcommit repair, cancellation, containers per departure) should land before the team starts typing.
