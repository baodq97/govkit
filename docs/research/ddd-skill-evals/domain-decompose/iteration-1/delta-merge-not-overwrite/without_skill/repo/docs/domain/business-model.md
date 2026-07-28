---
id: DOMAIN-BM-0001
title: Nordic Freight — business model & user needs
status: draft
owner: TBD
date: 2026-05-18
mode: discover
---

## Sources

Pricing page (`nordicfreight.example/pricing`), 2025 investor one-pager, interview with the
commercial director (2026-05-18), interview with two depot planners (2026-05-18).

## Who was in the room

Commercial director, two depot planners, three engineers. **Missing:** no customer took part —
the "what customers value" rows below come from the commercial director speaking for them, and are
marked `proxy`.

## Business Model Canvas (abridged)

| Block | Content | Source |
|---|---|---|
| Customer segments | Small and mid-size exporters shipping part loads (too small for a full container) | investor one-pager |
| Value propositions | *"Full-container prices on part-load shipments"* — we fill containers better than anyone else in the Nordics | commercial director, 2026-05-18 |
| Revenue streams | Forwarding margin per shipment; **Guaranteed Consolidation** premium (+18% of forwarding fee) which promises a departure slot even on a partly-filled container | pricing page |
| Key resources | Partner depot network in 9 ports; the load-planning know-how of four senior planners | commercial director |
| Cost structure | Unknown — nobody in the room owns the P&L | — |

## Capability classification inputs

| Capability | business_role | evolution_stage | differentiation | Source |
|---|---|---|---|---|
| Load consolidation / container fill optimisation | revenue-generator | custom-built | **yes** — the premium customers pay for; a new entrant would need both the depot network and the planning know-how | commercial director (proxy for customers) |
| Quoting | engagement-creator | product | partial — competitors quote in seconds too; we are no faster | commercial director |
| Customs declaration | compliance-enforcer | product | no — required, and two vendors already do it well | commercial director |
| Invoicing | compliance-enforcer | commodity | **no** — *"nobody has ever chosen us because of our invoices"* | commercial director |
| Shipment notifications | engagement-creator | commodity | no | commercial director |
| Carrier routing | cost-reduction | product | no — the partner network is the asset, not the routing step | depot planners |

## Goals

| Horizon | Goal | Source |
|---|---|---|
| Short | Raise average container fill from 71% to 80% | commercial director |
| Medium | Open two more ports | investor one-pager |
| Long | Unknown | — |

## Open questions

- Cost structure per shipment — would need whoever owns the P&L.
- Whether customers would pay for guaranteed departure windows as a separate product — no customer
  has been asked.

---

## Addendum — 2026-07-28, temperature-controlled freight

Source: the cold chain contract itself. **No interview was held and no customer or planner has been
asked**, so nothing here carries the same weight as the rows above. Recorded because it changes the
capability table, not because it has been validated.

### Canvas deltas

| Block | Delta | Source |
|---|---|---|
| Customer segments | Adds temperature-sensitive shippers — food, seafood, pharma. Different risk appetite from part-load exporters: they buy evidence, not just transport | contract, 2026-07-28 |
| Value propositions | Unchanged and possibly strained. *"Full-container prices on part-load shipments"* rests on filling containers well; reefer loads can only be filled from the same temperature band | inference — **needs the commercial director** |
| Revenue streams | Adds a reefer premium. Amount unknown; the contract is one account | contract |
| Key resources | Adds reefer capacity in the depot network and bought telemetry. Neither is know-how — unlike the four senior planners, both are purchasable | inference |
| Cost structure | Still unknown, and now larger: reefer capacity, telemetry subscription, and breach liability. Nobody in the room owns the P&L | — |

### Capability classification input

| Capability | business_role | evolution_stage | differentiation | Source |
|---|---|---|---|---|
| Cold chain custody & breach accountability | compliance-enforcer | custom-built | **partial** — the telemetry is commodity and buyable; the accountable custody record across our own depot network is not | inference, 2026-07-28 — **unvalidated** |

### Tension with the stated short-term goal

The short-term goal above is to raise average container fill from 71% to 80%. Cold chain splits the
container pool by temperature band, and a band-restricted container can only be filled from the
consignments in that band. On reefer departures, fill should be expected to fall before it rises.

Two readings, and they lead to different products:

- **Fill rate is the wrong measure for reefer.** Cold chain sells compliance and evidence, and it
  should be measured on breach rate and margin per shipment, not on how full the box is.
- **Fill rate still rules.** Then reefer volume needs to reach the point where each band fills its
  own containers, and until it does the premium has to cover the empty space we are shipping.

Cannot be resolved here — it needs whoever owns the P&L, the same person `business-model.md` has
been missing since May.
