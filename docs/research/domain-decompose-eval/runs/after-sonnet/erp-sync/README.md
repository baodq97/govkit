---
id: DOMAIN-0010
title: ErpSync bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# ErpSync bounded context

## Purpose
Pull the legacy ERP's nightly asset dump over its SOAP endpoint and translate it into RentField's
own clean asset records — quarantining the ERP's unstable, shifting export format so nothing else
ever sees a raw ERP field.

## Strategic classification
- Sub-domain type: **generic**
- Why: a technical integration/Anti-Corruption Layer; no business differentiation of its own.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| AssetRecord | RentField's own clean shape for an asset: tag, category. |
| ErpRow | The ERP's raw, unstable export row (field names shift between releases: `ASSET_NO` vs `assetNo`). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| External ERP (legacy SOAP) | nightly asset dump | data feed — **Anti-Corruption Layer**: translated here, nothing past this job sees a raw ERP field |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Catalog | cleaned `AssetRecord` (tag, category) | data hand-off |

## Aggregates
None — a nightly translation job, not a domain model.

## Business rules (draft)
- The ERP's raw fields must never be visible past this job — "if the ERP breaks its format, the
  damage stops here and nowhere else needs to change."

## Notes
Textbook Anti-Corruption Layer (`docs/erp-integration-notes.txt`): "We do not own it and cannot
get changes made to it... when it misbehaves, it must not be allowed to corrupt our own asset
records." Risk set to High because this isolation boundary protects every asset record on the
platform, not because of a rich domain model.
