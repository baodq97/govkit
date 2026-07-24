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
Produce a dynamic rental quote that moves with fleet demand and can never fall below a
utilization-derived floor, then publish it for Rentals to consume.

## Strategic classification
- Sub-domain type: **core** (flagged — see Q1 in `../QUESTIONS.md`)
- Why: proprietary demand-based pricing with a hard floor — the code calls it "the rule that
  makes this ours." README frames Allocation as *the* differentiator, so the core-vs-supporting
  call for Pricing is flagged for confirmation.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote | A price for a category + window, after discount and floor are applied. |
| List rate | The published base rate before demand adjustment. |
| Utilization | Share of the fleet already committed (0–1); drives the floor. |
| Floor | Minimum permitted price = `listRate × (0.60 + 0.40 × utilization)`; at 100% utilization the floor equals the full list rate. |
| Requested discount | A discount a rep asks for; honored only above the floor. |
| `PriceQuoted` | The stable, versioned published contract emitted for consumers. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (caller) | Quote(category, listRate, utilization, requestedDiscount) | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (v2: category, amount, utilization, contractVersion) | event / published language |

## Aggregates
- **Quote** — computes and publishes the demand-adjusted price under the floor invariant.

## Business rules (draft)
- A quote can never fall below the floor derived from fleet utilization; a rep may not discount
  under it no matter what discount they request. At 100% utilization the floor is the full list
  rate (no discount permitted at all).

> Note: the draft notes claimed "no minimum" discount. Shipped code and the current README both
> enforce a floor — the draft is stale (see Conflicts in `../context-map.md`). The unrelated
> `GlobalRules.MaxDiscountRate = 0.35` ceiling is **not** used by the pricing engine and is
> flagged as stale, not modeled here.
