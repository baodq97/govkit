---
id: DOMAIN-BCC-0005
title: Bounded context canvas — Invoicing
status: draft
owner: TBD
date: 2026-07-27
---

# Invoicing

**Treatment:** full canvas — 34 tables and 5 aggregates get built or migrated whatever the
classification turns out to be, and the classification conflict here is the sharpest in the repo.

## Purpose

Turns cleared shipments into money owed: invoices, surcharges, credit notes, payment allocation and
dunning, across nine ports and their VAT regimes.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `core` — "the largest and most business-critical system we run" | `context-map.md`, March session |
| business_role | compliance-enforcer | `business-model.md`, commercial director 2026-05-18 |
| evolution_stage | **commodity** | same |
| differentiation | **no** — *"nobody has ever chosen us because of our invoices"* | same (`proxy`) |

**Conflict surfaced, not resolved.** The two artifacts make different kinds of claim and only one
of them is strategic:

- *Largest* is a measurement, and it is true: 34 tables, 311 attributes, a 128-attribute entity —
  more mass than the other six contexts combined.
- *Core* asserts the capability wins customers. `business-model.md` records the commercial
  director saying the opposite, in quotes, and scores it commodity with no differentiation.

`invoicing/model.yaml` explains the mass without needing strategy: *"grown over eleven years.
Three of the five aggregates exist to model VAT variations across the nine ports; two were added
when the Finnish tax rules changed in 2024."* That is regulatory surface accumulated by external
events — a cost that grew, not a moat that was built.

The inversion matters because Consolidation is the mirror image: `supporting`, 1 aggregate, 5
tables, and the only capability the business model marks differentiated, carrying the only premium
revenue stream and the only quantified goal. Read the two labels together and the company's
scarcest engineers are pointed at the commodity.

Why I am not re-labelling it: the contradicting evidence is a single interview, marked `proxy`
because no customer was present, and classification is a business decision (OQ-1). Two things are
worth putting to that conversation:

1. "Business-critical" and "core" are not synonyms. Payroll is business-critical. The test is
   whether a customer would choose us for it, and the answer on record is no.
2. If Invoicing is generic or supporting, the 34 tables become an argument for buying or
   consolidating, not for staffing. That is a much larger decision than a label.

## Inbound communication

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| `DeclarationCleared` | event | Customs | Invoicing downstream — Customer/Supplier | `invoicing/model.yaml` → `{to: Customs, downstream}`; timeline #9 |
| *payment received* | event (external) | Bank / payment provider | Not modelled | **Assumption I-3** — `PaymentAllocation` exists as an aggregate with no inbound edge to feed it |

`DeclarationCleared` carries `declarationId, clearedAt`. It carries no customer, no amount, no
shipment and no premium flag — yet Invoicing has to produce a priced invoice from it. Everything
else must come from somewhere the map does not show. See I-1.

## Outbound communication

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| `InvoiceIssued` | event | Notifications | Invoicing upstream; Notifications **Conformist** (bought adapter) | `invoicing/model.yaml` → `{to: Notifications, upstream}`; `context-map.md`; timeline #10 |

Five aggregates, one published event. Credit notes, dunning progression and payment allocation —
three of the five — emit nothing at all, so no other context can react to a customer going into
dunning or an invoice being credited. See I-5.

## Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| Consignment | **A billable line on an invoice** | `invoicing/model.yaml` |
| Surcharge | Any fee added to the forwarding rate | `invoicing/model.yaml` |

Booking defines Consignment as "the goods a customer hands over as one unit". Hotspot 2, raised by
the finance analyst: *"finance and operations use 'consignment' differently — a billable line vs a
physical stack of pallets."* Both definitions are correct in their own context. The boundary is
right; what is missing is the translation on the way in.

## Business decisions

| Rule | Source |
|---|---|
| An invoice line must reference a cleared declaration | `invoicing/model.yaml` `invariants` |
| The premium is charged whether or not the container ends up full | `discovery/timeline.md`, finance analyst |

Two rules for 34 tables. Nothing states VAT treatment per port (three aggregates exist for it),
when a surcharge applies (`SurchargeSchedule` exists), what triggers dunning or how it escalates
(`DunningCase` exists), when a credit note may be raised (`CreditNote` exists), payment terms, or
allocation order for partial payments (`PaymentAllocation` exists).

**Four of the five aggregates are governed by no recorded rule whatsoever.** That is the finding to
take to finance, and it is the reason this section is short rather than plausible: this is the
easiest context in the repo to fill with invented policy that a finance analyst would then have to
un-invent.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| I-1 | Invoicing can obtain price, customer and shipment detail from somewhere not shown on the context map | `DeclarationCleared` carries only `declarationId, clearedAt`; `Invoice` needs `customerId, currency` and lines need amounts | A hidden dependency — most likely a shared database — that the map does not admit to |
| I-2 | The premium reaches Invoicing somehow | The finance analyst's rule requires knowing the premium was sold; the premium is agreed at booking; there is no Booking → Invoicing edge | The rule cannot be implemented, or is implemented against a back channel |
| I-3 | Payments arrive from an external provider not modelled as a context | `PaymentAllocation` is an aggregate with no inbound edge | A missing integration on a 34-table model |
| I-4 | One invoice per customer per period, not per shipment | Not stated; `InvoiceLine` implies aggregation but nothing says over what | Aggregate root and the whole VAT model |
| I-5 | Credit notes, dunning and allocation genuinely need no outbound events | They emit none today | Other contexts cannot react to credit or non-payment |
| I-6 | The eleven-year history means this is a migration, not a build | `model.yaml` describes growth over eleven years; the README frames the repo as pre-code | Changes the decision from "how to model" to "what to keep" |
| I-7 | VAT variation is genuinely irreducible and not accidental duplication | Three aggregates for nine ports' VAT is asserted, never examined | If it is duplication, the mass argument for `core` weakens further |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Cycle time on issues labelled `vat` or `invoicing-regulatory` | Whether the 34 tables are a cost centre or an asset. If a rule change like Finland 2024 costs months, the mass is a liability and the `core` label is doing harm | Issue tracker, quarterly |
| Credit notes issued per 100 invoices, by cause | Invoice correctness — the only quality signal a commodity capability owes anyone | Invoicing database, once `CreditNote` records a cause; today it records none |
| Invoice lines rejected for referencing an uncleared declaration | The one stated invariant | Constraint-violation counter on the write path |
| Days sales outstanding, and dunning cases opened per month | Whether dunning is worth its aggregate | Finance reporting from `DunningCase` |
| Premium-bearing bookings invoiced with the premium, % | Rule 2 — this should be 100% and today cannot be measured at all | Join booking premium flag to invoice lines — **blocked** on OQ-6 / I-2 |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-1 | `core` or commodity? The two artifacts disagree, and the answer decides whether 34 tables get staffed, bought or shrunk | Investment across the whole system |
| OQ-6 | How does the premium reach Invoicing? No edge exists from Booking or Consolidation | An explicitly stated finance rule |
| I-1 | Where do price and customer come from? | The invoice aggregate |
| I-8 | What are the VAT rules per port? Three aggregates encode them; no rule is written down | The bulk of the model |
| I-9 | When does a surcharge apply, and who sets the schedule? | `SurchargeSchedule` |
| I-10 | What triggers dunning, and how does it escalate? | `DunningCase` |
| I-11 | When may a credit note be raised, and by whom? | `CreditNote` |
| I-12 | How are partial payments allocated? | `PaymentAllocation` |
| I-13 | Should `Consignment` be renamed in one of the two contexts, or translated at the boundary? Hotspot 2 | Shared language and the Customs → Invoicing edge |
