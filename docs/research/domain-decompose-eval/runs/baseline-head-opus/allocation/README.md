---
id: DOMAIN-0001
title: Allocation bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Allocation bounded context

## Purpose
Commit the right physical unit, held at one depot, to one customer for one rental window —
without ever promising the same unit twice.

## Strategic classification
- Sub-domain type: **core**
- Why: "the heart of the business… where we win or lose against competitors, and the rules here
  change often." The no-double-booking consistency guarantee is the differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | One physical unit committed to one depot for one date window (`held` → `released`). |
| Asset / Unit | A physical rental unit, identified by its `AssetTag`. |
| Depot | The location that OWNS a unit while it is committed and must release it. |
| Home depot | The unit's base depot; a commit elsewhere requests a transfer. |
| Availability | Derived here from overlapping reservations — NOT a separate module (see draft-conflict). |
| Out of service | A unit pulled for maintenance is off the books entirely (queried from Maintenance). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Catalog | Depot / category reference data | query |
| Fleet | Asset exists / home depot (by tag) | query |
| Maintenance | Is-out-of-service(assetTag) | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event |
| (none — orphan) | `DepotTransferRequested` | event ⚠ no consumer yet (see context-map Q3) |

## Aggregates
- **Reservation** — guards the "one unit, one place, one renter at a time" invariant across the
  reservation book.

## Business rules (draft)
<!-- ONLY rules stated in README / shipped code. -->
- The same physical unit can never be committed twice for **overlapping** windows — **not even
  from a different depot**. (Supersedes the stale draft "hold at two depots at once" note.)
- A unit currently out of service (pulled for maintenance) cannot be committed.
- A rental window must be at least one day (`end > start`).

> Note: the draft notes proposed a standalone **Availability** module and a "same unit at two
> depots" rule. Both are contradicted by shipped code and the current README and were dropped —
> see the Conflicts table in `../context-map.md`.
