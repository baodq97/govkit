---
id: DOMAIN-0009
title: Documents bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Documents bounded context

## Purpose
Store files attached to rentals and accounts — signed agreements, delivery photos, inspection
sheets — and control who may delete them.

## Strategic classification
- Sub-domain type: **generic** (assumption — see `QUESTIONS.md` Q3)
- Why: a file-attachment capability serving multiple other contexts by a generic linked-entity id;
  `config/teams.yaml` groups it under `platform` alongside other generic/commodity concerns
  (erp-sync, crm-import, maintenance).

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | An uploaded file: id, file name, uploader (owner), and the entity it's linked to. |
| Owner | The user who uploaded the document — the only one (besides an admin) who may delete it. |

## Inbound communication
None captured in the given source (README.md states documents "attach to" rentals and accounts,
but no call site from `Rentals` or `Accounts` into `DocumentService` is shown — see the dotted
edges in context-map.md).

## Outbound communication
None captured in the given source.

## Aggregates
None — CRUD over Document records; see notes.

## Business rules (draft)
- Only the document's owner (the uploader) or an admin may delete it.

## Notes
Per ddd-methodology.md §2.6, "owner" here is treated as a per-context authorization projection
(this context's own `OwnerUserId`), not evidence of a richer shared Ownership model — see the
declined "Ownership" candidate in context-map.md. `QUESTIONS.md` Q3 records the judgment call
between modeling Documents as its own light context (chosen here) versus folding it as a
capability into Rentals/Accounts.
