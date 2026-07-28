---
id: DOMAIN-BC-0007
title: Notifications bounded context — stub canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: stub
---

# Notifications bounded context (stub)

> Right-sizing: **stub** — bought capability. `notifications/model.yaml` is a `bought-adapter` with
> no aggregates; `business-model.md` rates shipment notifications engagement-creator, commodity, no
> differentiation. Purpose, what it is bought from, the adapter interface. That is the whole canvas
> and it is complete.
>
> Created by `domain-define` on 2026-07-27.

## Purpose

Tell the customer what has happened to their shipment.

Key actor: the exporter receiving the message.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | generic | `context-map.md`, agreeing with `model.yaml` |
| Business-model role | engagement creator | `business-model.md` |
| Evolution | commodity | `business-model.md` |

## Bought from

An email/SMS provider. **The provider is not named anywhere in the repo** — see open questions.

## Adapter interface

| Direction | Collaborator | Message | Type | Relationship |
|---|---|---|---|---|
| in | Invoicing | `InvoiceIssued` (invoiceId, customerId, total) | event | conformist |
| out | Email/SMS provider | send templated message | command | anti-corruption layer (**proposed**) — the adapter should keep the provider's API out of the rest of the system |
| out | — | `CustomerNotified` (customerId, templateId) | event | — |

## Business decisions

**None.** No participant stated a notification rule.

## Assumptions

1. **(domain, inferred)** Notifications are triggered by `InvoiceIssued` only. That is the sole
   inbound relationship in the model, which would mean a customer hears nothing when their booking
   is confirmed, sealed or cleared — implausible for an engagement-creating capability.
2. **(behaviour, inferred)** No delivery guarantee or retry policy is required. Nobody said.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Distinct events that trigger a notification | Whether the single inbound relationship in the model matches reality | production / the provider's send log |
| Provider send failures per month | Whether "fire and forget" is acceptable | provider dashboard |

## Open questions

1. Which provider is this, and what does the contract guarantee? Not recorded anywhere.
2. When does `CustomerNotified` actually fire? `discovery/timeline.md` #11 marks it a **candidate**
   event, *"inferred from the notification templates, nobody confirmed when it fires"* — the only
   unconfirmed event in the timeline sits in this context.
3. Do booking confirmation, sealing or customs clearance notify the customer? The model says no; the
   business model calls this an engagement creator.

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F18 | `CustomerNotified` is the timeline's only unconfirmed event; its trigger is unknown | `domain-discover` |
| F19 | Only `InvoiceIssued` reaches Notifications, which is unlikely for an engagement-creating capability | `domain-connect` |
