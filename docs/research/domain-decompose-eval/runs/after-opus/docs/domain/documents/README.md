---
id: DOMAIN-0010
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
sheets.

## Strategic classification
- Sub-domain type: **supporting**
- Why: file storage with one authorization rule; not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Document | An uploaded file linked to a rental or account. |
| Owner (uploader) | The user who uploaded a document and may delete it (`OwnerUserId`) — an ownership projection, not audit metadata. |
| LinkedEntityId | The rental or account the document is attached to. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (users) | `Upload` / `Delete` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| — | — | — |

## Aggregates
- **None.** Transaction script — CRUD plus one authorization check.

## Business rules (draft)
Captured from `DocumentService`, not invented:
- Only the document **owner (the uploader)** — or an admin — may delete a document.

> `OwnerUserId` is modelled as an ownership projection, not audit metadata. It, `SalesRepId`
> (Accounts), and `DepotId` (Allocation) are three different meanings of "owner" — see the declined
> Ownership candidate in context-map.
