---
id: DOMAIN-0011
title: Payments bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Payments bounded context

## Purpose
Take card payments.

## Strategic classification
- Sub-domain type: **generic**
- Why: a commodity — bought behind a thin adapter (Stripe). "If a better vendor came along we
  would swap the adapter and move on."

## Aggregates
- **None.** Generic bought capability; no domain model.

## Business rules (draft)
None — no business rules live in the adapter.

> Integrated behind `StripePaymentClient`. The charge-on-invoice link to Billing is implied by the
> narrative but not wired in the reviewed code — not asserted here as a flow.
