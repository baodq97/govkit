---
id: DOMAIN-FLOW-INDEX
title: Nordic Freight — domain message flows
status: draft
owner: TBD
date: 2026-07-28
---

## What was asked, and what was drawn

The request was to trace the full quote-to-invoice lifecycle as *one* domain message flow. Drawn
as one flow it comes to **13 messages across 7 bounded contexts, 2 actors and 1 external system**.
That is over the 5-to-9 rule and over the 4-context threshold, so the overflow was treated as a
finding rather than a layout problem (F0) and the lifecycle is delivered as **three composed
flows**. Read end to end, FLOW-0001 → FLOW-0002 is the whole lifecycle; FLOW-0003 is what happens
when it goes wrong.

| Flow | Scenario | Role | Why this one | Messages | Contexts |
|---|---|---|---|---|---|
| [DOMAIN-FLOW-0001](DOMAIN-FLOW-0001-quote-to-confirmed-booking.md) | Quote to confirmed booking, on the road | happy path | the design's own story, and the first half of the lifecycle | 8 | 4 |
| [DOMAIN-FLOW-0002](DOMAIN-FLOW-0002-sealed-container-to-invoice.md) | Sealed container, cleared and invoiced | the path with money on it | carries the Guaranteed Consolidation premium (+18% of the forwarding fee), the revenue stream the business is built on | 5 | 4 |
| [DOMAIN-FLOW-0003](DOMAIN-FLOW-0003-carrier-refuses-sealed-container.md) | A partner carrier refuses a sealed container | failure path | discovery hotspot #3 — *"nobody knows who is responsible"* | 4 real, 3 absent | 4 |

Not traced: quote expiry and re-quote (single context, crosses no boundary), dunning and credit
notes (Invoicing-internal — three of its five aggregates model VAT variation, not lifecycle). Say
if one of those is the scenario the team actually argues about.

## Grounding

Flows built from a discovered timeline are grounded; flows built from context names alone are
speculation. **These are grounded.** `discovery/timeline.md` records an interview-mode session —
two depot planners, a customs clerk, a finance analyst, three engineers — and 10 of its 11 events
are confirmed by a named role. Every message drawn is one of those events, or is the
`"synchronous remaining-capacity check before reserving"` declared in `booking/model.yaml`.

Two caveats a reader should carry:

- **No customer was present** at discovery or at the business-model session. The exporter appears
  as an actor in FLOW-0001 and FLOW-0002 and nobody in the room spoke for them directly.
- `CustomerNotified` is marked *candidate* in the timeline — inferred from notification templates,
  never confirmed. It is the last message of the lifecycle and it is the weakest one.

**Tooling note.** `ddd_context.py --step 4-connect` reported *Discovery — nothing on disk*. It
looks for `docs/domain/discovery/model.json`; this repo has `docs/domain/discovery/timeline.md`.
The discovery grounding above was read from that file directly. The pack under-reported; the repo
is fine.

## Consolidated findings

`status` is for the human doc owner. Everything below is `proposed`; nothing has been accepted, and
**no `model.yaml` or the context map was edited** — `3-decompose` owns the model.

| # | Flow | Smell | Evidence | Hands to | Status |
|---|---|---|---|---|---|
| F0 | all | Lifecycle overflow — 13 messages, 7 contexts as one flow | the union of FLOW-0001..0003; 7 contexts is well over the 4-context prompt | see verdict below | proposed |
| F1 | 0001 | Check-then-act across a boundary | 4–5, the only boundary-crossing query in the lifecycle | `3-decompose` | proposed |
| F2 | 0001 | Distributed invariant — capacity | 4–6; rule owned by `ContainerLoad`, enforced by Booking | `3-decompose` | proposed |
| F3 | 0001 | Pass-through — Routing | 7–8; `aggregates: []`, *"owns no rule of its own"* | `3-decompose` | proposed |
| F4 | 0001 | Shared Kernel `ConsignmentLine` crosses no message | absent from contents 1–8; divergent attributes in the two models | `3-decompose` | proposed |
| F5 | 0002 | Distributed invariant + ordering contradiction — customs gate | FLOW-0001 msg 8 vs FLOW-0002 msg 2; timeline #6 precedes #8, violating a confirmed rule | `2-discover` | proposed |
| F6 | 0002 | Missing message — no price reaches Invoicing | 3–4; `InvoiceIssued.total` has no modelled input | `2-discover` | proposed |
| F7 | 0002 | Pass-through — Notifications, but legitimate | 4–5; generic subdomain, bought adapter | keep; annotate the map | proposed |
| F8 | 0002 | **Clean** — Invoicing's mass is internal, not connective | 1 of 13 lifecycle messages, 311 attributes | none | proposed |
| F9 | 0003 | No rejection message anywhere in the model | 11 discovered events, all past-tense successes; 3 refusal points unmodelled | `2-discover` | proposed |
| F10 | 0003 | Ownership vacuum, unnamed compensations | after msg 4 nothing is received; capacity and declaration both left wrong | `2-discover` | proposed |
| F11 | 0003 | Pass-through — Routing, second occurrence | 3–4 here plus 7–8 in FLOW-0001; the hop has nowhere to put a refusal | `3-decompose` | proposed |

## Verdict on F0 — does the loop-back trigger fire?

The trigger is: *more than 9 messages in one scenario, or one context appearing at every step ⇒ go
back and re-cut*. Both were checked, and the honest answer is that **neither fires**, for reasons
worth writing down rather than waving through:

- **Message count.** The 13-message diagram is not one scenario. Quote-to-invoice is a value
  stream, and the notation's first explanation for overflow — *two scenarios wearing one name* —
  is what happened here. Split on business boundaries the flows come to 8, 5 and 4. **No single
  scenario exceeds 9**, so message count does not refute the cut.
- **God context.** Consolidation appears in all three flows, which is the god-context prompt. It
  does not fire: the test is whether the context *decides* anything, and Consolidation owns the
  capacity invariant, the fill rate and the load-planning know-how the business model names as the
  differentiator. It decides more than anyone. Recorded so the next reviewer does not re-raise it.

What does survive the split is the **7 contexts on one lifecycle path**, two of which (Routing,
Notifications) make no decision. The re-cut case rests on that — F3 plus F11 — and on nothing else.
Removing Routing takes the lifecycle to six contexts and removes a hop that provably cannot handle
the failure path.

## What goes back, and to whom

**To `3-decompose` (update mode), as proposed changes:** F1+F2 together — collapse the
check-then-act pair into one `ReserveCapacity` command Consolidation accepts or rejects, and record
the capacity invariant as Consolidation's alone. F3+F11 — resolve Routing, either by giving it real
responsibility or deleting the hop. F4 — decide whether `ConsignmentLine`'s shared write is
deliberate.

**To `2-discover`, to confirm with people — not to be promoted to events by inference:** F5 (the
customs ordering contradiction: a confirmed rule and a confirmed timeline disagree, and one of them
is wrong), F6 (how price and the premium reach an invoice), F9 and F10 (the three refusals and
their compensations).

The single most valuable thing these flows produced is F9 read together with F0: the lifecycle is
long because every step succeeds. Thirteen messages and not one of them is the word *no*.
