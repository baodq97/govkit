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
Turn a price quote (and, per README, a reservation) into a booked order, then hand it to billing.

## Strategic classification
- Sub-domain type: **supporting**
- Why: orchestration/glue that turns other contexts' outputs into a billed order — necessary, but
  not itself named as the differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Rental order | Ties a customer to a committed unit at an agreed price; the unit of work Rentals owns. |
| Place | The command that creates an order, raises the invoice, and publishes `RentalOrderPlaced`. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` | event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Invoicing | `RaiseInvoice` | command |
| Invoicing | `RentalOrderPlaced` | event |

## Aggregates
- `RentalOrder` — ties one customer, one asset, and one agreed price into a single order.

## Business rules (draft)
None captured yet.

## Notes
- **Flagged gap:** README frames Rentals as turning "a quote **and a reservation**" into an order,
  but `RentalOrderService.Place()` takes a bare `assetTag` string — no call into Allocation, no
  subscription to `EquipmentAllocated`. See QUESTIONS.md Q3; not wired into this model as a
  confirmed relationship.
- Rentals may depend only on `Pricing.Contracts` (enforced by `Rentals.csproj`'s project
  references) — never on Pricing's internals. This is the clean side of the load-bearing
  extraction seam described in `context-map.md`.
- Customer/Supplier relationship with Invoicing: Rentals is the customer whose requests shape
  Invoicing's API, even though Rentals is the runtime caller.
