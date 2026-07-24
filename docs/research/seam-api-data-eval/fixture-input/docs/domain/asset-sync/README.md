---
id: DOMAIN-0009
title: Asset Sync bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Asset Sync bounded context

## Purpose
Pull the fleet's asset records from the legacy ERP each night and translate them into our own
clean asset shapes.

## Strategic classification
- Sub-domain type: **supporting**
- Why: essential asset ingestion, but plumbing — the value is the anti-corruption boundary, not a
  differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| AssetRecord | Our clean asset shape (`tag`, `category`) after translation. |
| ErpRow | A raw, shifting ERP row — quarantined; nothing past this context sees it. |
| Nightly sync | The read-only SOAP pull that runs once a night. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Legacy ERP (external) | raw asset dump | sync (SOAP) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation / Maintenance / Catalog | clean asset master data | sync |

## Aggregates
- **None.** The ERP is the system of record for assets; we hold a clean read-model. No `Asset`
  aggregate is invented here (no invariants stated on our side).

## Business rules (draft)
None — translation only.

> **Anti-corruption layer:** reads the ERP's inconsistent raw fields (`ASSET_NO` vs `assetNo`,
> nulls, reordered columns) and maps them to clean records; "if the ERP changes again, only the
> sync job should need touching." This is why it is an **ACL**, not a Conformist like Customer
> Accounts — the ERP's instability must not corrupt our records.
