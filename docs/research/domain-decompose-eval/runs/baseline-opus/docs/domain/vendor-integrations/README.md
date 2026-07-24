---
id: DOMAIN-0011
title: VendorIntegrations bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# VendorIntegrations bounded context

## Purpose
Wrap the off-the-shelf commodity services — card payments, login, transactional email — behind thin
adapters.

## Strategic classification
- Sub-domain type: **generic**
- Why: "thin adapters over third-party commodity services… none carry any of our business rules…
  there is no model to build here." Swap the adapter if a better vendor comes along.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Payments (Stripe) | Card charges via Stripe; thin adapter, no rules. |
| Identity (Auth0) | Login / user identity via Auth0; thin adapter. |
| Notifications (SendGrid) | Transactional email (e.g. receipts) via SendGrid; thin adapter. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Invoicing | card charge | command |
| Rentals | receipt email | command |
| (all) | verify login | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| — (external vendor SDKs) | — | — |

## Aggregates
- None — bought behind thin adapters; no model.

## Business rules (draft)
None — commodity adapters. **Note:** grouped as one generic context because the code and config
treat Stripe / Auth0 / SendGrid as one set of thin adapters ("no model to build here"); whether to
split them into separate service boundaries is a genuine question (see QUESTIONS.md Q5).
