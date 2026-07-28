---
id: DOMAIN-FLOW-0000
title: govkit — domain message flows
status: draft
owner: baodq97
date: 2026-07-28
mode: connect
---

# Domain message flows

Three real journeys walked message by message across the boundaries in `../context-map.md`, to
find out whether that cut survives motion. Input: `packages/govkit/src/**`, `govkit.yml`,
`AGENTS.md`, `package.json`, `docs/rfc/**`, and 151 lines of `.govkit/journal.jsonl`. There is no
workshop and no domain expert, so **no message here was invented**: every name is either a symbol
in the code, a transition listed in `govkit.yml:141-153`, or a shell command in `package.json:23-28`.

Messages typed as queries with a `→` carry their response inline, because the sender is blocked in
between. Messages the code names differently from this model are flagged in the flow that uses
them.

## The flows, and why these three

| Id | Scenario | Role | Why this one |
|---|---|---|---|
| [0001](DOMAIN-FLOW-0001-gate-run.md) | A gate run — one `bun run check` | happy path | the design's own story; five contexts on the critical path before an exit code |
| [0002](DOMAIN-FLOW-0002-status-ratification.md) | An R1 status flip, evidence to accept commit | the path with authority on it | the one journey where the rules are real and the enforcement is deliberately absent |
| [0003](DOMAIN-FLOW-0003-drift-ack-refused.md) | A drift acknowledgement, one doc refused | failure path | the rejection branch — and the only one in this model as developed as its happy twin |

**Not traced, and why.** `init --adopt` on a brownfield corpus is the obvious fourth: it crosses
Adoption → GovernanceSchema → StructuralGate and would exercise the sentinel contract end to end.
It is omitted because it has never been run against a real foreign corpus from this repo — both
proving grounds are external (`PRD-0001:97-100`), so the flow would be drawn from code alone and
would validate the design against its own implementation. Calibration's corpus run is likewise
untraced: it crosses one boundary, to `runEval`, which teaches nothing about the cut.

Three flows over twelve contexts is therefore a **biased sample** — it exercises the gate spine
hard and the adoption on-ramp not at all.

## The refutation triggers

`4-connect` names two conditions that refute a decomposition outright: **more than 9 messages in
one scenario**, or **one context appearing at every step**.

| Trigger | Result |
|---|---|
| >9 messages | **Not fired.** 7, 7 and 8 messages. |
| A context at every step | **Not fired.** No context appears in all three flows; StructuralGate appears in 0001 and 0002, Reconciliation only in 0003. |

The cut is **not refuted**. `../context-map.md` is not stale.

## Consolidated findings

| # | Flow | Smell | Status |
|---|---|---|---|
| F-1 | 0001 | One event, no subscriber — eleven of twelve contexts communicate by synchronous return only | recorded (characteristic, not defect) |
| F-2 | 0001 | "Is this excused" implemented twice, in `verify.ts` and `eval.ts` | proposed → declined here; it would invert a dependency |
| F-3 | 0001 | Five contexts, one cross-context query, zero blocking round-trips | **clean result** |
| F-4 | 0001 | `calibrate` runs in CI but may not journal, so the north-star metric never reaches the sensor | proposed to owner |
| F-5 | 0002 | The R1 citation rule spans three messages and no context executes any of them | recorded (the model's honest boundary, per `RFC-0027:169-176`) |
| F-6 | 0002 | The sole deterministic proof in the flow checks two headings exist, not that they are honest | recorded |
| F-7 | 0002 | The whole reminder path is bypassable by using `Edit` instead of `Write` | open question |
| F-8 | 0002 | A `us: -> done` R1 flip has no deterministic proof at all | recorded; `RFC-0027:222-225` already flags it |
| F-9 | 0003 | The refusal branch is a peer of the success branch, not an error handler | **clean result** |
| F-10 | 0003 | "The owner re-read the design" is the load-bearing step and has no message | open question |
| F-11 | 0003 | `drift --ack` is an R1 transition that cites nothing and records no citation | proposed to owner |
| F-12 | 0003 | One claim vouches for an entire `governs:` list | recorded |

**Two clean results and no refutation.** That is the honest headline: the boundaries hold under
motion. The findings that matter are not coupling problems — they are three places where a rule
exists with no message carrying it (F-5, F-10, F-11), which is what you get when a domain's
central concept is *authorisation* and its engine is deliberately stateless.

## Proposed changes handed back to `3-decompose`

None applied here. Two candidates, both gated on an owner decision:

1. **Fold `LifecycleReport` into `StructuralGate`** — it appears in no flow at all, which is itself
   evidence. See `lifecycle-report/README.md`.
2. **Let `calibrate` journal** (F-4) — additive to the `cmd` union; it would give the north-star
   metric a message in flow 0001.
