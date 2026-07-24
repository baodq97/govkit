---
id: DOMAIN-0007
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
Hold customer/sales accounts mirrored nightly from the third-party CRM, and record which sales
rep owns each account.

## Strategic classification
- Sub-domain type: **supporting**
- Why: needed to run the commercial relationship, not a differentiator; the account *model* is
  dictated by the CRM.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Sales account | A customer record (id, name, segment) owned by a sales rep. |
| Sales rep | The party who owns the commercial relationship on an account. |
| Segment | The CRM's segment code, mirrored verbatim. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Third-party CRM (external) | Nightly account export (`CrmAccountRow`) | import (conformist) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| (consumers look up accounts by id) | Find(accountId) | query |

## Aggregates
- **SalesAccount** — a customer account and the rep who owns it.

## Business rules (draft)
- The owning sales rep is the only person allowed to change terms on an account.
- Account records mirror the CRM's shapes (field names, segment codes, id format) verbatim.

> Relationship note: this is a **Conformist** relationship, not an ACL. "We take the CRM's record
> shape exactly as it arrives… we have no say over the CRM's model and do not reshape it." Contrast
> with **Fleet**, which applies an **ACL** to the legacy ERP. The rep-owns-account link is a real
> domain **ownership** relationship (owning party), so it is modeled — unlike audit metadata.
