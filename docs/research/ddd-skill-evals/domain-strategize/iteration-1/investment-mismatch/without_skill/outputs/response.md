# Nordic Freight — strategic read

Wrote the full analysis to `docs/domain/investment-strategy.md` (new doc; I left
`context-map.md` and the seven `model.yaml` files untouched — the reclassification is a proposal,
not an applied edit). Here is the read.

## The headline

Effort is allocated almost exactly opposite to where the business says the money is.

**71% of the modelled complexity sits in capabilities the commercial director says are not
differentiating. 7% sits in the one she says the premium is charged for.**

| Context | Labelled | Tables | % attrs | Differentiates? |
|---|---|---:|---:|---|
| Invoicing | `core` | 34 | 51% | **no** — *"nobody has ever chosen us because of our invoices"* |
| Customs | `core` | 12 | 16% | no — two vendors already do it well |
| Quoting | `core` | 11 | 13% | partial — *"we are no faster"* |
| Booking | `core` | 9 | 9% | not assessed |
| **Consolidation** | `supporting` | **5** | **7%** | **yes** — the +18% premium |
| Routing | `supporting` | 3 | 3% | no |
| Notifications | `generic` | 2 | 2% | no |

Invoicing carries **7.6× the modelled detail of Consolidation** and is the one capability
explicitly disclaimed as a reason anyone buys. Its own notes say why: eleven years of growth, and
3 of its 5 aggregates exist to model VAT variation across nine ports. That is regulatory surface
area, not advantage.

Also: four of seven contexts are labelled `core`. When most things are core, the label stops
sorting anything — which is why the current map cannot settle a roadmap argument.

## Why Consolidation is the core domain

Two revenue mechanisms, and both terminate in one context holding 7% of the model.

**Fill rate is margin.** The proposition is "full-container prices on part-load shipments". The
short-horizon goal is 71% → 80% fill. Nothing else in the map can move that number — Quoting
prices a lane, Booking records a commitment, Routing hands over a sealed box, Invoicing bills after
the fact. Fill is decided in load planning.

**The no-overbooking invariant *is* the premium.** Guaranteed Consolidation is +18% of the
forwarding fee, and finance confirms it is charged whether or not the container ends up full. So
customers are not paying for fill — they are paying for a promised departure slot. The only way to
break that promise is to bump a shipment, and the only rule preventing that is Consolidation's
invariant. It already failed once (the March double-booking), and afterwards nobody could agree
where the check should have happened. That is the diagnosis, not a mystery.

And it is the thinnest place operationally: planning still runs partly on a whiteboard in
Gothenburg, with four senior planners resolving infeasible stacks by hand. The canvas lists those
four people as a key resource. That is a key-person dependency sitting on top of the
differentiator — and it is what actually blocks opening two more ports, because planning know-how
in four heads does not deploy to ports 10 and 11.

## Proposed reallocation

Share of a year's engineering capacity:

| Context | Model today | FY effort | Play |
|---|---:|---:|---|
| Consolidation | 7% | **40–45%** | **Build.** Get planning out of the whiteboard; make the optimiser produce feasible stacks; instrument fill per departure |
| Booking (capacity seam) | 9% | **15%** | **Build, narrow.** Move the reserve decision behind Consolidation; split the shared kernel |
| Invoicing | 51% | **≤15%, falling** | **Cap.** Freeze features, strangle VAT/surcharges to a tax vendor. **No rewrite** |
| Customs | 16% | **10%** | **Buy.** Time-boxed spike to integrate one of the two commercial platforms |
| Quoting | 13% | **8%** | **Hold at parity.** Do not fund a lead in a capability we admit is at parity |
| Routing | 3% | **2%** | **Absorb** into Booking as a partner-network adapter — it owns no rule of its own |
| Notifications | 2% | 0–1% | Leave alone |

One sentence for the roadmap session: *stop paying to maintain a bespoke tax engine and a bespoke
customs engine, and spend it on the load planning we charge a premium for.*

Note the difference between capping and replacing. Invoicing is 34 tables with a 128-attribute
densest entity — a rewrite is the most expensive project on the table and buys zero
differentiation. Freeze it and outsource the tax variation; leave the rest.

## Two structural fixes worth doing regardless of budget

1. **Move the capacity commitment into Consolidation.** Booking currently checks remaining capacity
   and then commands a reserve, while the invariant lives in Consolidation. Check-then-act across a
   boundary is the shape that produced the March incident. One `ReserveCapacity` command that
   Consolidation accepts or rejects atomically. Small change, protects the premium directly.
2. **Break the `ConsignmentLine` shared kernel** (Booking and Consolidation both write it). A shared
   kernel running through the core domain means the differentiator cannot change shape without
   negotiating with order capture. While you are in there, fix "consignment" — finance means a
   billable line, operations mean a physical stack of pallets, and both meanings are already written
   into the models.

## Before you commit the whole year — three measurements

The recommendation is more confident than its evidence. Settle these in four weeks:

1. **What share of revenue is the premium?** The canvas gives the +18% rate, never the take-up. At
   2% of revenue Consolidation still deserves more than 7% of effort, but not 45%.
2. **What is a fill point worth in euros?** 71% → 80% cannot be ranked against anything until it has
   a number. Cost structure is listed as unknown — nobody in the room owns the P&L.
3. **Is Invoicing a drag, or just large?** Mass is not spend. Count what share of the last 12
   months' tickets touched Invoicing. 45% of mass *and* 45% of change traffic makes capping it the
   biggest single win available; 45% of mass and 5% of traffic means it is inert — leave it entirely
   alone and take the reallocation from Customs and Quoting instead. **This is the one measurement
   that can most change the plan.**

Two caveats on the inputs, both stated in the source docs. **No customer has ever been
interviewed** — every differentiation judgement traces to the commercial director as proxy, and the
load-bearing claim (customers pay for the departure-slot promise) is unverified. And the
classification has not been revisited since March; the mass figures, the labels, and the
differentiation column disagree with each other. I treated the business model as the tie-breaker,
because it is the only input tied to revenue.
