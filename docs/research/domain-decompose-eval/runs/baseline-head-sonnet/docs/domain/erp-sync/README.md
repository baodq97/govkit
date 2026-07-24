---
id: DOMAIN-0009
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
Quarantine the legacy ERP's shifting, unstable export shapes behind one nightly translation job, so
nothing else in the platform ever sees a raw ERP field.

## Strategic classification
- Sub-domain type: **generic**
- Why: pure anti-corruption/translation plumbing over a legacy system we don't own; no business
  differentiation.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Asset record | The platform's own clean shape for an ERP-sourced asset (tag + category), after translation. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| ERP (external) | nightly asset dump (SOAP) | ACL import — raw fields (`ASSET_NO`/`assetNo`, `CLASS_CD`, ...) translated before anything else touches them |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Catalog *(inferred)* | `AssetRecord` upsert | query/write — unconfirmed, see notes |

## Aggregates
- `AssetRecord` — the platform's clean asset shape, upserted from the nightly ERP translation.

## Business rules (draft)
- Nothing outside the sync job may ever see a raw ERP field — all translation from the ERP's
  shifting export shapes happens here before anything else touches the data.

## Notes
- **Inferred, unconfirmed relationship** (QUESTIONS.md Q4): `AssetRecord { Tag, Category }` closely
  matches Catalog's `Equipment { Tag, Category }`, but no concrete `IAssetWriter` implementation is
  shown in the read code, so the actual landing context (Catalog? Allocation's fleet? a separate
  asset store?) is not confirmed.
- True anti-corruption layer, unlike Accounts' CRM import: ERP fields are translated/renamed
  (`ASSET_NO` vs `assetNo` → `Tag`), not mirrored verbatim.
