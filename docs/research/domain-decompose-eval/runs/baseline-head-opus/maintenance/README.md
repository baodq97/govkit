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
Track each unit's service history and compute when it is next due — and mark units out of service.

## Strategic classification
- Sub-domain type: **supporting**
- Why: "Routine record-keeping… Useful, not a differentiator."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Maintenance record | A unit's service schedule: last serviced, interval, out-of-service flag. |
| Next due | `lastServiced + intervalDays`. |
| Out of service | A unit pulled for service; Allocation queries this to keep it off the books. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Fleet | Asset by tag | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation | Is-out-of-service(assetTag) | query response |

## Aggregates
- **MaintenanceRecord** — one service schedule per unit; "nothing to keep atomically consistent
  beyond a single record."

## Business rules (draft)
- Interval days must be positive; an asset tag is required to create a record.
- Next-due date is `lastServiced + intervalDays`.

> Note: the draft notes wanted maintenance folded into Allocation as "just a status." Shipped code
> and the README make it its own module/context — modeled that way here (see Conflicts in
> `../context-map.md`). Allocation still *queries* out-of-service state, but Maintenance owns it.
