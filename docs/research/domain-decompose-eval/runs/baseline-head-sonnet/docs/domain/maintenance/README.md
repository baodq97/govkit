---
id: DOMAIN-0005
title: Maintenance bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Maintenance bounded context

## Purpose
Track when each unit was last serviced and compute when it is next due.

## Strategic classification
- Sub-domain type: **supporting**
- Why: README, verbatim — "Routine record-keeping... Useful, not a differentiator."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Maintenance record | One unit's service history: last serviced date, interval, out-of-service flag. |
| Next due | Computed as `lastServiced + intervalDays`. |
| Out of service | A unit pulled for service is off the books entirely — Allocation checks this before committing. |

## Inbound communication
None observed.

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation | `IsOutOfService(assetTag)` | query (answers Allocation's own port) |

## Aggregates
- `MaintenanceRecord` — one unit's service history; "nothing to keep atomically consistent beyond
  a single record" (code comment).

## Business rules (draft)
None captured yet — asset tag and interval validation in code (`Create`) reads as input validation,
not a cross-entity business invariant, so it is not restated here.

## Notes
- Draft whiteboard notes claimed Maintenance would be "tracked inside Allocation... just another
  status a unit can be in." Shipped code keeps it a fully separate service, queried by Allocation
  through Allocation's own port (`IMaintenanceState`) — see `context-map.md`'s Conflicts table.
