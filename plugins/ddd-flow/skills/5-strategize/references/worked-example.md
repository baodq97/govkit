# Worked example — 5-strategize

**Input:** the equipment-rental model — `Allocation`, `Logistics`, `Invoicing`, `Notifications` —
plus `business-model.md` showing rental fees and a paid *priority depot transfer* add-on.

**Measured (x):** Invoicing — 4 aggregates, 30 tables, 112 attributes on its densest entity.
Allocation — 1 aggregate, 6 tables, but one hard invariant (no overlapping commitment of a physical
unit) and a scheduling decision that today happens on a whiteboard (operational complexity, judged
adjustment: +).

**Sourced (y):** Allocation — high; the transfer add-on is the thing customers pay extra for and a
new entrant would need the same depot network to match it. Invoicing — low; every competitor
invoices, and nobody chose the product for it.

| Context | x | y | Quadrant |
|---|---|---|---|
| Allocation | 0.7 | 0.9 | Core |
| Invoicing | 0.75 | 0.2 | Cost sink |
| Notifications | 0.15 | 0.1 | Generic |

**Investment mismatch — the finding:** the richest model in the system sits in the least
differentiating context, and the capability customers pay extra for has one aggregate. Decision:
stop extending Invoicing's model, evaluate an off-the-shelf billing engine behind an anti-corruption
layer, and move the deepest modelling effort to Allocation.

**Disagreement with the current classification:** `docs/domain/invoicing/model.yaml` says
`subdomain_type: supporting`, but the chart places it as a cost sink at 0.75 complexity — proposed
delta: `generic`, with the migration note that its complexity is largely accidental.

**Trajectory:** Allocation stays core for ~18 months; the trigger is a competitor announcing
cross-depot transfer. When that lands, the next core is likely predictive utilisation — start
watching now.

Note what the example does **not** do: it does not call Allocation core because it is the most
interesting engineering problem, and it does not leave Invoicing labelled `supporting` just because
someone wrote that first. It also does not outsource Invoicing on the spot — it names the evaluation
and who has to make the call.
