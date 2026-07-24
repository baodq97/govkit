---
id: DOMAIN-0008
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
RentField's client/port to the billing team's own internal invoicing service — raise an invoice
for a placed rental order.

## Strategic classification
- Sub-domain type: **supporting**
- Why: a necessary billing integration to a bespoke sibling-team service; not RentField's
  differentiator. The invoicing service's own domain model belongs to the billing team and is out
  of scope here — only the RentField-side client/port is modelled.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Raise invoice | Ask the billing team's invoicing service to bill a customer for an order. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RaiseInvoice(orderId, customerId, amount)` | command (synchronous, direct call) |
| Rentals | `RentalOrderPlaced` | event — handled by also calling `RaiseInvoice` (see the double-trigger flag below) |

## Outbound communication
None modelled — the actual invoicing service lives with the billing team, out of scope.

## Aggregates
- **None here.** Whatever aggregate (e.g. `Invoice`) exists lives inside the billing team's own
  invoicing service; this context only holds RentField's port/adapter to it.

## Business rules (draft)
- README states the relationship directly: "Rentals is its main customer — when rentals needs a
  new field on an invoice, billing adds it. The two teams agree the API between them." This is a
  **customer-supplier** relationship: Rentals (the customer/downstream caller) holds the pen on the
  contract (`IInvoicingPort` is defined in the `Rentals` namespace); Invoicing (the supplier)
  implements and plans around it.
- **Flag:** as read, `RaiseInvoice` appears to be triggered twice per order — once via the direct
  synchronous call from `RentalOrderService.Place()`, and again via the `RentalOrderPlaced` event
  handler in this module. See context-map.md and QUESTIONS.md Q5.
