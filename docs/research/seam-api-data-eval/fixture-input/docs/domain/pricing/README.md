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
Quote a dynamic rental price that moves with fleet utilization — and can never fall below a
utilization-derived floor.

## Strategic classification
- Sub-domain type: **core**
- Why: "The rule that makes this ours" — a floor a rep cannot discount under, derived from how
  heavily the fleet is already used. A protected, differentiating invariant.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote | A priced offer for a category and window; published as `PriceQuoted`. |
| Utilization | How heavily the fleet is already used (`0..1`); drives the floor. |
| Floor | The lowest price permitted: `listRate × (0.60 + 0.40 × utilization)`. |
| List Rate | The category's undiscounted rate (a `Money` Building Block). |
| Requested Discount | What a rep asks for; honoured only down to the floor. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (rep / caller) | `Quote(category, listRate, utilization, requestedDiscount)` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (v2) | event — **Published Language / OHS** |

## Aggregates
- **Quote** — protects the "never below the floor" invariant (currently a stateless calculation;
  see note).

## Business rules (draft)
Captured from `PricingEngine.Quote`, not invented:
- A quote may **never** fall below a utilization-derived floor.
- The floor **climbs with utilization**; at 100% utilization the floor equals the full list rate
  (no discount permitted at all).
- (Overrides the stale draft's "no minimum" note **and** the flat `GlobalRules.MaxDiscountRate =
  0.35` — see context-map Conflicts.)

> **Open entity-vs-value-object question** (see `QUESTIONS.md`): today a `Quote` is a transient
> value published on the versioned contract — there is no persisted `Quote` entity. Whether a
> Quote should become an entity (identity + lifecycle, referenced by the `RentalOrder`) is unstated.
