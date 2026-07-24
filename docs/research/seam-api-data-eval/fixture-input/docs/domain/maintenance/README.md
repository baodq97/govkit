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
Track when each unit was last serviced and when it is next due, and whether a unit is out of
service.

## Strategic classification
- Sub-domain type: **supporting**
- Why: "Routine record-keeping… Useful, not a differentiator" (README + code comment).

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| MaintenanceRecord | A service record for a unit: last serviced, interval, out-of-service flag. |
| NextDue | `LastServiced + IntervalDays` — the one calculation here. |
| Out of service | A unit pulled for service; Allocation reads this before committing. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Asset Sync | clean asset tags | sync |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation | `IsOutOfService(assetTag)` | query |

## Aggregates
- None. Transaction script (CRUD + a `NextDue` calculation); nothing to keep atomically consistent
  beyond a single record.

## Business rules (draft)
None captured beyond the `NextDue = LastServiced + IntervalDays` calculation.

> **Reconciliation note:** the stale draft folded Maintenance *inside* Allocation ("just another
> unit status"). The shipped code makes it a separate context that Allocation only *queries*. Code
> wins — see context-map Conflicts.
