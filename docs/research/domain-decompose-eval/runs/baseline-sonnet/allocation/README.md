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
Commit one physical unit, at one depot, to one customer's rental window — without ever promising
the same unit twice, and never during a maintenance hold.

## Strategic classification
- Sub-domain type: **core**
- Why: README states directly: "the heart of the business... This is where we win or lose against
  competitors, and the rules here change often."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | The commitment of one physical unit (by `AssetTag`) to one depot for one date window. |
| Commit | The act of creating a Reservation — the moment a unit is taken off the free pool. |
| Depot | The location that owns a unit while it is committed — responsible for releasing it. |
| Out of service | A unit currently pulled for maintenance; off the books entirely, cannot be committed. |
| Overlapping window | Two date ranges that share at least one day — the trigger for the no-double-commit rule. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Maintenance | `IsOutOfService(assetTag)` | query |
| (caller/UI) | `Commit(assetTag, depotId, start, end)` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event |
| *(none — orphan, see context-map.md)* | `DepotTransferRequested` | event |

## Aggregates
- `Reservation` — the consistency boundary that enforces "one unit, one place, one renter at a
  time," even across depots.

## Business rules (draft)
- A rental window must be at least one day (`end > start`).
- A unit currently out of service (per Maintenance) cannot be committed.
- **The same physical unit can never be committed twice for overlapping windows — not even from a
  different depot.** This is the rule the aggregate exists to protect. It directly reverses an
  earlier whiteboard note that allowed a unit to be held at two depots at once; running code is
  authoritative (see context-map.md Conflicts table).
- When a commit lands at a depot other than the asset's home depot, a `DepotTransferRequested`
  event fires so the transfer can be arranged — today nothing consumes it; the move is still
  planned by hand in the depot office (flagged as an orphan event, not silently dropped).
