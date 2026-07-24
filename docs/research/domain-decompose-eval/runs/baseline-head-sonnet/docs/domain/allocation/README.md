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
Commit the right physical unit, at one depot, to one customer for one rental window — without
ever promising the same unit twice.

## Strategic classification
- Sub-domain type: **core**
- Why: README, verbatim — "the heart of the business... where we win or lose against competitors,
  and the rules here change often."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | A commitment of one physical unit (by asset tag), held at one depot, to one rental window. |
| Rental window | The (start, end) date range a reservation covers; overlap is checked here, not elsewhere. |
| Commit | The act of creating a reservation, after checking service status and overlap. |
| Home depot | The depot a unit belongs to when not otherwise committed; a commit elsewhere triggers a transfer request. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Maintenance | `IsOutOfService(assetTag)` | query (via Allocation's own port, `IMaintenanceState`) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event |
| *(none — orphan)* | `DepotTransferRequested` | event — **no consumer wired yet; code comment confirms nothing listens for this today** |

## Aggregates
- `Reservation` — the consistency boundary that guarantees one unit is never committed twice for
  overlapping windows.

## Business rules (draft)
- Rental window must be at least one day (end must be after start).
- A unit currently pulled for service (out-of-service in Maintenance) may not be committed.
- The same physical unit can never be committed twice for overlapping windows, even across
  different depots — one unit, one place, one renter at a time.

## Notes
- Draft whiteboard notes (`docs/domain-notes-draft.md`) described a separate "Availability" module
  and allowed double-booking across depots. Neither survived into the shipped code/README; both are
  recorded and resolved in `context-map.md`'s Conflicts table (code/README chosen as authoritative).
