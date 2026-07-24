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
Take card payments via Stripe.

## Strategic classification
- Sub-domain type: **generic**
- Why: off-the-shelf commodity. "A thin adapter over a vendor SDK… no model to build here. If a
  better vendor came along we would swap the adapter and move on."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Charge | A card payment for a Money amount, delegated to Stripe. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (caller) | Charge(amount, token) | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Stripe (external) | CreateCharge | command (conformist adapter) |

## Aggregates
- None — this is a thin adapter with no business rules. Candidate to keep bought, not built.

## Business rules (draft)
None — no domain policy lives here.
