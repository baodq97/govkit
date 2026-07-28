---
id: DOMAIN-AGG-CONS-0001
title: Consolidation — ContainerLoad aggregate design canvas
status: draft
owner: TBD
date: 2026-07-27
context: Consolidation
---

# Aggregate: `ContainerLoad` (root: `ContainerLoad`)

Aggregate Design Canvas v1.1. Sources for every stated rule and number are cited inline; anything
not sourced is marked `unknown` or `question`, not estimated.

## Input state (read before trusting this canvas)

| Input | Status |
|---|---|
| `docs/domain/consolidation/model.yaml` | present — aggregate, entities, events, one invariant |
| `docs/domain/discovery/timeline.md` | present — confirmed events + the stated business rule + the March incident |
| `docs/domain/business-model.md` | present — Guaranteed Consolidation premium, fill-rate goal |
| `docs/domain/consolidation/README.md` (Bounded Context Canvas) | **missing** — `domain-define` has not been run for this context. Business decisions and quality attributes are therefore taken from the discovery timeline and business model only. No invariant below is inferred from the absence. |
| `docs/domain/message-flows/` | **missing** — command rate and client count cannot be derived. Section 7 stays `unknown` by rule. |

---

## 1. Description

One physical container on one departure, and the consignments committed to it. The root owns the
committed volume and is the single authority on whether more volume may be accepted.

**Why this boundary**

The one rule the business has actually stated — *"a container's committed volume must never exceed
its capacity"* (planner, 2026-05-25) — is scoped to a container. The consistency boundary is drawn
at exactly the scope of the rule, and no wider.

**Alternatives considered and rejected**

| Alternative | Why rejected |
|---|---|
| `Departure` as the aggregate (all containers on a sailing) | Every booking for that sailing would serialise on one instance. With bookings bursting in the hour before cut-off (stakeholder, this session), that is the worst possible boundary: peak contention, on one row, at the one hour that matters commercially. |
| Capacity held in `Booking` | `Booking` does not own the rule, and this is what the March incident already cost us: `Booking` performs a synchronous remaining-capacity check and then commands the reservation (`booking/model.yaml`, relationship note). Check-then-act across a boundary is not enforcement — between the read and the write, another booking commits. Hotspot 1 ("two shipments committed to the same slot in March; nobody agrees where the check should have happened") is that gap, not a bug in either service. |
| `ConsignmentLine` as its own aggregate | It has no life outside the container load it sits in, and pulling it out would move the volume sum outside the transaction that has to hold it. |

**Boundary consequence to state plainly:** `Booking`'s remaining-capacity call is **advisory only —
a query for the UI**. The reservation is the decision. `ReserveCapacity` may reject, and `Booking`
must be able to handle that rejection; its own stated invariant ("a booking may only be confirmed
once its capacity has been reserved", `booking/model.yaml`) already assumes it can. No design change
is needed in `Booking` beyond deleting the assumption that the pre-check is a guarantee.

**Right-sizing note.** `context-map.md` classifies Consolidation as `supporting`, which under
right-sizing would earn a transaction script and no canvas. That classification is contradicted by
`business-model.md`, which records container-fill as `revenue-generator`, `custom-built`,
`differentiation: yes`, and the source of the +18% Guaranteed Consolidation premium. This canvas is
filled on the business-model evidence. Resolving the label is a loop-2 decision — see Proposed
deltas.

---

## 2. State transitions

```
open ──(cut-off?)──> closed ──SealContainer──> sealed
```

Confirmed from the event timeline: a container accepts reservations (`CapacityReserved`, #4) and is
later sealed (`ContainerSealed`, #7).

Two states are confirmed; the rest is honestly open:

- **`closed` is a candidate, not a fact.** "Departure cut-off" was named by the stakeholder as a
  real time boundary, but `model.yaml` has no cut-off attribute and nobody has stated what happens
  at it. *Question for the planners: after cut-off, does the container reject further reservations
  outright, or does it keep accepting until sealing?* If it rejects, that is a second enforced
  invariant and it must come from them, not from us.
- **No post-departure state is evidenced.** There is no `ContainerDeparted` event in the timeline.
  `ShipmentHandedToCarrier` belongs to Routing, not here.

Two-to-three transitions is neither a split signal nor, on its own, proof of anaemia — the rule this
aggregate enforces is real and lives at the root. But see the mass gap in section 8: 5 tables and
41 attributes are recorded for a model with 2 entities, so there is unmodelled structure here that
may carry states nobody has written down.

---

## 3. Enforced invariants

| # | Invariant | Stated by | Enforced where |
|---|---|---|---|
| I1 | Committed volume must never exceed container capacity: `sum(consignmentLine.volumeM3) ≤ capacityM3` | depot planner, 2026-05-25 (`discovery/timeline.md`) | **inside the aggregate**, on `ReserveCapacity`, read-then-decide in one transaction |

That is the complete list. It is the only rule the business has stated for this context. No stacking
rule, no hazard-class rule and no cut-off rule is enforced here, because none has been stated —
`stackable` and `hazardClass` exist as attributes with no rule attached to them (`question` below).

**Schema enforceability (for `data-model`):** I1 is **not** enforceable as a check constraint. It
sums across rows and requires a read-then-decide. The schema must carry a `version` column for
optimistic locking on `ContainerLoad`; the rule itself stays in the aggregate. An invariant assumed
to be handled by the other layer is handled by neither.

---

## 4. Corrective policies

**None. Deliberately none — and that is the decision this canvas exists to record.**

The burst before cut-off is exactly the pressure that makes relaxing I1 attractive: enforcing it
means optimistic-lock conflicts concentrated in the busiest hour. The relaxed design would let two
reservations land, detect the overcommit afterwards, and repair it. We are not taking it, for two
reasons:

1. **The repair is a paid-for promise being broken.** Repairing an overcommit means bumping a
   consignment to a later departure. Guaranteed Consolidation charges +18% of the forwarding fee to
   promise a departure slot (`business-model.md`, pricing page), and the planner's own statement of
   the rule names the consequence: *"an overbooked container means a shipment is bumped and the
   Guaranteed Consolidation promise is broken."* The corrective path costs revenue and trust; the
   enforced path costs a retry.
2. **No corrective policy exists to relax into.** Nobody in the business has stated what happens
   when an overcommit is detected after the fact — who gets bumped, whether the premium is refunded,
   who is notified. A relaxed invariant with no named corrective policy is not eventual consistency;
   it is an unhandled defect with a schedule. We will not write that policy on the business's behalf.

**What exists today instead:** an undocumented manual repair. Four senior planners resolve conflicts
by hand in the Gothenburg depot (`model.yaml` notes), and the March double-commit was presumably
cleaned up the same way. That process is a corrective policy that nobody has written down.

**Questions the business must answer before any relaxation is reconsidered** (these are domain
decisions, not error handlers):

- If an overcommit is detected after the fact, who is bumped — and by what ordering rule?
- Does a Guaranteed Consolidation booking refund or void the premium when it is bumped?
- What happens when every consignment on the container carries the guarantee?
- Who is notified, and within what time?

Until those are answered by the commercial director and the planners, I1 stays enforced.

**The trade-off, plotted:**

| Design | Concurrency conflicts | Corrective logic | Customer experience |
|---|---|---|---|
| **Chosen** — `ContainerLoad` per container, I1 enforced | medium; concentrated in the cut-off hour | none | booking is rejected up front, or it holds. No post-hoc bumps. |
| `Departure` aggregate, I1 enforced | high — the whole burst serialises on one instance | none | slow or failing bookings exactly at cut-off |
| `ContainerLoad`, I1 relaxed + detect-and-repair | low | high, and currently **unwritten** | bookings accepted then silently bumped; premium promise broken |

---

## 5 & 6. Handled commands → created events

| Command | Sent by | Outcome | Event |
|---|---|---|---|
| `ReserveCapacity(containerId, bookingId, volumeM3)` | Booking | accepted | `CapacityReserved(containerId, bookingId, volumeM3)` — confirmed, timeline #4 |
| | | rejected (would breach I1) | **command result `CapacityRejected(reason)`** — see note |
| `SealContainer(containerId)` | planner (assumed — see gap G3) | sealed | `ContainerSealed(containerId, fillRate)` — confirmed, timeline #7 |

**Rejection is a domain result, not an exception.** "Would exceed capacity" is a modelled outcome of
`ReserveCapacity` and must be returned as such. Whether it *also* needs to be a published event
depends on whether Booking calls synchronously or reacts to a message — `docs/domain/message-flows/`
does not exist, so that is undecided. **Owner: the Booking and Consolidation engineers, one
decision.** If the call is synchronous, the return value suffices and no rejection event is published.

**Gaps the connector check exposed** (raised, not filled):

- **G1 — release/cancellation has no command and no event.** If a booking is cancelled or expires
  after `CapacityReserved`, nothing in this model returns the volume to the container. Committed
  volume would drift upward permanently, which directly undermines the 71%→80% fill-rate goal.
  There is no cancellation event anywhere in the timeline, so we are not inventing
  `ReleaseCapacity` — but somebody must confirm whether bookings can be cancelled after reservation.
  **Question for: commercial director / planners.**
- **G2 — how a container is chosen is unmodelled.** `ReserveCapacity` names a `containerId`, so the
  choice is made by the caller or by an unmodelled step. If Booking picks the container, the burst
  hour concentrates on whichever container the picker favours. **Question for: planners — how many
  containers are open per departure, and who assigns a consignment to one?** The answer changes the
  contention picture in section 7 more than any other unknown.
- **G3 — who seals.** `SealContainer` has no confirmed sender. Nobody knows who is responsible when
  a partner carrier refuses a sealed container either (hotspot 3), which suggests the sealing
  responsibility genuinely is unowned rather than merely undocumented.

---

## 7. Throughput — the concurrency estimate

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate (per `ContainerLoad` instance) | **unknown** | **unknown** — qualitatively, a burst of bookings arrives in the hour before departure cut-off (stakeholder, this session) |
| Total number of clients | **unknown** — at minimum: the Booking service (one process, N concurrent customer requests) and the depot planners | **unknown** |

**No numbers are invented here.** The worked-example figures for a freight container elsewhere in
the literature are not this business's numbers, and a guessed maximum here becomes a guessed
boundary and then a guessed schema.

**Who can supply them**

| Number | Owner |
|---|---|
| Bookings per departure, and their arrival profile across the final hour | depot planners (they see the cut-off queue) + Booking service logs |
| Containers open per departure (splits or concentrates the burst — see G2) | depot planners |
| Concurrent Booking request rate at peak | Booking engineers, from production traffic |

**→ Concurrency conflict chance: medium overall, high inside the cut-off hour.** That reading comes
from the shape of the load, not from a number: many bookings converge on a small set of container
loads within one hour, and every one of them takes a write on the same instance.

**What the burst already decided:**

1. It **rules out the `Departure` aggregate** — that boundary would put the entire burst on a single
   instance.
2. It **does not justify relaxing I1** (section 4). Bursty load argues for a small aggregate, and
   `ContainerLoad` already is one: a short instance, one summed field, a short transaction.
3. It **makes the mechanism explicit**: optimistic locking with a `version` on `ContainerLoad`, and
   a bounded retry on conflict in the application layer. Under a burst, a retry that re-reads and
   re-evaluates I1 is correct; a retry that replays a stale decision is not.
4. It **makes G2 the highest-value unknown**. If a departure has one open container, per-container
   scoping buys nothing and the retry rate at cut-off is the real risk to measure first.

---

## 8. Size

| Metric | Value |
|---|---|
| Event growth rate (per instance) | roughly one `CapacityReserved` per consignment plus one `ContainerSealed`. Consignments per container: **unknown** — bounded by capacity, and part-load exporters imply tens rather than thousands (inference, flagged) |
| Lifetime of an instance | bounded by its departure — days |

**→ Size: small.** No snapshotting is needed. Archival is natural: the instance closes at departure
and nothing accumulates afterwards, which is exactly the "scope the aggregate to a time period"
heuristic already satisfied by the name — a `ContainerLoad` is one container *on one departure*, not
a container. Retention period after departure is a Customs/Invoicing concern and is **unknown**
here.

**Mass gap.** `model.yaml` records `tables: 5, attributes: 41, densest_entity_attrs: 18` for a model
with two entities carrying seven attributes between them. Either the figures cover something this
canvas has not seen, or there is structure in the database with no model behind it. Worth one hour
of looking before implementation starts, because unmodelled structure is where unstated rules hide.

---

## 9. Code structure contract

Layering (dependencies point inward):

- **Domain layer holds `ContainerLoad`, `ConsignmentLine` and the two events**, and depends on no
  ORM, no HTTP, no framework, no clock. Test: the capacity rule must be unit-testable with no
  database.
- **Cut-off time is injected, never read from `now()` inside the aggregate.** The cut-off is a
  domain concept (section 2) and the burst is defined relative to it; a hidden `now()` makes exactly
  the cut-off behaviour untestable.
- **Application layer** owns the transaction boundary and the optimistic-lock retry.
- **Adapters** hold the repository, the Booking-facing API and any message consumer.

Aggregate rules that must be visible in the code:

- **One transaction per aggregate.** `Booking` and `ContainerLoad` never commit together.
  Consistency between them is eventual and runs through `CapacityReserved` / the rejection result.
- **References by id only** — `bookingId`, `departureId`, `containerId`. No object reference to a
  `Booking`.
- **The root guards the boundary.** `ConsignmentLine` is never handed out or fetched directly; all
  volume changes go through `ContainerLoad`.
- **One repository, for `ContainerLoad`**, returning the root. No `ConsignmentLineRepository`.
- **`ReserveCapacity` returns its outcome, including rejection.** "Would exceed capacity" is a
  domain result, not an exception for the transport layer to translate.
- **Ubiquitous language in the code**: `ContainerLoad`, `ConsignmentLine`, `capacityM3`,
  `committedM3`, `fillRate`, `CapacityReserved`, `ContainerSealed` — the canvas names, unchanged.

Test names that state the rules in the domain's words:

- *"rejects a reservation that would exceed container capacity"*
- *"accepts concurrent reservations from the cut-off burst up to capacity and no further"*

**Known boundary violation to route back, not to code around:** `context-map.md` declares
`ConsignmentLine` a **Shared Kernel** that both Booking and Consolidation write. Two contexts writing
one entity cannot both keep one transaction per aggregate, and Booking's and Consolidation's versions
of the line already carry different attributes (`weightKg`, `hazardClass` vs `stackable`). The
implementer must not resolve this by sharing a class. It is a loop-2 boundary question — see below.

---

## 10. Handoff

| Consumer | Takes | Does not take |
|---|---|---|
| `data-model` | `ContainerLoad` (root) and `ConsignmentLine`; identity `containerId` + `departureId`, `lineId`; a `version` column for optimistic locking. **I1 cannot be a check constraint** — it spans rows and needs read-then-decide; it stays in the aggregate | the corrective-policy section (there is none, and repair logic would be code anyway); audit columns are its own concern |
| `api-designer` | `ReserveCapacity` and `SealContainer` as the command surface, with rejection as a first-class modelled outcome; the remaining-capacity read as an **advisory query, explicitly not a reservation**; `CapacityReserved` as the published contract to Booking/Customs | `ContainerSealed`'s internal fields beyond `fillRate`; aggregate internals |
| implementer | this canvas plus section 9 | anything not written here — in particular, do not invent a bumping/overcommit-repair path (section 4) |

### Proposed deltas to `docs/domain/consolidation/model.yaml`

`domain-decompose` owns that file; these are proposals, not edits.

1. Add the handled commands (`ReserveCapacity`, `SealContainer`) — the file currently lists events
   only.
2. Record the rejection outcome of `ReserveCapacity`.
3. Add `version` to `ContainerLoad` attributes (optimistic locking, required by the burst).
4. Record cut-off as a candidate concept on `ContainerLoad` once the planners answer section 2.

### Routed back to loop 2 (not decided here)

| # | Item | Skill |
|---|---|---|
| R1 | `subdomain_type: supporting` contradicts `business-model.md` (differentiator, premium revenue, custom-built). This canvas was filled as if core. | `domain-strategize` |
| R2 | `ConsignmentLine` as Shared Kernel between Booking and Consolidation — incompatible with one transaction per aggregate. | `domain-connect` / `domain-decompose` |
| R3 | Booking's synchronous remaining-capacity check treated as a guarantee (hotspot 1, the March incident). The fix is stated above: advisory query, authoritative reservation. | `domain-connect` |
| R4 | `Consignment` means a billable line in Invoicing and a physical stack in Consolidation (hotspot 2). Keep both, qualified by context; do not collapse into a shared class. | `domain-decompose` |

### Open questions blocking a complete canvas

| # | Question | Owner |
|---|---|---|
| Q1 | What happens at departure cut-off — hard rejection or not? | depot planners |
| Q2 | Overcommit repair: who is bumped, premium refunded or not, all-guaranteed case, who is notified? | commercial director + planners |
| Q3 | Can a booking be cancelled after `CapacityReserved`, and what releases the volume? (G1) | commercial director |
| Q4 | Containers open per departure, and who assigns a consignment to one? (G2) | depot planners |
| Q5 | Bookings per departure and their arrival profile in the final hour | planners + Booking service logs |
| Q6 | Any rule attached to `stackable` or `hazardClass`? Both are attributes with no stated rule | planners |
| Q7 | Who seals a container, and who owns a carrier refusal? (G3, hotspot 3) | unowned — needs an owner |
