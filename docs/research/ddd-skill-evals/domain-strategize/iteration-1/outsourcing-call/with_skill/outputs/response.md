Partly. Two of the three moves are directionally right and executed with the wrong instrument; the third — Quoting — is the wrong destination.

I plotted all seven contexts on a Core Domain Chart rather than just the two under discussion, because "where do the engineers go" can't be answered from the contexts you're leaving. Full assessment in `docs/domain/core-domain-chart.md`.

## The finding, in one sentence

Invoicing carries **34 tables, 311 attributes and 5 aggregates — 45% of the system's model mass** — for a capability your own commercial director describes as *"nobody has ever chosen us because of our invoices."* Consolidation, the capability you charge an **18% premium** for and the one your entire short-term goal is about (fill rate 71% → 80%), carries **5 tables, 41 attributes and 1 aggregate**, and its central planning decision still happens on a whiteboard in Gothenburg. Invoicing has 6.8× the tables and 7.6× the attributes of the thing you actually compete on.

## Scoring the three moves

| Move | Verdict | Why |
|---|---|---|
| Stop investing in Customs | Right quadrant, wrong instrument | `customs/model.yaml` says two commercial platforms already cover all nine ports and you integrate with neither. **Buy one.** Outsourcing pays a third party to keep hand-maintaining a system that should stop existing — it relocates the cost instead of removing it. |
| Stop investing in Invoicing | Right quadrant, wrong instrument *and* wrong sequence | It's the cost sink and it's still growing (2 aggregates added for the 2024 Finnish VAT rules). But outsourcing a cost sink freezes the 34 tables in place, walks 11 years of undocumented VAT behaviour out of the building, and turns your unresolved `consignment` naming conflict into a billable change request. Contain → characterize → buy. |
| Three engineers → Quoting | **Wrong** | Your own business model puts Quoting at `product` stage with differentiation *"partial — competitors quote in seconds too, we are no faster."* No company goal points at it. Send them to **Consolidation** instead. |

## Where the engineers should go

Consolidation is the only context on the chart that lands in the core quadrant, and the current model calls it `supporting` — *"back-office load planning"* — which describes where the work happens, not what it wins. It has:

- the only hard invariant in the system (a container's committed volume must never exceed capacity) — and it was **violated in production** in March, two shipments in one slot, with nobody agreeing where the check belongs
- the +18% Guaranteed Consolidation premium riding on it
- the planning know-how living in four senior planners' heads and on a whiteboard, not in software
- **one aggregate**

That combination — real operational complexity the software hasn't absorbed, sitting under the highest differentiation in the business — is where three engineers change the outcome. Quoting is parity work: do it as well as everyone else and no better.

## Two things that should worry you more than the outsourcing question

**Four of your seven contexts are labelled `core`** (Quoting, Booking, Customs, Invoicing) and the classification hasn't been revisited since March. When four contexts are core, differentiation was assumed rather than assessed — which is exactly how the premium-bearing capability ended up filed as back-office. I've proposed reclassification deltas for all seven; the important one is Consolidation `supporting` → `core`.

**Booking has no differentiation assessment at all.** It's absent from the capability table in `business-model.md` and labelled `core` on a March intuition. It's the context where the money is committed. I left its y-axis position `unknown` rather than guessing.

## Before the board can actually decide

- **Nobody owns the P&L.** `business-model.md` records cost structure as *unknown*. This is a cost-cutting proposal with no cost figure behind it — nobody can currently say whether outsourcing saves money or spends it.
- **No customer has been interviewed anywhere in this repo.** Every differentiation value, including Consolidation's, comes from the commercial director speaking on customers' behalf. Good enough to rank contexts against each other; not good enough to sign a multi-year vendor contract on.
- **Is Invoicing's complexity essential or accidental?** Five aggregates producing one event and one invariant, plus a 128-attribute entity, point at accidental — in which case buying just relocates the mess and simplification is the move. Nine-jurisdiction VAT points at essential — in which case buy. Opposite decisions; needs a schema review first.
- **The repo has no headcount or ownership data at all.** "Those three engineers" isn't verifiable from here, and nobody has identified who holds the 11-year VAT knowledge that walks out with the transition.

## If it proceeds

1. Resolve the `consignment` conflict first — finance means a billable line, operations means a physical stack of pallets, and it straddles the boundary you're about to sell.
2. Characterization tests over Invoicing's VAT behaviour *while the people who understand it are still here*.
3. Publish `ShipmentRef` as a contract — it's shared across Booking, Consolidation, Customs and Invoicing, and two of those four are about to sit on the far side of a vendor boundary.
4. Keep Customs' cross-context rule (no carrier hand-off before the declaration is submitted) in your own anti-corruption layer, not in a vendor's terms of service.
5. Move the engineers to Consolidation **first**, not last. The transition is exactly when whiteboard knowledge is most at risk.

The instinct to free up capacity is right. The destination is off by one context — and it's the one your current classification calls `supporting`, which is probably why it never came up.
