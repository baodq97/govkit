# Worked example — 7-define

**Input:** the Nordic Freight model — `Consolidation` placed as the core context by
`5-strategize` (the Guaranteed Consolidation premium), with message flows already traced.

**Right-sizing:** full canvas for `Consolidation`, lighter ones for `Booking` and `Customs`, stubs
for `Notifications` (bought) and `Routing`.

**Purpose:** *"Decide which consignments travel in which container on which departure, so that
customers who paid for Guaranteed Consolidation get their slot and containers leave as full as
possible."* Actors: depot planners, and indirectly the exporters who bought the premium.

**Domain role:** execution (it enforces a workflow) **and** analysis (it optimises fill). Naming
both surfaced the finding: the optimiser and the commitment ledger have different change rhythms,
and the optimiser could move behind a port without splitting the context.

**Interface critique found:** `ReserveCapacity` was modelled as an inbound query followed by a
command — question 2 says it should be one command the context accepts or rejects. Question 4 caught
`ContainerLoad` being exposed wholesale to Booking, which is the context's internal state.

**Assumptions written down (previously implicit):**

- a container is committed to exactly one departure and never re-planned after sealing,
- planners will keep resolving infeasible stacks by hand — the optimiser is advisory,
- volume, not weight, is the binding constraint on Nordic's lanes.

The third turned out to be contested in the room, which made it an open question rather than an
assumption — and it is the kind of thing that would have been discovered by a production incident
instead.

**Verification metrics chosen:** how often `Consolidation` and `Booking` change in the same pull
request (change coupling, from CI); planner manual overrides per week (from the live system). If
the first climbs, the boundary is wrong; if the second climbs, the model does not match the work.

Note what the example does **not** do: it does not invent a business rule about re-planning, it does
not reclassify `Consolidation` on its own authority, and it does not fill the open-questions section
with rhetorical questions to look thorough — the one question there is a real disagreement with two
names on it.
