<!-- id: DOMAIN-BC-0001 · status: draft · owner: TBD · 2026-07-28 -->

# Consolidation bounded context

## Purpose

Decide which consignments travel in which container on which departure, so that customers who paid
for Guaranteed Consolidation get the slot they were promised and containers leave as full as the lane
allows. Actors: the four senior Gothenburg depot planners who commit the loads, and indirectly the
exporters who bought the premium.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested** — core by differentiation, `supporting` as declared | `business-model.md` (differentiates: yes) vs `context-map.md` + `model.yaml` (`supporting`, "back-office load planning") |
| Business-model role | revenue generator | `business-model.md` — "Load consolidation / container fill optimisation" |
| Evolution | custom built | `business-model.md` |

Canvas tier: **full (core)** — the sole differentiating capability, and the only context that gets
the deep sections. New file; `3-decompose` left no README anywhere.

Carried, not re-derived. The fork is the finding — and `context-map.md` admits the classification
"has not been revisited since the first modelling session in March". Right-sizing follows the
business-model reading because differentiation is the test for core; resolving the fork belongs to
`5-strategize` / `3-decompose`.

## Domain roles

Two roles, and naming both is the finding:

- **Execution** — enforces the capacity invariant, holds the ledger of which consignment sits on which container.
- **Analysis** — proposes fills; per `model.yaml` notes the proposal is advisory, planners resolve
  infeasible stacks by hand on a whiteboard.

A ledger that must never be wrong and an optimiser expected to be tuned change at different rates — not evidence for a split, evidence for putting the optimiser behind a port.

## Inbound communication

> **Not traced.** No message flows exist on disk (`4-connect` has not been run); rows below come from
> `model.yaml` relationships and the discovery timeline — from the model, not from observed use.
> Relationship carries *direction only*: no context-mapping pattern is stated except the Shared Kernel.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | *unnamed* — "synchronous remaining-capacity check before reserving" | query | Booking is the downstream customer (`booking/model.yaml`); pattern not stated |
| Booking | bounded context | *unnamed* — reserve capacity for a booking | command (inferred from `CapacityReserved`) | as above; pattern not stated |
| Booking | bounded context | `ConsignmentLine` | shared write | **Shared Kernel** — stated in `context-map.md` |

Neither inbound message has a name on disk: the half of the interface where March's incident happened is the unspecified half.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | `CapacityReserved` (containerId, bookingId, volumeM3) | event | confirmed by planner, 2026-05-25 |
| Customs | bounded context | `ContainerSealed` (containerId, fillRate) | event | Customs downstream (`customs/model.yaml`); pattern not stated |

Outbound is events only, not commands — no Brain Context signature here.

### Swimlane

| In | Decision made | Out |
|---|---|---|
| capacity check (Booking) | none — read-through | remaining capacity |
| reserve capacity (Booking) | does committed + requested exceed capacity? | `CapacityReserved`, or rejection (rejection path not modelled anywhere) |
| planner seals container | none stated — sealing is a planner act, not a rule | `ContainerSealed` |

Lane 1 has no decision between in and out — a pass-through read of state the next message mutates (critique 2).

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Container load | The set of consignments committed to one physical container on one departure | not used elsewhere |
| Fill rate | Committed volume ÷ container capacity | not used elsewhere |
| Consignment / ConsignmentLine | A physical stack of pallets: `lineId, volumeM3, stackable` | **yes** — Invoicing: "a billable line on an invoice"; Booking's own `ConsignmentLine` carries `weightKg, hazardClass` and no `stackable`. Hotspot #2 (finance analyst) |

## Business decisions

Only what was stated in discovery, with attribution:

- **A container's committed volume must never exceed its capacity** — an overbooked container bumps
  a shipment and breaks the Guaranteed Consolidation promise. *Planner, 2026-05-25.* Carried as this
  context's invariant in `model.yaml`.
- **The premium is charged whether or not the container ends up full.** *Finance analyst,
  2026-05-25.* It constrains this context by decoupling revenue from fill rate; which context
  enforces it was not stated.

Nothing else. Sealing, re-planning and rejection were stated by nobody, so they appear below as assumptions or open questions, not rules.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | 0 recurrences | planner — hotspot #1, the March double-commit | **yes** — the invariant defines the aggregate boundary |
| Availability | what Booking does when this context is unavailable is **unstated**; the capacity check is synchronous today | unknown | inferred from `booking/model.yaml` note; nobody stated a degradation rule | **yes if answered "must keep booking"** — that forbids the synchronous call and moves a capacity read model into Booking |
| Latency | planner waiting on a fill proposal | unknown | nobody in the 2026-05-25 session stated a tolerance; the four senior planners can supply it | no — pre-compute/caching |
| Auditability | prove which consignments were in a container once sealed | unknown retention | inferred from the customs clerk's declaration rule and Invoicing's "line must reference a cleared declaration"; **not stated as a retention requirement by anyone** | **yes if confirmed** — makes load history domain state rather than a log |

## Assumptions

Domain — *(all inferred)*:

- A container is committed to exactly one departure and never re-planned after sealing. Basis:
  `ContainerSealed` has no counterpart un-seal or re-plan event on disk.
- **Volume is the binding constraint on Nordic's lanes.** Basis: every capacity attribute here is m³
  (`capacityM3`, `committedM3`, `volumeM3`); `weightKg` and `hazardClass` sit on Booking's
  `ConsignmentLine` and are absent from ours. If weight or hazard segregation ever binds, this
  invariant is incomplete — and the shared kernel is why nobody noticed.
- `fillRate` is committed volume, not physically loaded volume — no loaded-volume attribute exists.
- A rejection path exists for an unsatisfiable reservation. Nothing models it; Booking's invariant covers only the success case.

Scale / behaviour:

- *(stated, `model.yaml` notes)* Planners keep resolving infeasible stacks by hand — the optimiser
  is advisory, not authoritative.
- *(inferred)* Volumes are low enough for a synchronous capacity check per booking. No volume figure
  was collected in discovery.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of PRs touching both `consolidation/` and `booking/` — prediction: **< 25% by 2026-10-31** | Above that, the Shared Kernel *is* the boundary and these are one context wearing two names | VCS / CI, per-PR path stats |
| Double-commit incidents after the invariant moves inside `ContainerLoad` — prediction: **0 in 6 months** | Hotspot #1 recurring means the check still is not where the state is | incident tracker |
| Ratio of capacity *queries* to `CapacityReserved` events | A high query:command ratio means Booking is doing planning it should be delegating | production telemetry |
| Planner manual overrides per week vs the pre-build whiteboard baseline | If it does not fall, the optimiser's model does not match how planners actually stack | depot's own planning log — **baseline not yet measured**, see open questions |

## Open questions

1. Core or supporting? `business-model.md` and `context-map.md` disagree and nobody owns the answer.
2. Hotspot #1 — should the slot check live in Booking or here? The planner raised it; the room did
   not agree.
3. Is `ConsignmentLine` one concept or two? The two definitions already differ while
   `context-map.md` calls them a Shared Kernel both sides write.
4. What must Booking do when this context is unavailable, given the check is synchronous?
5. Is volume really binding, or do weight and hazard segregation bind on some lanes?
6. Who enforces "the premium is charged whether or not the container is full" — here, or Invoicing?
7. Hotspot #3 — who owns a carrier refusing a sealed container? Routing "owns no rule of its own"
   and our boundary ends at `ContainerSealed`, so no context claims it.
8. What is today's manual-override rate? A baseline is needed before build, not after.
9. No customer attended the 2026-05-25 session, yet Guaranteed Consolidation is a customer premium —
   every statement about what the promise means is second-hand.

Nine open questions on the context the business model calls its differentiator. That count, not any
section above it, is the finding: this boundary is not ready to build against.

## Interface critique

1. **Coherent names?** The two events are coherent facts. The two inbound messages have no names —
   they exist as a prose note and an inferred command.
2. **Right type?** No. Check-then-reserve is a query then a command over the same state, leaving a
   read-then-write window; it should be one command this context accepts or rejects. That window
   explains the March double-commit without any concurrency bug in the code.
3. **Too big?** No — two in, two out.
4. **Exposing internals?** Twice over. Booking reading remaining capacity is Booking reading
   `ContainerLoad`'s state; the Shared Kernel exposes an internal entity by construction; and
   `fillRate` rides on `ContainerSealed` to Customs, which has no use for a fill KPI.
5. **Belongs elsewhere?** Sealing reads as a depot act rather than a consolidation rule; nothing on disk decides. Recorded, not moved.

### Perturbation experiments

- **Moved:** `ConsignmentLine` out of the Shared Kernel — Booking keeps its own and passes volume +
  stackable in the reserve command. **Cost:** the line concept is duplicated. **Gain:** the capacity
  invariant becomes enforceable in one aggregate, neither context writes the other's entity, and the
  volume-vs-weight divergence becomes visible. For `3-decompose` to rule on.
- **Rejected:** moving the capacity invariant into Booking — every future context that commits volume
  re-implements it, and hotspot #1 returns the first time one forgets.

## Deltas proposed to `3-decompose` (owner of `model.yaml`)

`subdomain_type: supporting` contradicts `business-model.md`; the `ConsignmentLine` Shared Kernel's two
definitions have already diverged; no rejection event exists for an unsatisfiable reservation.
