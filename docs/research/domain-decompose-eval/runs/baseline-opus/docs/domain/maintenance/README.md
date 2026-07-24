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
Keep a service record per unit — when it was last serviced, its interval, and when it is next due —
and expose whether a unit is out of service.

## Strategic classification
- Sub-domain type: **supporting**
- Why: "routine record-keeping… useful, not a differentiator." One calculation (next-due). Lighter
  shape on purpose: a transaction script / CRUD-plus-a-calculation, not an aggregate.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| MaintenanceRecord | A service record per unit — last serviced, interval, out-of-service flag. |
| Next due | The next service date = `lastServiced + intervalDays` (the one calculation here). |
| Out of service | A unit pulled for service; Allocation queries this to keep it off the book. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (operator) | create / reschedule record | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation | out-of-service state (`IsOutOfService`) | query (synchronous) |

## Aggregates
- None — supporting. `MaintenanceRecord` has an id/lifecycle (so it is an *entity*), but a
  transaction script over it is the right shape; "nothing to keep atomically consistent beyond a
  single record."

## Business rules (draft)
- Interval must be positive; asset tag required (input validation stated in the code).
- **Reconciliation:** the draft note that put maintenance "inside Allocation, just a unit status" is
  **stale** — this is a separate context; Allocation only *queries* out-of-service (see context-map
  Conflicts).
