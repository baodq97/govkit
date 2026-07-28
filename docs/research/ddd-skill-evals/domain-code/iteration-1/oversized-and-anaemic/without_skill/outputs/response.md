Designed the Invoicing aggregates. Short version: **5 aggregates should become 2**, and the reason it is painful to change is written down in your own model — you have been modelling tax variation as structure instead of as data.

## Artifacts

- `repo/docs/domain/invoicing/aggregate-design.md` — diagnosis, the two aggregates with behaviour, what stops being an aggregate, migration slices, decisions needed
- `repo/docs/domain/invoicing/model.target.yaml` — the to-be model in your existing per-context YAML shape

`model.yaml` is untouched on purpose: a refactor needs an as-is baseline to diff against.

## What the numbers say

Summing the seven `model.yaml` files, Invoicing is **34 of 76 tables (45%) and 311 of 608 attributes (51%)** — and produces **1 domain event and 1 invariant**. Booking gets 2 events out of 54 attributes. That gap is the finding: the data is here, the behaviour is somewhere else, in services and jobs that no boundary protects. The densest entity holds 128 attributes, 3.8x the next worst in the system.

Worse, the one invariant you state — *"an invoice line must reference a cleared declaration"* — belongs to Customs. Invoicing currently protects **zero** local invariants transactionally.

The cause is in your own notes: *"Three of the five aggregates exist to model VAT variations across the nine ports; two were added when the Finnish tax rules changed in 2024."* Nine ports encoded as columns is the likely source of the 128-attribute entity, and it is why one tax change cost two aggregates. Any design that does not fix this gets re-broken by the next rule change.

## The design rule

An aggregate exists to protect an invariant that must hold at the end of a single transaction. Everything else is an entity inside one, a value object, reference data, a read model, or a policy. Applied to Invoicing, eight candidate rules sort into **two** transactional boundaries.

**Invoice** (root) — holds `InvoiceLine` and `CreditNote`, with commands `openDraft / addLine / issue / credit / recordSettlement / void`. `issue()` is where the model gets its spine: it enforces immutability, the total, and the clearance check, then **freezes** the tax outcome onto each line as a `TaxTreatment` value object (vatCode, rate, basis, legalRef, ruleSetVersion). Credit notes live inside because their only rule is relative to the invoice balance and they are written a handful of times per invoice, never concurrently. Reversal trigger documented if standalone goodwill credits ever appear.

**Payment** (root) — one remittance received, holding `PaymentAllocation` entities. Separate from Invoice because your customers are small exporters who settle several invoices with one bank transfer; allocation inside Invoice would mean one transaction writing N invoices. Settlement is eventually consistent by design, and an over-allocation is an overpayment to handle, not an exception to throw.

**The other three stop being aggregates.** The VAT trio becomes `VatRuleSet` — versioned, effective-dated reference data read once at issue. `SurchargeSchedule` moves upstream to Tariff Data (two copies of a rate schedule drift, and the failure is customer-visible: invoiced price stops matching quoted price). `DunningCase` becomes a policy over overdue invoices — its state is fully derivable, and it appears in no interview in your discovery timeline. It earns aggregate status only if finance actually negotiates promises-to-pay, and then it is a separate Collections context, not an Invoicing aggregate.

Also fixed: Invoicing defines **Consignment** as "a billable line", while Booking and Consolidation use it for physical goods. That is hotspot #2, raised by your own finance analyst. Invoicing should drop the term — `InvoiceLine` for the billing line, `ShipmentRef` for the goods.

Target: 2 aggregates, ~8-10 tables (estimate), densest entity under 25 attributes, 7 events, 5 locally enforceable invariants. The metric that matters: **adding a port's VAT rule goes from "a new aggregate plus tables" to one row** — zero if you buy the tax engine.

## The uncomfortable part

Your two documents disagree about whether this refactor is worth doing at all.

`context-map.md` calls Invoicing `core` — "the largest and most business-critical system we run". `business-model.md` records the commercial director saying *"nobody has ever chosen us because of our invoices"*, and rates it compliance-enforcer / commodity / differentiation **no**. Meanwhile Consolidation — the capability your pricing page charges an 18% premium for, and the thing a new entrant could not copy — has 5 tables, 1 aggregate, and load planning still running partly on a whiteboard in Gothenburg.

Mass has followed the label, not the value. My recommendation is to reclassify Invoicing `supporting`, target a thin model, and **buy tax determination** — it is the highest-churn, lowest-differentiation part of the context, and vendors absorb rule changes as a subscription rather than a release. The trade-off table is in the doc. This is a doc-owner decision, so I proposed it in the target YAML rather than flipping anything.

Either way the aggregate boundaries are the same; only the tax box changes owner.

## Where to start

**Slice 1, one sprint, reversible in a day: freeze `TaxTreatment` on `invoice_line` at issue time and backfill from the existing VAT tables.** No behaviour change, but reads stop joining the three VAT aggregates, and it turns the tax engine into a swappable box — which makes the buy-vs-build call cheap to defer. Slices 2-6 are sequenced in the doc.

Stop rule: if slice 1 does not reduce read-path joins per invoice, the 128-attribute entity is not the VAT tables, my diagnosis is wrong, and you should re-measure before slice 2.

## Caveat worth reading

This repo contains `docs/domain/` and nothing else — no DDL, no migrations, no ORM models. The 34/311/128 figures and the claim that the 128-attribute entity is VAT-shaped come from prose in `model.yaml`, not from a schema. **Confirm which table actually holds those 128 columns before you start slice 1.** Three other gaps (no P&L owner, dunning unmentioned in interviews, the core/commodity conflict) are logged in section 6 of the design doc.
