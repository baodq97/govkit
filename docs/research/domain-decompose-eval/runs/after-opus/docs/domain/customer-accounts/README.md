---
id: DOMAIN-0008
title: Customer Accounts bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Customer Accounts bounded context

## Purpose
Hold the customer accounts imported nightly from the third-party CRM.

## Strategic classification
- Sub-domain type: **supporting**
- Why: customer master data; needed, not differentiating. We have no leverage over the CRM.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| SalesAccount | A customer account mirrored from the CRM (`accountId`, `name`, `segment`). |
| SalesRep (owner) | The rep who owns the commercial relationship (`SalesRepId`) — an ownership projection, not audit metadata. |
| Segment | The CRM's segment code, taken verbatim. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| CRM (external) | `CrmAccountRow` nightly import | sync |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | customer lookup | query |

## Aggregates
- **None.** CRUD over conformed records; no stated invariant.

## Business rules (draft)
None captured.

> **Conformist (not ACL):** we take the CRM's record shapes **exactly** as they arrive — field
> names, segment codes, id format — with **no translation**. Contrast Asset Sync, which wraps the
> ERP in an anti-corruption layer. The difference is deliberate: we conform to the CRM because we
> cannot change it and choose not to translate; we quarantine the ERP because its instability would
> corrupt our records.
