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
Turn a price quote and a committed unit into a booked rental order, then hand it to invoicing.

## Strategic classification
- Sub-domain type: **supporting** (assumption — see `QUESTIONS.md` Q2)
- Why: orchestrates Allocation + Pricing + Invoicing into an order; no invariant of its own is
  stated anywhere in the given source.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| RentalOrder | Ties a customer to a unit (by AssetTag) at the last-quoted price. |
| Place | The operation that raises an invoice and publishes that the order was placed. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` | event (updates the last-known quote used by `Place`) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Invoicing | `RaiseInvoice` (direct call) **and** `RentalOrderPlaced` (event, also consumed by Invoicing) | command + event — see the possible-duplicate-invoicing note in context-map.md |

## Aggregates
- **RentalOrder** — kept deliberately light (transaction script); no consistency rule is stated
  for it, modeled only so `RentalOrderPlaced` has a schema home (see notes).

## Business rules (draft)
None captured yet — no invariant for order placement is stated in the given source.

## Notes
- README.md describes Rentals as turning "a quote **and a reservation**" into an order, but
  `Rentals.csproj` has no project reference to `Allocation`, and `Place()` never calls a
  Reservation/commit operation. No Rentals→Allocation edge is modeled; see context-map.md
  Conflicts and `QUESTIONS.md` Q4.
- A TODO in the source proposes sharing Catalog's `Equipment` class directly with Rentals instead
  of maintaining a duplicate. Not yet built — not modeled as a live relationship. If built exactly
  as proposed, it would be Shared Kernel coupling; see context-map.md Conflicts for the
  recommendation (Published Language instead).
- `Place()` calls `_invoicing.RaiseInvoice(...)` directly *and* publishes `RentalOrderPlaced`,
  which `InvoicingClient.On` also turns into a `RaiseInvoice(...)` call — flagged as a possible
  double-invoice path in context-map.md, not resolved here (out of scope for a domain model, but
  worth a human's attention).
