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
Turn a quote and a reservation into a booked rental order that ties a customer to committed units at
an agreed price, then hand it to billing.

## Strategic classification
- Sub-domain type: **core** *(lightest of the three cores — see QUESTIONS.md Q1)*
- Why: owns the central `RentalOrder` aggregate and the commercial transaction lifecycle. The
  differentiating rules themselves live in Allocation and Pricing; Rentals is the order spine that
  coordinates them.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| RentalOrder | Ties a customer to one or more committed units at an agreed (quoted) price. |
| Customer | The renting account (from Accounts) billed for the order; an account counted as renter / prospect / partner-account. |
| Agreed price | The last `PriceQuoted` amount consumed from Pricing when the order is placed. |
| Active rental | An in-force rental order (definition currently in `SharedDomainRules`; belongs here). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| Pricing | `PriceQuoted` | event (published language) |
| Allocation | reservation reference | query |
| Accounts | customer identity | query |
| Catalog | category / asset reference | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Invoicing | `RaiseInvoice` (drives the contract) | command |
| Invoicing / others | `RentalOrderPlaced` | event |

## Aggregates
- **RentalOrder** — the placed order: customer + committed unit + agreed price + status.

## Business rules (draft)
<!-- ONLY rules the code/README state. -->
- A rental order is placed at the last quoted price consumed from the Pricing published language
  (`On(PriceQuoted)` handler).
- Rentals **drives** the invoicing contract — it is effectively Invoicing's only caller, and Billing
  builds the fields Rentals asks for (Customer-Supplier).
- No hard invariant beyond the above is stated in the input — not fabricating one. *(Tech-debt noted:
  Rentals keeps a duplicate `Equipment` class with a TODO to share Catalog's — see QUESTIONS.md Q6.)*
