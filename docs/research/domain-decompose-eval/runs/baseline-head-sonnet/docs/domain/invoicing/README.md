---
id: DOMAIN-0006
title: Invoicing bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Invoicing bounded context

## Purpose
Raise an invoice for a rental order, on an API that Rentals — its main consumer — drives.

## Strategic classification
- Sub-domain type: **supporting**
- Why: an in-house service, not bought/outsourced (so not generic), but not itself the
  differentiator either.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Invoice | A billing record raised for one order, one customer, one amount. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RentalOrderPlaced` | event |
| Rentals | `RaiseInvoice` | command |

## Outbound communication
None observed.

## Aggregates
- `Invoice` — inferred only from the `RaiseInvoice` call contract; the Invoicing team's own
  internal aggregate design is not visible from this codebase (only the Rentals-side port/client
  is — `InvoicingClient`/`IInvoicingPort`).

## Business rules (draft)
None captured yet.

## Notes
- Customer/Supplier pattern (per `ddd-methodology.md` §2.3): Rentals is the customer whose
  requirements shape Invoicing's API ("when rentals needs a new field on an invoice, billing adds
  it... the two teams agree the API between them" — README), even though Rentals is the one calling
  Invoicing's API at runtime. Direction of "upstream" here is by influence, not by call direction.
