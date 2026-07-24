---
id: DOMAIN-0010
title: Documents bounded context
risk: High
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
sheets — with a single owner per file.

## Strategic classification
- Sub-domain type: **generic** *(inclusion of this context at all is an assumption — see
  QUESTIONS.md Q7)*
- Why: commodity file-storage capability; the one real rule (owner-only delete) is an
  access-control detail, not a business differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | A stored file, linked to a rental or account by id, with exactly one owner. |
| Owner | The user who uploaded the document; only the owner (or an admin) may delete it. |

## Inbound communication
None observed as a direct call in code — see the inferred relationships below.

## Outbound communication
None observed.

## Aggregates
- `Document` — one stored file, owned by the uploading user.

## Business rules (draft)
- Only the document's owner (or an admin) may delete it.

## Notes
- This context is never mentioned in README's "What the platform does" list — it surfaces only
  from code (`src/Documents/`) and `config/teams.yaml` (`platform: owns: [..., documents, ...]`).
  Modeled here as its own context because it matches a real code module boundary and a real
  ownership row, not because the business narrative called it out. See QUESTIONS.md Q7.
- `LinkedEntityId` connects a Document to a Rentals order or an Accounts record by id only (no
  object reference) — correct per the "reference by id" aggregate rule, but no direct code
  dependency runs either direction, so those relationships are recorded as inferred, not confirmed.
