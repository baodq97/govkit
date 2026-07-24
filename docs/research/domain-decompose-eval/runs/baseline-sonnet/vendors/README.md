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
Thin adapters over commodity third-party services: card payments, login, and transactional email.

## Strategic classification
- Sub-domain type: **generic**
- Why: README explicit: "All off-the-shelf." Code comment: "None of these carry any of our
  business rules... If a better vendor came along we would swap the adapter and move on."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Payment charge | A card charge made through Stripe. |
| Identity resolution | Resolving a bearer token to a user id through Auth0. |
| Receipt notification | A transactional email sent through SendGrid. |

## Inbound communication
None coded in this slice (adapters are called by other contexts, not shown invoking each other in
the given source).

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Stripe (external) | `CreateCharge` | command, conformist to Stripe's SDK shape |
| Auth0 (external) | `Verify` | query, conformist to Auth0's SDK shape |
| SendGrid (external) | `Send` | command, conformist to SendGrid's SDK shape |

## Aggregates
- **None.** Bought/commodity adapters — no domain model, per this skill's classification rule for
  generic subdomains.

## Business rules (draft)
None captured yet — no invariant was stated for Vendors in the given sources; by design, there
should never be one here.
