# Worked example — 8-code

**Input:** Nordic Freight's `Consolidation` context, defined, with the stated rule *"a container's
committed volume must never exceed its capacity"* and the March incident where two shipments were
committed to the same slot.

**Aggregate: `ContainerLoad`** (root: `ContainerLoad`) — one container on one departure.

*Description:* chosen over a per-departure aggregate because contention is per container; the
rejected alternative (`Departure` as the aggregate) would have serialised every booking on a
sailing.

*State transitions:* `planned → committing → sealed → departed`. Four transitions, no branch — no
split signal, and not anaemic.

*Enforced invariant:* committed volume ≤ capacity. **Corrective policy** for the relaxed variant,
written because the team seriously considered relaxing it: *"if an overcommit is detected after the
fact, bump the latest non-premium consignment to the next departure and notify its planner"* —
which immediately raised the question of what happens when every consignment on the container is
premium. That question went to the business rather than into the code.

*Commands → events:* `ReserveCapacity → CapacityReserved`; `SealContainer → ContainerSealed`. The
canvas exposed that `ReleaseCapacity` is handled but emits nothing, so cancellations are invisible
to Billing — a gap, not a style issue.

*Throughput:* average 3 commands/hour per container, **maximum ~40 in the hour before cut-off**,
with 6–12 planner clients. The maximum is where the conflicts live, and it justified keeping the
invariant enforced rather than relaxing it into a corrective policy.

*Size:* ~20 events per instance, lifetime bounded by the departure — days. No snapshotting needed,
nothing unbounded, archival is natural.

**Handoff:** `data-model` takes `ContainerLoad`, `ConsignmentLine` and the identity scheme, and is
told the capacity invariant is enforced in the aggregate, not by a check constraint, because it spans
rows. `api-designer` takes `ReserveCapacity` and `SealContainer` as the public surface, with
`CapacityReserved` published and the internal planning events kept private.

Note what the example does **not** do: it does not invent a rule about premium precedence — it turns
that into a question — and it does not fabricate the throughput numbers. Where the planner could not
estimate client counts for the Oslo lane, the canvas says `unknown`.
