---
id: DOMAIN-0009
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
sheets — each owned by the user who uploaded it.

## Strategic classification
- Sub-domain type: **supporting**
- Why: a needed capability with a real ownership rule, but not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | An uploaded file linked to a rental or account. |
| Owner | The user who uploaded the document. |
| Linked entity | The rental/account the document is attached to (by id). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals, Accounts | Attach / reference a document by linked-entity id | command / reference |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| (none captured) | — | — |

## Aggregates
- **Document** — an uploaded file with its owner and linked entity.

## Business rules (draft)
- Only the document owner (or an admin) may delete a document.

> Provenance flag: Documents appears in the shipped code but **not** in the README capability
> list. Included as a supporting context on the strength of a clear stated ownership rule, and
> flagged (Q5) for confirmation that it is in scope. The owner-uploaded link is a real domain
> **ownership** relationship, so it is modeled (unlike audit metadata).
