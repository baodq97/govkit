---
id: DOMAIN-0008
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
Store files attached to rentals and accounts — signed agreements, delivery photos, inspection sheets.

## Strategic classification
- Sub-domain type: **supporting**
- Why: file storage is needed, not a differentiator. A light transaction script with one ownership
  rule, not an aggregate.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | A file attached to a rental or account. |
| Owner | The user who uploaded a document; only the owner (or an admin) may delete it. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (user) | upload / delete | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| — | — | — |

## Aggregates
- None — supporting. `Document` has an id (an entity), but a transaction script with one delete rule
  is the right shape.

## Business rules (draft)
- Only the owning uploader (or an admin) may delete a document (owner-based authorization — a real
  domain ownership relationship; the uploader is **not** audit metadata).
