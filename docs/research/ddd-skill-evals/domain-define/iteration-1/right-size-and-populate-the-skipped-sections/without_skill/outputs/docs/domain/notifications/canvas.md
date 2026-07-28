---
id: DOMAIN-BCC-0007
title: Bounded context canvas (stub) — Notifications
status: draft
owner: TBD
date: 2026-07-27
---

# Notifications — stub

**Treatment: stub, not a full canvas.** `notifications/model.yaml` records `aggregates: []`,
`tactical_pattern: bought-adapter`, and `aggregates_rationale: "Thin adapter over a bought
email/SMS provider; no domain model."` `context-map.md` classifies it `generic` — "commodity" —
and `business-model.md` agrees: commodity stage, no differentiation.

All three artifacts agree, and they agree it is bought. The open work here is provider selection
and delivery reliability, not modelling. A full canvas would produce a page of blanks.

## Purpose

Delivers shipment and invoice notifications to customers through a third-party email/SMS provider.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `generic` — "commodity" | `context-map.md` |
| business_role | engagement-creator | `business-model.md`, commercial director |
| evolution_stage | commodity | same |
| differentiation | no | same |

**No conflict.** The one wrinkle: `engagement-creator` sits oddly with a bought commodity adapter,
since engagement is normally something a business wants to shape. Nothing in the repo suggests
anyone intends to, and `business-model.md` scores differentiation `no`, so it is treated as bought.
Worth one question if customer communication ever becomes a product concern.

## Communication

Inbound:

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| `InvoiceIssued` | event | Invoicing | **Conformist** — a bought adapter takes what it is given | `notifications/model.yaml` → `{to: Invoicing, downstream}`; `context-map.md`; timeline #10 |

Outbound:

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| *send message* | **command** (external) | Email/SMS provider | Conformist — the provider's API is the contract | `notifications/model.yaml` `aggregates_rationale` |
| `CustomerNotified` | event | published — **no recorded consumer** | — | `notifications/model.yaml`; timeline #11, marked *candidate* |

`InvoiceIssued` is the only inbound edge recorded. The customer arguably cares more about
`BookingConfirmed`, `ContainerSealed`, `DeclarationCleared` and `ShipmentHandedToCarrier` than
about an invoice — none of which reach this context. Either notifications are genuinely
invoice-only, or the map is incomplete. See N-1.

## Business decisions

None recorded. No rule states which events notify whom, through which channel, or with what
timing.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| N-1 | Notifications are triggered only by `InvoiceIssued` | The only inbound edge in the repo, and the timeline places `CustomerNotified` last — but the notification *templates* exist and nobody checked what they cover | If shipment-progress notifications are expected, Notifications needs edges to four contexts and the map is wrong |
| N-2 | Contact details come from the provider or a customer record outside these seven contexts | `CustomerNotified` carries `customerId, templateId` only; no context in the repo owns customer contact data | A missing customer/CRM context |
| N-3 | Delivery is best-effort — no notification is contractually required | Nothing states an obligation. Note that customs and invoicing regimes sometimes do impose one | A compliance gap discovered late |
| N-4 | The bought provider covers every market the nine ports serve, in the required languages | Unexamined; nine ports across the Nordics implies several languages | Provider re-selection after build |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Delivery failure rate (bounces, undelivered SMS), weekly | Whether the bought provider is doing its one job | Provider dashboard / delivery webhooks — no in-house model needed |
| Customer support contacts asking "where is my shipment?", per 100 shipments | Assumption N-1 directly. If customers chase status the notifications never send, Notifications needs more inbound edges — this is the cheapest way to find out, and it can be measured before any code exists | Support ticket tags in the issue tracker |
| Code written in this context beyond the adapter (target: none) | The bought-adapter treatment. Domain logic appearing here means the classification was wrong | Code review, quarterly |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-8 | **When does `CustomerNotified` actually fire?** Timeline #11 is the only unconfirmed event in the system — "inferred from the notification templates, nobody confirmed when it fires". Nobody in the discovery session owned customer communication | The context's only inbound edge |
| N-1 | Should Notifications react to shipment-progress events as well as invoices? Reading the existing templates would answer this in an afternoon | Map correctness |
| N-2 | Which context owns customer contact details and language preference? | Provider integration |
| N-5 | Which provider, and does it cover all nine ports' markets and languages? This is the real decision in this context | Build start |
