# Is Routing a bounded context?

**No.** Routing fails the capability-vs-context test on every reading. It is a dispatch capability
of Booking — or an anti-corruption adapter over the external Partner Network — not a context, not a
service boundary, and not a team.

## The test, and how Routing fails it

A bounded context must own a domain model with **real business invariants**. Name the invariants
its model would own; if the honest answer is "none — it only serves other contexts," it is a
capability.

| Evidence | Source |
|---|---|
| **Owns zero invariants.** `aggregates: []`, and the rationale in the file says it outright: *"It owns no rule of its own."* | `docs/domain/routing/model.yaml` |
| **Its one gating rule belongs to Customs.** *"A shipment cannot be handed to a carrier before its declaration is submitted"* is recorded as a **Customs** invariant, not a Routing one. Splitting Routing off makes another team's rule a distributed-consistency problem. | `docs/domain/discovery/timeline.md`, `docs/domain/customs/model.yaml` |
| **No language shift at the boundary.** `bookingId`, `carrierId`, `shipmentRef` mean exactly the same thing on both sides. Bounded contexts exist where the *same word means different things* — that is why `Consignment` (billable line vs. physical pallet stack) is a real seam and Routing is not. | `discovery/timeline.md` hotspot 2 |
| **Nothing to model.** 3 tables / 17 attributes, `tactical_pattern: transaction-script`. Booking is 9/54, Customs 12/96, Invoicing 34/311. | `mass:` fields across `docs/domain/` |
| **The business says it isn't the asset.** Carrier routing: `cost-reduction`, no differentiation — *"the partner network is the asset, not the routing step"* (depot planners). | `docs/domain/business-model.md` |
| **It emits an event nobody consumes.** `ShipmentHandedToCarrier` has no consumer in any context model. An orphan emit is a log line, not an integration seam. | event-flow continuity check |

Carrier selection today is a lookup: the standing contract for that lane. A lookup plus an outbound
call is a transaction script inside Booking.

## What it costs to do it anyway

1. **A network hop and a team boundary around one transaction script.** The handoff/declaration
   ordering rule then spans three teams (Customs owns the rule, Booking owns the trigger, Routing
   owns the action) with no single owner — precisely hotspot 3, "nobody knows who is responsible
   when a partner carrier refuses a sealed container," made structural.
2. **It spends the one team you have on the wrong context.** See below.
3. **It forces a universal model.** Minting a context with no model of its own means it either
   borrows Booking's or forces a compromise shape serving neither.

## The boundary that is actually load-bearing: Consolidation

While reconciling the docs I hit a conflict that changes the staffing answer, so it needs to be on
the table before you commit:

- `context-map.md` classifies **Consolidation** as `supporting` — "back-office load planning" — and
  notes it hasn't been revisited since March.
- `business-model.md` (2026-05-18) classifies the same capability as **revenue-generator,
  custom-built, differentiating**: the Guaranteed Consolidation premium (+18% of the forwarding
  fee) is the value proposition, and the short-horizon goal is raising container fill 71% → 80%.
- The same file demotes **Invoicing** — currently labelled `core` because it is the biggest system
  — with *"nobody has ever chosen us because of our invoices."* 34 tables is mass, not
  differentiation.

Consolidation also has a real, contested invariant: *"a container's committed volume must never
exceed its capacity"* — and hotspot 1 says two shipments were committed to the same slot in March
and **nobody agrees where the check should have happened**. That is a genuine boundary question with
money attached. It is also blocked by a **Shared Kernel**: Booking and Consolidation both write
`ConsignmentLine`, and they already model it differently (`hazardClass` vs `stackable`). That kernel
must be broken before either can be a separate team.

**Recommendation:** point the architect's service-and-team proposal at Consolidation, not Routing.
Keep routing as a module in Booking behind a Partner Network adapter.

## Trade-offs

| Option | For | Against |
|---|---|---|
| **Routing as its own service + team** (proposed) | Isolates the external Partner Network integration; the carrier API can fail independently | No invariants, no language shift, 17 attributes. Fragments a Customs rule across three teams. Burns the team budget on the least differentiating step. |
| **Routing as a module in Booking, behind an ACL adapter** (**recommended**) | Matches where the invariants actually live; keeps the handoff ordering rule inside one transaction; the adapter still isolates the carrier API | Doesn't satisfy the architect's org-chart goal. |
| **Consolidation as its own service + team** | The actual differentiator and revenue premium; owns a real contested invariant; directly serves the 71→80% fill goal | Requires breaking the `ConsignmentLine` Shared Kernel first, and load planning is still partly manual (whiteboard in Gothenburg) — carving it now freezes a process still being learned. |

## What would change the answer

Promote Routing to a bounded context when — and only when — carrier selection acquires rules of its
own:

- multi-carrier bidding or lane-rate selection replaces the standing per-lane contract;
- carrier refusal / re-routing exceptions get real rules, ownership and penalties (hotspot 3);
- you negotiate capacity contracts *against* carriers rather than consuming a fixed one.

Any of those gives Routing invariants to defend, and this decision should be re-opened.

## Two things to resolve before you commit either way

1. **A contradiction between two first-hand sources, left unresolved rather than blended.** The
   planner-confirmed event timeline has `ShipmentHandedToCarrier` (#6) firing *before*
   `DeclarationSubmitted` (#8); the customs clerk states the handoff *cannot* precede the
   declaration. Both are recorded as confirmed. Ask both parties — and note the map has no
   `Customs → Routing` edge under either answer.
2. **Confirm the Consolidation / Invoicing classification flips.** I did not change them; setting a
   sub-domain type is your call, not mine. Both disagreements are recorded in the Conflicts table.

## What I changed in the repo

Update mode, delta merge only — nothing deleted, no status or owner touched.

- `docs/domain/context-map.md` — added **Declined context candidates** (Routing, with its
  escalation condition), **Conflicts & reconciliation** (3 rows), **Event-flow continuity check**,
  a stated cost on the `ConsignmentLine` Shared Kernel, and a changelog.
- `docs/domain/routing/model.yaml` — recorded the declined-candidate verdict and escalation
  condition in `notes`. The folder stays on disk; a merge into Booking is flagged for you to
  confirm, not performed.

This model is a draft to iterate on, not a final truth — boundaries move as understanding deepens.
