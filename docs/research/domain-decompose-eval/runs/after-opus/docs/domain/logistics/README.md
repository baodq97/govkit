---
id: DOMAIN-0004
title: Logistics bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Logistics bounded context

## Purpose
Plan depot hand-offs and delivery runs for committed units.

## Strategic classification
- Sub-domain type: **supporting**
- Why: record-keeping / scheduling built off Allocation's events; not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| DeliveryRun | A planned delivery of a committed unit from a depot on a date. |
| Hand-off | A depot handing a unit over for delivery. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event (Shared Kernel) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| — | — | — |

## Aggregates
- None. Deliberately light — a transaction script over `DeliveryRun` records; no invariant to
  protect and no domain event of its own.

## Business rules (draft)
None captured yet.

> **Shared Kernel flag:** Logistics and Allocation are one squad (Fulfilment), share model types
> (`Reservation`, `EquipmentAllocated`) directly, and ship together. That is a Shared Kernel /
> Partnership — highest coupling among cooperating patterns; cost = mutual-consent change + drift
> risk. Acceptable because one team owns both, but it is real coupling, recorded on the context map.
