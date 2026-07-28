---
id: DOMAIN-BC-0006
title: Invoicing bounded context — canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: light
---

# Invoicing bounded context

> Right-sizing: **light canvas**, deliberately. Invoicing carries the largest model in the system
> (34 tables, 311 attributes, 5 aggregates) and `context-map.md` labels it core — *"the largest and
> most business-critical system we run"*. `business-model.md` rates it compliance enforcer,
> commodity, differentiation **no**: *"nobody has ever chosen us because of our invoices."*
>
> Mass is not strategy. Sizing the canvas by table count is how a commodity capability ends up
> consuming the modelling budget of the differentiator. It gets purpose, interface, language, its one
> stated rule, and the assumptions / open questions that bear on other contexts.
>
> Created by `domain-define` on 2026-07-27.

## Purpose

Bill customers for shipments that have cleared, in the currency and tax regime of the port they
moved through, and chase what is unpaid.

Key actors: the finance analyst who issues and reconciles invoices; the customer who pays.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested**: `core` per `context-map.md`; `business-model.md` says no differentiation, commodity | both files |
| Business-model role | compliance enforcer | `business-model.md` |
| Evolution | commodity | `business-model.md` |

Carried, not re-derived. The disagreement is sharp enough to be the headline finding for
`domain-strategize`: the largest and most-invested model in the repo sits on the capability the
commercial director says nobody buys from us, while the capability they *do* pay a premium for holds
one aggregate and five tables.

## Domain roles

- **Execution** — it runs the invoice → dunning → payment workflow.
- **Gateway (partial)** — three of five aggregates exist to model VAT variation across nine ports
  (`model.yaml` notes), which is translation for external tax regimes rather than Nordic Freight's
  own business.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Customs | bounded context | `DeclarationCleared` (declarationId, clearedAt) | event | conformist (Invoicing is downstream) | `customs/model.yaml`; timeline #9 |
| Finance analyst | direct user interaction | issue invoice, raise credit note, allocate payment | command | — | finance analyst confirmed `InvoiceIssued`, timeline #10 |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Notifications | bounded context | `InvoiceIssued` (invoiceId, customerId, total) | event | published language (**proposed**); Invoicing is upstream | `model.yaml`; timeline #10 |

One inbound event, one outbound event, and everything else internal. For 34 tables, that is a very
small public interface — which is the strongest argument that most of this mass is Invoicing's own
business and not the rest of the system's.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Consignment | A billable line on an invoice | **Yes, and it matters** — Booking: the goods handed over as one unit; Consolidation: a physical stack of pallets. Hotspot #2 (finance analyst, 2026-05-25) is this exact clash |
| Surcharge | Any fee added to the forwarding rate | Not used elsewhere; the Guaranteed Consolidation premium is presumably one, but nobody said so |
| Cleared | Depended on from Customs — an invoice line must reference a cleared declaration | Owned by Customs |

The consignment clash is the justification for the boundary between Invoicing and the operational
contexts, and it should stay in the language table rather than being resolved by picking a winner.

## Business decisions

- **The premium is charged whether or not the container ends up full.** — *finance analyst,
  2026-05-25 (`discovery/timeline.md`)*.

That is the only attributed rule for this context. The `model.yaml` invariant *"an invoice line must
reference a cleared declaration"* has no stated source and appears under assumptions.

## Assumptions

1. **(inherited, unattributed)** An invoice line must reference a cleared declaration. Plausible, but
   it makes Customs a hard dependency of revenue collection and nobody stated it.
2. **(domain, inferred)** The Guaranteed Consolidation premium is billed as a surcharge here. The
   business model says the premium exists; no one said which context applies it. (Same gap as F13.)
3. **(domain, inferred)** VAT variation genuinely requires three aggregates. `model.yaml` says two of
   them arrived with the 2024 Finnish tax change; whether that is essential complexity or accumulated
   structure was not examined by anyone.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Aggregates or tables added per new port | Whether the VAT model scales to 11 ports or grows linearly per jurisdiction | VCS history against the port rollout |
| Share of total engineering change volume landing in `invoicing/` | Whether a commodity capability is consuming the budget of the differentiator | issue tracker / VCS |
| Invoices blocked waiting on a cleared declaration | Whether the unattributed invariant is costing cash flow | production |
| Change coupling with `customs/` | Whether the cleared-declaration dependency is really one unit of change | CI / VCS history |

## Open questions

1. Core or commodity? The context map and the business model disagree, and the answer decides where
   the next two engineers go.
2. Would a bought accounting/VAT package cover the nine ports, given the capability is rated
   commodity with no differentiation?
3. Which context applies the +18% premium? (F13.)
4. Does the invoice depend on the *cleared* declaration or merely the *submitted* one? The
   difference is days of cash flow.

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F15 | Largest model in the repo (34 tables) on the capability rated commodity / no differentiation, while the differentiator holds 5 tables | `domain-strategize` |
| F16 | "Consignment" means a billable line here and physical goods upstream — hotspot #2 is unresolved | `domain-decompose` |
| F13 | Ownership of the Guaranteed Consolidation premium is unassigned | `domain-discover` |
