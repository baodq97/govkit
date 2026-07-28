---
id: DOMAIN-PLAN-0001
title: Nordic Freight — sequenced next steps
status: draft
owner: TBD
date: 2026-07-27
---

Findings referenced as F1–F12 are in `ASSESSMENT.md`.

## The two tracks

The work splits by who has to be in the room, so the two halves run in parallel:

- **Track A (strategy).** Commercial director, whoever owns the P&L, customers. Answers *which
  contexts deserve investment.*
- **Track B (model repair).** Engineering plus the depot planners. Fixes the seam that already
  caused an incident.

Neither blocks the other. Track B's fix is correct regardless of how Track A classifies
Consolidation, because it is a correctness fix, not an investment one.

---

## Track A: strategy

### A1. Reclassification session (90 minutes, this week)

**Why first:** every "should we build this?" question downstream is answered by the labels in
`context-map.md`, and four of seven currently read `core` (F1). Until that is fixed, the map cannot
direct anything.

**In the room:** commercial director (owns the differentiation claim), a depot planner (owns the
consolidation reality), whoever can be found nearest the P&L, two engineers.

**Input:** the mass table in `ASSESSMENT.md` §2, and the `differentiation` / `evolution_stage`
columns already in `business-model.md`.

**The question to put on the table:** the capability the business charges an 18% premium for holds
7% of the model; the two capabilities nobody chooses us for hold 67%. Which of those two facts is
wrong?

**Output:** a revised sub-domain table in `context-map.md` citing, for each row, the differentiation
and evolution-stage evidence. Reason from defensibility. Size and closeness to the customer are the
reasons that produced the labels you are replacing.

**Decision owner:** commercial director. Engineering proposes; it does not decide this.

### A2. Buy/build stance for Customs and Invoicing (after A1)

Only if A1 lands them as generic. `customs/model.yaml` already notes two commercial platforms cover
all nine ports and we integrate with neither; Invoicing is eleven years old with three of five
aggregates existing to model VAT variation.

Cost it before deciding anything. Needed: vendor pricing, migration cost, switching risk, and the
real schema behind the `mass` figures. The output is a comparison, and it belongs in an ADR rather
than in the domain docs.

### A3. Talk to customers (start now, runs alongside everything)

Four or five conversations with exporters shipping part loads. Two questions, both open in
`business-model.md`:

1. Why did you choose us? (tests the `differentiation: yes` on consolidation, currently `proxy`)
2. Would you pay for a guaranteed departure window as its own product? (the doc's own open
   question, never asked)

This is the only step that produces new evidence rather than reorganising existing evidence. If
answer 1 does not name container fill or departure reliability, A1's reclassification is built on
sand and should be revisited.

Also chase the cost structure. Nobody in the room owned the P&L, which means nobody currently knows
whether the premium is profitable.

### A4. Ownership and teams (before any restructuring)

There is no team list, headcount or ownership record anywhere in the repo (F8), so no context has a
named owner and every governed doc reads `owner: TBD`. Two hotspots are ownership disputes that the
model cannot settle by itself.

Minimum viable input: who currently works on each of the seven contexts, and how many of them.
Until that exists, boundary-versus-team alignment cannot be assessed, and neither can the risk that
the differentiating capability lives in four planners' heads and a whiteboard.

---

## Track B: model repair

### B1. Fix the Booking/Consolidation seam (highest-value engineering work available)

Already caused a production incident (hotspot 1: two shipments in one slot, March). Sequence:

1. **Move the decision to the invariant.** Replace the read-then-command pattern with one command,
   `ReserveCapacity(bookingId, volumeM3)`, handled inside the `ContainerLoad` aggregate. Delete the
   synchronous remaining-capacity read from `booking/model.yaml`. Consolidation decides; Booking
   asks. (F2)
2. **Add the refusal event.** `CapacityRefused` does not exist, and step 1 cannot be expressed
   without it. Add `ShipmentBumped` at the same time; the planners stated it as a business rule and
   nobody modelled it. (F6)
3. **Restate Booking's invariant as a reaction.** *"A booking may only be confirmed once its
   capacity has been reserved"* becomes a response to `CapacityReserved` / `CapacityRefused`, not a
   precondition Booking evaluates.
4. **Dissolve the shared kernel.** `ConsignmentLine` is currently written by both contexts with
   divergent attributes (F3). The shared field, `volumeM3`, is what the contested invariant is
   computed from, so steps 1–3 are not safe until one context owns it. Likely resolution: two
   concepts under separate names, one for what the customer hands over and one for what has to be
   stacked.

Step 4 is the one that will take a modelling session with the planners rather than an afternoon.

### B2. Model the failure paths (one session with the planners and the customs clerk)

All 11 events in `discovery/timeline.md` describe success (F6). All three hotspots describe
failure. Walk the timeline backwards and ask what happens when each step refuses:

- Carrier refuses a sealed container (hotspot 3, explicitly unowned).
- Customs rejects rather than clears a declaration.
- An invoice is never paid. Invoicing declares `DunningCase` and `PaymentAllocation` and emits only
  `InvoiceIssued`.
- A quote expires between issue and booking.

Assign each new event to exactly one owning context as it is discovered. That assignment is the
output, more than the event list.

### B3. Fix the context map's mechanics (half a day, no meeting required)

1. **Close the Customs/Routing gap.** Routing performs the handover; Customs owns the rule that
   gates it; there is no edge between them and no way for Routing to comply (F5). Add the edge and
   name the mechanism.
2. **Define the direction notation and fix the inverted edge.** `{to: X, type: downstream}` appears
   to mean "I am downstream of X." Write that down, then fix `routing/model.yaml`, where the
   PartnerNetwork edge is inverted (F7).
3. **Add an integration pattern to every relationship.** Nothing in the repo declares an ACL, an
   Open-Host Service, a Published Language, Conformist or Customer/Supplier (F7). Start with the
   three seams where it is load-bearing: PartnerNetwork (external), Customs (buy candidate),
   Invoicing (replacement candidate).
4. **Record the `Consignment` collision.** Note explicitly in both `booking/model.yaml` and
   `invoicing/model.yaml` that the term differs by design, and declare the translation at the seam
   (F9). Otherwise someone will unify them into one field and call it a cleanup.

### B4. Settle Routing's status (after B2)

Routing owns no rule today (F10), but the two unowned responsibilities, carrier acceptance/refusal
and the pre-handover customs gate, both sit at that point in the flow. Make the call in the open:
grow Routing into a context that owns them, or fold it into Booking and place those
responsibilities somewhere named. B2 supplies the evidence, so do not decide before it.

### B5. Schema for the tactical models (an afternoon, do it while B1 is in flight)

The seven `model.yaml` files have drifted (F11): events nested in five files and top-level in two,
`ubiquitous_language` missing from three, four Invoicing aggregates that are names with nothing
under them, and no field to hold the integration pattern B3 needs to record.

Write one template, add a validator to CI, backfill. The absence of one is why nobody caught the
F1 contradictions for four months.

---

## What to leave alone for now

- **Invoicing's 128-attribute entity** (F12). Real, and pointless to redesign before A2 decides
  whether the system stays.
- **Customs' tactical model.** Same reason.
- **Consolidation's model depth.** It is thin: one aggregate, no value objects, planning partly on
  a whiteboard. If A1 lands it as core, that is where modelling effort should go next, but
  deepening it before the classification is confirmed is guessing.
- **Re-running discovery.** The timeline is 10-of-11 confirmed. What is missing is failure paths
  (B2) and customers (A3), not another pass over the happy path.

## Order, if only one thing gets done

1. **A1**. 90 minutes, unblocks every investment question, needs no new data.
2. **B1**. Fixes a defect that already broke the premium product once.
3. **A3**. The only new evidence, and the rest of Track A rests on it.

## Open decisions needing a human

| # | Decision | Owner | Blocked on |
|---|---|---|---|
| 1 | Confirm or reject the reclassification in `ASSESSMENT.md` F1 | Commercial director | A1 |
| 2 | Buy or keep Customs | Commercial director + engineering lead | A2 costing |
| 3 | Buy, keep or rewrite Invoicing | Same | A2 costing |
| 4 | Split or unify `ConsignmentLine` | Engineering + depot planners | B1 step 4 |
| 5 | Routing: grow, fold or delete | Engineering lead | B2 |
| 6 | Who owns each context | Whoever owns headcount | A4 |

No status in `docs/domain/` should be advanced past `draft`, and no `owner: TBD` filled in, until
the person named in each row has actually said so.
