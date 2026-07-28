---
id: DOMAIN-BCC-0001
title: Consolidation — bounded context canvas
status: draft
owner: TBD
date: 2026-07-28
canvas: v5
depth: full
---

# Consolidation bounded context

> Provenance: `3-decompose` left no first-pass canvas here (only `model.yaml`), so this is a new
> file rather than a delta-merge. There is no `core-domain-chart.md` and no `message-flows/`:
> classification is carried from `business-model.md` per the missing-input rule, and the interface
> sections are reconstructed from `discovery/timeline.md` + `model.yaml` relationships. Every row
> below carries its source; unsourced items are in *Assumptions* or *Open questions*.

## Purpose

Decide which consignments travel in which container on which departure, so that customers who
bought Guaranteed Consolidation get the slot they paid for and containers leave as full as
possible. Served actors: the four senior depot planners, and indirectly the exporters who bought
the premium. (`business-model.md` — value proposition, revenue streams.)

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | **core** (capability "Load consolidation / container fill optimisation", differentiation *yes*) | `business-model.md`, commercial director 2026-05-18 |
| Business-model role | revenue generator (Guaranteed Consolidation premium, +18% of forwarding fee) | `business-model.md` (pricing page) |
| Evolution | custom built | `business-model.md` |

**Conflict, not resolved here:** `context-map.md` classifies this context *supporting*
("back-office load planning") and notes the table has not been revisited since March.
`business-model.md` (May) makes the same capability the differentiator and the source of the only
premium the company charges. This canvas is sized on the May evidence; the disagreement is a
finding for `5-strategize`, not a local edit. See *Open questions*.

## Domain roles

**Execution** — it enforces the capacity invariant and commits slots — **and analysis**, it
optimises fill toward the 71%→80% goal (`business-model.md`). Two roles, named deliberately: the
commitment ledger changes when the premium's terms change, the optimiser changes whenever planners
learn a new stacking trick. They can share a boundary if the optimiser sits behind a port; the
alternative (split it out) is tested in the move experiment below.

*Brain-context check:* outbound is 100% events, no commands. Not a brain context.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | remaining-capacity read, then reserve — **no agreed message name** (`booking/model.yaml`: "synchronous remaining-capacity check before reserving") | query + command | **Shared Kernel** on `ConsignmentLine`, both write (`context-map.md`); direction customer/supplier, Booking downstream |
| Depot planners | direct user interaction | hand-resolution of an infeasible proposed stack — no agreed message name (`consolidation/model.yaml` notes) | command *(unconfirmed)* | — |

Sealing has no traced initiator: `ContainerSealed` is emitted, but nothing in the artifacts says who
or what triggers it. Recorded as an open question rather than guessed.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | `CapacityReserved` (containerId, bookingId, volumeM3) | event | shared kernel (as above) |
| Customs | bounded context | `ContainerSealed` (containerId, fillRate) | event | pattern **unstated** — `context-map.md` records direction only |

Relationship patterns are agreed for exactly one of this context's edges. Unstated is recorded as
unstated; conformist/ACL/open-host were not invented.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Container load | The set of consignments committed to one physical container on one departure | — |
| Fill rate | Committed volume ÷ container capacity | — |
| Consignment | A physical stack of pallets committed to a container | **Yes** — Invoicing means a billable line (hotspot 2, finance analyst) |
| Slot | Used in the premium promise and in hotspot 1; **defined nowhere** | unknown |

## Business decisions

- A container's committed volume must never exceed its capacity; an overbooked container bumps a
  shipment and breaks the Guaranteed Consolidation promise — *planner, 2026-05-25*.

That is the only rule anyone stated for this context. One stated rule for a candidate core context
is itself a finding (see *Open questions*).

## Quality attributes

Desk-run against the artifacts on 2026-07-28 — **no room, no planners present**. Rows without a
number name who could supply one.

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | — | hotspot 1, planner 2026-05-25 | **yes** — it is the aggregate boundary; reserve must be one atomic command |
| Availability | can bookings still be confirmed while Consolidation is down? | unknown — commercial director | inferred from the synchronous call in `booking/model.yaml` | **yes if "no"** — it forbids the synchronous dependency |
| Latency | planner waiting for a fill proposal | unknown — the four senior planners | `consolidation/model.yaml` notes | no |
| Auditability | reconstruct which consignments were inside a sealed container, and for how long | unknown — customs clerk, finance analyst | inferred from Customs and Invoicing both depending on sealed state | **yes if required** — history becomes domain state, not a log |
| Volume / growth | 9 ports today, 2 more planned; average fill 71% → 80% | stated | `business-model.md` | no |

## Assumptions

Domain:

- *(inferred)* A container load belongs to exactly one departure and is never re-planned once
  sealed — `ContainerSealed` has no counterpart re-open event and nobody stated a re-planning rule.
- *(inferred)* Volume, not weight, is the binding constraint — `ContainerLoad` tracks only
  `capacityM3`/`committedM3`, while Booking's `ConsignmentLine` carries `weightKg` and
  `hazardClass`. The model contradicts itself here, so this is also an open question.
- *(inferred)* One booking's consignment lines are never split across two containers.

Scale / behaviour:

- *(inferred, from stated practice)* The optimiser stays advisory and planners keep resolving
  infeasible stacks by hand. That they do it today is stated (`model.yaml` notes); that they will
  keep doing it is inference.
- *(inferred)* Planning volume stays within what four senior planners can oversee as two more ports
  open.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of PRs touching Consolidation that also touch Booking. Prediction: **< 30% by 2026-10-31** | above that, the real boundary runs through `ConsignmentLine` and the shared kernel should be dissolved | VCS / CI commit history |
| Planner manual overrides per week (no baseline — planning is on a whiteboard, so instrument first) | a rising count means the model does not match the work | production planning tool, once one exists |
| Average fill rate from `ContainerSealed.fillRate`, monthly. Prediction: **71% → 80%** | whether the analysis half earns its place inside this boundary | production event stream |
| Double-commit incidents. Prediction: **0 in the 6 months after reserve becomes one command** | whether the invariant is enforced where we think it is | incident tracker (hotspot 1 is the baseline: 1 in March) |

## Open questions

- Core or supporting? `context-map.md` (March) says supporting, `business-model.md` (May) says it is
  the differentiator. Unresolved — for `5-strategize`.
- Weight or volume — which actually binds on Nordic's lanes? The model implies volume; nobody said so.
- Who or what triggers sealing, and may a sealed container be re-planned?
- Where does the capacity check belong — Booking or Consolidation? Hotspot 1: "nobody agrees where
  the check should have happened".
- Who owns a partner carrier refusing a sealed container (hotspot 3)? No context claims it.
- `discovery/timeline.md` orders `ShipmentHandedToCarrier` (#6) *before* `DeclarationSubmitted`
  (#8), contradicting the stated customs rule. Is the timeline wrong, or is the rule routinely
  broken?
- Only one business rule was stated for the context the company charges a premium for. Two of the
  four senior planners were in the room; the whiteboard knowledge of the other two is unrecorded.

## Interface critique

1. **Coherent names?** `CapacityReserved` and `ContainerSealed` fit the purpose. The most important
   interaction — Booking reserving capacity — has no name at all; it is a read followed by a write.
2. **Right types?** No. The remaining-capacity query plus reserve should be a single command this
   context accepts or rejects. Check-then-act across a boundary is precisely the race that produced
   hotspot 1.
3. **Too big?** No — one inbound interaction, two outbound events.
4. **Exposing internals?** Yes. `ConsignmentLine` is a shared kernel both contexts write, and
   Booking reads container state to make a decision this context owns. Expose a decision
   (accept/reject) instead of the state.
5. **Belongs elsewhere?** `ContainerSealed` → Customs is right. The rule "no handover before
   declaration submitted" is enforced by nobody; Routing performs the act, so Routing is the
   candidate owner — not this context.

**Move experiment (kept):** move `ConsignmentLine` wholly into Consolidation, leaving Booking a
booking line plus `ShipmentRef`. Gains: the shared kernel disappears and the capacity invariant
becomes enforceable inside one aggregate. Costs: Booking can no longer show `weightKg`/`hazardClass`
without a query, and the billable "consignment" in Invoicing drifts further from the physical one
(hotspot 2). Worth it.

**Move experiment (rejected):** extract fill optimisation into its own context. It reads and writes
the same `ContainerLoad` state, so the split would need a chatty synchronous contract. Put it behind
a port inside this boundary instead — consistent with the optimiser being advisory.

## Deltas proposed to `model.yaml` (owned by `3-decompose`)

- Add a `ReserveCapacity` command; drop the synchronous remaining-capacity read from Booking's
  relationship note.
- `subdomain_type: supporting` conflicts with `business-model.md`. Do not flip it here.
