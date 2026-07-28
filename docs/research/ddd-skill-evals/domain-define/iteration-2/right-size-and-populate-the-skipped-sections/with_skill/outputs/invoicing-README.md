# Invoicing bounded context (stub)

> *Canvas v5, `7-define`, 2026-07-28 — new file; `model.yaml` unchanged.*
> **Depth: stub — deliberately, against the loudest context on the map.** Invoicing is the biggest thing here (34 tables, 311 attributes, 5 aggregates) and `context-map.md` calls it `core` because it is "the largest and most business-critical system we run"; `business-model.md` rates it compliance-enforcer / commodity / differentiation **no** — *"nobody has ever chosen us because of our invoices"*. Size is not differentiation. A full canvas would spend the most modelling effort on the least differentiating capability; the mass is an argument for replacing it, not deepening it.
> `model.yaml` records three of five aggregates existing only for VAT variation across nine ports, two added when Finnish rules changed in 2024 — the churn profile of a commodity. Buying has not been investigated. **Provenance:** `4-connect` has not run.

## Purpose

Bill the customer correctly for what was shipped, and stay defensible to nine tax authorities. Actors: the finance analyst; the customer receiving the invoice.

## Boundary interface

| Direction | Collaborator | Message | Type | Source |
|---|---|---|---|---|
| in | Customs | `DeclarationCleared` | event | `customs/model.yaml`; timeline #9 |
| out | Notifications | `InvoiceIssued` | event | `model.yaml`; timeline #10, finance analyst |

## Business decisions (stated)

- An invoice line must reference a cleared declaration. — `model.yaml` invariant
- The premium is charged whether or not the container ends up full. — finance analyst, 2026-05-25 — **and no aggregate here models the premium**

## Assumptions
- *(inferred)* The four aggregates beyond `Invoice` are separate because VAT forced it, not because the domain has four consistency boundaries. No invariant is stated for any of them.

## Verification metric

- Share of `invoicing/` PRs driven by VAT or regulatory change rather than by our own product decisions, over 2 quarters (VCS + tracker labels, reviewed 2027-01-28). Above ~70% confirms commodity — 51% of the modelled mass is then sitting on a capability nobody chooses us for, and the argument is replacement, not modelling.

## Open questions

1. Core (`context-map.md`) or commodity (`business-model.md`)? It decides build vs buy on the largest codebase in the business. Owner: `5-strategize`.
2. Where is the +18% premium modelled — quoted, booked or invoiced? Nowhere on this map.
3. "Consignment" = billable line here, physical stack in Consolidation (hotspot #2). Healthy boundary or unresolved translation?
4. Do the five aggregates each have an invariant, or are four of them tables with a root attached?
