---
id: DOMAIN-0013
title: Notifications bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Notifications bounded context

## Purpose
Send transactional email (e.g. receipts) via SendGrid.

## Strategic classification
- Sub-domain type: **generic**
- Why: off-the-shelf commodity. Thin adapter over the SendGrid SDK, no domain model, swappable.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Receipt email | A transactional email delegated to SendGrid. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (caller) | SendReceipt(to, body) | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| SendGrid (external) | Send(to, subject, body) | command (conformist adapter) |

## Aggregates
- None — thin adapter, no business rules. Candidate to keep bought, not built.

## Business rules (draft)
None — no domain policy lives here.
