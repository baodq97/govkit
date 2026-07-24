---
id: DOMAIN-0010
title: ErpSync bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# ErpSync bounded context

## Purpose
Pull asset and cost data nightly from the legacy ERP and translate it into our own clean records,
quarantining the ERP's mess so nothing downstream ever sees a raw ERP field.

## Strategic classification
- Sub-domain type: **generic** *(integration)*
- Why: the value here is **isolation, not modelling**. A read-only nightly sync over a legacy ERP we
  do not own and cannot change.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| AssetRecord | Our own clean unit record (tag + category), translated from the ERP's shifting shapes. |
| Anti-Corruption Layer | The translation boundary that quarantines the ERP's mess. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| External ERP | nightly SOAP asset dump | event (batch) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Catalog | clean `AssetRecord` upsert | command |

## Aggregates
- None — integration/ACL, no domain model.

## Business rules (draft)
None owned. **Relationship note:** classic **Anti-Corruption Layer** — defensively maps the ERP's
inconsistent/renamed fields (`ASSET_NO` vs `assetNo`, reordered columns, stray nulls) into clean
`AssetRecord`s; "if the ERP breaks its format, the damage stops here and nowhere else needs to
change."
