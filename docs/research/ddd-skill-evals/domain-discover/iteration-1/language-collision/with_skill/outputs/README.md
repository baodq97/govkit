---
id: DOMAIN-DISC-0001
title: Equipment depot transfers & availability — discovery session 2026-07-27
status: draft
owner: TBD
date: 2026-07-27
mode: interview
technique: eventstorming-big-picture
---

## Mode

**INTERVIEW.** Brand new repo — no PRDs, ADRs, schemas or domain layer to ground against, so there
was no candidate-mining pass. Every element below came from a person in the session, which is why
nothing carries `status: candidate`. Read that carefully: `confirmed` here means *a participant said
it*, not *the participants agree*. Ops and Finance contradicted each other on the transfer charge
and the contradiction is unresolved (HS-1).

## Who was in the room

| Role | Present | Notes |
|---|---|---|
| Domain expert — Operations | yes — Ha | source for the physical transfer flow and the out-of-service flow |
| Domain expert — Finance | yes — Minh | source for the charge; explicitly disclaimed the physical move ("not my problem") |
| Depot Manager | **no** | owns the out-of-service decision (element 13); that flow is described second-hand by Ha |
| Driver / whoever performs the move | **no** | the actor on element 7 stayed "someone" |
| Real end user (Contractor) | **no** | anything about what contractors expect — including cancellation behaviour under HS-1 — is inference, not evidence |
| Product / business strategy | **no** | nobody could speak to why the charge is £180 or whether it is fixed |
| Developers / testers | **no** | no statement about what any system enforces today |

The missing depot manager and the missing contractor matter more than the usual attendance
disclaimer: the two most valuable findings of the session (HS-1, HS-3) sit exactly where those two
people would have spoken.

## Coverage

**Covered**
- The depot-to-depot transfer flow, request → raise → dispatch → arrival → marked available.
- The billing side of the same flow, as Finance sees it (charge on request).
- The out-of-service flow and its manual reservation-cancellation step.
- One invariant, stated with feeling and with an incident behind it (INV-1).

**Not covered**
- *Enforcement.* Ha asserts double-commitment "can't" happen, but a 2023 incident says it did, and
  nobody described what stops it. See HS-4.
- *The in-transit window.* What state the unit and its reservation are in between dispatch and
  arrival was never asked. The timeline has an explicit hole between elements 7 and 9.
- *The reservation itself.* "Reservation", "booked" and "committed" were all used; none was defined.
- *Money mechanics.* Whether £180 is fixed, per-unit or per-move; who the invoice goes to; whether a
  charge can be reversed. Minh named the amount and nothing else.
- *Aggregates and context boundaries.* Deliberately out of scope — that is `domain-decompose`'s job,
  and the "Transfer" collision below is precisely the input it needs to do it.

## Confidence

**16 confirmed elements · 0 unconfirmed candidates · 1 invariant · 5 open hotspots.**

Honest reading: this is one 15-minute conversation with two of the six roles that should have been
present. The transfer flow is solid enough to model. The charge lifecycle is *not* — two people
described mutually exclusive rules and the session parked it rather than picking one.

## Session artifacts

| File | Contents |
|---|---|
| `timeline.md` | the event storm in time order, plus INV-1 |
| `ubiquitous-language.md` | terms with holders — including the "Transfer" collision |
| `hotspots.md` | the 5 open questions |
| `model.json` | machine-readable payload (same content, renderable by the preview surface) |

**On the visual surface:** this run replayed a transcript after the fact, so no live wall was run —
the participants were no longer present to watch the model form. `model.json` is written in the
preview-server format so the next round can open it as a wall from the first minute, which is where
it belongs. A transcript replay is not a substitute for the room.

**`model.json` schema note:** carries one additive key beyond the template, `invariants`. INV-1 is
neither an event nor a policy and dropping it into the timeline would have mislabelled the single
most load-bearing rule in the session. Existing keys are unchanged.

## Next step

`domain-decompose` consumes `timeline.md` and `ubiquitous-language.md` as its step-2 input.

Two things to carry forward explicitly:

1. **The "Transfer" collision is the headline finding.** Ops means a truck; Finance means a £180
   invoice line. Do not reconcile it into one word — the two meanings have different lifecycles
   (Finance's begins at request and survives cancellation; Ops's begins at dispatch and ends at
   arrival), and that divergence is the boundary signal.
2. **The decomposition will be exactly as good as this discovery was**, and this discovery is one
   conversation short of trustworthy on the money side. Any modelling of the charge lifecycle should
   be treated as provisional until HS-1 is answered by someone with authority to answer it.

Recommended next round: Example Mapping on HS-1 (a rule dispute with concrete edges — cancel before
dispatch, after dispatch, after arrival), with the depot manager present for HS-3 and HS-5.
