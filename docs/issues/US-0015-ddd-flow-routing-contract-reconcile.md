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
- No eval has been run on mis-routing specifically. The evidence gathered so far measures output
  quality, not router accuracy, so the claim "descriptions are enough" is untested.

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

Related debt on the same branch: `RFC-0028`'s `reconciled:` hash is stale and `bun run check` is
red on `govkit drift` until the owner re-vouches it. That is mechanical and separate from this
decision.
