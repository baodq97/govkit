---
id: DOMAIN-0006
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
Plan depot hand-offs and delivery runs for every unit that gets committed.

## Strategic classification
- Sub-domain type: **supporting**
- Why: Needed to run the business, not called out in README as a differentiator. Built by the
  fulfilment squad together with Allocation, sharing model types and releases (shared kernel).

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Delivery run | A planned hand-off of one unit from a depot on a given date, created from an `EquipmentAllocated` event. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event |

## Outbound communication
None found in the given source.

## Aggregates
- **None, by design.** `DeliveryRun` is a light transaction-script record derived straight from
  Allocation's event; Logistics and Allocation are built by the same squad and use each other's
  model types directly (shared kernel per `README.md`: "the two evolve together and ship in the
  same release").

## Business rules (draft)
None captured yet — no invariant was stated for Logistics in the given sources.
