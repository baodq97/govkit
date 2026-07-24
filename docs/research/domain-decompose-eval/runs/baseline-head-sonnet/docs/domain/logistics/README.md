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
- Why: necessary operational planning off the back of Allocation's commitments; not itself named
  as the differentiator (that's Allocation), even though the two share a team and a release.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Delivery run | A planned hand-off of one unit from a depot on a given date, triggered by a commit. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Allocation | `EquipmentAllocated` | event |

## Outbound communication
None observed — Logistics does not currently publish any domain event.

## Aggregates
- `DeliveryRun` — one planned hand-off per committed reservation.

## Business rules (draft)
None captured yet.

## Notes
- **Ambiguous entity vs. value object** (QUESTIONS.md Q2): `DeliveryRun` has no explicit identity
  field in code, yet is the only aggregate root in this context. Modeled here as an entity (a root
  needs identity by DDD default), with the missing id flagged as a likely implementation gap.
- Shares a squad (Fulfilment) and model types with Allocation — a genuine Shared Kernel, not a
  looser event integration; the two "evolve together and ship in the same release" (README).
