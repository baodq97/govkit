---
id: DOMAIN-0007
title: Accounts bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Accounts bounded context

## Purpose
Hold customer (sales) account records mirrored nightly from the external CRM, including which
sales rep owns the commercial relationship.

## Strategic classification
- Sub-domain type: **supporting**
- Why: carries business-meaningful reference data (rep ownership of an account) but originates no
  business rule of its own — every field is mirrored verbatim from the CRM's export shape.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Sales account | A customer account owned by one sales rep, mirrored from the CRM's `CrmAccountRow` shape exactly (id, owner rep, name, segment). |
| Owns (rep → account) | The sales rep is the only person allowed to change terms on the account — a real domain relationship, not audit metadata (per the code's own comment). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| CRM (external, nightly import) | `CrmAccountRow` batch | conformist data feed — code comment: "we have no say over the CRM's model and do not reshape it" |

## Outbound communication
None found in the given source.

## Aggregates
- **None, by design.** `SalesAccount` is plain CRUD over a conformist import — no invariant stated
  beyond mirroring the CRM's shape.

## Business rules (draft)
- The sales rep recorded as `SalesRepId` is the only party allowed to change terms on the account
  (stated in the code comment; not enforced anywhere in the given source — recorded as a stated
  rule, not asserted as implemented).

Note: `config/teams.yaml` refers to this capability as `crm-import`; no `CrmImport` module exists
in the code, so `Accounts` (the code's own name) is used as the canonical context name here — see
QUESTIONS.md Q3 and context-map.md Conflicts table.
