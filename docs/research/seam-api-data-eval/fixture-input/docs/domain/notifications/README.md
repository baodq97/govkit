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
Send transactional email (e.g. receipts).

## Strategic classification
- Sub-domain type: **generic**
- Why: a commodity — bought behind a thin adapter (SendGrid).

## Aggregates
- **None.** Generic bought capability; no domain model.

## Business rules (draft)
None.

> Integrated behind `SendGridNotificationClient`. The receipt-after-order trigger is implied by the
> narrative but not wired in the reviewed code — not asserted here as a flow.
