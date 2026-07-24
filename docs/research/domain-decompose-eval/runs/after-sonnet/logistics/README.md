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
Plan depot hand-offs and delivery runs for committed units.

## Strategic classification
- Sub-domain type: **supporting**
- Why: README.md: "Planning depot hand-offs and delivery runs" — necessary, not called out as a
  differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| DeliveryRun | A planned hand-off: asset tag, from-depot, date. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event (**Shared Kernel** — consumes Allocation's raw event type directly, not a translated contract) |

## Outbound communication
None captured in the given source.

## Aggregates
None — record-keeping (planned runs), no invariant stated.

## Business rules (draft)
None captured yet.

## Notes
Logistics and Allocation are built by the same squad and ship together (`config/teams.yaml`:
`fulfilment` owns both, `release_cadence: shared`) — the code comment is explicit that "the two
evolve together... neither side can move without the other." This is real Shared Kernel coupling
(flagged with its cost in context-map.md), not a Published Language integration, and Allocation is
a **core** context — ddd-methodology.md §2.4 recommends keeping the Core Domain out of a Shared
Kernel. Acceptable today because of the same-team/same-release constraint; revisit if that
constraint ever changes.
