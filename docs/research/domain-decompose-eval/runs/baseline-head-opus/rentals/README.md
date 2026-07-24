---
id: DOMAIN-0003
title: Rentals bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Rentals bounded context

## Purpose
Turn a published quote and a committed reservation into a booked rental order, then hand it to
billing.

## Strategic classification
- Sub-domain type: **supporting**
- Why: orchestration between Pricing, Allocation and Invoicing — valuable glue, but not the
  differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Rental order | A customer tied to one or more committed units at an agreed price. |
| Agreed price | The last `PriceQuoted` amount received from Pricing. |
| Equipment | A unit reference (tag + category); source of truth is Catalog (see note). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` | event (published language) |
| Catalog | Equipment / category reference | query (conformist) |
| Fleet | Asset by tag | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Invoicing | `RaiseInvoice(orderId, customerId, amount)` | command (customer-supplier: Rentals is the customer) |
| Invoicing | `RentalOrderPlaced` | event |

## Aggregates
- **RentalOrder** — ties a customer to committed units at the agreed price and triggers billing.

## Business rules (draft)
None captured yet beyond "an order carries the agreed (last quoted) price." No stated invariant
on max units, order status transitions, etc. — not fabricating them; gaps flagged.

> Note: `RentalOrderService` keeps a private `Equipment` class with a `TODO` to share Catalog's
> `Equipment` directly. Recommendation: **Rentals conforms to Catalog** (Catalog = source of
> truth) rather than a mutual shared kernel. Both are in the Commerce squad, so the coupling is
> intra-team and lower-risk — but keep Catalog upstream. See Conflicts in `../context-map.md`.
