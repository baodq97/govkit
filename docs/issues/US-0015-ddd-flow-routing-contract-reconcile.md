---
id: US-0015
title: Reconcile the ddd-flow routing contract — US-0007/RFC-0032 F2 mandate a guard the shipped skills no longer carry
status: open
owner: TBD
date: 2026-08-01
priority: P1
parent: RFC-0032
---

As a govkit maintainer, I want the ddd-flow routing contract to say what the plugin actually does,
so that a reader of the governed record is not told the nine step skills are orchestrator-only when
every one of them is model-invocable.

## The disagreement

`US-0007` (`status: done`) and `RFC-0032` F2 require `disable-model-invocation: true` on the eight
numbered step skills and on `view`, so that `ddd-flow:design` is the single router. The thinning
work on `optimize/ddd-flow-thin` removed that key from all nine — `1-understand … 8-code` in
`f23287f`, `view` in `1fc872a` — and gave each a trigger-shaped description instead.

Neither commit flipped a status, so the record still reads as implemented. **The code and the
governed doc disagree, and the doc is the one a stranger would trust.**

## Why the reversal was made

- The key blocks **all** model invocation, including the orchestrator's own `Skill` call
  (documented behaviour in the skills reference). "Orchestrator-only" is therefore not what it
  buys: it buys human-slash-command-only, and the orchestrator has to inline the step's work —
  which is exactly what `design`'s first hard rule forbids, because the step skills carry rules
  that do not survive paraphrase.
- The operator directive on 2026-07-31 was to let the model hold the control flow and decide when
  to advance or go back, which a hard invocation guard prevents.
- `skill-lint` accepts either shape: trigger-shaped description, or the guard. Both pass today.

## Why it is not obviously right

- F2's original motivation stands: nine sibling skills with similar descriptions can mis-route.
  `skill-lint` still warns on two description collisions (`2-discover`↔`3-decompose`,
  `3-decompose`↔`7-define`), which is that risk, measured and unresolved.
- ~~No eval has been run on mis-routing specifically.~~ **Now measured — see below.**

## Measured (2026-08-01): a router-accuracy eval

44 utterances × 3 independent routers = 132 decisions. Ground truth was set from `steps.yml`
(`question:`/`artifacts:` — configuration describing what each step *does*); the corpus author was
forbidden to read the descriptions, and each router saw **only** the description surface — no repo,
no history. Utterance wording was lifted from the 68 verbatim operator turns of the btm pilot, half
Vietnamese, half English.

| Slice | Score |
|---|---|
| Overall | **129/132 (98%)** — all 3 errors are the same case, no router disagreed with another |
| Negatives (PRD, failing test, release, review, migration, CI) | **24/24 — zero false claims** |
| Orchestration · step-specific · view | 100% each |
| Vietnamese · English | 100% · 95% |
| Ambiguous | 3/4 |

**The negative rate is the number that matters**: not once did a ddd-flow skill claim a request
that was not its business. That is the exact failure mode F2's invocation guard was bought to
prevent, and it did not occur without the guard.

**The two `skill-lint` collisions are false alarms, as measured.** `2-discover`↔`3-decompose`
(55.2%) and `3-decompose`↔`7-define` (50.9%) produced **zero** errors in 132 decisions. The one
real confusion — `3-decompose`↔`4-connect` — scores *below* the warn floor and never appeared, so
the lint was silent on the only pair that bit. Lexical cosine did not track measured mis-routing here. The check
is kept as a cheap copy-paste guard with that caveat written into it.

**Limits, stated plainly.** 44 cases, 3 routers, one corpus author, descriptions in isolation. In a
live session the model sees roughly 30 competing skills across swe-flow and design-flow, and
cross-plugin negatives were never tested. By the rule of three, 0/8 clean negative cases bounds the
true false-claim rate at roughly ≤37% (3/8) — the eight negative CASES are the independent units,
and the 24 decisions are three routers over the same eight, so they do not multiply the evidence.
Not at zero, and not as tight as a decision-count would flatter it into looking. **This licenses keeping the reversal; it does
not prove the guard was unnecessary.**

One description change followed, and not to chase the failing case: `4-connect` now says it also
handles a rule or invariant that appears to span two contexts. That is the plugin's own doctrine
already — `design` §2 gates `8-code` on "none spanning two contexts? → a distributed invariant
belongs in connect" — and the description did not carry it.

## Acceptance criteria

1. The governed record and the shipped skills agree — whichever way the owner decides.
2. If the reversal stands: `RFC-0032` F2 carries an amendment stating the guard's real blast
   radius and why a trigger-shaped description replaced it; `US-0007` moves out of `done` to a
   status that is true (owner's call — `wontfix`, or superseded by this US).
3. If the reversal does not stand: the key returns to all nine skills, and `design`'s "never do a
   step's work inline" rule is re-written to say what an orchestrator that cannot invoke should do
   instead.
4. Either way, the two `skill-lint` description collisions are closed or explicitly accepted with
   a reason.

## Owner decision required

This US exists because an agent may not resolve it. `US-0007` is at `done` with an assigned owner;
moving it, or amending an `implemented` RFC's design, is a doc-owner act. The evidence is above;
the call is not the AI's to make.

## Notes

Related, and separate from this decision: `RFC-0028`'s `reconciled:` hash was re-vouched on this
branch with `govkit drift --ack` (commit `a0b6689`), which turned the full gate green. That ack is
an `R1_packet` act under `govkit.yml` `ratification:` and it was taken **without the full R1
ceremony** — there is no gate-loop packet for this slice and the commit cites neither a
`packet.runId` nor `govkit.yml@<sha>`. The substance of R1 was met (an adversarial review ran over
the whole branch and is what caught this), the paperwork was not. Flagged for the owner in the PR.
