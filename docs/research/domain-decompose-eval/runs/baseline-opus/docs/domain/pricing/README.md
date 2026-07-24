---
id: DOMAIN-0002
title: Pricing bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Pricing bounded context

## Purpose
Compute a dynamic rental price for a window that never falls below a floor derived from how heavily
the fleet is used, and publish it as a versioned contract for the rentals team.

## Strategic classification
- Sub-domain type: **core**
- Why: the utilization-derived price floor is "the rule that makes this ours" — a genuine
  competitive differentiator.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote / RentalQuote | A computed price for a rental window at a point-in-time fleet utilization. |
| Floor | The lowest price permitted, derived from utilization (`listRate × (0.60 + 0.40 × utilization)`); at 100% utilization it equals the full list rate (no discount at all). |
| Utilization | How heavily the fleet is already used (0..1); drives the floor. |
| Discount ceiling | The maximum discount a rep may apply (`MaxDiscountRate = 0.35`). |
| List rate | The base per-window rate for a category, before discount. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (sales rep) | `Quote` request (category, list rate, utilization, requested discount) | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (v2: category, amount, utilization, contractVersion) | event / published language |

## Aggregates
- **RentalQuote** — guards the "quote never below the utilization floor" invariant while producing a
  publishable price.

## Business rules (draft)
<!-- ONLY rules the code/README state. -->
- A quote can never fall below a floor derived from fleet utilization
  (`floor = listRate × (0.60 + 0.40 × utilization)`); at 100% utilization no discount is permitted.
- A rep may not apply more than the discount ceiling (`MaxDiscountRate = 0.35`; stated in
  `SharedDomainRules`, belongs here).
- Every money figure is rounded to 2 dp, away from zero (rounding rule in `SharedDomainRules`,
  belongs here).
- **Reconciliation:** the draft note "no minimum — a rep may give it away" is **stale and rejected**;
  the shipped floor and ceiling both apply (see context-map Conflicts, and QUESTIONS.md Q3).
