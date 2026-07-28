# Consolidation bounded context

Canvas tier: **full** — the business model marks load consolidation / container fill optimisation as
the one capability that differentiates Nordic Freight. Tier assigned across the whole set; not
claimed here. New file: `3-decompose` left no README, so nothing was merged or overwritten.

## Purpose

Decide which consignments travel in which container on which departure, so that a container's
committed volume never exceeds its capacity and containers leave as full as the day's bookings allow.
Served actors: the four senior depot planners in Gothenburg, and — indirectly — the exporters who
bought Guaranteed Consolidation and expect the slot they paid for.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting — "back-office load planning" | `context-map.md`, sub-domain table (not revisited since March) |
| Business-model role | revenue generator | `business-model.md`, row "Load consolidation / container fill optimisation" |
| Evolution | custom-built, differentiating = yes | `business-model.md`, same row |

These two upstream artifacts disagree: the only differentiating, revenue-generating capability in the
business model sits in the context the map calls supporting back-office. Carried as-is, not
re-derived. Logged as open question Q4 for `5-strategize`.

## Domain roles

Two, and they change at different rates.

- **Execution** — it holds the commitment ledger and enforces "committed volume ≤ capacity". This is
  where correctness lives; the rule was stated by a planner on 2026-05-25 and its failure mode is a
  bumped shipment and a broken premium.
- **Analysis** — it proposes fills. Per `model.yaml` notes, planning still runs partly on a
  whiteboard and four senior planners resolve infeasible stacks by hand, so the optimiser is
  advisory today.

Brain-context check: negative. Both declared outbound messages are events, zero outbound commands.

## Inbound communication

_No message flows on disk_ (`docs/domain/message-flows/` does not exist). The row below is
reconstructed from the `CapacityReserved` payload, which carries a `bookingId` that Consolidation
does not own — so something upstream must be asking. It is **inferred**, not traced.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | *(unnamed — the reserve-capacity request)* [inferred] | command | shared kernel on `ConsignmentLine` (`context-map.md`); up/downstream direction unstated — see Q3 |

The missing name is the finding, not a formatting gap: the context's central decision — accept or
reject a commitment against remaining capacity — has no message representing it. Run `6-connect` to
trace the flows before treating this row as real.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customs | bounded context | `ContainerSealed` (`containerId`, `fillRate`) | event | "publishes to" per `context-map.md`; pattern not named |
| Booking | bounded context | `CapacityReserved` (`containerId`, `bookingId`, `volumeM3`) | event | shared kernel; consumer not stated anywhere [inferred consumer] |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Container load | The set of consignments committed to one physical container on one departure | — |
| Fill rate | Committed volume ÷ container capacity | Yes, by consequence: finance charges the premium whether or not the container ends up full (finance analyst), so fill rate is an operations number with no billing meaning |
| Consignment | A physical stack of pallets occupying volume in a container | **Yes** — finance reads it as a billable line (discovery hotspot, finance analyst). Unresolved |
| `ConsignmentLine` | Entity inside `ContainerLoad`: `lineId`, `volumeM3`, `stackable` | **Shared Kernel with Booking — both write it** (`context-map.md`) |

## Business decisions

Only what was stated, with attribution.

- A container's committed volume must never exceed its capacity. An overbooked container means a
  shipment is bumped and the Guaranteed Consolidation promise is broken. — planner, 2026-05-25
- The premium is charged whether or not the container ends up full. — finance analyst. Consequence
  for this context: fill rate is an efficiency target, never a billing input, so it must not become a
  precondition for sealing.

No rule anywhere states what happens when the optimiser proposes an infeasible stack, when a sealed
container is refused, or whether a load may be re-planned. Those are absences, recorded below.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness under concurrency | Two bookings must never commit the same container slot | — | March incident + planner rule, 2026-05-25 | **yes** — this is the aggregate boundary, and it currently spans a shared kernel |
| Auditability | Reconstruct which consignments were committed to a container at seal time | unknown | unstated; customs clerk could supply | **yes if required** — makes commitment history domain state, not a log |
| Latency | Planner waits for a fill proposal at the whiteboard | unknown | the four Gothenburg planners could supply | probably no — pre-compute |
| Availability | Whether commitments may continue while Booking is unreachable | unknown | nobody asked | **yes if strict** — forbids a synchronous read of Booking-owned lines |

Three of four are unknown. Nobody has run quality storming with the planners; that is the state of
the evidence, not a gap to fill with plausible SLAs.

## Assumptions

Domain:

- A `ContainerLoad` belongs to exactly one departure and is not re-planned after sealing. [inferred
  — `departureId` is singular and no reopen/unseal event exists]
- Volume is the binding constraint on Nordic's lanes. [inferred — every attribute in the aggregate is
  m³; no weight, no axle limit appears anywhere in the model. Untested with planners → Q5]
- `stackable` is carried on every consignment line but no stated rule consumes it, so stacking
  feasibility is resolved by planners rather than by the model. [inferred from an attribute with no
  matching invariant]

Scale and behaviour:

- Planners keep overriding the optimiser by hand; it stays advisory. [stated — `model.yaml` notes]
- Booking's writes to `ConsignmentLine` are trusted as valid volume input; Consolidation re-checks
  the capacity sum but not the line. [inferred — no validation rule stated on either side]

## Verification metrics

Written as predictions, so they can be wrong.

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of PRs touching `ConsignmentLine` that change both Booking and Consolidation. Prediction: **> 50% within 3 months** | If it holds, the shared kernel is real coupling and the two contexts are one for change purposes — re-cut the line rather than document it | CI / VCS commit history |
| Planner manual overrides of the optimiser, per week | If it does not fall as the model improves, the model does not match how load planning actually works | depot / live system; no telemetry exists yet — needs instrumenting |
| Double-commit incidents per quarter. Prediction: **0 once the capacity check has one owner** | Non-zero means the check is still in two places, or in neither | incident tracker (the March case is the baseline) |
| Ratio of inbound commands to outbound events | Rising commands out would mean Consolidation is starting to drive its neighbours | the message flows, once `6-connect` traces them |

## Open questions

1. Where does the capacity check belong — Booking or Consolidation? Two shipments took the same slot
   in March and nobody agrees where it should have been caught (planner). Unresolved; this is the
   single question blocking the aggregate design.
2. Who owns the failure when a partner carrier refuses a sealed container (planner)? No context
   claims it, and `ContainerSealed` has no compensating event.
3. Relationship direction Booking ↔ Consolidation is unreadable: `model.yaml` says
   `{ to: Booking, type: upstream }` while the map draws `Booking -->|downstream| Consolidation`.
   Neither artifact defines the convention, so the two cannot be checked against each other.
4. Business model says this capability differentiates and generates revenue; the context map calls it
   supporting back-office and has not been revisited since March. Which holds? For `5-strategize`.
5. Is volume the only binding constraint, or do weight and stackability bind too? Planners can answer.
6. Is `fillRate` a fact other contexts may consume, or Consolidation's internal performance number?
7. Does "consignment" get one meaning or two? Splitting it (billable line vs physical stack) is
   cheaper now than after Invoicing consumes `ContainerSealed`.
8. Data-quality flag: `ddd_slice.py` reports `ContainerLoad` with 0 entities and 0 invariants, but
   `consolidation/model.yaml` declares 2 entities and 1 context-level invariant. The counts feeding
   right-sizing may be understating this context.

Eight open questions on the context the business model calls its differentiator. That count is the
headline: this boundary is not ready to build.

## Interface critique

1. **Coherent names?** Yes. `CapacityReserved` and `ContainerSealed` are both past-tense facts about
   a container's lifecycle and both match the purpose.
2. **Right types?** The gap is a missing message, not a wrong one. `CapacityReserved` announces the
   outcome of a decision no named command asks for. The accept/reject decision — the reason this
   context exists — is invisible on its interface.
3. **Too big?** No. Two messages for a differentiating capability is too small, and it hides the
   commitment decision behind a shared database write.
4. **Exposing internals?** Yes. `ContainerSealed` publishes `fillRate` to Customs, which has no use
   for it, and finance has already stated the premium does not depend on fill. Publishing it invites
   Invoicing to couple to a number that is meant to be an internal target.
5. **Messages that belong elsewhere?** `ConsignmentLine` sits inside `ContainerLoad` while Booking
   writes it. It is not a message, but it is the interface — the widest and least governed part of it.

**Perturbation run.** Moved `ConsignmentLine` ownership to Booking: Consolidation can no longer
evaluate "committed volume ≤ capacity" inside its own boundary, and the invariant degrades to
eventual consistency — rejected, it makes the March incident structural. Moved it the other way,
sole ownership in Consolidation with Booking sending an explicit reserve command: the invariant gets
exactly one enforcement point, and Q1 answers itself. Cost: Booking loses its direct write, needs a
rejection path, and the shared kernel becomes customer/supplier. That is the cheaper trade, and it is
a proposal for `3-decompose`, not an edit made here.

## Proposed deltas to `consolidation/model.yaml` (owned by `3-decompose`)

- Add the inbound command that causes `CapacityReserved`; name it with the planners.
- State the relationship convention, then fix whichever of `model.yaml` / `context-map.md` is wrong.
- Either add an invariant that consumes `stackable`, or drop the attribute.
- Decide whether `fillRate` stays in the `ContainerSealed` payload.
