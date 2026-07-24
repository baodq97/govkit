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
Turn a customer, a committed unit, and a price quote into a booked rental order, then hand it to
billing.

## Strategic classification
- Sub-domain type: **core** (assumption — see QUESTIONS.md Q2)
- Why: `RentalOrder`'s `OrderId` is a real identity referenced elsewhere (e.g. the new
  `audit_log` table keys on it), so it has its own lifecycle even though the code shown here is
  mostly orchestration over Allocation/Pricing/Invoicing rather than a unique rule of its own.
  Flagged for confirmation rather than asserted.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Rental order | The booked transaction tying one customer to one committed unit at an agreed price. |
| Place | The command that creates a rental order, raises its invoice, and announces it happened. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` | event |
| (caller/UI) | `Place(customerId, assetTag)` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Invoicing | `RaiseInvoice(orderId, customerId, amount)` | command (synchronous) |
| Invoicing | `RentalOrderPlaced` | event — **see context-map.md: this appears to double-trigger `RaiseInvoice` alongside the direct call above; flagged, not silently resolved** |

## Aggregates
- `RentalOrder` — the transaction itself; ties `orderId` to a customer, an already-committed
  `assetTag`, and the last quoted `Money` amount.

## Business rules (draft)
None captured yet beyond what's implicit in the orchestration itself (no invariant was stated for
Rentals in the given sources). A known, separate piece of technical debt: a `TODO` in the code says
Rentals currently keeps its **own private `Equipment` class** duplicating `Catalog`'s, instead of
sharing Catalog's directly — not a business rule, but flagged in context-map.md as it borders on
domain duplication.
