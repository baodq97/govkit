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
Store files attached elsewhere in the platform — signed agreements, delivery photos, inspection
sheets — each with a clear owner.

## Strategic classification
- Sub-domain type: **supporting**
- Why: file storage plus a single authorization rule; not called out anywhere in README as a
  capability in its own right (it surfaced only from reading the code), and not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | An uploaded file, linked to some other entity by a generic `LinkedEntityId`. |
| Owner | The user who uploaded the document — only the owner (or an admin) may delete it. |

## Inbound communication
None coded in this slice. README describes files "attached to rentals and accounts," but no code
in `Rentals` or `Accounts` references `Documents` — this association is prose-only, not wired (see
QUESTIONS.md Q6).

## Outbound communication
None found in the given source.

## Aggregates
- **None, by design.** `Document` is a light transaction-script entity (upload, delete-if-owner) —
  a single-entity authorization rule, not a multi-entity consistency boundary.

## Business rules (draft)
- Only the document's owner (or an admin) may delete it.
