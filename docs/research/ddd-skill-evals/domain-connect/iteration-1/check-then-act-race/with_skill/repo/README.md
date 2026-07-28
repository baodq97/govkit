# Nordic Freight — eval fixture

A synthetic freight-forwarding repo used as shared input for the `domain-connect`,
`domain-strategize` and `domain-organise` skill evals. It is deliberately **not** the
equipment-rental domain used in the skills' worked examples, so a run cannot pass by recalling the
example.

Nordic Freight consolidates part-load shipments from many customers into full containers, moves
them through partner carriers, clears customs, and invoices.

## What is here

```
docs/domain/
  context-map.md          7 contexts, relationships, first-pass classification
  business-model.md       domain-understand output: revenue, differentiation, evolution
  discovery/timeline.md   domain-discover output: confirmed events + hotspots
  <context>/model.yaml    per-context tactical model with mass figures
```

## Traps planted (do not fix them in the fixture)

| # | Trap | Which skill it targets |
|---|---|---|
| 1 | `Booking` asks `Consolidation` for remaining capacity, then commands it to reserve — check-then-act across a boundary, with the no-overbooking invariant owned by `Consolidation` | domain-connect |
| 2 | `Routing` receives `BookingConfirmed` and forwards it to the partner network unchanged — a pass-through with no decision of its own | domain-connect |
| 3 | `Invoicing` is labelled `core` and carries the largest model in the system (5 aggregates, 34 tables); `Consolidation` — the capability the business charges a premium for — is labelled `supporting` with 1 aggregate | domain-strategize |
| 4 | Four of seven contexts are labelled `core` | domain-strategize |
| 5 | No headcount, team list, or ownership information exists anywhere in the repo | domain-organise |

The mass figures, the `subdomain_type` labels and the business-model differentiation column
disagree with each other on purpose. That disagreement is the finding.
