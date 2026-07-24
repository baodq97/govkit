---
id: DOMAIN-0007
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
Raise invoices against the internal billing service on behalf of Rentals.

## Strategic classification
- Sub-domain type: **supporting**
- Why: an internal, co-negotiated service (not off-the-shelf like Vendors' third-party
  integrations); the client/handler shown carries no invariant of its own.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| RaiseInvoice | Post an invoice request (order, customer, amount) to the internal billing API. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Rentals | `RaiseInvoice` (direct call) | command |
| Rentals | `RentalOrderPlaced` | event (also triggers `RaiseInvoice` — see possible-duplicate note in context-map.md) |

## Outbound communication
None captured in the given source (the internal billing service's own domain model is out of this
codebase's scope — only the client/port living in `Rentals`/`Invoicing` is shown).

## Aggregates
None — thin client plus one event handler; no invariant of its own.

## Business rules (draft)
None captured yet.

## Notes
README.md: "The Billing team runs an internal invoicing service. Rentals is its main customer —
when rentals needs a new field on an invoice, billing adds it. The two teams agree the API between
them." Modeled as `customer-supplier` (Rentals leads, Invoicing conforms), not `conformist` or
`open-host`, because the contract is described as mutually negotiated rather than one side simply
taking the other's shape as-is.
