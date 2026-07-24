---
id: DOMAIN-0004
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
Track service jobs for each unit — when it was last serviced, when it's next due, and whether
it's currently out of service.

## Strategic classification
- Sub-domain type: **supporting**
- Why: README.md: "Routine record-keeping... Useful, not a differentiator." Code's own comment:
  "Straightforward record-keeping... nothing to keep atomically consistent beyond a single
  record."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| MaintenanceRecord | One unit's service history: last serviced date, interval, out-of-service flag. |
| Next due | `lastServiced + intervalDays` — the one calculation this context performs. |

## Inbound communication
None captured in the given source.

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation | `IsOutOfService(assetTag)` | query (Allocation calls in via a port it defines itself) |

## Aggregates
None — deliberately lighter shape (transaction script / active record); see notes.

## Business rules (draft)
None captured yet — no invariant beyond a single record is stated in the given source.

## Notes
An early draft (`docs/domain-notes-draft.md`) proposed folding maintenance status into Allocation
as "just another status a unit can be in." Shipped code keeps it as its own module/service,
queried by Allocation through a narrow port — see context-map.md Conflicts.
