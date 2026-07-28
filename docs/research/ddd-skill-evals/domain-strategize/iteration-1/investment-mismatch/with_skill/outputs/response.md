Plotted all seven contexts on a Core Domain Chart and reconciled it against the `subdomain_type`
labels. Written to `docs/domain/core-domain-chart.md` (status: draft, owner: TBD).

## The finding

**Invoicing carries 45% of the tables, 51% of the attributes and 56% of the aggregates in the
system. Consolidation carries 7%, 7% and 11%.**

Your commercial director's words on Invoicing: *"nobody has ever chosen us because of our
invoices."* Consolidation is the Guaranteed Consolidation premium — +18% of the forwarding fee, on
your published pricing page, and the thing your value proposition is written around.

So: 6.8× the tables, 7.6× the attributes and 5× the aggregates sit in the context nobody buys,
versus the one they pay extra for.

Sharper version of the same number: **Invoicing has 311 attributes and one invariant. Consolidation
has 41 attributes and the one invariant your paid promise depends on.** Mass has been accumulating
where the rules are not.

And it has already cost you. Hotspot #1 in the discovery timeline — two shipments committed to the
same container slot in March, nobody agreeing where the check belonged — is a failure of the
no-overbooking invariant. That invariant *is* the Guaranteed Consolidation promise. Your thinnest
model guards your only premium, and it broke in production once already.

## Where the effort should go

| Context | Chart | Move |
|---|---|---|
| **Consolidation** | Core | **Build, invest more.** Best modellers, long-lived stream-aligned team. The specific work: absorb the whiteboard. Load planning still runs partly by hand in Gothenburg with four senior planners resolving infeasible stacks — that is real complexity your software has not taken on yet, and it is exactly where the 71% → 80% fill goal lives |
| **Invoicing** | Cost sink | **Freeze and contain.** Stop extending the model, put an ACL around it, run a procurement spike on a billing engine. Do **not** refactor it beautiful — that is the most expensive available mistake here |
| **Customs** | Cost sink → generic | **Buy.** Your own `customs/model.yaml` records that two commercial platforms cover all nine ports and you integrate with neither, at a cost of 12 tables and 96 attributes. Before buying, name the one requirement neither vendor meets. If nobody can say it in a sentence, there isn't one |
| **Quoting** | Generic | **Keep thin.** The business model already says you are no faster than competitors. Parity is the goal, and parity is reached |
| **Routing / Notifications** | Generic | Correct as-is. Routing owns no rule; the partner network is the asset, not the routing step |
| **Booking** | **Unassessed** | Hold. See below |

## Your classification is arguing from the wrong axis

Four of seven contexts are labelled `core`, and the label table has not been revisited since March.
Read its own *Why* column:

- Quoting — *"first thing the customer sees"* → visibility
- Booking — *"where the money is committed"* → criticality
- Customs — *"regulated, and mistakes are expensive"* → criticality
- Invoicing — *"the largest and most business-critical system we run"* → **size** and criticality

Not one is justified by differentiation. Every one is justified by how critical, visible or big it
is. Meanwhile the only capability your business model marks `differentiation: yes` is labelled
`supporting`.

Customs and Invoicing are not unimportant — mistakes there really are expensive, and their
reliability bar stays high. They are important and **not worth differentiating on**, which is a
different instruction to a team than "core". Buy the capability, hold the vendor to an SLA.

Proposed deltas: Consolidation `supporting` → `core`; Invoicing, Customs, Quoting off `core`;
Routing `supporting` → `generic`. Four core labels become one. I have not edited any `model.yaml` —
those go to `domain-decompose` to merge, since it owns the ids and the tactical right-sizing.

## Two things I could not answer

**Booking has no capability row in `business-model.md` at all.** Its differentiation is not low, it
is unassessed, and it carries the highest integration load in the system plus a Shared Kernel with
Consolidation. I left it off the chart rather than guessing. Don't downgrade it on missing evidence.

**Every differentiation value is second-hand.** No customer took part in the 2026-05-18 session; the
commercial director spoke for them, and the source marks those rows `proxy`. The pricing-page
premium is the only y evidence in this chart that is an artifact rather than an opinion.

## What would make this read wrong

**The attach rate of the Guaranteed Consolidation premium.** The whole argument rests on that
premium being commercially material. If it attaches to 3% of shipments, Consolidation is an
interesting engineering problem attached to a rounding error and the chart needs redrawing. Nobody
in the modelling sessions owned the P&L, so nobody could answer it — and you cannot price the
Invoicing buy-vs-build case for the same reason.

Before the roadmap meeting, get three numbers: premium attach rate, Invoicing's annual run cost, and
five customer interviews on what they actually buy. The interviews are the cheapest evidence
available anywhere on this chart, and they either harden the Consolidation call or collapse it.

## Trajectory

Consolidation stays core roughly 18–24 months. The trigger to watch is a vendor productising
multi-depot load planning — the `custom-built` → `product` slide is what ends this advantage. Second
trigger: a competitor announcing guaranteed departure slots. Third and quieter: hitting the 80% fill
target, after which the marginal advantage flattens and the next core is probably premium pricing or
the two-port expansion, not fill optimisation.

For Invoicing, treat the next tax-rule change as the forcing event for the buy decision. The 2024
Finnish change added two aggregates to a context that earns nothing; the next one will do the same.
