---
id: DOMAIN-ASSESS-0001
title: Nordic Freight — state of the domain model
status: draft
owner: TBD
date: 2026-07-27
---

## Short answer to "where do we start"

You are already mid-flow. `docs/domain/` holds a discovery timeline, a business model, a context
map and seven tactical models. Re-running discovery would re-collect what is on disk and lose the
three hotspots the planners gave you.

Start by **reconciling those artifacts against each other.** Three of them describe which part of
this business matters, and all three disagree: the sub-domain labels in `context-map.md`, the
differentiation column in `business-model.md`, and the `mass` figures in the seven `model.yaml`
files. Two of the three are wrong, and engineering effort follows one of the wrong ones.

Sections 1 to 3 set out what the artifacts say, where they conflict, and which conflicts justify a
session.

---

## 1. Coverage: what exists and what does not

| DDD activity | Artifact | State |
|---|---|---|
| Event discovery | `discovery/timeline.md` | 11 events, 10 confirmed. Happy path only |
| Business model | `business-model.md` | Present. Differentiation and value prop are `proxy` |
| Strategic classification | `context-map.md` | Present, stale since March, contradicts the business model |
| Context map — topology | `context-map.md` | Present. Direction notation undefined, one edge inverted |
| Context map — integration patterns | — | **Absent.** No ACL, OHS, Conformist, Customer/Supplier anywhere |
| Tactical models | 7 × `model.yaml` | Present, uneven. No shared schema |
| Aggregate consistency boundaries | — | **Absent.** No aggregate states why its contents are one transaction |
| Failure / compensation paths | — | **Absent.** All three hotspots are failure paths; none are modelled |
| Ownership, teams, Conway | — | **Absent.** No headcount or team list in the repo |
| Cost structure | — | **Absent.** `business-model.md` records nobody owns the P&L |

Most of a strategic pass is done. What is missing is the half of a context map that carries the
integration decisions, plus every question about who builds it.

## 2. The mass distribution

Summing the `mass` blocks across the seven `model.yaml` files:

| Context | Label in `context-map.md` | Differentiation in `business-model.md` | Tables | Attributes | Aggregates |
|---|---|---|---|---|---|
| Invoicing | core | **no** — "nobody has ever chosen us because of our invoices" | 34 (45%) | 311 (51%) | 5 |
| Customs | core | no — "two vendors already do it well" | 12 (16%) | 96 (16%) | 1 |
| Quoting | core | partial — "we are no faster" | 11 (14%) | 78 (13%) | 1 |
| Booking | core | — | 9 (12%) | 54 (9%) | 1 |
| **Consolidation** | **supporting** | **yes** — the premium customers pay for | **5 (7%)** | **41 (7%)** | **1** |
| Routing | supporting | no | 3 (4%) | 17 (3%) | 0 |
| Notifications | generic | no | 2 (3%) | 11 (2%) | 0 |

Three numbers to take to the reclassification session:

- The two contexts the business model marks **no differentiation** hold **61% of the tables and
  67% of the attributes** in the system.
- The one capability the business model marks as the differentiator, the one the Guaranteed
  Consolidation premium is charged for, holds **7%**. That is one aggregate, no value objects, and
  by its own notes, load planning "still happens partly on a whiteboard in the Gothenburg depot."
- Invoicing carries **6.8× Consolidation's tables and 7.6× its attributes**, and one entity in it
  has **128 attributes**.

The short-term company goal in `business-model.md` is to raise container fill from 71% to 80%.
That goal lives entirely inside the context with the thinnest model and a manual planning step.

## 3. Findings, ranked

Ranked by impact × strength of the evidence already in the repo.

### F1. The sub-domain classification is inverted. Blocker.

`context-map.md` marks four of seven contexts `core`, which drains the label of meaning: if 57% of
the map is core, the map cannot direct investment. Worse, the labels disagree with the business
model on the two that matter most, and the stated reasons are not strategic ones:

| Context | Reason given in `context-map.md` | What that reason actually measures |
|---|---|---|
| Quoting | "first thing the customer sees" | Proximity to the user, not defensibility |
| Booking | "where the money is committed" | Transaction position, not defensibility |
| Invoicing | "the largest and most business-critical system we run" | Size, not defensibility |
| Consolidation | "back-office load planning" | Where the work happens, not its value |

Not one row cites differentiation or evolution stage. `business-model.md` supplies both.

Proposed reclassification, for the commercial director to confirm rather than for engineering to
decide:

| Context | Now | Proposed | Evidence |
|---|---|---|---|
| Consolidation | supporting | **core** | revenue-generator, custom-built, differentiation `yes`, carries the +18% premium, owns the short-term goal |
| Invoicing | core | **generic** | compliance-enforcer, commodity, differentiation `no`. The 34 tables record eleven years of VAT rules |
| Customs | core | **generic** | compliance-enforcer, product stage, "two vendors already do it well" |
| Quoting | core | **supporting** | engagement-creator, product stage, partial differentiation, "we are no faster" |
| Booking | core | **supporting** | Commits the transaction, but the defensible decision it depends on belongs to Consolidation |
| Routing | supporting | supporting | "the partner network is the asset, not the routing step" — but see F10 |
| Notifications | generic | generic | Consistent everywhere |

That leaves one core context, which is what makes the label useful for directing investment.

Two buy/build decisions fall straight out of it, and `customs/model.yaml` already contains half of
one: *"Two commercial customs platforms cover all nine ports; we integrate with neither."* A
generic sub-domain with 12 tables of hand-built model and two mature vendors in the market is a buy
candidate, and so is an eleven-year-old invoicing system where three of five aggregates exist only
to model VAT variation.

### F2. Booking and Consolidation race on the capacity invariant. Blocker. Already fired once.

`booking/model.yaml` records a *"synchronous remaining-capacity check before reserving"* against
Consolidation. `consolidation/model.yaml` owns the invariant *"a container's committed volume must
never exceed its capacity."*

So Booking reads remaining capacity, decides, and then commands Consolidation to reserve. Between
the read and the command, another booking can consume the same space. The context that owns the
invariant is never given the chance to enforce it, because by the time it is called, the decision
is already made.

This is not hypothetical. Hotspot 1 in `discovery/timeline.md`: *"Two shipments were committed to
the same container slot in March; nobody agrees where the check should have happened."* The model
answers that question, since the check belongs where the invariant is, and the planners' rule
states the business cost: an overbooked container bumps a shipment and breaks the Guaranteed
Consolidation promise, which is the premium product.

The shape of the fix: one command, `ReserveCapacity(bookingId, volumeM3)`, handled inside the
`ContainerLoad` aggregate, which decides and answers. Booking never reads-then-decides. Its own
invariant, *"a booking may only be confirmed once its capacity has been reserved,"* then becomes a
reaction to the answer instead of a precondition it evaluates itself.

That requires an event the timeline does not have. See F6.

### F3. `ConsignmentLine` is a Shared Kernel across that same seam. High.

`context-map.md` declares `ConsignmentLine` a **Shared Kernel** between Booking and Consolidation,
"both write it." Both `model.yaml` files then list it as an entity *inside their own aggregate*,
with different attributes:

- Booking: `lineId, volumeM3, weightKg, hazardClass`
- Consolidation: `lineId, volumeM3, stackable`

Two aggregates cannot both own one entity. That is what an aggregate boundary means. And the one
field they share, `volumeM3`, is the quantity the contested invariant is computed from, so F2
cannot be fixed while this stands: no single context holds the authoritative volume.

The divergent attributes suggest these are two concepts wearing one name: what the customer hands
over (weight, hazard class) versus what has to be stacked in a box (stackability). Splitting them
is likely cheaper than maintaining a shared kernel at the system's most contested seam.

### F4. The strategy rests on proxy evidence. High.

`business-model.md` is explicit and to its credit says so plainly: *"no customer took part."* The
differentiation column, the value proposition, and therefore F1's whole reclassification come from
the commercial director speaking on customers' behalf. Neither discovery session had a customer in
the room.

Two gaps compound it. Cost structure is `Unknown — nobody in the room owns the P&L`, so nobody can
say whether the +18% premium is profitable, only that it is charged. And the doc's own open
question, whether customers would pay for guaranteed departure windows as a separate product, has
never been put to a customer.

Everything else in this assessment is inference over artifacts. This one needs new evidence, and it
is the cheapest high-value evidence available: four or five customer conversations.

### F5. The customs invariant cannot be enforced where it is written. High.

`customs/model.yaml` states: *"A shipment cannot be handed to a carrier before its declaration is
submitted."* The handover is performed by Routing, which emits `ShipmentHandedToCarrier`.

Routing's declared relationships are Booking and PartnerNetwork. It has no relationship to Customs
at all. As modelled, Routing cannot know whether a declaration exists, so the rule is unenforceable
by construction. The rule sits in a context that has no way to apply it.

Either Routing consumes `DeclarationSubmitted` and gates on it, or the handover moves behind a
policy that observes both. Whichever is chosen, the context map is missing an edge.

### F6. Only the happy path is modelled. Medium-high.

All 11 events in the timeline describe success. Nothing in the repo names a refusal, a compensation
or a reversal, yet all three hotspots are failure scenarios, and the planners' own rule describes
what happens when a container is overbooked ("a shipment is bumped") without a `ShipmentBumped`
event existing anywhere.

Missing and load-bearing:

- **`CapacityRefused`**. F2's fix cannot be expressed without it.
- **`ShipmentBumped`**. Named in a business rule the planners stated, modelled nowhere.
- **Carrier refusal**. Hotspot 3: *"nobody knows who is responsible when a partner carrier refuses
  a sealed container."* An unowned responsibility, not just an unmodelled event.
- **Declaration rejection**. `DeclarationSubmitted` and `DeclarationCleared` exist; customs
  authorities also reject.
- **Payment events**. Invoicing declares `DunningCase` and `PaymentAllocation` aggregates, and the
  only event it emits is `InvoiceIssued`. Nothing is ever paid, allocated or chased.

Failure paths are where boundaries are decided, because that is where responsibility has to be
assigned to exactly one context. Modelling only the happy path is why hotspots 1 and 3 both take
the form "nobody agrees who owns this."

### F7. No relationship in the system declares an integration pattern. Medium.

Every edge in `context-map.md` and every entry in the `relationships:` blocks carries a direction
and nothing else. Upstream/downstream says who is influenced; it does not say how the downstream
protects itself. Nothing in the repo declares an Anti-Corruption Layer, an Open-Host Service, a
Published Language, Conformist or Customer/Supplier.

Three seams need that decision and none of them record one: the PartnerNetwork edge is external,
the Customs model is a buy candidate (F1), and an Invoicing replacement would need a translation
layer.

The direction notation is also undefined and inconsistently applied. Reading `booking/model.yaml`,
`{to: Quoting, type: downstream}` must mean "*I* am downstream of Quoting." Under that reading, six
edges are consistent and one is not: `routing/model.yaml` has `{to: PartnerNetwork, type:
downstream}`, but Routing hands the shipment *to* the partner. Cheap to fix, and worth fixing
before anyone builds on the map.

### F8. Nobody owns anything. Medium.

Every governed doc in `docs/domain/` is `status: draft, owner: TBD`. There is no team list, no
headcount, and no ownership column anywhere in the repo, so no context has a named owner.

Three consequences follow. Hotspots 1 and 3 are ownership disputes that the model cannot settle by
itself. Aligning boundaries to teams is impossible without knowing the teams. And "the
load-planning know-how of four senior planners" is listed in `business-model.md` as a key resource
while appearing in no model, which puts the differentiating capability in four people's heads and
on a whiteboard.

### F9. "Consignment" means two different things, and no translation is declared. Medium.

- `booking/model.yaml`: *"The goods a customer hands over as one unit."*
- `invoicing/model.yaml`: *"A billable line on an invoice."*

Hotspot 2 confirms this in the field: finance and operations use the word differently. A term
meaning different things on either side of a boundary is normal, because ubiquitous language is
per-context. What is missing is the acknowledgement. No translation is declared at the
Customs→Invoicing seam, and both definitions sit in a `ubiquitous_language` block as if each were
global. Left implicit, someone will unify them into one field and call it a cleanup.

### F10. Routing owns no rule, but a real responsibility is unowned next to it. Medium.

`routing/model.yaml` is candid: it "owns no rule of its own," has zero aggregates and a
transaction-script pattern. It receives `BookingConfirmed` and forwards it unchanged. On that
description alone, it behaves as an adapter to the partner network rather than a bounded context.

Hotspot 3 complicates the picture. Carrier refusal is unowned, and F5 leaves the pre-handover
customs gate without a home, and both belong at that point in the flow. So the question is whether
Routing grows into a context that owns carrier acceptance and the handover gate, or is folded into
Booking with those responsibilities placed somewhere named. Letting it drift is how hotspot 3 stays
unowned.

### F11. The tactical models have no shared schema. Low, but cheap.

The seven `model.yaml` files drifted apart:

- `domain_events` is nested under aggregates in five files and top-level in Invoicing and
  Notifications.
- `ubiquitous_language` is present in four files, absent in Customs, Routing and Notifications.
- `invariants` is absent from Notifications and Routing.
- Invoicing lists five aggregates; only `Invoice` has entities. `SurchargeSchedule`, `CreditNote`,
  `DunningCase` and `PaymentAllocation` are names with nothing under them.
- `relationships` entries have no field for the integration pattern F7 wants to record.

No validator reads these files, so the drift stays invisible until a person opens all seven. That
is how the contradictions in F1 survived four months.

### F12. Two aggregates are sized like databases. Low.

`densest_entity_attrs` is 128 in Invoicing and 34 in Customs. A 128-attribute entity is a table
with a class around it rather than an aggregate root defended by an invariant. Both sit in contexts
F1 proposes to reclassify as generic, so the cheapest resolution may be to leave them alone until
A2 decides whether either system survives.

---

## 4. What this does not cover

- **No customer evidence.** F1 rests on the commercial director's proxy account (F4).
- **No cost data.** Contexts cannot be ranked by economics, only by stated differentiation.
- **No code was read.** Every figure comes from the `mass` blocks in the `model.yaml` files. If
  those are stale, the ranking moves. Worth a spot-check against the real schemas before the
  buy/build decisions in F1 are made.
- **No team data**, so no Conway analysis and no proposed ownership (F8).
- The buy/build line on Customs and Invoicing is a **direction to cost, not a recommendation**. It
  needs vendor cost, migration cost and switching risk, none of which are in this repo.

Sequenced next steps are in `next-steps.md`.
