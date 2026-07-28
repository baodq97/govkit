---
id: DOMAIN-BC-0001
title: Nordic Freight — bounded context definitions (index)
status: draft
owner: TBD
date: 2026-07-27
---

## What this is

A canvas per bounded context, sized to what each context actually is, written before any code
exists. Sources are the three artifacts already in `docs/domain/`: `context-map.md`,
`business-model.md`, `discovery/timeline.md`, and the seven `model.yaml` files.

Nothing here is a decision. Every canvas separates **what the repo states** (cited) from **what I
assumed** (flagged) from **what nobody has answered** (open questions). Where the existing
artifacts disagree with each other, the disagreement is recorded, not resolved — resolving it needs
the commercial director and a customer, neither of whom I can call.

I did not edit any existing artifact. `context-map.md` still carries the March classification.

## Right-sizing: which contexts got a full canvas

A canvas costs a room full of people half a day. Spending that on a context that owns no rule is
how canvases get a reputation. Five contexts own decisions; two do not.

| Context | Treatment | Why | Evidence |
|---|---|---|---|
| Booking | Full canvas | Owns the confirmation lifecycle and one invariant; sits on the March double-commit hotspot | `booking/model.yaml` (1 aggregate, 9 tables, 1 invariant); hotspot 1 |
| Consolidation | Full canvas | Owns the no-overbooking invariant and the capability the premium is sold against | `consolidation/model.yaml`; business-model differentiation = **yes** |
| Quoting | Full canvas | Owns the validity-window rule and a real aggregate; customer-facing entry point | `quoting/model.yaml` (1 aggregate, 1 invariant) |
| Customs | Full canvas | Regulated, owns the pre-handover invariant, and is the largest buy-vs-build question open | `customs/model.yaml`; note: "two commercial platforms cover all nine ports; we integrate with neither" |
| Invoicing | Full canvas | 34 tables and 5 aggregates will be built or migrated whatever its classification turns out to be | `invoicing/model.yaml` |
| **Routing** | **Stub** | `aggregates: []`, `tactical_pattern: transaction-script`, and its own rationale says "It owns no rule of its own". A canvas has nothing to fill in — the questions worth asking about Routing are whether it is a context at all, and where carrier contracts live | `routing/model.yaml` |
| **Notifications** | **Stub** | `aggregates: []`, `tactical_pattern: bought-adapter`, "thin adapter over a bought email/SMS provider; no domain model". Generic and bought; the design question is provider selection, not modelling | `notifications/model.yaml` |

The two stubs each carry the same header, communication table and open questions as a full canvas.
What they omit — business decisions, ubiquitous language, verification metrics beyond an
availability figure — they omit because the repo says there is nothing there to write.

## Strategic classification — carried forward, with conflicts surfaced

Column 2 is copied from `context-map.md`. Columns 3–5 are copied from the capability table in
`business-model.md`. Column 6 is my reading of the gap. **I have changed nothing.**

| Context | `context-map.md` says | business_role | evolution | differentiation | Conflict? |
|---|---|---|---|---|---|
| Quoting | core | engagement-creator | product | partial — "competitors quote in seconds too; we are no faster" | **Yes (moderate)** — partial differentiation at product stage reads supporting, not core |
| Booking | core | *(no row)* | — | — | **Gap** — Booking is not in the capability table at all; its classification has no business-model backing either way |
| Consolidation | supporting | revenue-generator | custom-built | **yes** — "the premium customers pay for" | **Yes (inverted)** — the only capability scoring custom-built + differentiated is the one labelled supporting |
| Routing | supporting | cost-reduction | product | no — "the partner network is the asset, not the routing step" | No |
| Customs | core | compliance-enforcer | product | no — "required, and two vendors already do it well" | **Yes** — no differentiation plus two viable vendors is a buy case, not a core case |
| Invoicing | core, "the largest and most business-critical system we run" | compliance-enforcer | commodity | **no** — "nobody has ever chosen us because of our invoices" | **Yes (major)** — see below |
| Notifications | generic | engagement-creator | commodity | no | No |

### The Invoicing conflict, stated plainly

`context-map.md` labels Invoicing `core` and justifies it with *"the largest and most
business-critical system we run"*. `business-model.md` records the commercial director saying
*"nobody has ever chosen us because of our invoices"* and scores it commodity / no
differentiation.

Those are two different claims, and only one of them is about strategy. Largest is a fact about
mass (34 tables, 311 attributes, a 128-attribute entity — by far the heaviest thing in the repo).
Core is a claim that the capability wins customers. `invoicing/model.yaml` explains the mass
without invoking strategy: *"three of the five aggregates exist to model VAT variations across the
nine ports; two were added when the Finnish tax rules changed in 2024."* That is regulatory
surface area accumulated over eleven years, which is a cost, not a moat.

The mirror image is Consolidation: labelled `supporting`, 1 aggregate, 5 tables — and the only
capability in the business model marked differentiated, attached to a named revenue stream
(Guaranteed Consolidation, +18% of forwarding fee) and the only quantified company goal (fill 71% →
80%).

If the classification stands as written, investment follows mass and the differentiated capability
stays on a whiteboard in Gothenburg. That is the finding. The re-label is not mine to make, for
one reason worth stating: every differentiation cell in `business-model.md` is sourced to the
commercial director speaking as **proxy** for customers — no customer was in the room. The
evidence pointing at a re-label is one interview deep. See open question OQ-1.

Also worth noting: four of seven contexts are labelled `core`, and `context-map.md` closes with
*"the classification above has not been revisited since the first modelling session in March."*
Applied to the business model's own differentiation column, exactly one context survives the test.

## Ubiquitous language conflicts across boundaries

| Term | Meaning A | Meaning B | Consequence |
|---|---|---|---|
| Consignment | "the goods a customer hands over as one unit" (`booking/model.yaml`) | "a billable line on an invoice" (`invoicing/model.yaml`) | Hotspot 2, raised by the finance analyst. Two meanings is the normal, healthy sign of a real boundary — it becomes a defect only if a shared type carries one meaning across. Needs a translation at the Customs → Invoicing edge |
| `ConsignmentLine` | Booking's version: `lineId, volumeM3, weightKg, hazardClass` | Consolidation's version: `lineId, volumeM3, stackable` | Declared a **Shared Kernel** in `context-map.md` ("both write it"), yet the two `model.yaml` files already give it different attributes. A shared kernel that has already diverged on paper, before any code, is a naming coincidence rather than a shared model. See OQ-4 |
| Lane (`laneId`) | Quoting prices against it | Routing selects a carrier by "the standing contract for that lane" | No context owns Lane or the standing contract, and there is no Quoting → Routing edge on the map. See OQ-5 |

## Cross-cutting open questions

Numbered so canvases can reference them. Each names who could answer it.

| # | Question | Why it is open | Who can answer |
|---|---|---|---|
| OQ-1 | Does the classification in `context-map.md` stand, given the differentiation column in `business-model.md` contradicts it for Consolidation, Invoicing, Customs and Quoting? | Two artifacts disagree; the newer one is proxy evidence from a single interview | Commercial director **plus at least one customer** — the business-model open questions already flag that no customer has been asked |
| OQ-2 | Who is responsible when a partner carrier refuses a sealed container? | Hotspot 3, raised by a planner and unresolved. The container is sealed, so Consolidation is done; the declaration may be submitted or cleared, so Customs is implicated; the shipment is Routing's to hand over; the customer relationship and the Guaranteed Consolidation promise sit with Booking. **No context in the repo claims it, and no `model.yaml` has a rule or event for it.** Left unowned, it lands wherever the first on-call engineer puts it | Depot planners + whoever owns the carrier contracts; needs a decision before Routing is built |
| OQ-3 | Where is the no-overbooking check enforced? | Hotspot 1 (two shipments to one slot in March, "nobody agrees where the check should have happened"). `consolidation/model.yaml` owns the invariant; `booking/model.yaml` records a "synchronous remaining-capacity check before reserving" — a read on one side of a boundary and a write on the other, which is the shape that produced the March incident | Booking + Consolidation modellers together |
| OQ-4 | Is `ConsignmentLine` genuinely a shared kernel, or two entities that share a name? | Attributes already differ between the two contexts (`hazardClass` vs `stackable`) | Booking + Consolidation modellers |
| OQ-5 | Which context owns Lane and the standing carrier contract? | `laneId` appears in Quoting, "standing contract for that lane" in Routing, and neither owns it. `context-map.md` shows Tariff Data as external to Quoting but says nothing about carrier contracts. This may be a missing context rather than a missing field | Commercial director + depot planners |
| OQ-6 | How does Invoicing learn that the Guaranteed Consolidation premium was sold? | The finance analyst states "the premium is charged whether or not the container ends up full". The premium is agreed at booking; Invoicing's only inbound edge is from Customs (`invoicing/model.yaml` → `to: Customs, downstream`), and no event on the timeline carries a premium flag | Finance analyst + Booking modellers |
| OQ-7 | What enforces "a shipment cannot be handed to a carrier before its declaration is submitted"? | The invariant is owned by Customs (`customs/model.yaml`), but the handover is Routing's action (`ShipmentHandedToCarrier`), and **there is no edge between Customs and Routing** anywhere on the context map. The rule as written cannot be enforced by the context that owns it | Customs clerk + Routing/Booking modellers |
| OQ-8 | When does `CustomerNotified` fire? | Timeline marks it *candidate* — "inferred from the notification templates, nobody confirmed when it fires". It is the only unconfirmed event in the system | Whoever owns customer comms; nobody in the discovery session did |
| OQ-9 | Buy or build Customs? | `customs/model.yaml`: "two commercial customs platforms cover all nine ports; we integrate with neither", against a business-model score of no differentiation. The repo plans a 12-table model for a capability it says two vendors already do well | Commercial director + customs clerk |
| OQ-10 | Is Routing a bounded context or an outbound adapter of Booking? | It owns no rule, no aggregate, and forwards `BookingConfirmed` unchanged. It may become a context if OQ-2 or OQ-5 lands on it | Whoever answers OQ-2 and OQ-5 first |

## On business decisions

Every "Business decisions" section below contains only:

- the three rules in the *Business rules stated* table of `discovery/timeline.md`, and
- the `invariants:` entries in the seven `model.yaml` files.

That is **eight statements in total for seven contexts**, and two of them are the same rule seen
from two sides. Quoting has one. Booking has one. Notifications and Routing have none.

Nothing else was written into those sections. Cancellation, refunds, credit terms, dunning
triggers, hazardous-goods handling, surcharge policy, VAT treatment and carrier-refusal liability
are all absent from the repo — several are implied by attributes (`hazardClass`, `DunningCase`,
`SurchargeSchedule`, `vatCode`) that no stated rule governs. They are listed as open questions in
the relevant canvas rather than filled in with something plausible. A plausible invented policy is
worse than a blank one, because a blank gets asked about.

## On verification metrics

No code exists yet, so no metric here can be read today. Each one names the source that has to be
built alongside the context — an event stream, a counter, an issue-tracker label, an ops log entry.
A metric whose collection point is not built with the feature does not get collected.

## Canvases

| Context | Canvas |
|---|---|
| Booking | [`booking/canvas.md`](booking/canvas.md) |
| Consolidation | [`consolidation/canvas.md`](consolidation/canvas.md) |
| Quoting | [`quoting/canvas.md`](quoting/canvas.md) |
| Customs | [`customs/canvas.md`](customs/canvas.md) |
| Invoicing | [`invoicing/canvas.md`](invoicing/canvas.md) |
| Routing | [`routing/canvas.md`](routing/canvas.md) — stub |
| Notifications | [`notifications/canvas.md`](notifications/canvas.md) — stub |
