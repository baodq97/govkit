---
id: DOMAIN-BCC-0004
title: Invoicing — bounded context canvas
status: draft
owner: TBD
date: 2026-07-28
---

# Invoicing bounded context

> Canvas v5, supporting depth — deliberately shorter than Consolidation despite being the biggest
> system here (34 tables, 311 attributes): depth follows classification, not mass. No flows traced.

## Purpose

Charge customers correctly for shipments that have cleared customs, in the tax regime of the port
they went through, and chase the money that does not arrive. Actors: finance analyst, exporters.

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested, not resolved here** — core per `context-map.md` ("the largest and most business-critical system we run") vs differentiation *no* per `business-model.md` ("nobody has ever chosen us because of our invoices") | both, cited |
| Business-model role | compliance enforcer | `business-model.md`, 2026-05-18 |
| Evolution | commodity | `business-model.md` |

The sources argue different things — size vs differentiation. A commodity carrying 311 attributes is the largest cost-to-value gap in this model.

## Domain roles

**Execution** (invoices, payment allocation, dunning) with a **compliance** overlay: three of five
aggregates exist only for VAT variation across nine ports (`model.yaml`). The tax half changes on legislative cadence, the dunning half on commercial cadence — two rhythms in one boundary.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customs | bounded context | `DeclarationCleared` | event | pattern **unstated**; Invoicing downstream (`context-map.md`) |
| Payment source | **unmodelled** | nothing traced, yet `PaymentAllocation` and `DunningCase` aggregates exist | — | — |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Notifications | bounded context | `InvoiceIssued` (invoiceId, customerId, total) | event | pattern **unstated** |

One inbound and one outbound event for five aggregates — either untraced, or most of this context
talks to a collaborator nobody has named.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Consignment | A billable line on an invoice | **Yes** — the goods handed over (Booking), a physical stack (Consolidation). Hotspot 2, finance analyst |

## Business decisions

- An invoice line must reference a cleared declaration — `model.yaml` invariant; **nobody is
  recorded as stating it** in discovery, so treat the attribution as missing.
- The Guaranteed Consolidation premium is charged whether or not the container ends up full —
  *finance analyst, 2026-05-25*.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Auditability | reproduce what was invoiced and under which tax rule | retention unknown — finance analyst | inferred from the VAT modelling | **yes if required** — rule versions become domain state with effective dates |

## Assumptions

- *(inferred)* Invoicing is per shipment, not per period — no consolidated monthly billing anywhere.
- *(inferred)* Old invoices keep the tax rule they were issued under — yet the 2024 Finnish change was absorbed by adding aggregates.
- *(inferred)* Payments arrive through a system outside this model and are matched here.
- *(inferred)* Credit notes fully reverse; partial reversal is unmodelled.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of changes here driven by tax-rule changes vs. product work, per quarter. Prediction: **> 60% tax** | if most change is legislative, this is a commodity to buy, not to keep hand-building | issue tracker |
| Engineer-days spent in this context per quarter, against forwarding margin | the cost of owning a capability nobody chooses us for | tracker + finance |
| Invoices amended or credited within 30 days of issue | whether "cleared declaration" is enough to invoice from | production |

## Open questions

- Buy or keep building? Commodity evolution, no differentiation, and the largest codebase we own.
- Who does Invoicing actually talk to for payments? Two aggregates have no traced collaborator.
- Which context owns the word "consignment"? Renaming here or in Booking is the cheapest fix for hotspot 2; nobody has decided.
- What is the invoice retention obligation across the nine tax regimes?
- Nobody owns the P&L (`business-model.md`), so no one can say what this context costs or earns.
