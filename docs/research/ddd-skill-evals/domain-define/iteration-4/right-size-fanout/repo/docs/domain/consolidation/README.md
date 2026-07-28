# Consolidation bounded context

> **Supporting-tier canvas** (`model.yaml: subdomain_type: supporting`). 114 lines, over the 90-line
> supporting budget: the classification below is contested, which re-opens the deep sections. No
> quality-attribute table — nobody supplied a number. `3-decompose` left no README to merge into.

## Purpose

Decide which consignments travel in which container on which departure, so a container leaves as
full as possible and no committed shipment is bumped. Served actors: the four senior depot planners
in Gothenburg, and indirectly the exporters who bought Guaranteed Consolidation.

## Strategic classification — contested upstream, not resolved here

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting | `consolidation/model.yaml` |
| Domain type (conflicting) | differentiating | `business-model.md` — "Load consolidation / container fill optimisation", differentiates: **yes** |
| Business-model role | revenue generator | `business-model.md` |
| Evolution | custom-built | `business-model.md` |
| Chart | **absent** — no `core-domain-chart.md` in this repo | — |

**Finding for `5-strategize`.** The only capability that is revenue-generating, custom-built *and*
differentiating is carried by the one context typed `supporting`; every context typed `core` maps to
a capability marked `differentiates: no` or `partial`. Either the type or the capability row is
wrong. This canvas is thin on purpose — if the classification flips, it is under-built.

## Domain roles

**Execution** (holds capacity commitments, enforces the invariant) **and analysis** (optimises
fill) — two change rhythms in one boundary. Evidence for `3-decompose`, not re-cut here.

## Inbound communication

| Collaborator | Type | Message | Type | Relationship |
|---|---|---|---|---|
| _nothing traced_ | | | | |

No `docs/domain/message-flows/`; the slice reports nothing on this boundary. **No inbound message is
modelled anywhere in the repo**, yet `CapacityReserved` is published — something must be asking.

## Outbound communication

| Collaborator | Type | Message | Type | Relationship |
|---|---|---|---|---|
| untraced | — | `CapacityReserved` (containerId, bookingId, volumeM3) | event | undeclared |
| untraced | — | `ContainerSealed` (containerId, fillRate) | event | undeclared |

`model.yaml` gives `to: Booking, type: upstream` and `to: Customs, type: upstream` — a direction
word, not a context-mapping pattern (conformist / ACL / open-host / published language /
customer-supplier / partnership). The pattern is a stated absence, and "upstream" does not say which
side it names.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Container load | consignments committed to one physical container on one departure | — |
| Fill rate | committed volume ÷ container capacity | — |
| Consignment line | one stackable volume unit inside a container load (`volumeM3`, `stackable`) | **yes** — finance reads "consignment" as a billable line, operations as a physical stack of pallets (hotspot, finance analyst). Here it is the physical thing |

## Business decisions

- Committed volume must never exceed capacity; an overbooked container bumps a shipment and breaks
  the Guaranteed Consolidation promise — *planner, 2026-05-25*. The context's only invariant.
- The premium is charged whether or not the container ends up full — *finance analyst*. Owned by
  Invoicing, but it prices this work: fill optimisation is a cost lever, not a revenue lever.

## Assumptions

- **Inferred:** volume, not weight, binds — the aggregate carries `capacityM3`/`committedM3`, no
  weight attribute anywhere.
- **Inferred:** one departure per container load, never re-planned after sealing — no re-plan or
  unseal event exists on disk.
- **Inferred:** `stackable` implies a stacking rule nobody has stated.
- **Sourced** (`model.yaml` notes, not a stated rule): planning is partly whiteboard-based and the
  four senior planners hand-resolve infeasible stacks — the optimiser is advisory.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| < 25% of PRs touching Consolidation also touch Booking, by 2026-10 | if it climbs, the capacity check belongs on one side and the cut is wrong | CI / VCS change coupling |
| Planner manual overrides per week, trending down | if flat or rising, the model does not match the work | production — **not collectable today**, the work is on a whiteboard |
| Double-commit incidents per quarter (baseline: 1, March) | whether the invariant is enforced anywhere | issue tracker |

## Open questions

- Where should the capacity check happen? Two shipments took the same slot in March and nobody
  agrees where it should have been caught — *planner*. This context holds the invariant but accepts
  no message, so on disk the check has no home.
- Is Consolidation core or supporting? Two artifacts disagree (above).
- Who consumes `ContainerSealed`, and does Customs gate "no handover before declaration submitted"
  on it?
- Which side does `type: upstream` name for Booking and Customs?
- Who is accountable when a partner carrier refuses a sealed container? — *planner*, unresolved.

## Interface critique

1. **Q2/Q3 — publish-only interface.** Two events, zero accepted messages. A context owning an
   invariant must accept the request that could violate it; a `ReserveCapacity` command it accepts
   or rejects is the missing half.
2. **Q4 — internals leaking.** `ContainerSealed` carries `fillRate`. The premium is flat, so no
   downstream party needs fill rate to bill, notify or clear customs.
3. **Perturbation (rejected).** Moving the invariant to Booking would give the March hotspot an
   owner, but Booking would then write `committedM3` while this context plans against it — two
   writers on one number, which is that incident by construction.

## Proposals for other steps (not applied)

- `3-decompose` / `model.yaml`: add the inbound command; declare mapping patterns instead of
  `upstream`; the invariant sits at context level while the aggregate declares none.
- Tooling: `ddd_slice.py --context Consolidation` reports `entities: 0` for `ContainerLoad`, but
  `model.yaml` declares two (`ContainerLoad`, `ConsignmentLine`). One is miscounting.
