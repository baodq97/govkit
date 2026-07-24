---
id: DOMAIN-0001
title: Allocation bounded context
risk: Critical
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Allocation bounded context

## Purpose
Commit the right physical unit, at one depot, to one rental window — without ever double-booking
the same unit — and hold that commitment until it's released.

## Strategic classification
- Sub-domain type: **core**
- Why: README.md: "the heart of the business... this is where we win or lose against competitors,
  and the rules here change often."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | A commitment of one physical unit (by `AssetTag`), held at one depot, for one rental window (`Start`–`End`). |
| Commit | The act of creating a Reservation; the operation that enforces the no-double-booking rule. |
| DepotId | The depot that *owns* the unit while it's committed — responsible for it, and the one that must release it. |
| Out of service | A unit currently pulled for maintenance; off the books entirely, cannot be committed. |
| Release | Ending a Reservation's hold on a unit. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Maintenance | `IsOutOfService(assetTag)` | query (via `IMaintenanceState` port, owned by Allocation) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event (**Shared Kernel** — Logistics consumes Allocation's raw event/model types directly, not a translated contract; see context-map.md) |
| *(none — orphan)* | `DepotTransferRequested` | event — emitted whenever a commit lands away from the asset's home depot; **nothing consumes it today** (planned by hand in the depot office). Flagged in context-map.md, not fabricated a consumer. |

## Aggregates
- **Reservation** — the consistency boundary that guarantees one physical unit is never committed
  twice for overlapping windows, even from a different depot.

## Business rules (draft)
- The same physical unit can never be committed twice for overlapping rental windows — not even
  from a different depot ("One unit, one place, one renter at a time").
- A unit currently pulled for service (out of service) cannot be committed.
- A rental window must be at least one day (`end > start`).

## Aggregate design canvas — Reservation

```markdown
### Aggregate: Reservation   (root: Reservation)

Purpose: guarantee the same physical unit is never committed to two overlapping rental windows,
even from a different depot.

Entities (have identity):
- Reservation — id, assetTag, depotId, start, end, status (held | released)

Value objects (no identity, equal by value, immutable):
- (none captured — Start/End are plain attributes on Reservation in the given source; a RentalWindow
  value object is a plausible future extraction, not fabricated here since the code doesn't have one)

Handled commands → emitted events:
| Command (imperative) | Event (past tense) |
|---|---|
| CommitReservation | EquipmentAllocated |
| CommitReservation (when depot ≠ home depot) | DepotTransferRequested |
| ReleaseReservation | (no event observed in given source) |

Enforced invariants:
- The same AssetTag can never have two overlapping, non-released Reservations, regardless of depot.
- A Reservation cannot be created for an AssetTag that Maintenance reports out-of-service.
- Start < End (a rental window is at least one day).

Relationships:
- References Maintenance's out-of-service status via the IMaintenanceState port (query only, no
  object reference).
- Emits events consumed by Logistics (EquipmentAllocated) and, currently, no one
  (DepotTransferRequested).
```

## Notes
- No separate "Availability" module exists — an early draft (`docs/domain-notes-draft.md`)
  described one, but the availability/overlap check is folded into `Commit()` itself. This is
  correct DDD, not a shortfall: the availability check and the commit must be atomic (one
  aggregate, one transaction) to avoid a race that double-books the unit. See context-map.md
  Conflicts.
- `HomeDepotOf()` is currently hardcoded to `"DEP-CENTRAL"` in the given source — a stub, not a
  business rule; not modeled as an invariant.
