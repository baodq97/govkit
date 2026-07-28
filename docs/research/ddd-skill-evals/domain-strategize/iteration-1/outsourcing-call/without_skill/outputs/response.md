# Is that the right call?

Outsourcing Customs and Invoicing holds up. Moving those three engineers to Quoting does not. The
timing assumption underneath both is also backwards.

## The board is right about where you over-invest

I counted the `mass:` figures across all seven contexts and set them against the differentiation
column in `business-model.md`:

| Context | Tables | % of attrs | Differentiates? |
|---|---|---|---|
| Invoicing | 34 | 51.2% | no |
| Customs | 12 | 15.8% | no |
| Quoting | 11 | 12.8% | partial |
| Booking | 9 | 8.9% | never assessed |
| **Consolidation** | **5** | **6.7%** | **yes** |
| Routing | 3 | 2.8% | no |
| Notifications | 2 | 1.8% | no |

Customs and Invoicing hold 60.5% of your tables and 66.9% of your attributes. Your commercial
director's own words on one of them: *"nobody has ever chosen us because of our invoices."* Two
thirds of the engineering surface sits in capabilities that win no business.

Two arguments for the board's case that nobody in the room made:

- **Invoicing is big from accretion, not value.** Three of its five aggregates model VAT variation
  across nine ports, and two arrived when Finland changed its tax rules in 2024. Three fifths of your
  largest system tracks other governments' paperwork. Let a vendor absorb that churn.
- **It compounds with opening two more ports.** Customs and Invoicing are the two contexts whose cost
  scales with port count. Keep them in-house and every new port becomes an engineering project. The
  case for outsourcing gets stronger at 11 ports, not weaker.

## Quoting is the wrong place to send anyone

`business-model.md` assesses Quoting as `evolution_stage: product`, differentiation *partial*, with
the reason spelled out: *"competitors quote in seconds too; we are no faster."*

You would spend a third of your engineering capacity to stay level with the market. Quoting is not
starved either, at 11 tables and 78 attributes it is your third-largest context, more than double
Consolidation.

And "win more deals" has nothing behind it in the repo. No win/loss data, no conversion measurement,
no stated quoting bottleneck, no customer input of any kind. Every customer-value row in
`business-model.md` carries a `proxy` marker because no customer sat in either session.

## Send them to Consolidation instead

Consolidation is the only capability your business model says differentiates, and the gap between
that and how you have staffed it is the real finding here:

- It **is** the value proposition: *"we fill containers better than anyone else in the Nordics."*
- It carries the only named premium in your revenue model, Guaranteed Consolidation at **+18% of the
  forwarding fee**.
- It owns the only quantified goal in the repo: container fill from **71% to 80%**.
- It runs partly on a whiteboard. Four senior planners resolve infeasible stacks by hand, and
  `business-model.md` names those same four people as a **key resource**. Your stated key asset is
  undocumented and held in four heads.
- Its promise has broken once already. Two shipments went to the same container slot in March, and
  nobody agrees where the check should have happened.

That last one is a live defect in the product customers pay 18% extra for. Booking asks Consolidation
for remaining capacity and then commands it to reserve, while Consolidation owns the no-overbooking
invariant. Check-then-act across a context boundary, so the race is structural.

Three engineers on Consolidation, in order: close the capacity race, get the planning rules out of
the whiteboard and into the model, then work the fill-rate goal. The second item is also what gates
your expansion. You can extend a depot network by contract; you cannot put four planners in eleven
ports.

## Your context map will tell you the opposite, and it is stale

`context-map.md` labels four of seven contexts `core`, including Customs and Invoicing, and files
Consolidation under `supporting` as "back-office load planning". Its own note says the table has not
been revisited since March.

Read the reasons it gives and each one substitutes a proxy for differentiation: Quoting is core
because it is "first thing the customer sees" (visibility), Customs because "mistakes are expensive"
(risk, which argues for buying from a specialist), Invoicing because it is "the largest system we run"
(circular). If the board uses that table, it will conclude that Customs and Invoicing are core and
must stay, and that Quoting is a fine place to invest. Both wrong.

I have written the corrected classification as a proposal in
`docs/domain/strategy/subdomain-classification-review.md` rather than editing the context map, since
that flip is a doc-owner decision.

## Three conditions before you sign anything

1. **Do not outsource the invariants with the systems.** *"A shipment cannot be handed to a carrier
   before its declaration is submitted"* gets enforced at the Routing hand-off, not inside Customs.
   And *"an invoice line must reference a cleared declaration"* couples Invoicing to Customs, so two
   different vendors means rebuilding that link across two boundaries you no longer control.
2. **Fix "consignment" first.** Finance means a billable line, operations means a physical stack of
   pallets, and both meanings are live in your models today. Today that ambiguity costs you arguments
   in meetings. Written into a vendor spec, it costs you change requests.
3. **Customs first, Invoicing second, never in parallel.** Customs is the clean one: 1 aggregate, 12
   tables, and two commercial platforms already cover all nine ports. Invoicing is 34 tables and 311
   attributes with a single 128-attribute entity, the riskiest migration you own. The dependency also
   runs the right way, so doing Customs first defines the declaration interface that the Invoicing
   migration then consumes.

## The timing is backwards

The proposal reads as: outsource, cost drops, three engineers come free, they go to Quoting. In
practice you pay first. Migrating 46 tables and 407 attributes across two vendor boundaries, holding
two invariants in-house, and reconciling a billing system through at least one tax period will
consume those three engineers for several quarters before it releases any of them.

Worth flagging: there is no headcount, roster, or ownership map anywhere in this repo. The only
mention of "three engineers" is as attendees of the two discovery sessions. Nothing shows that Customs
and Invoicing are staffed by those three, or that they are the right people to run a vendor migration.

So the Consolidation work should not wait on the outsourcing track. Start it now, in parallel, as its
own decision.

One more cost line the board skipped: Routing is 3 tables, 0 aggregates, and by its own model file
*"owns no rule of its own"*. Folding it into Booking is cheaper than outsourcing anything.

## What would change my answer

- **Win/loss data by pipeline stage.** If deals do die at the quote step, the board's second move gets
  stronger and I would re-rank. Nobody has measured this.
- **Margin per shipment against fill rate.** I cannot tell you what a point of fill is worth versus a
  marginal quote, because `business-model.md` records the cost structure as *"Unknown, nobody in the
  room owns the P&L."* Every cost judgement above is directional until someone owns that.
- **Five customer conversations.** The whole invoicing case rests on one proxy sentence from your
  commercial director. It is plausible, and it is still worth one afternoon of checking before a
  multi-quarter migration.
- **Vendor port coverage for the two target ports.** Outsource customs while planning expansion and
  the vendor's port map becomes your expansion constraint.

**Kill criterion:** if quote-stage loss turns out to dominate your deal losses *and* the planning
know-how turns out not to be scarce, the board's original proposal is right as stated and you should
throw this assessment out.

## Artifacts

- `docs/domain/strategy/subdomain-classification-review.md` — reconciles the context map against the
  business model, proposes `core` dropping from four contexts to one.
- `docs/domain/strategy/outsourcing-assessment.md` — the full assessment, sequencing plan, and
  falsifiable conditions.

Both are `status: draft`, `owner: TBD`. I did not touch `context-map.md` or any model file.
