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
Compute the dynamic rental price for a window and enforce a fleet-utilization-derived floor a rep
may never discount below.

## Strategic classification
- Sub-domain type: **core** (assumption — see `QUESTIONS.md` Q1)
- Why: a real, actively-protected invariant (the discount floor) enforced against sales pressure,
  central to how RentField captures revenue as fleet demand shifts.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote | A dynamically computed price for a category, listRate, utilization, and requested discount. |
| Utilization | How busy the fleet is (0–1); the floor rises as utilization rises. |
| Floor | The minimum price a quote may settle at; at 100% utilization the floor equals the full list rate (no discount at all). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| *(caller not shown in given source)* | `Quote(category, listRate, utilization, requestedDiscount)` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (via the versioned `Pricing.Contracts` package, v1→v2) | event — **Published Language / Open Host Service**, the load-bearing extraction seam (see context-map.md) |

## Aggregates
- *(none — see notes)*. Pricing is a stateless domain service; the discount-floor invariant is
  enforced synchronously within one computation, not across a persisted consistency boundary.

## Business rules (draft)
- A quote can never fall below a floor derived from current fleet utilization: `floor = listRate ×
  (0.60 + 0.40 × utilization)`. At 100% utilization, the floor equals the full list rate — no
  discount is permitted at all, "no matter how badly [a rep] wants the deal."

## Aggregate design canvas note

Per aggregate-design-canvas.md's opening guidance ("first decide whether this context should have
aggregates at all"): `PricingEngine.Quote()` holds no state between calls and nothing here has an
id, a lifecycle, or is referenced by id from elsewhere — there is no consistency boundary to
protect across multiple writes, only a rule enforced within one stateless calculation. Recorded as
`aggregates: []` in `model.yaml`, with the `PriceQuote` value object and `PriceQuoted` event kept
there so the schema still has a home for what's actually emitted, per the schema note in that file.

## Notes
- An early draft (`docs/domain-notes-draft.md`) claimed "no minimum" on pricing. Shipped code and
  README.md both confirm a real floor exists — see context-map.md Conflicts.
- `SharedDomainRules.GlobalRules.MaxDiscountRate` (0.35) is never referenced by `PricingEngine`;
  the floor formula here is independent of it. See context-map.md Conflicts.
