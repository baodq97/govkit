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
Track when each unit was last serviced, when it's next due, and whether it's currently out of
service.

## Strategic classification
- Sub-domain type: **supporting**
- Why: README explicit: "Routine record-keeping... Useful, not a differentiator." Lighter shape
  deliberately — no cross-record invariant to protect, so no aggregate ceremony is imposed.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Maintenance record | One unit's service history: last serviced date, interval, out-of-service flag. |
| Next due | `lastServiced + intervalDays` — the one calculation this context performs. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `IsOutOfService(assetTag)` | query |

## Outbound communication
None found in the given source — Maintenance answers queries; it doesn't publish events.

## Aggregates
- **None, by design.** `MaintenanceRecord` is a single-entity transaction-script/active-record:
  create, reschedule, list, compute next-due. Nothing here needs cross-record atomic consistency.

## Business rules (draft)
- Asset tag is required (non-empty) when creating a record.
- Service interval must be a positive number of days.
