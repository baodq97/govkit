# Is Routing a bounded context?

No. On your own model's evidence, Routing is a **capability** — a step in the shipment value stream
— not a bounded context. And separately, the map it sits in has the wrong two contexts marked core,
so this proposal is spending a team in the wrong place.

## The numbers, from `docs/domain/*/model.yaml`

| Context | tables | attributes | aggregates | invariants owned | terms defined |
|---|---|---|---|---|---|
| Invoicing | 34 | 311 | 5 | 1 | 2 |
| Customs | 12 | 96 | 1 | 1 | 0 |
| Quoting | 11 | 78 | 1 | 1 | 0 |
| Booking | 9 | 54 | 1 | 1 | 2 |
| Consolidation | 5 | 41 | 1 | 1 | 2 |
| **Routing** | **3** | **17** | **0** | **0** | **0** |
| Notifications | 2 | 11 | 0 | 0 | 0 |

Routing is 3.9% of the tables and 2.8% of the attributes in the whole model. Every column matches
Notifications, which your own file describes as "a thin adapter over a bought email/SMS provider; no
domain model". Nobody is proposing a team for Notifications.

## Four tests, four failures

**1. Does it own a model?** No. `routing/model.yaml` says `aggregates: []`,
`tactical_pattern: transaction-script`, and states outright: *"It owns no rule of its own."* A
bounded context is a boundary around a model. There is no model here to put a boundary around.

**2. Does a word mean something different inside it?** This is the sharpest test, and Routing fails
it. Routing defines zero terms. Shipment, booking, carrier, lane are all defined elsewhere. Compare
`Consignment`, which means a physical unit of goods in Booking/Consolidation and a billable invoice
line in Invoicing — hotspot #2 in your discovery notes. That is a real linguistic boundary. Routing
has nothing like it.

**3. Does it own the rule that governs its own action?** No. *"A shipment cannot be handed to a
carrier before its declaration is submitted"* is an invariant of **Customs**. The constraint on the
routing action is owned outside routing, and would stay there after the split.

**4. Is there a decision to make?** No. The carrier is *"selected by the standing contract for that
lane"* — a table lookup. `ShipmentHandedToCarrier(bookingId, carrierId)` is a state transition on a
Booking, published from a different box.

## What extraction would actually cost you

Splitting Routing out turns the Customs invariant into a **distributed invariant** spanning three
services on the critical path of every shipment. Today it's a local check. After the split it's a
cross-service consistency problem — for a rule that, per hotspot #3, nobody currently owns.

Conway's law then makes it permanent: hotspot #3 ("nobody knows who is responsible when a partner
carrier refuses a sealed container") becomes a standing cross-team escalation instead of one team's
bug.

## The strongest version of the architect's case, and why it still doesn't hold

There is one genuine anomaly at this seam, and it's worth saying out loud because it's the best
argument available. `discovery/timeline.md` orders `ShipmentHandedToCarrier` (#6) **before**
`DeclarationSubmitted` (#8) — which the customs clerk's stated rule forbids. Either the timeline is
wrong, the invariant is being violated in production, or "handed to carrier" means two different
things: physical assignment at the depot to the planner, legal export release to the customs clerk.

Ambiguity in a term is normally a signal that a boundary is nearby. But the ambiguity here is
between **Consolidation** (physical) and **Customs** (legal). Routing owns neither meaning; it emits
an event whose meaning is disputed by the two contexts on either side of it. You resolve that by
defining the term inside an existing model, not by chartering a team around the confusion.

## Options

| # | Option | Cost | Verdict |
|---|---|---|---|
| **A** | **Fold Routing into Consolidation** as a carrier-handoff module, with an explicit ACL to Partner Network | one module move, no org change | **Recommended.** Puts sealed containers, handoff, and carrier refusal under one owner and closes hotspot #3 |
| B | Fold into Booking | one module move | Defensible if you read handoff as completing the commitment, but it splits the refusal path from the depot that has to re-plan the load |
| C | Own service + own team (the proposal) | a distributed invariant on the critical path; a team owning 17 attributes | Only if one of the conditions below becomes true |

**Revisit C if:** carrier selection stops being a standing-contract lookup and becomes a real
decision (multi-carrier bidding, cost/SLA scoring, carrier-supplied capacity); or the "open two more
ports" goal turns lane→carrier assignment into a rules engine; or the ambiguity above resolves into
two distinct concepts with their own lifecycles. Any one of those gives Routing a model, and then it
earns a boundary.

## The bigger finding: your map has core and supporting inverted

`context-map.md` admits the classification "has not been revisited since the first modelling session
in March". Against `business-model.md` it's wrong in two places:

| Context | Map says | Business model says | Should be |
|---|---|---|---|
| Consolidation | supporting | revenue-generator, custom-built, **differentiating** — carries the 71%→80% fill goal and the +18% Guaranteed Consolidation premium | **core** |
| Invoicing | core | compliance-enforcer, **commodity** — *"nobody has ever chosen us because of our invoices"* | **supporting** |

So: the capability you sell — the one still partly run on a whiteboard in Gothenburg by four senior
planners — is marked supporting and has 5 tables. Invoicing, which nobody buys you for, is marked
core and holds 51% of your model's attributes. That's where a team is worth spending, in that order:

1. **Consolidation.** It's the differentiator, it's under-modelled, and hotspot #1 (two shipments
   committed to the same slot) is a live breach of the invariant behind the premium you charge for.
2. **The Booking ↔ Consolidation seam.** Both write `ConsignmentLine` as a declared Shared Kernel,
   and Booking makes a synchronous capacity call into Consolidation. That is the coupling that's
   actually hurting, and hotspot #1 is it failing.
3. Routing, folded into (1).

## Caveat on the evidence

The claim that Consolidation is differentiating comes from the commercial director speaking as
`proxy` for customers — `business-model.md` flags this, and no customer has been interviewed. Before
you re-charter teams on it, talk to three customers. The Routing claim is on firmer ground: it came
from the depot planners, who work the step daily and rated it non-differentiating against their own
interest.

## Cheapest next step

One session to define "handed to carrier", with a depot planner and the customs clerk in the same
room and hotspot #3 on the agenda. That settles the timeline contradiction and the boundary in one
sitting. Cost: one hour. Compare against standing up a service and hiring a team.

---

I've written this up as `docs/domain/context-map-review.md` (draft, owner TBD) so it's reviewable
alongside the model. I did not change the classification table in `context-map.md` — that's a
modelling decision for the doc owner, not something to flip in a review.
