---
id: DOMAIN-STRAT-0002
title: Assessment — outsource Customs & Invoicing, redeploy three engineers to Quoting
status: draft
owner: TBD
date: 2026-07-27
mode: strategize
depends_on: DOMAIN-STRAT-0001
---

## The proposal under review

The board proposes two moves, presented as one:

1. Outsource the Customs and Invoicing systems to cut cost.
2. Move the three engineers freed up onto Quoting, to win more deals.

They should be judged separately, because the evidence points in opposite directions.

## Verdict

| # | Move | Verdict |
|---|---|---|
| 1 | Outsource Customs and Invoicing | **Right call, wrong sequencing.** Do Customs first and Invoicing second, not in parallel, with three preconditions below |
| 2 | Redeploy the engineers to Quoting | **Wrong destination.** Quoting is at explicit competitive parity. Send them to Consolidation |
| — | Timing assumption | **Wrong.** This is not a cost cut that frees people. It is an investment that consumes those three engineers first and releases them later |

The board has correctly identified where the company over-invests. It has misidentified where the
freed capacity should go, and it has the cash-flow timing backwards.

## Move 1 — outsourcing Customs and Invoicing

### Why the direction is right

| Signal | Customs | Invoicing |
|---|---|---|
| `business_role` | compliance-enforcer | compliance-enforcer |
| `evolution_stage` | product | commodity |
| Differentiation | no — *"required, and two vendors already do it well"* | no — *"nobody has ever chosen us because of our invoices"* |
| Domain mass | 12 tables / 96 attrs | 34 tables / 311 attrs |
| Share of system | 15.8% of tables | 44.7% of tables, 51.2% of attributes |
| Vendor market | *"Two commercial customs platforms cover all nine ports; we integrate with neither"* | Commercial billing/tax engines are a mature category |

Together the two contexts are **60.5% of the tables and 66.9% of the attributes** in the system, and
neither wins a single deal. That is the strongest fact in this assessment and it supports the board.

Two further arguments the board did not make, both in its favour:

- **Invoicing's size is accretion, not value.** `invoicing/model.yaml`: *"Grown over eleven years.
  Three of the five aggregates exist to model VAT variations across the nine ports; two were added
  when the Finnish tax rules changed in 2024."* Three-fifths of the largest system in the company
  exists to track other governments' tax rules. Absorbing regulatory churn on someone else's roadmap
  is precisely what this category of vendor is for.
- **It compounds with the expansion goal.** The medium-horizon goal is to open two more ports.
  Customs and Invoicing are the two contexts whose cost scales directly with port count — 12 tables
  covering 9 ports, and per-port VAT variation. Keeping them in-house means every new port is an
  engineering project. Outsourcing converts a per-port build cost into a per-port vendor cost. The
  case for outsourcing is *stronger* at 11 ports than at 9.

### Preconditions before signing anything

**1. Do not outsource the invariants along with the systems.**

Two rules cross these boundaries and must stay in-house:

- *"A shipment cannot be handed to a carrier before its declaration is submitted"* — enforced at the
  Routing hand-off, not inside Customs. A vendor files declarations; it cannot be trusted to gate
  your operational flow. Keep a thin in-house policy that holds the gate and treats the vendor as a
  filing service.
- *"An invoice line must reference a cleared declaration"* — this couples Invoicing to Customs
  directly. If the two go to *different* vendors, you must reconstruct that coupling across two
  external boundaries you no longer control. Either pick one vendor covering both, or keep a thin
  in-house ledger that owns the link.

Note also `timeline.md` hotspot 3: *"Nobody knows who is responsible when a partner carrier refuses
a sealed container."* Ownership is already unclear at these seams while both sides are in-house.
Adding a contract boundary to an unowned seam makes it harder to fix, not easier.

**2. Fix the language before writing the vendor spec.**

`timeline.md` hotspot 2: *"Finance and operations use 'consignment' differently — a billable line vs
a physical stack of pallets."* Both meanings are live in the models right now — `invoicing/model.yaml`
defines Consignment as *"a billable line on an invoice"*, `booking/model.yaml` as *"the goods a
customer hands over as one unit"*.

A vendor specification written on an ambiguous core term encodes the ambiguity into a contract. Today
the confusion costs argument in meetings; after signature it costs change requests. Resolve it first.
This is days of work, not months.

**3. Sequence Customs first, Invoicing second. Do not run them in parallel.**

Three reasons:

- **Customs is the clean one.** One aggregate, 12 tables, an identified vendor market covering all
  nine ports, zero differentiation. It is the low-risk proof that the outsourcing model works here.
- **Invoicing is the highest-risk migration in the system.** 34 tables, 311 attributes, a single
  entity with 128 attributes, five aggregates, eleven years of accretion. Nothing about that
  lift-and-shifts in a quarter.
- **The dependency runs the right way.** Invoicing is downstream of Customs (*"an invoice line must
  reference a cleared declaration"*). Doing Customs first forces you to define the declaration
  interface cleanly — which is exactly the interface the Invoicing migration will then consume.
  Reversing the order means defining it twice.

### What the board got wrong about timing

The proposal reads as: outsource → cost drops → three engineers become available → they go to
Quoting. In practice the order is inverted.

Migrating 46 tables and 407 attributes across two vendor boundaries, keeping two cross-context
invariants in-house, running parallel reconciliation on a billing system through at least one tax
period, and resolving a core-term ambiguity is not spare-time work. It will occupy those three
engineers for several quarters before it releases any of them.

There is no headcount, team roster, or ownership map anywhere in this repo — the only mention of
"three engineers" is as attendees of the two discovery sessions. So the premise that Customs and
Invoicing are staffed by exactly three people, and that those same three are the right people to run
a vendor migration, is unverified. Establish the ownership map before committing to the plan's
arithmetic.

Outsourcing here is a sound investment. It is not a cost cut that pays out this year.

## Move 2 — redeploying to Quoting

This is the part to push back on.

### Quoting is at parity, by our own assessment

`business-model.md` on Quoting: `evolution_stage: product`, differentiation **partial**, with the
qualifier spelled out — *"competitors quote in seconds too; we are no faster."*

Adding a third of your engineering capacity to a capability where you have explicitly assessed
yourself as level with the market buys parity, more expensively. `product` stage means it is
commoditising: the direction of travel is toward everyone having it, not toward advantage.

Quoting is also not starved. At 11 tables and 78 attributes it is the third-largest context in the
system, ahead of Booking and more than double Consolidation.

### "Win more deals" has no evidence behind it

Nothing in this repo shows deals are lost at the quoting step. There is no win/loss data, no
conversion measurement, no stated quoting bottleneck, and no customer input of any kind — every
customer-value row in `business-model.md` is marked `proxy`. Quoting's only recorded invariant is
that a quote cannot be accepted after its validity window, which is not the shape of a system under
strain.

Compare the two candidate destinations on evidence quality:

| | Quoting | Consolidation |
|---|---|---|
| Stated company goal | none | **fill rate 71% → 80%** (the only quantified goal in the repo) |
| Revenue attached | forwarding margin, same as every context | **+18% premium**, the only named premium |
| Differentiation | partial — *"we are no faster"* | **yes** — the reason the premium exists |
| Known operational failure | none recorded | **double-booked container slot, March** |
| Known key-person risk | none recorded | **four planners, one whiteboard** |
| Evidence for investing | *"win more deals"* — unmeasured | five independent sources, one quantified target |

One column has a number. The other has a hope.

### Where the three engineers should go

**Consolidation**, on three pieces of work, in this order:

1. **Close the capacity race.** Booking currently asks Consolidation for remaining capacity and then
   commands it to reserve — a check-then-act across a context boundary, while Consolidation owns the
   no-overbooking invariant. That is the March double-booking, and it is a live defect in the
   product customers pay 18% extra for. Move the reserve decision wholly inside Consolidation so the
   check and the commit happen under one owner. This is the smallest of the three and it directly
   protects premium revenue.
2. **Get the planning know-how out of the whiteboard.** *"Load planning still happens partly on a
   whiteboard in the Gothenburg depot; the four senior planners resolve conflicts by hand when the
   optimiser proposes an infeasible stack."* `business-model.md` names those planners as a **key
   resource** — meaning the company's stated key asset is undocumented, held by four people, and
   unable to be in two places at once. This is also the real constraint on opening two more ports:
   the depot network can be extended by contract, but four planners and a whiteboard cannot.
3. **Pursue the fill-rate goal.** 71% → 80% is the only quantified goal in the repo, it lives
   entirely in this context, and it is worth modelling what each point is actually worth — which
   requires someone to own the P&L (see gaps below).

The strategic summary: **the company's one differentiating capability holds 6.7% of its domain mass,
runs partly on a whiteboard, and has already failed once in a way that breaks a paid promise.** That
is where three engineers change the outcome. Quoting is where they hold station.

## Recommended plan

| Step | Action | Owner | Precondition |
|---|---|---|---|
| 0 | Resolve the "consignment" ambiguity across Finance and Operations | TBD | none — start now, days not months |
| 0 | Produce the missing ownership/headcount map | TBD | none |
| 1 | Redeploy engineering capacity to **Consolidation**, starting with the capacity race | TBD | none — independent of the outsourcing track |
| 2 | Outsource **Customs**; keep the hand-to-carrier gate in-house | TBD | step 0 complete; vendor port coverage checked against the two target ports |
| 3 | Outsource **Invoicing**; keep the invoice-line-to-declaration link in-house | TBD | step 2 stable through one full tax period |
| 4 | Fold **Routing** into Booking — 3 tables, 0 aggregates, no rules of its own | TBD | none; cheapest cost line on the list, and the board did not consider it |

Step 1 does not wait on steps 2–3. That is the main correction to the board's plan: the Consolidation
investment is the urgent item and it is being treated as the by-product of a migration that will take
a year to release anyone.

## Falsifiable conditions

Conditions under which this assessment is wrong, and the cheapest test for each.

| # | This assessment fails if… | Test |
|---|---|---|
| 1 | Deals are in fact lost at the quote stage — the "win more deals" claim has real data behind it | Win/loss analysis by pipeline stage, last four quarters. If quote-stage loss dominates, Move 2 gets stronger and this ranking should be re-run |
| 2 | A point of container fill is worth materially less than a marginal quote | Margin per shipment vs. fill rate. Blocked on the unowned P&L — which is itself the finding |
| 3 | Customers *do* choose Nordic Freight partly on invoicing (self-serve portals, billing accuracy in tenders) | Ask five customers directly. The entire invoicing case rests on one proxy sentence from the commercial director; no customer has been asked anything |
| 4 | No vendor covers the two target expansion ports | Check coverage before signing. Outsourcing customs while planning expansion makes the vendor's port map your expansion constraint |
| 5 | Consolidation's advantage is really the depot network, not the planning know-how — in which case the planners are replaceable and the whiteboard is not a risk | Ask whether a competitor with an equivalent depot network could match the fill rate. `business-model.md` claims a new entrant needs *both*; that claim is proxy and untested |

**Kill criterion.** If test 1 shows quote-stage loss is the dominant deal-loss reason *and* test 5
shows the planning know-how is not actually scarce, then the board's original proposal is correct as
stated and this assessment should be discarded.

## Evidence gaps carried forward

These block a fully quantified answer and none is expensive to close:

- **Nobody owns the P&L.** `business-model.md` records cost structure as *"Unknown — nobody in the
  room owns the P&L."* Every cost-versus-value judgement in this document is therefore directional.
- **No customer has been asked anything.** All differentiation inputs are the commercial director as
  `proxy`. Both of this assessment's load-bearing quotes — *"nobody has ever chosen us because of our
  invoices"* and *"a new entrant would need both the depot network and the planning know-how"* — are
  unverified proxy.
- **No ownership or headcount data exists** anywhere in the repo, so "those three engineers" cannot
  be mapped to the systems in question.
- **Booking's differentiation was never assessed** — it is missing from the capability table despite
  being labelled `core`.
- **`CustomerNotified` is unconfirmed** (`timeline.md`, event 11) — minor, but the notification path
  is downstream of Invoicing and would be touched by the migration.
