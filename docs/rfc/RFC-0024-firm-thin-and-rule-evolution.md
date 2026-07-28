---
id: RFC-0024
title: Name the firm/thin/honor-system line and make rules evolve from friction
status: accepted
owner: baodq97
date: 2026-06-10
governs:
  - packages/govkit/src/commands/audit-write.ts
---

> A refinement of RFC-0001's trust-layer thesis, not a new layer. RFC-0001 split *well-formed*
> from *sound* (gate vs reviewer) and recorded an honest ceiling. A red-team of the shipped engine
> found the ceiling is stated incompletely: the gate also cannot enforce **status-transition
> provenance**, and the docs imply it does. This RFC names every check's tier explicitly (firm /
> advisory / honor-system), corrects the provenance claim, and defines the path by which a
> honor-system rule earns its way to firm — so the frame can evolve instead of ossify. Drafted at
> `status: draft`; the accept is the owner's.

## Summary

govkit's pitch is "governance you can run, not just read." A red-team shows that for the single
most load-bearing governance rule — *a doc starts at `startStatus` and only a human flips it
forward* — you can only **read** the rule (in AGENTS.md), not **run** it. An RFC authored directly
at `status: accepted`, with no draft history and no human approval, passes `verify` with **0
violations** and `eval` at **100/100**. The hook does not block it; CI does not catch it, because
`accepted` is a valid enum value. The rule has zero deterministic enforcement anywhere in the repo
(no git hook, no `startStatus` check in `verify.ts`, no transition logic).

This is not a defect to patch — a stateless, no-git, no-history gate *structurally cannot* see a
transition. It is a **mislabeled tier**: a honor-system rule wearing a firm rule's clothes. A good
harness is a frame that is firm where truth is objective and thin where judgment is required, and
that never lies about which is which. This RFC makes the firm/thin line explicit, corrects the one
place govkit oversells its own scope, and turns rule-evolution into a defined loop so the thin
parts can become firm when (and only when) real friction proves they should.

## Context — the evidence

Red-team run on the built engine against a clean fixture repo:

1. **Born-terminal passes clean.** An RFC written straight to `status: accepted` (no draft
   provenance) → `verify` 0 violations, `eval` 100/100. The `audit-write` hook returns exit 0, no
   block, no remind.
2. **`verify.ts` never references `startStatus`.** There is no "a new doc must begin at
   `startStatus`" check, and no transition model — by design, the engine is stateless per run.
3. **The real-time hook is narrower than it reads.** `audit-write` governs only full-content
   **Write** to a governed dir. Every **Edit** defers (partial content), and **Bash**-mediated
   writes (heredoc/`sed`) never match the `Write|Edit` matcher. The most common self-flip shape —
   edit a draft's `status:` to `accepted` — is invisible to it.
4. **No provenance backstop exists.** No `.git/hooks`, no husky, no pre-commit. The "separate
   accept commit" that the doctrine leans on is convention, enforced by nothing.

So the rule "never self-flip status" rests entirely on the agent reading AGENTS.md and choosing to
comply. That is honor-system. RFC-0001's honest-ceiling section names two limits (eval cannot judge
substance; the gate cannot see doc↔code semantic divergence) but omits this third, equally
load-bearing one.

## Decision / recommendation

Make the firm/thin boundary an **explicit, declared, evolving** property of govkit. Three parts;
only the third touches code.

1. **Declare the tier of every check.** Classify each into exactly one tier and document it (a tier
   column in the README check table, a one-line tag in RFC-0001's honest-ceiling section):
   - **FIRM (gate, blocks):** front-matter completeness, status-enum, id↔filename, no-placeholder,
     ref-integrity, chain-coherence, required-sections. Deterministic and objective.
   - **ADVISORY (signal, never blocks):** `eval` score, `stale`, `report`, the `remind` nudge.
   - **HONOR-SYSTEM (uncovered by design):** status-transition provenance ("no self-flip"),
     substance soundness. Owned by commit-discipline + the human accept + the keyed reviewer —
     **not** by the engine. Making this a *named* tier, not an unstated gap, is the core move.

2. **Correct the provenance claim.** Add the third limit to RFC-0001's honest ceiling and align the
   README/tagline: the gate enforces *structure*, not *provenance*. The achievable promise is
   unchanged — make drift loud, force acknowledgement — but the docs must not imply the gate runs
   the transition rule. A governance engine that misstates its own governance scope spends the
   trust that is the product.

3. **Define the friction→rule loop.** Replace ad-hoc `LEARNING-LOOP.md` notes with a one-page
   protocol: every friction event (a gate false-block, a gaming/FN escape, a scope-escape) resolves
   to exactly one recorded outcome — **PROMOTE** (becomes a firm rule in `govkit.yml` *plus* a RED
   fixture in `packages/govkit/eval/` that pins it before the fix lands), **KEEP-THIN** (stays
   advisory/honor-system with a one-line why), or **DROP**. The invariant: *no firm rule lands
   without a RED fixture first.* This formalizes the habit RFC-0023 already followed and makes
   "rules exist to be broken into better rules" a repeatable mechanism rather than a slogan.

**The only code change** is one additive branch on the existing `remind` channel in
`audit-write.ts`: on a full-content Write that sets a governed doc to a status other than its type's
`startStatus`, emit a non-blocking remind ("born at `<status>`; agents start at `<startStatus>` —
confirm a human authorized this"). It is thin by construction — a nudge, no git, no block, reusing
the RFC-0008/0010 remind path. It is explicitly **not** a gate: the Edit-flip and Bash-write shapes
stay uncovered, because provenance is honor-system and the nudge is a courtesy, not a wall.

## Alternatives / trade-offs considered

- **Git-history provenance scanner (`verify --provenance` reading `git log`).** Rejected. It breaks
  the no-git core invariant unless bolted on as an opt-in layer like `stale`; at n=2 the ROI is
  near zero; it thickens the frame and invites the agent to fight the gate. Provenance is thin by
  nature, and forcing it firm contradicts the very firm/thin design this RFC argues for. Reserved
  as a *future opt-in advisory* only if external friction ever justifies it — a friction-log entry,
  not a commitment.
- **Status state-machine config (allowed transitions per type).** Rejected: rigidity creep, and a
  stateless run cannot see a transition anyway — it would constrain only the single-run enum, which
  `statuses:` already does.
- **Make `eval` judge substance.** Rejected: proven impossible by the RFC-0001 red-team; that is the
  keyed reviewer's job. Listed only to keep the rejected set complete.
- **Do nothing — leave the line implicit.** Rejected: the false confidence of an unenforced rule
  labeled as enforced is worse than a rule honestly labeled honor-system. The whole product is
  calibrated trust (FP→0); silence here is the inward-facing version of the same failure.

## Impact / migration / rollout

- **Parts 1 + 2 are docs-only.** A tier column in README, a corrected honest-ceiling paragraph in
  RFC-0001, firm/thin labels on the AGENTS.md agent-constraints. Copy change, no behavior change, no
  gate impact, `verify`/`eval` byte-identical.
- **Part 3 is a protocol.** A one-page friction→rule section (in `LEARNING-LOOP.md`, where the
  friction log already lives) plus the "RED fixture before firm rule" convention, already the
  de-facto practice.
- **Code:** one additive branch in `audit-write.ts` guarded by the existing remind path, plus unit
  tests in `audit-write.test.ts` (born-at-non-`startStatus` → remind; born-at-`startStatus` → no
  remind; Edit → defer, unchanged). No new command, no new dependency, no change to `verify` exit
  semantics, no change to the no-key invariant. Backward-compatible: the remind never blocks.
- **Sequencing:** none of this outranks R0 (publish + a real n≥3 consumer). Part 2 ships first
  (cheap credibility insurance); Part 1 with it; Part 3 is defined now but only *compounds* once
  external friction feeds it; the code nudge is the smallest, last piece.

## Open questions / risks

- **The nudge is partial, on purpose.** It catches born-at-Write only; Edit-flip and Bash-write
  stay uncovered. Decision: accept — that *is* the honest thin boundary; documenting it is the
  point, not chasing coverage in the engine.
- **Naming a HONOR-SYSTEM tier could invite consumers to dismiss those rules.** Labeling something
  "not enforced" can reduce compliance. Counter: an unenforced rule mislabeled as enforced is worse
  (false confidence); honesty plus explicit reviewer ownership is the mitigation. Flagged for the
  friction log.
- **Where the loop protocol is governed.** `LEARNING-LOOP.md` is the natural home, but if the loop
  should itself be a governed artifact it may want its own doc type. Leaning toward
  `LEARNING-LOOP.md` for now; open.
- **n=2 same-author limits new promotions.** Most friction today is self-generated; the loop's real
  compounding needs n≥3 external friction, which depends on R0. The mechanism is cheap to define now
  and idle until then — that is acceptable, not a reason to defer.

## As-built

All three parts and the one code change shipped, over several commits rather than one PR:

1. **Tier declaration** — README § the trust-layer table carries the three tiers named
   honestly (firm / advisory / honor-system, "outside the engine by design"), and AGENTS.md
   § Agent constraints opens by declaring itself honor-system with the control set (commit
   discipline + the human accept + the keyed reviewer + the non-blocking per-write nudge).
2. **The provenance claim corrected** — RFC-0001's honest-ceiling section carries the third
   limit as a recorded deviation: a doc born at `accepted` passes `verify` clean and the gate
   enforces structure, not provenance.
3. **The friction→rule protocol** — the standing "Friction→rule protocol" section at the top
   of `LEARNING-LOOP.md`, applied by every round since; the PROMOTE path's "no firm rule
   without a RED fixture first" is the convention `govkit calibrate` pins (FP=0,
   non-regressing recall on every distill proposal, RFC-0017).
4. **The code nudge** — the born-at-non-`startStatus` remind branch in `audit-write.ts`
   (guarded on `startStatus`, Write-only, never blocks), covered by the
   "born-at-non-startStatus provenance nudge" describe in `audit-write.test.ts` (nudge on
   born-at-other, silence at `startStatus`, silence when the type declares no `startStatus`).

Later work built ON this tier vocabulary rather than diverging from it: RFC-0027's
ratification policy tiers the honor-system transitions themselves (R0/R1/R2), and its
2026-07-28 amendment re-binds WHO may act (main agent vs propose-only sub-agents) — both are
refinements of the honor-system tier this RFC named, with the engine still reading none of it.

## Deviations from design

- **The shipped surfaces credited the wrong RFC.** The protocol header in LEARNING-LOOP.md,
  RFC-0001's deviation notes, the README/AGENTS.md tier attributions, the `audit-write.ts`
  comments, and even the remind string the hook EMITS all cited RFC-0012 (the journal RFC)
  instead of this one. Found by the 2026-07-29 corpus audit and corrected everywhere in the
  same change-set as this section — the content was this RFC's, verbatim; only the citation
  was wrong. Recorded here because a misattributed rule is provenance debt of exactly the
  kind this RFC exists to name.
- **Part 3's home stayed `LEARNING-LOOP.md`** (the open question resolved by use): 22 rounds
  plus an archive split later, no separate doc type was needed — the protocol is standing text
  at the top of the active file, and the archive move (2026-07-29) verified every tooling
  contract is last-round + append.
- Otherwise implemented as accepted; the nudge's deliberate partiality (Write-only) is
  unchanged and remains the honest thin boundary.
