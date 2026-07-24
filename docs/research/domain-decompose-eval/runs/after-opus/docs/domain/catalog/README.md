---
id: DOMAIN-0006
title: Catalog bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Catalog bounded context

## Purpose
Hold the reference lists everyone labels units against: the equipment category tree, the depots,
and the tags.

## Strategic classification
- Sub-domain type: **generic** (master-data / reference)
- Why: "Pure lookups… no behaviour beyond storage and retrieval, no rules to enforce."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Category | A node in the equipment category tree (`code`, optional `parentCode`). |
| Depot | A location record (`id`, `city`). |
| Tag | A free-form label applied to units. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Asset Sync | clean asset categories | sync |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| (all) | lookup queries | query |

## Aggregates
- **None — explicitly declined.** A reference context: plain lookup CRUD, no aggregate, no
  repository pattern, no domain event. This is the correct, complete output for master data, not a
  gap.

## Business rules (draft)
None — "no rules to enforce."

> Resolves the stale draft's open question ("separate reference-data area, or per-module lists?"):
> yes — Catalog is that reference-data context.
