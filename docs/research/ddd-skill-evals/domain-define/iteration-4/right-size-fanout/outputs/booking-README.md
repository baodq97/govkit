# Booking bounded context

Canvas tier: **full** — `Booking` is typed `core` (contexts table / `booking/model.yaml:2`), so it earns
every section plus the interface critique. Created, not merged: `3-decompose` left `no README` for all
seven contexts, so there were no human edits to preserve. `model.yaml` is unchanged — deltas below are
proposals for `3-decompose`.

## Purpose

Take a customer's commitment to move a consignment on a named departure, hold the details of what is
being handed over, and turn that commitment into a confirmed slot the rest of the operation can act on.
Actors: the exporter who commits, and the depot planner downstream who receives a confirmed booking.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `booking/model.yaml:2` and the contexts table |
| Business-model role | **not classified** | `business-model.md` has no capability row for booking |
| Evolution | **not classified** | same absence |

Two stated absences, both findings, neither resolved here:

- `business-model.md` classifies six capabilities; none of them is booking. A core context the
  classification does not recognise as a capability is either an unnamed capability or a mis-typed
  context — a question for `1-understand` / `5-strategize`, not a local edit.
- No `core-domain-chart.md` exists, so `core` here comes from a tactical file, not a strategic ranking.
  Four of seven contexts carry `core`, while the one capability marked *differentiating* +
  *revenue-generator* (load consolidation) sits in a context typed `supporting`. Flagged, not re-derived.

## Domain roles

**Draft context → execution context.** A booking is work-in-progress (`status` on the root) until it is
confirmed against reserved capacity, after which it is a commitment others execute on. One role at a
time, not two at once — a transition, so no coupled-responsibility finding.

Not a Brain Context on the current evidence — both declared outbound messages are events, no commands —
but that reading is weak, since only one collaboration has any traced content.

## Inbound communication

_No message flows exist on disk — `docs/domain/message-flows/` is absent, so nothing here is observed._
Collaborators come from `model.yaml:23-26`; the messages genuinely are not recorded anywhere.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Quoting | bounded context | not traced | — | upstream of Booking; pattern not stated |
| whoever places a booking | not recorded | not traced | — | not recorded |

The second row is the finding: for a core context, no artifact says who initiates a booking. The
`BookingRequested` event implies a request arrived; the request itself is not modelled.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Consolidation | bounded context | remaining-capacity check, then reserve | query + command | downstream; "synchronous" per `model.yaml:25` |
| not stated | — | `BookingRequested` (bookingId, departureId, volumeM3) | event | subscribers not recorded |
| not stated | — | `BookingConfirmed` (bookingId, containerId) | event | subscribers not recorded |
| Routing | bounded context | not traced | — | Booking is upstream of Routing |

Swimlane, the only lane with a decision in it: *booking request in → check remaining capacity, reserve,
decide confirm/not → `BookingConfirmed` out*. Every other lane is a collaborator with no traced message.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | a customer's committed request to move a consignment on a given departure | — |
| Consignment | the goods a customer hands over as one unit (physical) | **yes** — finance uses it for a billable line; ops for a physical stack of pallets (hotspot, finance analyst). Booking's definition is the ops one |
| ConsignmentLine | one line of the goods: volume, weight, hazard class | not recorded elsewhere |
| ShipmentRef | prefix + sequence identifier | not recorded elsewhere |

The Consignment collision is sourced, not inferred, and is this canvas's strongest justification for
keeping Booking and Invoicing apart.

## Business decisions

Only one rule is stated for this context:

- **A booking may only be confirmed once its capacity has been reserved** — `model.yaml:22`. No
  attribution on the rule; discovery attributes no rule to Booking.

Two stated rules land next door but constrain this one: *"a container's committed volume must never
exceed its capacity"* (planner, 2026-05-25) and *"a shipment cannot be handed to a carrier before its
declaration is submitted"* (customs clerk). Whether either binds Booking's confirm is open — see below.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | 0 recurrences | planner, March incident (hotspot) | **yes** — decides where the invariant, and so the aggregate boundary, sits |
| Availability | Booking cannot confirm while the capacity check is unavailable | unknown | `model.yaml:25` (synchronous) — nobody stated a tolerance | **yes if any tolerance is required** — a held reservation would remove the sync dependency |
| Auditability | not stated | — | — | — |
| Latency | not stated | — | — | — |
| Volume / growth | not stated | — | — | — |

Three unknowns on a core context. The planner can supply latency and volume; nobody has been asked.

## Assumptions

Domain:

- *inferred* — a booking is confirmed against exactly one departure and one container; rollover,
  re-planning and cancellation appear nowhere in the model.
- *inferred* — `ShipmentRef` is Booking's own identifier scheme and the token other contexts quote.
- *inferred* — volume is the binding constraint: the stated capacity rule is volume-only, yet
  `ConsignmentLine` also captures `weightKg` and `hazardClass`, which no Booking rule consumes.
- *inferred* — `status` transitions are internal; no event announces rejection or cancellation.

Scale and behaviour:

- *inferred* — the capacity check is fast and reliable enough to sit in the confirm path, since no
  timeout, retry or fallback is stated.
- *inferred* — booking volumes are low enough that contention on a departure is rare. The March
  double-commit is the only evidence either way, and it points the other direction.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| ≥75% of PRs touching `booking/` do not touch `consolidation/`, measured over 3 months | if it falls below, the capacity invariant is split across the boundary and the line is in the wrong place | VCS / CI commit history |
| Double-committed slot incidents after the check is placed: target 0 | the March hotspot recurring means placement did not fix it | incident tracker |
| Confirms blocked per week by the capacity check being unavailable | any non-trivial rate makes the synchronous dependency a real constraint and forces the reservation into Booking | production telemetry |
| Number of distinct teams opening PRs in `booking/` | more than one means the ownership of this core context is unclear | issue tracker / VCS |

## Open questions

1. Where does the capacity check belong — Booking or Consolidation? Unresolved since March; the planner
   says nobody agrees. This blocks the concurrency invariant and therefore the aggregate boundary.
2. Is Booking's `Consignment` (physical unit) the same thing as Invoicing's billable line? Finance and
   operations currently say no.
3. What is Booking's business-model role and evolution stage, given no capability row exists for it —
   and is `core` still right if none is found?
4. Who owns the failure when a partner carrier refuses a sealed container? Booking is upstream of
   Routing, so it may land here (planner, hotspot).
5. Does a quote become a booking, and is the quoted price frozen at confirm? Booking is declared
   downstream of Quoting with no traced message.
6. Does the customs rule bind Booking's confirm, or only handover in Routing?
7. Who initiates a booking, and through what message?

Seven open questions on a core context, four of them load-bearing. This boundary is not ready to build.

## Interface critique

1. **Names coherent?** `BookingRequested` / `BookingConfirmed` are coherent with the purpose. The gap is
   what is *not* published: `status` lives as an attribute with no event for rejection or cancellation,
   so the transitions neighbours care about are invisible outside the boundary.
2. **Right types?** No. The capacity interaction is a query ("remaining capacity") followed by a command
   ("reserve"). Between the two reads and the write sits the exact window that produced the March
   double-commit. It should be one command Consolidation accepts or rejects.
3. **Too big?** No — two events and one collaboration. The risk here is an interface too thin to be
   integrated against, not too wide.
4. **Exposing internals?** `BookingConfirmed` carries `containerId`, which is Consolidation's identifier,
   not Booking's. Booking is republishing a neighbour's internal key as part of its contract.
5. **Belongs elsewhere?** `ConsignmentLine.hazardClass` — no Booking rule uses it; it reads like Customs
   data captured on the booking form.

**Perturbation run — move the capacity invariant into Booking.** Rejected. It would remove the
synchronous dependency and make the confirm rule locally enforceable, but the stated rule is
container-level ("committed volume must never exceed capacity") and spans many bookings, so one Booking
aggregate cannot enforce it. Keeping it in Consolidation and collapsing the interaction to a single
`ReserveCapacity` command gets most of the benefit without duplicating capacity truth.

**Perturbation run — move `hazardClass` to Customs.** Rejected for now: Booking would lose the single
point of capture at request time, and no traced flow shows Customs receiving it. Revisit once flows exist.

## Proposals for other steps

- `3-decompose` / `model.yaml`: replace the query-then-command capacity interaction with one
  `ReserveCapacity` command; add the missing `status` transition events; record subscribers for the two
  declared events; state a relationship pattern rather than bare `downstream` / `upstream`.
- `2-discover`: no rule in discovery is attributed to Booking, and no actor is recorded as initiating a
  booking. Open questions 4-7 are all discovery gaps.
- `4-connect`: `docs/domain/message-flows/` is absent, so every interface row above is derived from
  `model.yaml`, not observed.
- `5-strategize` / `1-understand`: Booking has no capability row, and there is no core-domain chart to
  carry a classification from.
