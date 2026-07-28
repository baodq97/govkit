---
id: DOMAIN-FLOW-0000
title: Euro Parking — domain message flows
status: draft
owner: TBD
date: 2026-07-27
mode: connect
---

# Domain message flows

Four concrete scenarios walked message by message across the boundaries drawn in
`../context-map.md`, to find out whether that cut survives motion. Input: `docs/domain/` (10
contexts), `discovery/timeline.md` (elements 1–69), `discovery/hotspots.md` (H1–H19),
`EXPERT.md` (2026-07-27). No code, no schema, no wiki, and the expert is not available for
follow-up — so every gap below stays a gap.

**No message here was invented.** Names come from `discovery/timeline.md` or an emitting
`model.yaml`. Messages marked `*` in the flows are queries whose *relationship* the decompose
READMEs type as a query but which no source names; the name is the modeller's and is flagged in
each file. One message is drawn deliberately **unnamed** (`DOMAIN-FLOW-0002` #4, the payment
capture) because naming it would be fiction.

## The flows, and why these four

| Id | Scenario | Role | Why this one |
|---|---|---|---|
| [0001](DOMAIN-FLOW-0001-garage-entry.md) | Garage entry — admitted and sent to a bay | happy path | the design's own story; the only flow where four contexts are on the critical path before a barrier opens |
| [0002](DOMAIN-FLOW-0002-pay-then-exit.md) | Pay at the machine, then exit within the window | the path with money on it | the operator's parking revenue, the fiscal record, and the machine takings that feed reconciliation |
| [0003](DOMAIN-FLOW-0003-exit-refused.md) | Exit refused — window expired, driver pays the difference | failure path | the rejection branch the expert refuses to remove; models are built happy-path-first, so this is where missing language lives |
| [0004](DOMAIN-FLOW-0004-offline-exit-settled.md) | Offline exit at 2am, settled the next morning | known hotspot | the stated differentiator, the load-bearing extraction seam, and one of the two capabilities operators said they would pay for |

**Not traced, and why.** Occupancy reporting — the other paid-for capability — has no drawable
flow: H3 (a lot observes nothing), H14 (does a car in a truck bay count as a car or a truck?) and
H4 (are sensors trustworthy?) are all open, and `occupancy-insight/model.yaml` is deliberately
empty. Lost ticket (H12), remote let-out (H9) and the entitlement-bay report (H6) are the same
story: too little was said to draw them without inventing messages. Four driver-lifecycle flows is
therefore a **biased sample** — it tests the entry/exit spine hard and the operator's day barely.

## The refutation triggers

Two conditions refute a decomposition outright. Both were evaluated.

- **More than 9 messages in one scenario ⇒ go back and re-cut. THIS FIRED.**
  `DOMAIN-FLOW-0002` needs **11 messages**. It is not two scenarios: pay and exit are tied by the
  15-minute window, and `parking-visit/README.md` states they must stay in one aggregate for that
  reason. Six of the eleven are ParkingVisit ↔ TerminalOperations. `3-decompose` is **stale** as of
  this artifact and should re-run in update mode over PC-1.
- **One context appearing at every step ⇒ re-cut. Did not fire.** ParkingVisit and
  TerminalOperations each appear in all four flows, which meets the counting threshold, but the
  god-context test is whether the context *decides*: ParkingVisit owns admission, price and paid
  status; TerminalOperations owns the barrier, the stripe and the offline call. Both decide. The
  single exception is the entrance forward in `DOMAIN-FLOW-0001` messages 1–2 (finding 1.2).

## Counting checks

| Flow | Messages | Contexts | Cross-boundary queries | Busiest pair | Longest sync chain |
|---|---|---|---|---|---|
| 0001 garage entry | 9 | 6 | 2 | PV ↔ TO, 4 of 9 | 3 hops |
| 0002 pay then exit | **11** | 7 | 2 | **PV ↔ TO, 6 of 11** | 3 hops |
| 0003 exit refused | 9 | 5 | 2 | **PV ↔ TO, 5 of 9** | 3 hops |
| 0004 offline exit | 9 | **3** | 0 | — | 1 hop (no cross-context call) |

Thresholds: >9 messages, >4 contexts, >0 queries, ≥5 messages in a pair, >2 hops.

## Consolidated findings

`status` is `proposed` throughout: no human has reviewed these, and the expert is unavailable.

| # | Flow | Finding | Evidence | Status |
|---|---|---|---|---|
| 2.1 | 0002 | 11 messages in one scenario — the refutation trigger; the pay/exit boundary is the cause | 11 messages, 6 in one pair | proposed |
| 4.3 | 0004 | The reconciliation the operator would buy has one leg of three modelled — bank and coin box have no emitter | #6 needs three totals; only machine takings exist | proposed |
| 4.2 | 0004 | An offline exit reaches ParkingVisit and produces nothing — no exit time for a ten-year fiscal record | #5 has no consequent message | proposed |
| 2.3 | 0002 | The money leg has no named message anywhere in the model | `payment-capture/model.yaml`: `aggregates: []`, no events | proposed |
| 1.1 | 0001 | Distributed invariant: "no ticket when full" is decided against a projection of a supplier's sensors, with no named compensation | #3 → #4 → #6 | proposed |
| 2.5 / 4.4 | 0002, 0004 | The 15-minute window is enforced online and silently dropped offline | #6 writes `paidFlag` without `paidAt` (H10); 0004 #2 | proposed |
| 2.2 / 3.3 | 0002, 0003 | Chatty pair PV ↔ TO in two flows of four; silent in the third because the link is down | 6 of 11, 5 of 9 | proposed |
| 2.4 | 0002 | Nothing in the payment message identifies the visit; the card serves ~100 of them | H13 | proposed |
| 3.1 | 0003 | One `ExitRefused` event and one NOT PAID sign for two different refusals | #3 | proposed |
| 3.2 / 3.5 | 0003 | "The difference" has no stated calculation, and no rule says whether a fresh window starts | #6, after #8 | proposed |
| 1.4 | 0001 | The entry flow loses 2 of 9 messages in a lot; the assignment changes meaning | #3, #4, #6 | proposed |
| 1.2 | 0001 | Entrance terminal forwards without deciding — a hop, unless H18 makes it a boundary | #1 → #2 | proposed |
| 1.5 | 0001 | Bay assignment ownership unresolved; if the supplier assigns, #4 and #6 reverse | H1 | proposed |
| 4.5 | 0004 | The offline upload has no deadline; the claim path needs a plate deleted at 7 days | #5, H7 | proposed |
| 4.1 | 0004 | **Clean result:** the offline exit decides at the edge in 4 messages, 3 contexts, 0 queries — the seam works | 0004 #1–4 vs 0002 #7–10 | proposed |

## Proposed changes — handed to `3-decompose`, not applied

`3-decompose` owns the model: the stable ids, the reconciliation rules, the human edits and the
extraction seam. Nothing below was written into any `model.yaml`.

- **PC-1 — re-cut the ParkingVisit / TerminalOperations boundary around the exit decision.**
  Evidence: 0002 (11 messages, 6 in the pair), 0003 (5 of 9), 0004 (the same decision taken alone in
  4). *Option A:* the exit decision lives at the edge always — the terminal decides from the stripe
  online and offline, the system reconciles after. Keeps the seam the context map calls
  load-bearing and collapses 0002 #8. **Requires H10** (the stripe must carry `paidAt`).
  *Option B:* merge the two contexts and keep an offline mode inside — cheaper to reason about,
  destroys the seam that lets the edge open barriers while the centre is unreachable. **Recommend A,
  gated on H10.**
- **PC-2 — give ParkingVisit an explicit free-bay projection** fed by `BayOccupied` / `BayVacated`,
  and have the business name the compensation for a ticket issued into a full site. Gated on H4.
- **PC-3 — `PaymentCapture` must publish one named fact or be absorbed** into ParkingVisit; today
  it sits on the money leg of every paid flow and emits nothing. Gated on H9.
- **PC-4 — someone must own the bank and coin-box facts** for the three-way match, or
  `PaymentCapture`'s ACL widens to cover them. Gated on H9.
- **PC-5 — garage vs lot:** 0001 adds evidence to the split the context map left undecided (2 of 9
  messages have no lot equivalent). Still blocked on H2, H3, H17.

## Handed to `2-discover` — questions, not inferences

- **D-1** — what is the payment-captured fact called, and what does it carry? (H9)
- **D-2** — is the expired-window refusal a distinct event, and what does the sign show a driver who has already paid?
- **D-3** — how is "the difference" computed, does the daily cap apply again, and does a fresh 15-minute window start?
- **D-4** — what does ParkingVisit do with an uploaded offline exit, and does that exit produce a fiscal record?
- **D-5** — what identifies a visit, as distinct from the card? (H13)
- **D-6** — is there a deadline for uploading the offline log, given the 7-day plate deletion? (H7)

Existing hotspots these flows touched without resolving: H1, H2, H3, H4, H5, H7, H9, H10, H12,
H13, H15, H18. None were promoted; none were answered.
