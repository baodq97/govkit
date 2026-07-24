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
Quote a rental price that moves with fleet demand, and never let it fall below a floor the fleet's
own utilization sets — publishing every quote on a stable contract for Rentals to consume.

## Strategic classification
- Sub-domain type: **core** (assumption — README never uses the word "core" for Pricing the way it
  does for Allocation; see QUESTIONS.md Q1)
- Why: a genuine differentiating rule (utilization-driven discount floor) plus deliberate
  investment in a versioned, stable integration contract — not a commodity capability.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Quote | A priced, category-scoped rental rate for one window, published once and consumed downstream — no identity of its own, never referenced by id. |
| Utilization | How busy the fleet is (0–1); the input that moves both the price and its floor. |
| Discount floor | The lowest a quote may fall regardless of requested discount; climbs with utilization, reaching the full list rate at 100% utilization. |
| Contract version | The version tag (`v1`, `v2`) on the published `PriceQuoted` shape — a breaking change ships as a new version; old ones stay live until every consumer migrates. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (caller) | `Quote(category, listRate, utilization, requestedDiscount)` | command |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | `PriceQuoted` (v2: category, amount, utilization, contractVersion) | event, published on a versioned Published Language contract — **the load-bearing extraction seam of this whole system, see context-map.md** |

## Aggregates
- **None.** `Quote`/`PriceQuoted` has no identity, is never persisted, and is never referenced by
  id — it is a value object produced by a stateless domain service (`PricingEngine`), not an
  aggregate. Forcing an aggregate root onto a concept the source never gives identity to would be
  inventing structure, not modelling it; the core invariant below is protected by the calculation
  itself, not by a consistency boundary. This is a deliberate right-sizing choice, not a gap — see
  `model.yaml` notes.

## Business rules (draft)
- **The floor**: a quote may never fall below `listRate × (0.60 + 0.40 × utilization)` — at 100%
  utilization the floor is the full list rate (no discount permitted at all). A rep cannot discount
  under it "no matter how badly they want the deal."
- This directly reverses an earlier whiteboard note ("no minimum... that's a sales decision, not a
  system rule"); running code is authoritative (see context-map.md Conflicts table).
