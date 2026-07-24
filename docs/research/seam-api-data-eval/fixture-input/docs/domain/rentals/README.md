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
Turn a quote and a reservation into a booked order, then hand it to billing.

## Strategic classification
- Sub-domain type: **supporting**
- Why: an orchestration step — it coordinates Pricing, Allocation, and Billing but owns no
  differentiating invariant of its own.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| RentalOrder | A customer tied to one or more committed units at an agreed price. |
| Place | Booking an order and raising its invoice. |
| Quote | The last `PriceQuoted` amount consumed from Pricing (Published Language). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` (v2) | event (Published Language) |
| Customer Accounts | customer lookup | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Billing | `RaiseInvoice` / `RentalOrderPlaced` | command / event |

## Aggregates
- **RentalOrder** — deliberately light (transaction script); exists mainly to carry the
  `RentalOrderPlaced` event.

## Business rules (draft)
None captured yet — the input states none. (Do **not** invent an "order needs a committed
reservation + a valid quote" rule; flagged as a question in `QUESTIONS.md`.)

> **Coupling flag:** Rentals carries a `TODO` to stop keeping its own `Equipment` class and share
> Catalog's `Equipment` entity directly. That would be Shared Kernel coupling — see context-map
> Sharing levels. Prefer duplicate or Published Language over sharing the entity.
