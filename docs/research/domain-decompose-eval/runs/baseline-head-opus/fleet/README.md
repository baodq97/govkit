---
id: DOMAIN-0008
title: Fleet bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Fleet bounded context

## Purpose
Own the canonical, clean registry of the physical units (assets) — identified by asset tag and
category — isolated from the unstable legacy ERP by an anti-corruption layer.

## Strategic classification
- Sub-domain type: **supporting** (boundary flagged — see Q2 in `../QUESTIONS.md`)
- Why: the fleet of physical units is central to the business, but maintaining the registry is
  necessary infrastructure rather than the competitive differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Asset / Unit | A physical rental unit, identified by `AssetTag`. |
| Asset record | The clean canonical shape (`Tag`, `Category`) other contexts reference. |
| Nightly ERP sync | The ACL job that translates raw ERP payloads into clean asset records. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Legacy ERP (external) | Nightly SOAP asset dump (`ErpRow`, shifting fields) | import via **ACL** |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation, Maintenance, Rentals | Asset lookups by tag | query |

## Aggregates
- **Asset** — the canonical registry entry for one physical unit (root: Asset).

## Business rules (draft)
- Nothing past the sync job may ever see a raw ERP field; the ACL translates every shifting field
  (`ASSET_NO` vs `assetNo`, reordered columns, stray nulls) into the clean shape before anything
  else touches it. If the ERP changes format, only the sync job changes.

> Relationship note: this is an **Anti-Corruption Layer** (translate + quarantine), deliberately
> unlike Accounts' **Conformist** import of the CRM. The ERP notes also mention "cost records"
> flowing in alongside assets, but no cost model exists in the code — noted as a gap, **not**
> invented here. Whether the asset registry should be its own context or folded into Catalog is
> flagged (Q2).
