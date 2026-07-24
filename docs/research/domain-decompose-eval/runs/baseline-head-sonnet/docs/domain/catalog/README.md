---
id: DOMAIN-0007
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
Own the reference data every other context looks up: the equipment category tree, depots, and
tags.

## Strategic classification
- Sub-domain type: **generic**
- Why: code, verbatim — "Pure lookups... No behaviour beyond storage and retrieval, no rules to
  enforce." README: "Simple lookups."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Equipment | A unit's tag + category, as reference data (distinct from Allocation's live `Reservation`, which is about commitment, not classification). |
| Category | A node in the equipment category tree (self-referencing via `parentCode`). |
| Depot | A physical location. |
| Tag | A free-form label. |

## Inbound communication
None observed as a direct call in code; see the inferred ErpSync relationship below.

## Outbound communication
None observed.

## Aggregates
- `Equipment` — tag + category, add/rename/retire.
- `Category` — category tree node, add/rename/remove.
- `Depot` — a physical location, add.
- `Tag` — a free-form label, add.

## Business rules (draft)
None captured yet.

## Notes
- **Inferred, unconfirmed relationship** (QUESTIONS.md Q4): ErpSync's clean `AssetRecord { Tag,
  Category }` shape closely matches `Equipment { Tag, Category }`, but no concrete `IAssetWriter`
  implementation is shown in code, so whether ErpSync actually populates Catalog is not confirmed.
