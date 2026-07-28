---
id: DOMAIN-0007
title: Ratification bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0012, RFC-0024, RFC-0027]
related_adrs: []
---

# Ratification bounded context

## Purpose

Decides **who** may advance a governed document's status, and on what evidence — separating the
commitments that are costly to reverse, which always need a human in the room, from the ones that
merely write down something already proven, which the lead may transcribe if the proof is cited.
It serves the **owner**, whose attention is the scarce resource, and the **lead**, who otherwise
waits on a confirmation that adds no judgement.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — demoted from the prior pass's `core` | `model.yaml`; `core-domain-chart.md` |
| Business-model role | interrupt-load reducer, measured at 3 bookkeeping ratifications in 5 | `RFC-0027:52-73` |
| Evolution | genesis — the honor-system tier, given a committed text | `RFC-0027:19-20` |

Not re-derived. No source in this repo claims market differentiation for it; its measured value is
an internal cost saving.

## Domain roles

**Policy context, with zero runtime enforcement.** It is the only context here whose invariants no
code executes — and `RFC-0027:169-176` argues that is honest rather than lazy: a stateless, no-git
gate cannot see a transition at all (a doc born at `accepted` is indistinguishable from one
legitimately advanced), and teaching it to would need git history or persisted state, breaking the
no-key CI invariant. So the rule lives where the actor that performs the transition already runs.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | StructuralGate + QualityEval | the full-gate verdict R1's first condition names | query | conformist — the gates do not know this context exists |
| in | Reconciliation | `drift --ack`, itself an R1 transition | — | conformist |
| in | gate-loop packet | an independent verify + an independent red team, with a `runId` | — | customer/supplier |
| out | the accept commit | the flip, citing the packet `runId` **and** `govkit.yml@<sha>` | — (git commit) | **published language** — the citation is the audit trail |
| out | WriteTimeAudit | the two reminders that are the only code reflecting this policy | — | published language, unenforced |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| One-way door | a commitment costly to reverse — accept, approve, supersede, release | — |
| Recording of reality | writing down a state already true and already proven; nothing is decided | — |
| Packet | a gate-loop artifact carrying an independent verify + red team | — |
| Accept commit | the separate commit that performs the flip and carries the citation | — |
| Honor-system | the third trust tier: a rule that binds because you follow it | shared with `README.md:64-66` |
| `--ack` | an R1 transition here; a byte-span rewrite in Reconciliation | **yes** |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Auditability | every R1 flip must be reconstructible from its commit message alone | — | `govkit.yml:151` | **yes** — the citation is part of the transition, not metadata about it |
| Interrupt load | the measured target: remove the bookkeeping half | 3 of 5 events | `RFC-0027:52-73` | yes |
| Non-enforcement | must not require git or state in the gate | — | `RFC-0027:169-176` | **yes** — it is why this context has no code at all |
| Audit latency | the distiller's R1 audit is after the fact, so a bad flip lives until the next DISTILL run | unbounded | `RFC-0027:209-215` | recorded as an open question by the RFC itself |

## Assumptions

*Stated.* That the deterministic gate plus a two-agent packet have already done the checking a
human ratification would re-do by eye (`RFC-0027:91-94`).

*Inferred, and therefore attackable.* That a packet's red team is genuinely independent — nothing
in the repo verifies which model or agent produced a verdict. That the lead reads the packet before
citing it: the citation proves a packet *exists*, not that anyone opened it. That "this slice" is
unambiguous — `packet_exists` names no matching rule, so a stale packet from a neighbouring slice
would satisfy the condition textually. `RFC-0027:209-215` raises the age question and leans
acceptable without settling it.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| R1 flip commits whose cited packet was red, or that cite no packet | the escape rate the compensating control exists to catch | git log + the packets; the distiller's audit duty (`RFC-0027:152-156`) — **collectable today** |
| Ratifications per slice, split R0 / R1 / R2 | whether the measured 3-in-5 bookkeeping share actually fell | git history of status flips — **collectable today; RFC-0027:229-234 records the first data point: 1 R0, 0 bookkeeping asks** |
| Median age of the cited packet at flip time | whether the unbounded-latency open question is real | git timestamps |
| R0 transitions performed without an in-session ask | the one failure this scheme must never have | git log + session record |

## Open questions

- **Nothing in the repo checks a citation.** `drift --ack` is R1 (`govkit.yml:146`) and `drift.ts`
  reads no packet and no policy sha. Same for every other R1 transition. That is by design, and it
  means every metric above is a *post-hoc audit*, never a gate.
- **`packet_exists` has no matching rule.** Nothing binds a packet to the slice it certifies.
- **The owner's global instruction still says "never self-flip"** without the R1 carve-out;
  `RFC-0027:216-221` flags the amendment as out of this repo's scope and it is not recorded here as
  done. *Owner.*
- **One data point.** The scheme has been exercised once (`RFC-0027:229-234`).
