---
id: DOMAIN-0011
title: Vendors bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Vendors bounded context

## Purpose
Thin adapters over third-party commodity services: card payments (Stripe), login (Auth0), and
transactional email (SendGrid).

## Strategic classification
- Sub-domain type: **generic**
- Why: README.md: "All off-the-shelf." Code's own comment: "None of these carry any of our
  business rules... There is no model to build here."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| StripePaymentClient | Adapter that charges a card via Stripe. |
| Auth0IdentityClient | Adapter that resolves a user id from an Auth0 bearer token. |
| SendGridNotificationClient | Adapter that sends transactional email via SendGrid. |

## Inbound communication
None captured in the given source (no call site into any of the three adapters is shown).

## Outbound communication
None captured in the given source.

## Aggregates
None — bought/adapted commodity services, no domain model by design.

## Business rules (draft)
None captured yet — the code explicitly states there are none by design.

## Notes
Kept as one context matching the actual `RentField.Vendors` code module (assumption —
`QUESTIONS.md` Q6), rather than splitting Payments/Identity/Notifications into three, since none
carries enough of its own model to justify a separate bounded context today.
