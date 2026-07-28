# Nordic Freight — bounded contexts defined (Bounded Context Canvas v5 + Quality Storming)

Seven canvases written into `docs/domain/<context>/README.md`, right-sized rather than uniform. Two
things you should read before anything else: the strategic classification in `context-map.md`
contradicts `business-model.md` on four of seven contexts, and the discovery timeline contradicts a
stated business rule. Neither is fixed here — both are findings for the skills that own those files.

## Right-sizing — what got what, and why

| Context | Depth | Lines | Why |
|---|---|---|---|
| Consolidation | **full canvas + interface critique** | 172 | the only capability `business-model.md` marks *differentiation: yes*, and the source of the one premium the company charges |
| Booking | supporting + the contested deep sections | 90 | two live disputes: the shared kernel and where the capacity check belongs |
| Customs | supporting | 89 | compliance enforcer, product evolution, live buy-vs-build question |
| Invoicing | supporting | 90 | commodity per `business-model.md` — sized on classification, not on its 34 tables |
| Quoting | supporting | 90 | engagement creator, product, partial differentiation |
| Routing | stub-shaped | 53 | owns no rule of its own (`model.yaml`) |
| Notifications | stub | 34 | generic, bought, thin adapter |

Ratio core to generic is 5:1. Invoicing is the deliberate call: it is by a wide margin the biggest
system in the model (34 tables, 311 attributes, one entity with 128 attributes) and it got a
supporting-sized canvas, because canvas depth follows classification and `business-model.md` records
it as commodity with no differentiation — *"nobody has ever chosen us because of our invoices"*.

## Inputs that were missing, and what that cost

- **No `core-domain-chart.md`.** Classification is carried from `business-model.md`'s capability
  table (the `1-understand` fallback the process allows). Nothing was re-derived.
- **No `message-flows/`.** Every inbound and outbound table is reconstructed from
  `discovery/timeline.md` and `model.yaml` relationships, and says so. Messages that exist as events
  but have no named request — the booking request, the quote request, the planner's manual override
  — are marked *unconfirmed* rather than named for them.
- **No first-pass canvases.** `3-decompose` left only `model.yaml`, so these are new files, not
  delta-merges. `model.yaml` was not edited; proposed deltas are listed at the bottom of the
  Consolidation canvas.
- **Relationship patterns are agreed for one edge in the whole map** — the Booking/Consolidation
  shared kernel. Every other edge says `pattern unstated`. Conformist / ACL / open-host were not
  invented to fill columns.

## The classification conflict — a finding, not an edit

`context-map.md` (March, "not revisited since") and `business-model.md` (May) disagree on four
contexts:

| Context | `context-map.md` | `business-model.md` |
|---|---|---|
| Consolidation | supporting, "back-office load planning" | revenue generator, custom built, **differentiation yes** |
| Invoicing | core, "largest and most business-critical system we run" | compliance enforcer, commodity, differentiation **no** |
| Customs | core, "regulated, and mistakes are expensive" | compliance enforcer, product, differentiation **no** |
| Quoting | core, "first thing the customer sees" | engagement creator, product, **partial** |

The pattern is worth naming: three of the four "core" labels argue *size*, *risk* or *visibility*,
none of which is differentiation. Meanwhile the one capability the company charges a premium for is
labelled back-office. I have not flipped anything — that is `5-strategize`'s call — but I sized the
canvases on the May evidence and recorded the disagreement in each affected canvas.

## Findings from the interface critique (Consolidation)

1. **The capacity interaction has no name.** Booking does a remaining-capacity read and then writes
   (`booking/model.yaml`: *"synchronous remaining-capacity check before reserving"*). Check-then-act
   across a context boundary is exactly the race that produced hotspot 1 — two shipments on the same
   slot in March. It should be one command Consolidation accepts or rejects.
2. **`ConsignmentLine` is a shared kernel both contexts write** (`context-map.md`), and Booking reads
   container state to make a decision Consolidation owns. Expose the decision, not the state.
3. **Move experiment (kept):** move `ConsignmentLine` wholly into Consolidation. The shared kernel
   disappears and the capacity invariant becomes enforceable inside one aggregate; the cost is that
   Booking loses direct access to weight and hazard class.
4. **Move experiment (rejected):** extract fill optimisation as its own context — it reads and writes
   the same `ContainerLoad` state, so put it behind a port inside the boundary instead.
5. Consolidation's outbound messages are all events, no commands — it is not becoming a brain context.

## The finding I did not expect

`discovery/timeline.md` orders `ShipmentHandedToCarrier` (#6) **before** `DeclarationSubmitted` (#8),
while the customs clerk stated *"a shipment cannot be handed to a carrier before its declaration is
submitted"*. One of the two is wrong. Note also that the rule is owned by Customs while the act is
performed by Routing, which owns no rules at all — so as modelled there is no place where the rule
can be enforced. This is in the open questions of Customs, Routing and Consolidation, and it has a
verification metric attached: handovers preceding a submission, predicted zero, from production
event ordering.

## Sections that usually get skipped, and are not empty here

Every canvas carries assumptions, verification metrics and open questions. Twenty-eight assumptions
across the seven, all labelled `(inferred)` — nothing inferred was written up as a business rule.
The ones most worth attacking:

- volume, not weight, binds on Nordic's lanes — the model contradicts itself (Consolidation tracks
  only m³, Booking tracks `weightKg` and `hazardClass`), so it is also an open question;
- a sealed container is never re-planned — there is no re-open event and nobody stated a rule;
- a quote reserves nothing, so a quoted price can be honoured on a full departure, which sits
  awkwardly beside the Guaranteed Consolidation promise;
- cancellation exists but is unmodelled everywhere — no event, no rule for releasing reserved capacity.

Verification metrics are predictions with sources, not aspirations. The four on Consolidation:
change coupling with Booking under 30% by 2026-10-31 (VCS), planner manual overrides per week
(needs instrumenting — planning is on a whiteboard today), average fill 71% → 80% from
`ContainerSealed.fillRate`, and zero double-commit incidents in the six months after the reserve
becomes one command.

Open questions: 30 across the seven canvases, 7 of them on Consolidation. That count is the honest
answer to "are we ready to build?" — on the context you are betting the premium on, no.

## Quality storming — the caveat

I ran it against the artifacts, not with a room, and every row says so. Rows with a number cite
`business-model.md` (nine ports, fill 71% → 80%). Rows without one name who could supply it —
retention periods from the customs clerk and finance analyst, the fill-proposal latency from the
planners, the "can Booking confirm while Consolidation is down?" answer from the commercial
director. Four attributes are flagged as model-changing rather than infrastructure: the concurrency
invariant, the synchronous Booking→Consolidation dependency, auditability of sealed containers, and
tax-rule versioning in Invoicing.

## What I did not do

Did not touch `context-map.md`, `business-model.md` or any `model.yaml`. Did not reclassify anything.
Did not invent a business rule, a message name or an SLA. Did not add C4 diagrams — no context here
faces enough external systems or user types to need one yet, and Routing's single external
collaborator is already legible from the canvas.

## Before anyone writes code

1. Resolve Consolidation's classification. If it is the differentiator, it is being staffed as
   back-office today.
2. Decide where the capacity check lives and make it one command. Hotspot 1 recurs otherwise.
3. Answer the handover-before-declaration contradiction — either the timeline is wrong or a
   regulated rule is being broken routinely.
4. Trace the message flows. Six of eight relationship patterns are unstated, and Invoicing has two
   aggregates with no traced collaborator at all.
