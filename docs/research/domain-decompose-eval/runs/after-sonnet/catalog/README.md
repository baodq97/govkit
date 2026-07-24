---
id: DOMAIN-0005
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
Own the equipment category tree, the depot/location list, and the tags used to label units —
reference data other contexts read by id.

## Strategic classification
- Sub-domain type: **generic** *(master-data/reference — see mapping note in context-map.md)*
- Why: README.md: "Simple lookups." Code's own comment: "Pure lookups: add, rename, retire. No
  behaviour beyond storage and retrieval, no rules to enforce."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Equipment | A physical unit's tag and category. |
| Category | A node in the equipment category tree (with an optional parent). |
| Depot | A location that can hold units. |
| Tag | A free-form label used across the platform. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| ErpSync | (cleaned `AssetRecord`: tag + category) | data hand-off (ACL upstream of Catalog) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Pricing, Allocation, Logistics | category codes / depot ids (referenced by id, not by object) | reference data |

## Aggregates
None — plain lookup CRUD; aggregates, repositories, and domain events explicitly declined per the
master-data/reference tactical pattern.

## Business rules (draft)
None captured yet — no rule beyond CRUD is stated in the given source.
