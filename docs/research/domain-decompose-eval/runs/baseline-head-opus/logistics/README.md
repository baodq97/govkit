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
Plan depot hand-offs and delivery runs for every committed reservation.

## Strategic classification
- Sub-domain type: **supporting**
- Why: necessary fulfilment planning, not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Delivery run | A planned hand-off of one unit from a depot on a date. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| (none captured) | — | — |

## Aggregates
- **DeliveryRun** — one planned delivery derived from a committed reservation.

## Business rules (draft)
None captured yet.

> Relationship note: Logistics and Allocation are built by the same Fulfilment squad, share model
> types directly, and ship in the same release — "neither side can move without the other." This
> is a **shared kernel**, not a service seam; do not split them early.
