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
Compute a rental quote whose price rises with fleet utilization and can never be discounted below
a utilization-derived floor.

## Strategic classification
- Sub-domain type: **supporting** *(assumption — genuinely ambiguous, see QUESTIONS.md Q1)*
- Why: README never calls Pricing a differentiator the way it does Allocation; it's framed as
  publishing a quote "for the rentals team to consume" — a service role. Flagged for confirmation,
  not asserted with confidence.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote | An ephemeral, computed price for a category + utilization; not a persisted entity. |
| Utilization | How heavily the fleet is currently used (0–1); drives the discount floor. |
| Floor | The minimum acceptable price at a given utilization; no discount may cross it. |

## Inbound communication
*(none observed — Pricing is only called synchronously with plain parameters, no inbound events)*

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (contract v2, via `Pricing.Contracts`) | event |

## Aggregates
- `Quote` — nominal grouping only; Quote is a **value object** (no persisted identity), not a true
  aggregate root. Included here only to satisfy the model.yaml schema shape.

## Business rules (draft)
- A quote can never fall below a floor derived from fleet utilization
  (`floor = 0.60 + 0.40 × utilization`, of list rate); at 100% utilization no discount is permitted
  at all.

## Notes
- **This context is already structured as the system's load-bearing extraction seam** — see
  `context-map.md`. `PriceQuoted` is published via a separately versioned project
  (`Pricing.Contracts`, v1→v2 changelog in code, explicitly labeled "STABLE INTEGRATION CONTRACT"),
  and `Rentals.csproj` is forbidden from referencing Pricing's internals.
- Draft whiteboard notes claimed "no minimum" discount; shipped code and README both confirm a
  hard floor exists. See `context-map.md`'s Conflicts table.
- `GlobalRules.MaxDiscountRate` (0.35) is documented platform-wide but never referenced by
  `PricingEngine` — flagged, unresolved, see QUESTIONS.md Q6.
