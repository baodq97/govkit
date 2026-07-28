---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

## What this is

Three business scenarios walked message by message across the boundaries in `docs/domain/`, to test
whether the split holds. Findings are **proposed** here and merged by `3-decompose`; unconfirmed
events go back to `2-discover`. Nothing under `docs/domain/` was edited by this pass.

## Flows and why they were chosen

| Flow | Scenario | Role | Contexts touched |
|---|---|---|---|
| [DOMAIN-FLOW-0001](DOMAIN-FLOW-0001-book-a-part-load.md) | Book a part-load shipment on a departure | **happy path** — the design's own story | Quoting, Booking, Consolidation, Routing (+ Partner Network) |
| [DOMAIN-FLOW-0002](DOMAIN-FLOW-0002-premium-billed.md) | Guaranteed Consolidation premium — sealed, cleared, billed | **money on it** — the +18% premium is the revenue stream in `business-model.md` | Consolidation, Customs, Invoicing, Notifications |
| [DOMAIN-FLOW-0003](DOMAIN-FLOW-0003-last-slot-race.md) | Two bookings race for the last slot | **failure path** + discovery hotspot #1 | Booking, Consolidation |

Not drawn, and why: hotspot #3 (a partner carrier refuses a sealed container) has **no messages in
the model** — drawing it would have meant inventing them. It is recorded as an absence, not a flow.

## Verdict

**The split does not hold up on the Booking ↔ Consolidation seam.** Everywhere else it does better
than expected.

- The seam that fails: every booking is a **check-then-act pair across a boundary** (F1) enforcing an
  invariant **Consolidation owns** (F2, F14). DOMAIN-FLOW-0003 shows the March double-commit
  reproducing from the model as drawn, with message numbers — it is not an operator error.
- The seam that works: Consolidation → Customs → Invoicing is four events, zero queries, no cycles
  (DOMAIN-FLOW-0002). Recorded as evidence the post-departure split is sound.
- The hole that is bigger than any smell: **the model contains no failure message at all** (F15) —
  11 events, all success-shaped, on a product whose value proposition is a *guaranteed* slot.
- The money does not reach the invoice: no message carries the booking or the premium into Invoicing
  (F8). The paid scenario cannot complete with the messages that exist.

### Loop-back trigger (step 4)

The two conditions that refute a decomposition outright were checked explicitly:

| Condition | Result |
|---|---|
| > 9 messages in one scenario | **Not fired.** 7 / 6 / 7+1. Longest is 7 |
| one context appearing at every step | **Not fired — but read the note.** Booking appears in 8/8 of DOMAIN-FLOW-0003 and 6/7 of DOMAIN-FLOW-0001; Consolidation appears in all three flows. Neither is a god context: both *decide* something they own. Flow 0003 involves only two contexts by construction, so its every-step count is an artefact of the scenario, not evidence of a hop |

So `3-decompose` is **not** stale by the loop-back rule. It is stale by ordinary evidence: F13/F14
and F15 are boundary defects with message numbers on them.

## Consolidated findings

| # | Flow | Smell | Evidence | Proposed change | Status |
|---|---|---|---|---|---|
| F1 | 0001 | Check-then-act across a boundary | msgs 3 → 4 | collapse into one `ReserveCapacity` Consolidation accepts or rejects | proposed |
| F2 | 0001 | Distributed invariant — capacity | msg 3 vs `consolidation/model.yaml` invariant | capacity rule is Consolidation's alone | proposed |
| F3 | 0001 | Distributed invariant — quote validity | msg 1; no message checks `validUntil` | model the check, or carry `validUntil` on `QuoteIssued` | proposed |
| F4 | 0001 | Ordering contradiction | msg 6→7 vs Customs invariant, timeline #6 before #8 | decide who owns "no handover before declaration" | proposed |
| F5 | 0001 | Missing rejection | whole flow | see F15 | proposed |
| F6 | 0001 | Shared-kernel write | msgs 3–5 carry `volumeM3`; `ConsignmentLine` written by both | one owner; the two definitions look like two concepts | proposed |
| F7 | 0001 | Pass-through (Routing) | msg 7 only; "owns no rule of its own" | **hold** — decide after hotspot #3 is discovered | proposed |
| F8 | 0002 | Revenue never reaches the invoice | msgs 2–4 carry no bookingId/premium | Booking must publish a billable fact Invoicing consumes | proposed |
| F9 | 0002 | Correlation lost between hops | msgs 2 → 3 → 4, three unrelated ids | put `shipmentRef` on the messages | proposed |
| F10 | 0002 | Distributed invariant — billability | msg 4 vs "premium charged whether or not full" | ask finance which rule wins | proposed |
| F11 | 0002 | Event as disguised command | msg 4, single consumer that must act | accept the dependency or move the trigger | proposed |
| F12 | 0002 | Unconfirmed event on a paid path | msg 6, timeline #11 *candidate* | → `2-discover`, do not promote | proposed |
| F13 | 0003 | Check-then-act race, demonstrated | msgs 2,4 both = 8 m³; 5,7 both commit 6 m³ | delete the query; command + `CapacityRefused` | proposed |
| F14 | 0003 | Distributed invariant broken in-flow | msg 7 | enforce inside `ContainerLoad`, one command per transaction | proposed |
| F15 | 0003 | **No failure path in the model** | msg 8 (absence); 11/11 events success-shaped | add `CapacityRefused`, `BookingRejected`, a bump fact | proposed |
| F16 | 0003 | Compensation unnamed | planner's bump rule appears in no model | name the compensation and its owner | proposed |
| F17 | 0003 | Two queries, one misplaced decision | msgs 2, 4 | move the decision, not the data | proposed |
| — | 0002 | *Clean:* Consolidation → Customs → Invoicing | msgs 2–5, 0 queries | keep the split | proposed |

## Handoffs

**To `3-decompose` (update mode)** — F1/F2/F13/F14/F17 are one change: Booking sends a single
`ReserveCapacity` command; Consolidation answers `CapacityReserved` or `CapacityRefused` and owns the
capacity invariant end to end. Then F15/F16 (failure and compensation vocabulary), F8/F9 (a billable
fact from Booking to Invoicing, `shipmentRef` on the messages), F6 (one owner for `ConsignmentLine`),
F4 (who owns the pre-handover rule). None applied here.

**To `2-discover`** — confirm `CustomerNotified` (F12); name the commands between Booking and
Consolidation, which the model does not have; get hotspot #3 onto a timeline so DOMAIN-FLOW-0004 can
be drawn; answer Q1/Q2 in DOMAIN-FLOW-0002 (the `after` vs `every` invoicing trigger).

**Out of scope, noted once:** `context-map.md` classifies Invoicing as *core* while
`business-model.md` records its differentiation as *"no — nobody has ever chosen us because of our
invoices"*. Not a flow finding; raised because `3-decompose` will touch that table anyway.
