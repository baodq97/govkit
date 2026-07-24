---
id: DOMAIN-0007
title: Billing bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Billing bounded context

## Purpose
Raise and manage invoices for placed rental orders. (Model owned by the Billing team — not
modelled here.)

## Strategic classification
- Sub-domain type: **supporting**
- Why: an internal invoicing service another team runs; needed, not a differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Invoice | A billable record raised for a placed order. |
| RaiseInvoice | The command Rentals sends over `IInvoicingPort`. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RaiseInvoice` / `RentalOrderPlaced` | command / event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Payments | charge card (implied, not wired) | command |

## Aggregates
- **None here.** The invoice model lives in the Billing team's service; we hold only the
  `IInvoicingPort` contract.

## Business rules (draft)
Not ours to state — owned by the Billing team.

> **Customer-Supplier:** Rentals is the customer and drives the API ("when rentals needs a new
> field on an invoice, billing adds it… the two teams agree the API"). Billing is the accommodating
> supplier.
