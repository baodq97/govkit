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
Commit the right physical unit, held at one depot, to one customer for one rental window — without
ever promising the same unit twice.

## Strategic classification
- Sub-domain type: **core**
- Why: "The heart of the business… where we win or lose against competitors, and the rules here
  change often." This is where the modelling effort goes.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Reservation | A commitment of one physical unit, at one depot, to one rental window. |
| Unit / Asset | A single physical piece of equipment, identified by `AssetTag`. |
| Depot | The location that **owns** a unit while it is committed and is responsible for releasing it. |
| Rental window | The `[Start, End)` date range a unit is committed for. |
| Out of service | A unit pulled for maintenance — off the allocation book entirely (queried from Maintenance). |
| Availability | The reservation book + overlap check — folded into this context, not a separate module. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Maintenance | out-of-service state (`IsOutOfService`) | query |
| Catalog | depot / asset reference | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Logistics | `EquipmentAllocated` | event |
| — (no consumer) | `DepotTransferRequested` | event *(orphan — planned by hand; see context-map)* |

## Aggregates
- **Reservation** — guards the "one unit, one place, one renter at a time" invariant.

## Business rules (draft)
<!-- ONLY rules the code/README state. -->
- The same physical unit is never committed twice for overlapping windows — **not even from a
  different depot** (this is the rule the `Commit` method exists to enforce).
- A unit currently out of service (pulled for maintenance) cannot be committed.
- A rental window must be at least one day (`end > start`).
- Allocation priority order is **contract > walk-in > internal** (stated in `SharedDomainRules`;
  belongs here — see context-map cross-cutting concerns).
- The depot that commits a unit **owns** it while committed and is the party responsible for
  releasing it (a real domain ownership relationship, not audit metadata).
