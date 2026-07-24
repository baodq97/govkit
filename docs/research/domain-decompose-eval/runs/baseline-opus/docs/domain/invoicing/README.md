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
Raise invoices for placed rental orders through the internal invoicing service the Billing team runs.

## Strategic classification
- Sub-domain type: **supporting** *(supporting-vs-generic is a genuine question — see QUESTIONS.md Q2)*
- Why: an **internal**, **custom** service whose API shape is driven by Rentals — not a bought
  commodity, so supporting rather than generic.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Invoice | A billing document raised for a placed rental order. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RaiseInvoice` | command |
| Rentals | `RentalOrderPlaced` | event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| VendorIntegrations | card charge (Stripe) | command |

## Aggregates
- None — a thin internal service; no domain model owned here.

## Business rules (draft)
None captured yet. **Relationship note:** **Customer-Supplier** — Rentals is the customer that holds
the pen on the contract ("when Rentals needs a new field on an invoice, the invoicing team adds it…
they plan their work around our requests"); Billing supplies.
