---
id: DOMAIN-0009
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
Hold the platform's reference data — the equipment category tree, the depot/location records, the
tags, and the canonical unit/equipment records.

## Strategic classification
- Sub-domain type: **generic** *(master-data / reference)*
- Why: "pure lookups — add, rename, retire. No behaviour beyond storage and retrieval, no rules to
  enforce." Explicitly **no aggregates, repositories, or domain events**.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Category | A node in the equipment category tree (code + optional parent). |
| Depot | A location record (id + city). |
| Tag | A free-form label applied to units. |
| Equipment / Asset | The canonical unit reference record (tag + category), fed by the ERP ACL. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| ErpSync | clean `AssetRecord` upsert | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation / Rentals | category / depot / asset lookups | query |

## Aggregates
- None — master-data / reference. Plain lookup CRUD; an empty model is the correct, complete output.

## Business rules (draft)
None captured — pure lookups. **Note:** candidate **system-of-record** for the Equipment/Asset
registry that ERP sync writes into and that Rentals should consume instead of keeping its own
duplicate `Equipment` class (see QUESTIONS.md Q6).
