# Nordic Freight — quote-to-invoice as domain message flows

I traced the lifecycle, but not as one flow. Drawn end to end it comes to **13 messages across 7
bounded contexts, 2 actors and 1 external system** — over the 5-to-9 rule and over the 4-context
threshold. That overflow is a finding, not a layout problem, so the lifecycle is delivered as three
composed flows. FLOW-0001 → FLOW-0002 read back to back *is* the full lifecycle; FLOW-0003 is what
happens when it goes wrong.

Written to `docs/domain/message-flows/` (all `status: draft`, `owner: TBD`):

| File | Scenario | Role | Messages |
|---|---|---|---|
| `DOMAIN-FLOW-0001-quote-to-confirmed-booking.md` | Quote to confirmed booking, on the road | happy path | 8 |
| `DOMAIN-FLOW-0002-sealed-container-to-invoice.md` | Sealed container, cleared and invoiced | the path with money on it (+18% Guaranteed Consolidation premium) | 5 |
| `DOMAIN-FLOW-0003-carrier-refuses-sealed-container.md` | A partner carrier refuses a sealed container | failure path (hotspot #3) | 4 real, 3 absent |
| `README.md` | index, grounding, consolidated findings, loop-back verdict | — | — |

No `model.yaml` and no context-map row was edited. `3-decompose` owns the model; everything below
is proposed.

## The three findings worth your time

**1. Two confirmed facts contradict each other (F5).** Customs' invariant says a shipment cannot be
handed to a carrier before its declaration is submitted. The discovered timeline puts
`ShipmentHandedToCarrier` at #6 and `DeclarationSubmitted` at #8. Worse, the hand-off is sent by
**Routing**, which never receives the declaration event and has no path to Customs on the map — so
even if the order were right, nothing enforces the rule. Either the rule has been quietly unenforced
for years or the timeline is wrong. Both were confirmed by named people, so this goes back to
`2-discover` with the clerk and a planner in the same room. Don't resolve it by picking the
convenient one.

**2. Thirteen messages and not one of them is the word "no" (F9).** All 11 discovered events are
past-tense successes. Three refusal points are reachable from the flows — capacity refused,
declaration rejected, carrier refuses — and none has a message. FLOW-0003 is short *because* of
this: I left the rows empty rather than invent `ShipmentRefused`, since a made-up message would
validate the design against fiction. After the hand-off nothing is received by anyone: Consolidation
still holds `committedM3` for a shipment that isn't moving, Customs holds a live declaration, the
customer is owed a premium refund, and Booking's `status` is never updated. Unnamed compensation is
an unhandled bug, not eventual consistency.

**3. The money path carries no money (F6).** Invoicing's only inbound message is
`DeclarationCleared {declarationId, clearedAt}`, and it emits `InvoiceIssued {..., total}`. Nothing
carries the quoted price, the +18% premium flag, or `fillRate` to Invoicing — `ContainerSealed`
carries `fillRate` to Customs, not to Invoicing. Either pricing is duplicated between Quoting and
Invoicing, or a message is missing. I did not propose one; ask the finance analyst who owns price at
invoice time.

## The located defect

Hotspot #1 — the March double-booking, "nobody agrees where the check should have happened" — is now
two message numbers. FLOW-0001 messages 4 and 5: Booking queries Consolidation for remaining
capacity, then commands the reservation, crossing the boundary in between. The gap is the race. The
no-overbook invariant is owned by `ContainerLoad` but enforced by Booking's pre-check — one rule,
two enforcers, unenforceable under concurrency. **Proposed to `3-decompose`:** collapse the pair into
one `ReserveCapacity` command Consolidation accepts or rejects, and record the invariant as
Consolidation's alone. The Guaranteed Consolidation premium is sold on that rule holding.

## Does the loop-back trigger fire?

**No — and I checked both conditions rather than waving them through.**

- *More than 9 messages in one scenario:* the 13-message diagram is not one scenario. Quote-to-invoice
  is a value stream. Split on business boundaries the flows come to 8, 5 and 4; none exceeds 9. Message
  count does not refute the cut — it refutes the framing of the request.
- *One context at every step:* Consolidation appears in all three flows, which is the prompt. It fails
  the test, because the test is whether the context *decides* anything, and Consolidation owns the
  capacity invariant, the fill rate and the load-planning know-how your business model names as the
  differentiator. Not a god context. Recorded so nobody re-raises it.

What survives the split is **7 contexts on one lifecycle path, two of which decide nothing**:

- **Routing** — `aggregates: []`, and its own file says *"It owns no rule of its own."* It receives
  `BookingConfirmed`, emits `ShipmentHandedToCarrier`, and that's all. The failure path is what makes
  this decisive: Routing is the only context positioned to catch the carrier refusal and it holds
  nothing to catch it with. Either give it real responsibility (lane contracts, hand-off state,
  refusals) or delete the hop and let Booking talk to the Partner Network. That takes the lifecycle to
  six contexts.
- **Notifications** — structurally identical, but *not* the same call. It's a `generic` subdomain
  wrapping a bought email/SMS provider; a thin adapter around a vendor is a legitimate boundary and the
  pass-through shape is the point. Keep it, and say why on the map.

## Two clean results, recorded

The whole back half of the lifecycle (FLOW-0002) is **event-driven with zero boundary-crossing
queries**. That part of the split is working, and it's worth having on record.

And Invoicing — 34 tables, 311 attributes, one entity at 128 attributes — contributes **1 of the 13
lifecycle messages**. Its mass is internal (VAT variation across nine ports, per its own notes), not
connective. Its size is a maintainability question for `3-decompose`; the message flow gives you no
evidence it's a coupling problem, so don't argue that case from this artefact.

## Grounding, and one caveat

These flows are grounded, not speculative: `discovery/timeline.md` is an interview-mode session with
two planners, a customs clerk and a finance analyst, and 10 of its 11 events are confirmed by a named
role. Every message drawn is one of those events, or is the `"synchronous remaining-capacity check
before reserving"` declared in `booking/model.yaml`.

Two things to carry: **no customer was in either session**, yet the exporter is the actor in two of
three flows. And `CustomerNotified` is marked *candidate* — inferred from templates, nobody confirmed
when it fires. It's the last message of the lifecycle and the weakest one.

Tooling note: `ddd_context.py --step 4-connect` reported *Discovery — nothing on disk*. It looks for
`docs/domain/discovery/model.json`; this repo has `discovery/timeline.md`. I read it directly. The
pack under-reported — your repo is fine, but a re-run will keep claiming the flows are ungrounded.

## What I'd do next

To `3-decompose` (update mode): F1+F2 (collapse check-then-act, move the invariant), F3+F11 (resolve
Routing), F4 (`ConsignmentLine` is a Shared Kernel written by two contexts with divergent attributes
and it crosses no message in any flow — the coupling is through storage, invisible on every diagram).

To `2-discover`, to confirm with people: F5, F6, F9, F10. None of these becomes an event on my
inference.

Scenarios I skipped: quote expiry and re-quote (single context, crosses no boundary), dunning and
credit notes (Invoicing-internal). If one of those is what the team actually argues about, say so and
I'll trace it.
