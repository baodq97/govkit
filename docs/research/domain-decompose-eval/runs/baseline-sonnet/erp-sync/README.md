---
id: DOMAIN-0009
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
Pull the legacy ERP's nightly asset dump over its unstable SOAP interface and translate it into
RentField's own clean asset/cost records — quarantining the ERP's mess so nothing else ever sees a
raw ERP field.

## Strategic classification
- Sub-domain type: **generic**
- Why: pure Anti-Corruption-Layer translation over a legacy vendor system RentField does not own
  and cannot get changed ("the vendor quotes six figures to touch anything"); no business rule of
  RentField's own lives here.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Asset record | RentField's own clean shape for one ERP asset (`tag`, `category`), translated from whatever raw fields the ERP happened to export that night. |
| Raw dump | The ERP's inconsistent nightly export — field names have changed between releases (`ASSET_NO` vs `assetNo`), nulls appear where they shouldn't, columns can arrive reordered. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Legacy ERP (external, SOAP, nightly) | Raw asset dump | Anti-Corruption Layer — translated defensively before anything else touches it |

## Outbound communication
None found in the given source — `AssetRecord` upserts have no declared consumer in this codebase
(see context-map.md and QUESTIONS.md Q4; not scored as an orphan-event defect since this may feed a
capability outside this code slice, but flagged as unverified).

## Aggregates
- **None, by design.** Generic/ACL integration — translation only, no domain model of RentField's
  own.

## Business rules (draft)
- "It must not be allowed to corrupt our own asset records" when the ERP misbehaves — the sync job
  defensively falls back (`ASSET_NO` or `assetNo` or `"UNKNOWN"`) rather than propagate a bad or
  missing field.
- "If the ERP changes again, only the sync job should need touching" — nothing past this job may
  ever see a raw ERP field.
