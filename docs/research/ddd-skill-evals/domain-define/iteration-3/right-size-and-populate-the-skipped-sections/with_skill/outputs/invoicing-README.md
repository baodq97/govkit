<!-- id: DOMAIN-BC-0005 · status: draft · owner: TBD · 2026-07-28 -->

# Invoicing bounded context

Canvas tier: **stub**. `business-model.md` stages this as a compliance-enforcing **commodity** that
does not differentiate. It is also the repo's largest model (34 tables, 311 attributes, densest entity
128) — and mass is what a stub resists. Domain type is **contested**: `context-map.md` calls it core
because it is "the largest and most business-critical system we run", which is not the test.

## Purpose

Bill customers for shipments that have cleared customs, and collect. Actors: the finance analysts who issue and chase invoices, and the customers who pay.

## Sourcing — not bought, built over eleven years

Per `model.yaml` notes, three of the five aggregates model VAT variation across the nine ports and two
arrived with the 2024 Finnish tax change. Commodity capability, largest custom model: buy-vs-build.

## Interface (not traced — from `model.yaml` + discovery timeline)

| Direction | Collaborator | Message | Type |
|---|---|---|---|
| in | Customs | `DeclarationCleared` | event |
| out | Notifications | `InvoiceIssued` (invoiceId, customerId, total) | event |

## Business decisions

- **An invoice line must reference a cleared declaration** — from `model.yaml`; stated by nobody.
- **The premium is charged whether or not the container ends up full.** *Finance analyst, 2026-05-25.* No premium concept exists in this model.

## Open questions

1. Buy or keep building? Commodity stage, no differentiation, 34 tables of VAT variation.
2. "Consignment" is a billable line here and a physical stack in operations — hotspot #2, unresolved.
3. Where is the Guaranteed Consolidation premium billed, given nothing here represents it?
