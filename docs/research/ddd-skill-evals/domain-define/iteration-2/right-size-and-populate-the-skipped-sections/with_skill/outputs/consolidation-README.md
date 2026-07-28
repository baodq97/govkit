# Consolidation bounded context

*Canvas v5, `7-define`, 2026-07-28. New file — `3-decompose` left no README; `model.yaml` unchanged.*

> **Depth: full canvas, budgeted as core (≤180 lines)** — the only capability `business-model.md`
> marks as differentiating. `ddd_check` reports this file over a 90-line *supporting* budget because
> `model.yaml` still says supporting: the same contested classification as Open question 1, one
> resolution needed, not two.
> **Interface provenance:** `4-connect` has not run, so no traced flows exist. Inbound/Outbound rows
> come from `discovery/timeline.md`, `model.yaml` or `context-map.md` (see Source); rows marked
> *inferred* are a guess from the model, not observed use, and must be re-derived before anyone
> builds against them. No context-mapping pattern is recorded on disk except the Shared Kernel.

## Purpose

Decide which consignments travel in which container on which departure, so that a customer who
bought the Guaranteed Consolidation premium gets the departure slot they were promised, and
containers leave as full as the depot can make them. Actors: the four senior depot planners running
load planning across nine partner ports; indirectly the exporters who bought the premium.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested — core vs supporting** | `business-model.md` (differentiation = **yes**, the only such row) vs `context-map.md` + `model.yaml` (`supporting`, "back-office load planning") |
| Business-model role | revenue-generator | `business-model.md` capability table |
| Evolution | custom-built | `business-model.md` capability table |

No `core-domain-chart.md` exists (`5-strategize` has not run), so classification is carried from
`1-understand`. The disagreement is **not resolved here** — Open question 1. Written at core depth
because `context-map.md` says its own classification "has not been revisited since March".

## Domain roles

- **Execution context** — enforces the capacity workflow: reserve, commit, seal. The `model.yaml`
  invariant lives on this half.
- **Analysis context** — proposes how to fill a container; advisory today, since `model.yaml` notes
  say planners resolve infeasible stacks by hand on a whiteboard.

They change at different rates — a promise to a paying customer versus a heuristic. A finding for `3-decompose`, not a boundary move here.

**Brain-context check:** outbound is events only, no commands. Not a brain context.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Booking | bounded context | remaining-capacity check before reserving | query | customer/supplier (*inferred*) | `booking/model.yaml` note — the check is stated, the message is not named on disk |
| Booking | bounded context | capacity reservation for a booking | command (*inferred*) | customer/supplier (*inferred*) | implied by `CapacityReserved` (timeline #4); no command named on disk |
| Booking | bounded context | `ConsignmentLine` writes | — | **Shared Kernel — both write it** | `context-map.md` shared artifacts — the only relationship type stated on disk |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Booking | bounded context | `CapacityReserved` (containerId, bookingId, volumeM3) | event | customer/supplier (*inferred*) | `model.yaml`; timeline #4, confirmed by planner |
| Customs | bounded context | `ContainerSealed` (containerId, fillRate) | event | published language (*inferred*) | `model.yaml`; timeline #7, confirmed by planner |

## Swimlane — what this context actually decides

| Message in | Decision made here | Message(s) out |
|---|---|---|
| capacity check + reservation from Booking | is there room on this container/departure, and does this booking hold a Guaranteed Consolidation slot? | `CapacityReserved` — or a rejection, which is **not modelled anywhere on disk** |
| planner seals the container (direct user interaction) | this load is final; no further consignments | `ContainerSealed` (carries fillRate) |

The rejection path is the gap: the invariant is stated, no message represents the refusal. A lane
whose only modelled outcome is success has not been designed for what the invariant prevents.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Container load | The set of consignments committed to one physical container on one departure | own term; `model.yaml` |
| Fill rate | Committed volume ÷ container capacity | own term; the 71% → 80% goal is measured on it (`business-model.md`) |
| Consignment | A physical stack of pallets moving as one unit | **yes** — Invoicing means "a billable line on an invoice" (`invoicing/model.yaml`; hotspot #2, finance analyst). This clash is the justification for the boundary |
| Reserve vs commit | `model.yaml` uses both: the event is `CapacityReserved`, the invariant is on *committed* volume | unresolved **inside** this context — see Open questions |

## Business decisions

Stated in discovery, with attribution; nothing here is inferred.

- Committed volume must never exceed capacity — an overbooked container bumps a shipment and breaks
  the Guaranteed Consolidation promise. — planner, 2026-05-25
- The premium is charged whether or not the container ends up full. — finance analyst, 2026-05-25
  *(it constrains this context: a half-full sealed container is a legitimate outcome, not a failure)*

**Stated absence:** nobody said what happens when the capacity check fails, who may re-plan a
container, or whether a sealed container can be reopened.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness under concurrency | two bookings must never commit the same container slot | — | planner, hotspot #1 (2026-05-25): it happened in March | **yes** — this is the aggregate boundary; the check must be inside the `ContainerLoad` transaction, not a read-then-write across Booking |
| Availability | Booking's synchronous capacity check means an outage here stops all booking confirmation | unknown — no tolerance stated | `booking/model.yaml` note | **yes if a tolerance exists** — "accept bookings while Consolidation is down" forces provisional reservation into the model |
| Auditability | prove which consignments were committed to a sealed container, and when | unknown — customs clerk could supply the statutory retention | inferred from `ContainerSealed` feeding Customs | **yes if > operational** — history becomes domain state, not a log |
| Latency | a planner should not wait for a fill proposal while a customer is on the phone | unknown — no planner stated a threshold | inferred from `model.yaml` whiteboard note | no — pre-compute/caching |
| Volume | nine ports, four senior planners; medium-horizon goal is two more ports | 9 → 11 ports | `business-model.md` goals | no |

Three of five have no number — recorded, not invented; planners and the customs clerk can close them.

## Assumptions

- *(inferred, domain)* A container is committed to exactly one departure and is never re-planned
  after sealing. Nothing on disk says it can be reopened — and nothing says it cannot.
- *(inferred, behaviour)* Planners keep resolving infeasible stacks by hand, so the optimiser stays
  advisory. From `model.yaml`'s whiteboard note — which describes today, not a decision.
- *(inferred, domain)* Volume is the binding constraint. `ContainerLoad` tracks volume only, while
  `ConsignmentLine` also carries `weightKg` and `hazardClass`. If weight or hazard segregation ever
  binds, this aggregate cannot express it. **Contested — see Open questions.**
- *(inferred, domain)* The premium is a property of the booking, not the container load. Nothing
  records which reservations are premium, so this context cannot tell a promised slot from an
  ordinary one — the promise it exists to keep.
- *(inferred, behaviour)* `ConsignmentLine`, written by both contexts, stays consistent by
  agreement. `context-map.md` says nothing about how conflicting writes are settled.

## Verification metrics

| Metric | Prediction, checkable 2026-10-28 | Where it comes from |
|---|---|---|
| Change coupling with Booking | fewer than 25% of PRs touching `consolidation/` also touch `booking/` | CI / VCS commit history |
| Shared-kernel churn | `ConsignmentLine` changes in fewer than 4 PRs per quarter; if it changes more, the Shared Kernel is a joint aggregate wearing a value-object costume | CI / VCS |
| Planner manual overrides | overrides per week is flat or falling once the optimiser ships; a rise means the model does not match how planning actually works | production, once the optimiser is live; planners can count today |
| Double-commit incidents | zero after the invariant moves inside `ContainerLoad` (hotspot #1 was one occurrence in March) | incident tracker |
| Average fill rate | 71% → 80% (the stated business goal); if fill rises while override count also rises, the gain is coming from planners, not the model | production, `ContainerSealed.fillRate` |
| Cross-team PRs | how many teams open PRs here per quarter — more than two means the boundary does not match the org | tracker |

## Open questions

1. **Core or supporting?** `business-model.md` says only-differentiating; `context-map.md` and
   `model.yaml` say `supporting`. The answer decides whether this context is built or minimised.
   Owner: `5-strategize` / `3-decompose`.
2. **Is volume really the binding constraint?** Weight and hazard class exist on `ConsignmentLine`,
   not on `ContainerLoad`; nobody stated which binds on Nordic's lanes. Ask: depot planners.
3. **Where does the double-commit check belong?** Hotspot #1 — "nobody agrees where the check should
   have happened" (planner). This canvas says inside `ContainerLoad`, unagreed with Booking.
4. **Reserve or commit?** The event says reserved, the invariant says committed. Are these two
   states or one? If two, there is a missing state and a missing expiry rule.
5. **What happens on rejection?** No message, event or rule covers a failed capacity check.
6. **Can a sealed container be reopened, and who may?** Nobody was asked.
7. **How is a Guaranteed Consolidation slot represented here?** The premium is the reason this
   context exists and it is absent from the model.
8. **Who settles conflicting `ConsignmentLine` writes** between Booking and Consolidation?
9. **Who owns the failure when a partner carrier refuses a sealed container?** Hotspot #3, raised by
   a planner, unanswered — it lands between this context, Routing and Customs.

Nine open questions on the context carrying the premium — the count is the finding: this boundary
is not ready to build, and no customer has been in any session.

## Interface critique

1. **Names coherent?** No — `CapacityReserved` against an invariant about *committed* volume.
2. **Right message type?** No. Booking queries remaining capacity, then writes separately
   (`booking/model.yaml`) — a read-then-write across a boundary with a window between, the exact
   shape that produced hotspot #1. It should be **one command** accepted or rejected atomically.
3. **Too big?** No — two outbound events, one inbound collaboration. Under-specified, not oversized.
4. **Exposing internals?** Yes — `ConsignmentLine` holds this context's stack-planning detail
   (`stackable`) and Booking's billing detail (`hazardClass`) in one entity both write.
5. **Messages that belong elsewhere?** `ContainerSealed` carries `fillRate`, which no consumer needs
   for a decision — Customs needs the seal. It is a reporting need riding on a domain event, and it
   is why the event will get changed by people who do not care about customs.

### Perturbation experiments

| Moved | Effect | Kept? |
|---|---|---|
| `ConsignmentLine` wholly into Consolidation; Booking sends volumes only | Shared Kernel becomes customer/supplier — the strongest coupling on the map goes, and the double-commit check gets one owner | **Proposed to `3-decompose`.** Cost: Booking cannot amend a line without a round trip; hazard/billing attributes need a home |
| The optimiser into its own context | Separates advisory heuristic from commitment ledger, matching their change rhythms | **Rejected for now** — a port inside this context buys the same separation far cheaper |
| `fillRate` off `ContainerSealed` | Frees the domain event from its reporting consumer | Deferred — a one-line change later, not a boundary decision |

No C4 diagram: this context reaches no external system directly (Partner Network is via Routing)
and serves one user type.

## Delta from `3-decompose`

This file is new; `model.yaml` was **not** modified. Proposed to its owner: resolve `subdomain_type:
supporting` against `business-model.md`; make the Booking capacity collaboration one command;
consider absorbing `ConsignmentLine`; give the premium a place in the aggregate.
