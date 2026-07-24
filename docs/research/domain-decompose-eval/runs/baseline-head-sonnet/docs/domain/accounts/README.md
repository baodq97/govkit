---
id: DOMAIN-0008
title: Accounts bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Accounts bounded context

## Purpose
Mirror customer/sales-account records from the third-party CRM, exactly as the CRM exports them.

## Strategic classification
- Sub-domain type: **generic**
- Why: README, verbatim — "we take its record shapes exactly as they arrive; we have no leverage
  to change them."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Sales account | A customer/prospect/partner account, owned by exactly one sales rep. |
| Sales rep (owner) | The rep who owns the commercial relationship and is the only one allowed to change its terms. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| CRM (external) | nightly account export | conformist import — field names, segment codes, and id format taken verbatim |

## Outbound communication
None observed.

## Aggregates
- `SalesAccount` — one customer/prospect/partner account, owned by one sales rep.

## Business rules (draft)
- The sales rep on an account (`SalesRepId`) is the only person allowed to change that account's
  terms.

## Notes
- This is a **Conformist** relationship with the CRM, not an anti-corruption layer: the code
  comment is explicit that field names, segment codes, and id format are mirrored verbatim, with no
  translation. Contrast with ErpSync, which *does* translate.
- `config/teams.yaml` labels this ownership `crm-import` (distinct from an `accounts` label that
  doesn't otherwise appear); this model treats CrmImport and Accounts as the same context, matching
  the single `RentField.Accounts` code module. See QUESTIONS.md Q5 if that should split.
