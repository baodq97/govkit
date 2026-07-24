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
Commit the right physical unit to the right customer for the right window — without ever
promising the same unit twice.

## Strategic classification
- Sub-domain type: **core**
- Why: "The heart of the business… where we win or lose against competitors, and the rules here
  change often." The no-double-commit invariant is the differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | A commitment of one physical unit, held at one depot, to one rental window. |
| Commit | The act of committing a unit to a window; rejected if it would double-book or the unit is out of service. |
| Rental Window | The `[start, end)` date range a unit is committed for (a value object). |
| Custodian Depot | The depot that holds a committed unit and must release it (`Reservation.DepotId`) — an ownership projection, not audit metadata. |
| Home Depot | A unit's base depot; committing it elsewhere raises a transfer request. |
| Out of service | A unit pulled for maintenance is off the books entirely (state **read** from Maintenance). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Maintenance | `IsOutOfService(assetTag)` | query |
| Asset Sync | clean asset master data | sync |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event (Shared Kernel) |
| depot transfer (planned by hand) | `DepotTransferRequested` | event — **UNCONSUMED** |

## Aggregates
- **Reservation** — guards the no-overlap, out-of-service, and minimum-window invariants.

## Business rules (draft)
Captured from the shipped code (`AllocationService.Commit`), not invented:
- The same physical unit may **never** be committed twice for overlapping windows — not even from
  a different depot. (This directly overrides the stale draft's "two depots at once" note.)
- A unit that is **out of service** cannot be committed.
- A rental window must be **at least one day** (`end` after `start`).

> **Open aggregate-boundary question** (see `QUESTIONS.md`): the no-overlap invariant is set-based
> over *all* live reservations for one asset, so the true consistency boundary may be a per-asset
> reservation book rather than a single `Reservation`. Flagged, not silently decided.
