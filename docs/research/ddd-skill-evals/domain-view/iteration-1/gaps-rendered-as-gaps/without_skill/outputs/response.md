# Domain model, on a screen

Open this in a browser and put it on the big display. No server, no network, no build step:

```
docs/domain/view/domain-view.html
```

Everything is inlined, so it works from `file://` and it works offline in the standup room.

## What you're looking at

One scrolling page in five bands:

1. **Five headline numbers** — the state of the model in one glance.
2. **The seven contexts** — one card each: classification, mass, aggregates, rules, events, language, and the holes.
3. **The event flow** — 11 events, each tagged with the named person who confirmed it, plus a panel listing the events that don't exist.
4. **Where the docs disagree** — 5 conflicts, each with its source files.
5. **Seven things standup can close** — ordered by what unblocks the most.

The design rule: **a blank in the docs is drawn as a blank, not smoothed over.** Four visual states, in the legend at the top:

- solid teal = stated and confirmed by a named person
- dashed amber = written down, nobody confirmed it
- solid red = two docs disagree
- dotted + hatched = nobody in the room knew
- solid grey = deliberately empty, a recorded modelling decision

That last one matters. Routing and Notifications have no aggregates, and that is *not* a gap — both `model.yaml` files record why (transaction script; bought adapter). They render as a calm grey box. Customs having no ubiquitous language at all renders as a hatched hole. Same emptiness on the page, opposite meaning, and the view keeps them apart.

## The numbers you'll want in the room

| | |
|---|---|
| Attributes in the real systems | **608** across 7 contexts |
| Attributes actually modelled | **29** — 4.8% |
| Invoicing's share of the total | **51%** of attributes, 45% of tables |
| Effort vs differentiation | **7.6x** — Invoicing 311 attributes, Consolidation 41 |
| Docs with an owner | **0 of 10** — every one is `status: draft`, `owner: TBD` |
| Failure-path events | **0 of 11** — everything modelled is happy path |

## The five conflicts

**C1 — the core/supporting map contradicts the business model (high).** Consolidation is the only capability the business model marks differentiating and revenue-generating — "a new entrant would need both the depot network and the planning know-how" — and the context map files it as *supporting*. Invoicing and Customs are both filed *core* while the business model rates them commodity and product with no differentiation ("nobody has ever chosen us because of our invoices"). Sub-domain type is what decides where your good engineers go. Right now it points them at the invoice system.

**C2 — nobody owns the capacity invariant (high).** "A container's committed volume must never exceed its capacity" lives in Consolidation's `ContainerLoad`. Booking enforces its own version by reading remaining capacity synchronously and then reserving. Read-then-act across an aggregate boundary has no serialisation — which is exactly the March incident, two shipments in the same slot, hotspot #1, "nobody agrees where the check should have happened". The model already contains the bug.

**C3 — "Consignment" means two different things (high).** Booking: the goods a customer hands over as one unit. Invoicing: a billable line on an invoice. Finance and operations have been talking past each other (hotspot #2), and both definitions are written into the model as if settled.

**C4 — the Shared Kernel has already diverged (medium).** `ConsignmentLine` is declared a Shared Kernel written by both Booking and Consolidation. Booking models `lineId, volumeM3, weightKg, hazardClass`. Consolidation models `lineId, volumeM3, stackable`. Two writers, two shapes, no contract.

**C5 — modelling effort is inverted against differentiation (medium).** Invoicing: 34 tables, 311 attributes, densest entity **128 attributes** — that isn't an entity, that's a table with a class around it. Four of its five aggregates are a name and nothing else; `CreditNote`, `DunningCase` and `PaymentAllocation` emit no events at all. Meanwhile the capability the premium is charged for still runs on a whiteboard in the Gothenburg depot.

## What the model is silent about

Rendered as its own band, because an empty cell in a modelling doc is a finding:

- No customer took part in either session — every "what customers value" row is the commercial director speaking for them, marked `proxy`.
- Cost structure per shipment: nobody in the room owns the P&L. Long-horizon goal: blank.
- Guaranteed Consolidation (+18%, promises a departure slot) is a revenue stream with **no aggregate, no invariant, no event**.
- The 71% → 80% fill goal has nothing in the model representing the optimiser, the stacking rules or the fill target.
- Hotspot #3 — who's responsible when a partner carrier refuses a sealed container — has no owner, no event, no aggregate.
- Tariff Data has an arrow on the context map and nothing else. No model, no owner, no classification.
- The classification table "has not been revisited since the first modelling session in March".

## Seven things standup can actually close

1. Re-classify Consolidation as core, Invoicing and Customs as supporting/generic — or write down why the map is right and the business model is wrong. *(closes C1, one meeting)*
2. Name the single place the capacity invariant is enforced. One context, one transaction. *(closes C2 and the March incident)*
3. Rename one of the two Consignments — suggest Invoicing's becomes `BillableLine`. *(closes C3, cheap now, expensive later)*
4. Split `ConsignmentLine` per context, or pin the shared attribute set and give it one owner. *(closes C4)*
5. Confirm `CustomerNotified` with someone who knows, or delete it. *(closes the one unconfirmed event)*
6. Put a name against each of the 7 contexts. `owner: TBD` ×10 is *why* none of the above moved since March. *(five minutes)*
7. Book a session with an actual customer before the next modelling round. *(closes the proxy problem)*

Items 1–3 are the ones already costing money. If standup only has ten minutes, do 2 and 6.

## How it's built

Three files in `docs/domain/view/`:

- `model.json` — the derived payload, single source of truth, every claim traceable to a source file
- `template.html` — markup, styling, render logic
- `build.mjs` — inlines the JSON into the template

Regenerate after editing `model.json`:

```
node docs/domain/view/build.mjs
```

Dependency-free — no npm install, no CDN, no framework. I verified it renders in headless Chrome over both `http://` and `file://`, and shut the server down afterwards.

## One caveat, stated plainly

Nothing on that page was inferred to fill a blank. Every box traces to a line in `docs/domain/`. Where the docs are silent, the page says so rather than guessing — which is why it looks more unfinished than a normal architecture diagram. That's the point: this is what the model actually knows today, and the holes are the agenda.
