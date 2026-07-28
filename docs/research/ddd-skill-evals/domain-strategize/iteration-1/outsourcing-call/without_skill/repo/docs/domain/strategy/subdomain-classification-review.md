---
id: DOMAIN-STRAT-0001
title: Nordic Freight — subdomain classification review
status: draft
owner: TBD
date: 2026-07-27
mode: strategize
supersedes: DOMAIN-0000 § Sub-domain classification (proposal only — not yet applied)
---

## Why this document exists

`context-map.md` classifies four of seven contexts as `core`. `business-model.md` finds exactly one
capability that differentiates. Both cannot be right. This document reconciles them against the
revenue model, the domain mass, and the stated goals, and proposes a corrected classification.

The context map's own note says its table "has not been revisited since the first modelling session
in March." The reconciliation below is the revisit.

This is a proposal. It does not edit `context-map.md`; the classification there stands until a
doc owner accepts this review.

## The contradiction

| Context | `context-map.md` label | `context-map.md` stated reason | `business-model.md` differentiation |
|---|---|---|---|
| Quoting | core | "first thing the customer sees" | partial — *"competitors quote in seconds too; we are no faster"* |
| Booking | core | "where the money is committed" | **not assessed — absent from the capability table** |
| Customs | core | "regulated, and mistakes are expensive" | no — *"required, and two vendors already do it well"* |
| Invoicing | core | "the largest and most business-critical system we run" | no — *"nobody has ever chosen us because of our invoices"* |
| Consolidation | **supporting** | "back-office load planning" | **yes** — *"the premium customers pay for"* |
| Routing | supporting | "hands shipments to carriers" | no — *"the partner network is the asset, not the routing step"* |
| Notifications | generic | "commodity" | no |

Every `core` label in the context map rests on a proxy for importance rather than on
differentiation:

- **Visibility** (Quoting: "first thing the customer sees") — being seen first is not the same as
  being chosen for.
- **Money flow** (Booking: "where the money is committed") — every business has a step where money
  is committed; it is rarely the step that wins the deal.
- **Risk** (Customs: "mistakes are expensive") — expensive-if-wrong argues for reliability, and
  reliability is exactly what a specialist vendor sells. High risk is an argument to buy, not to build.
- **Size** (Invoicing: "the largest system we run") — this is circular. Invoicing is the largest
  system because it has absorbed eleven years of accretion, not because it earns the most.

And the one capability with a price premium attached to it is filed under "back-office".

## Domain mass vs. differentiation

Mass figures are taken from the `mass:` block of each `<context>/model.yaml`.

| Context | Tables | % of tables | Attributes | % of attrs | Aggregates | Differentiates? |
|---|---|---|---|---|---|---|
| Invoicing | 34 | 44.7% | 311 | 51.2% | 5 | no |
| Customs | 12 | 15.8% | 96 | 15.8% | 1 | no |
| Quoting | 11 | 14.5% | 78 | 12.8% | 1 | partial |
| Booking | 9 | 11.8% | 54 | 8.9% | 1 | not assessed |
| **Consolidation** | **5** | **6.6%** | **41** | **6.7%** | **1** | **yes** |
| Routing | 3 | 3.9% | 17 | 2.8% | 0 | no |
| Notifications | 2 | 2.6% | 11 | 1.8% | 0 | no |
| **Total** | **76** | | **608** | | **9** | |

Three readings of the same table:

1. **Customs and Invoicing together hold 60.5% of the tables and 66.9% of the attributes** of the
   whole system. By the company's own account, no customer has ever chosen Nordic Freight for
   either one. Two-thirds of the engineering surface is invested in capabilities that do not win
   business.
2. **Consolidation holds 6.7% of the attributes.** It is the sole differentiator, it carries the
   only named price premium in the revenue model (+18%), and it owns the short-horizon company goal
   (fill rate 71% → 80%). It is the second-smallest modelled context in the system.
3. **Invoicing has 7.6× the attributes of Consolidation.** Its single densest entity (128
   attributes) is 3.1× the size of the entire Consolidation context (41 attributes).

Investment follows the org chart's sense of importance, not the business model's.

## Evidence for Consolidation as the core domain

| Claim | Evidence | Source |
|---|---|---|
| It *is* the value proposition | *"Full-container prices on part-load shipments — we fill containers better than anyone else in the Nordics"* | business-model.md, commercial director |
| It carries the only premium | Guaranteed Consolidation, **+18% of forwarding fee**, charged whether or not the container ends up full | business-model.md (pricing page); timeline.md (finance analyst) |
| It is hard to copy | *"a new entrant would need both the depot network and the planning know-how"* | business-model.md |
| It owns the short-horizon goal | Raise average container fill from **71% to 80%** — the only quantified goal in the repo | business-model.md |
| It is genuinely custom | `evolution_stage: custom-built` — the only capability so marked | business-model.md |
| It is under-built | 5 tables, 1 aggregate; *"load planning still happens partly on a whiteboard in the Gothenburg depot; the four senior planners resolve conflicts by hand when the optimiser proposes an infeasible stack"* | consolidation/model.yaml |
| Its promise is already breaking | *"Two shipments were committed to the same container slot in March; nobody agrees where the check should have happened"* | timeline.md, hotspot 1 |

The last two rows are the ones to sit with. The capability the business charges a premium for runs
on a whiteboard and four people's memory, and it has already failed at least once in a way that
breaks the premium's promise to a customer.

`business-model.md` also names those same four planners under **Key resources**. The company's
stated key resource is undocumented know-how held by four individuals. That is the single largest
concentration of key-person risk in the business, and no context in the repo is charged with
reducing it.

## Proposed classification

| Context | Current | **Proposed** | Basis |
|---|---|---|---|
| Consolidation | supporting | **core** | Sole differentiator; carries the +18% premium and the 71%→80% goal; custom-built; not replicable without the depot network and planning know-how |
| Booking | core | **supporting** | Transactional shell around Consolidation's invariant. Commits money but does not win it. Keep in-house — it holds the capacity race — but it is not where advantage lives |
| Quoting | core | **supporting** | Explicit parity: *"we are no faster"*. `evolution_stage: product` — commoditising. Engagement-creator, not revenue-generator |
| Customs | core | **generic** | Zero differentiation, compliance-enforcer, `product` stage, and *"two commercial customs platforms cover all nine ports"* |
| Invoicing | core | **generic** | Zero differentiation, compliance-enforcer, `commodity` stage. Its size reflects accreted VAT variation, not business value |
| Routing | supporting | **generic** | *"It owns no rule of its own"* — `transaction-script`, 0 aggregates, pass-through of `BookingConfirmed` |
| Notifications | generic | generic | Correct as-is; `bought-adapter` over a bought provider |

Net effect: `core` goes from four contexts to one, and the one is the context currently labelled
"back-office".

## Consequences

1. **Buy or outsource the generic contexts.** Customs and Invoicing are the two largest systems in
   the repo and neither differentiates. See `outsourcing-assessment.md`.
2. **Invest in Consolidation.** Get the planning rules out of the whiteboard and the four planners'
   heads and into the model; close the capacity race; pursue the fill-rate goal.
3. **Routing is a folding candidate.** Three tables, no aggregates, no rules of its own. It is a
   cost line the board's proposal did not consider. Absorbing it into Booking is cheaper than
   outsourcing anything.
4. **Booking's differentiation was never assessed.** It is labelled `core` and is the fourth-largest
   context, yet it does not appear in `business-model.md`'s capability table at all. Close this gap
   before any decision that depends on Booking's status.

## Open questions

- **Cost structure per shipment is unknown** — `business-model.md` records *"nobody in the room owns
  the P&L"*. Without it, no one can rank a point of fill rate against a marginal quote, and every
  cost argument below is directional rather than quantified.
- **No customer has been asked anything.** Every differentiation judgement above traces to the
  commercial director speaking as `proxy` for customers. The most load-bearing single sentence in
  this review — *"nobody has ever chosen us because of our invoices"* — is unverified proxy.
- **Booking's differentiation** — unassessed, see above.
