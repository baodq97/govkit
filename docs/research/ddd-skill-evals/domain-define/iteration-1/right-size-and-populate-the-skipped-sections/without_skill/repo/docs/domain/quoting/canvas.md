---
id: DOMAIN-BCC-0003
title: Bounded context canvas — Quoting
status: draft
owner: TBD
date: 2026-07-27
---

# Quoting

**Treatment:** full canvas — owns a rule and an aggregate, and is the first thing a customer
touches.

## Purpose

Prices a lane and a volume for a customer and issues a quote that is binding for a stated window.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `core` — "first thing the customer sees" | `context-map.md`, March session |
| business_role | engagement-creator | `business-model.md`, commercial director |
| evolution_stage | product | same |
| differentiation | partial — "competitors quote in seconds too; we are no faster" | same (`proxy`) |

**Conflict carried forward (moderate).** "First thing the customer sees" is a claim about
sequence, not advantage. The business model scores Quoting at product stage with partial
differentiation and an explicit admission of parity on the one dimension named (speed). A
capability at parity, at product stage, is the usual definition of supporting. Whether the
remaining *partial* differentiation is real — and what it consists of, since speed is excluded —
is unanswered. Not re-labelled here; see OQ-1.

## Inbound communication

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| *request a quote* | **command** | Customer-facing channel (not modelled) | Unknown | **Assumption Q-1** — `QuoteRequested` is emitted by Quoting (timeline #1), so something triggers it; no artifact names the origin |
| *tariffs / rates for a lane* | **query** | Tariff Data (external) | **Conformist** — external feed, we take its model | `context-map.md` → `Quoting -->|downstream| TariffData`. Relationship pattern is my reading of "downstream to an external source"; the map does not name a pattern |

## Outbound communication

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| `QuoteRequested` | event | published (no consumer recorded) | — | `quoting/model.yaml`; timeline #1 |
| `QuoteIssued` | event | Booking | Quoting upstream, Booking downstream — Customer/Supplier | `quoting/model.yaml` → `{to: Booking, upstream}`; timeline #2 |

There is no edge from Quoting to Routing, yet both work in lanes: Quoting prices `laneId` and
Routing picks a carrier by "the standing contract for that lane". Neither owns Lane (OQ-5).

## Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| Quote | `quoteId, customerId, laneId, validUntil` | `quoting/model.yaml` |
| Lane | *undefined* | Used as `laneId` in `quoting/model.yaml`; defined nowhere in the repo |

Quoting has no `ubiquitous_language` block in its `model.yaml`. The vocabulary above is inferred
from attribute names, which is weaker evidence than a stated definition.

## Business decisions

| Rule | Source |
|---|---|
| A quote cannot be accepted after its validity window | `quoting/model.yaml` `invariants` |

One rule. Nothing states how price is computed, whether the +18% Guaranteed Consolidation premium
is quoted here or agreed later, whether quotes can be re-priced, or who may discount. Notably, the
context that *accepts* a quote is Booking, so the one rule Quoting owns is enforced somewhere else
(B-3 in the Booking canvas).

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| Q-1 | An unmodelled customer channel originates quote requests | Same gap as Booking A1 | A missing context |
| Q-2 | Tariff Data is read-only and external, and we conform to its model | The map shows the edge and marks the node external; no integration pattern is stated | If tariffs need local override, an anti-corruption layer is required and the aggregate grows |
| Q-3 | The premium is not priced in Quoting | `business-model.md` puts the premium in revenue streams with no context attached; `quoting/model.yaml` has no premium attribute | The quote does not match the invoice — a customer-visible defect |
| Q-4 | A quote is for one lane and one volume, single-shot | `QuoteRequested` carries `customerId, laneId, volumeM3`; multi-leg and multi-line quoting appear nowhere | Rework of the aggregate root |
| Q-5 | Quotes are not contractual capacity reservations | Nothing connects `QuoteIssued` to Consolidation | If quoting implies held space, the capacity invariant reaches back into Quoting |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Quote → booking conversion rate, by lane | Whether the "first thing the customer sees" is doing commercial work | Join `QuoteIssued` to `BookingRequested` on `quoteId` — requires `BookingRequested` to carry it; **today it does not** (`bookingId, departureId, volumeM3`) |
| Quote response time p95 | The parity claim — "competitors quote in seconds too". Also the only way to notice if we fall behind | APM span, quote request → `QuoteIssued` |
| Attempts to accept an expired quote, per week | Whether the validity-window rule needs enforcing at the Booking boundary too (B-3) | Counter on the rejection path, in whichever context enforces it |
| Share of quotes overridden or re-priced manually | Whether pricing rules are actually encoded or live with staff, as load planning does | Pricing audit log — must be built in; nothing captures it today |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-1 | Does `core` stand for a capability at parity and product stage? | Investment |
| OQ-5 | Which context owns Lane and its tariff/carrier contracts? | Both Quoting and Routing |
| Q-6 | Is the Guaranteed Consolidation premium quoted, or agreed at booking? | OQ-6 and Invoicing |
| Q-7 | How is a price computed, and who may discount? Not one pricing rule is recorded anywhere | The aggregate's reason to exist |
| Q-8 | What sets `validUntil`? | The one invariant depends on a value nothing explains |
| B-3 | Quoting owns the validity rule; Booking performs the acceptance. Where is it enforced? | Rule ownership |
