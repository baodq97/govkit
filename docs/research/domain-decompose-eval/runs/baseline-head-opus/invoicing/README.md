---
id: DOMAIN-0010
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
Raise invoices for placed rental orders via the company's internal invoicing service.

## Strategic classification
- Sub-domain type: **generic** (see Q6)
- Why: billing is a commodity capability; built in-house but could be outsourced. Not a
  differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Invoice | A billing request raised for a rental order (orderId, customerId, amount). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RaiseInvoice(orderId, customerId, amount)` | command |
| Rentals | `RentalOrderPlaced` | event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| (external billing API) | POST /invoices | command |

## Aggregates
- **Invoice** — a billing request for one rental order.

## Business rules (draft)
None captured.

> Relationship note: **Customer-Supplier**, with Rentals as the *customer* who drives the API —
> "when Rentals needs a new field on an invoice, the billing team adds it… they plan their work
> around our requests." The README frames it as "the two teams agree the API between them"
> (a partnership flavor); modeled as customer-supplier because Rentals holds the driving power.
> Run by a separate Billing squad.
