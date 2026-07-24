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
Plan depot hand-offs and delivery runs for committed reservations.

## Strategic classification
- Sub-domain type: **supporting**
- Why: needed to run the business, not where we win. Deliberately lighter than the core — a
  delivery-run list, no aggregate ceremony.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| DeliveryRun | A planned depot hand-off / delivery for a committed reservation. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| — | — | — |

## Aggregates
- None — supporting transaction script over a delivery-run list.

## Business rules (draft)
None captured yet. **Relationship note:** built by the same squad as Allocation, shares its model
types directly, and ships in the same release — **Shared Kernel + Partnership** with Allocation
(neither side moves without the other). *(Candidate consumer of Allocation's currently-orphan
`DepotTransferRequested` event — see context-map / QUESTIONS.md Q7.)*
