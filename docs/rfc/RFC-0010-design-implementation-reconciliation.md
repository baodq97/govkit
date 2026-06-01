---
id: RFC-0010
title: Controlling design↔implementation divergence — make as-built deviations explicit and reviewable
status: accepted
owner: baodq97
date: 2026-06-01
---

> Answers "how do we control the local decisions that diverge from the design during
> implementation?" with the honest scope first: a no-key gate CANNOT detect that code does Y
> while the RFC says X — that semantic comparison is the reviewer agent's job (RFC-0001), and
> RFC-0008 explicitly scoped it out. So this RFC does not promise to *detect* divergence. It
> makes divergence-capture a **required, gated ritual** so divergence is never *silent*, gives
> it a structural home, and routes the actual detection to the reliable mechanism. RFC-0009 is
> reserved for the staleness advisory (named in RFC-0008); this is RFC-0010 by design.
> Drafted at `status: draft`; the accept is the owner's.

## Summary

During implementation you make local decisions that contradict the design. If nobody records
them, the RFC silently becomes a lie — the exact "docs are trash" failure RFC-0008 fights, but
one level deeper: not the doc's *status* drifting from the chain, the doc's *content* drifting
from the code. The user's question: how do we **control** that.

**The load-bearing evidence is this very repo's history, not a hypothetical.** Implementing
RFC-0007 and RFC-0008 in one session produced two real divergences from their own design text —
and *drafting this very RFC* produced a third, caught at review before it could ship:

- RFC-0007 specified "three readers + audit-write"; the implementation found **five readers +
  the hook** — the design count was wrong the moment it was written.
- RFC-0008 item 3 described a nudge "at the moment of the done-flip"; the build revealed it
  fires only on a full **Write**, not the Edit-based status flip — the design over-promised.
- **This RFC's own first draft** keyed its as-built gate to RFC-0008's `terminalStatuses`. But
  `rfc.terminalStatuses = [accepted, superseded]`, and an RFC reaches `accepted` *before*
  implementation — so the gate would have demanded `## As-built` at accept-time, when no
  divergence yet exists (only honest content: "None"), and then **never re-fired** when the
  divergence became real. The gate would have *passed* on the exact RFC-0007 divergence above.
  Adversarial review at done-check caught it; the fix (below) re-homes the trigger. The RFC
  about controlling divergence diverged from its own sound design — and the control that caught
  it was, again, the review, not a gate.

What **controlled** both was not a gate. It was an **adversarial review at done-check**, which
then got written into the learning record and a residue in RFC-0008. That is the finding this
RFC is built on: **the reliable control on design↔implementation divergence is adversarial
review; everything deterministic is a forcing function that ensures the review happens and is
recorded — it does not replace it.** Promising more would repeat the overclaim reflex this
session has been catching.

So the work splits, again along the RFC-0001 trust line:

- **GATE class (deterministic forcing function):** a *required, status-conditional*
  "As-built / Deviations" section — required on a doc **only at a post-implementation status**
  (a new `implemented` state, *not* `accepted`), so the requirement fires exactly when the
  divergence is knowable — and the ADR-as-divergence-log convention that gives a recorded
  divergence a home. Both are presence/shape checks: honest to enforce, but they force the
  *question*, never the *honesty*.
- **REVIEWER class (keyed, opt-in):** the swe-flow reviewer compares the implementing diff
  against the RFC and flags semantic divergence — the only thing that catches *undocumented*
  divergence. Never in no-key CI.

## Decision

**1. A status-conditional required section, keyed to a post-implementation state (GATE).** The
trigger must coincide with the moment as-built knowledge *exists* — which is **after** code
ships, not at `accepted` (a design is accepted *before* it is built). So:

- **Introduce a post-acceptance lifecycle status, `implemented`** (rfc statuses become
  `… accepted → implemented → superseded`). `accepted` = the design is decided, build may begin;
  `implemented` = the code shipped and the author is closing the loop. The flip `accepted →
  implemented` is a deliberate authored act on the RFC's **own** lifecycle, and it is the precise
  moment the author confronts "what actually diverged."
- **Required sections are keyed to a specific status, not to `terminalStatuses`.** Add a per-type
  **`requiredSectionsByStatus: { <status>: string[] }`** (heading regexes). For this repo:
  `rfc: { implemented: ["## As-built", "## Deviations from design"] }`. `verify` requires those
  headings present **only when the doc is at that exact status** — an `accepted` RFC needs none;
  an `implemented` one must carry them (or affirm "None"). This is zero-false-positive *by
  construction*: the requirement is silent until the author themselves declares the work
  implemented.
- **Why a status map, not `terminalStatuses` (the original draft's mistake, caught at review):**
  `terminalStatuses` includes `accepted`, which precedes implementation — reusing it fires the
  gate before any divergence can exist and then never again. Keying to a status that *follows*
  implementation is what makes the trigger land where the knowledge is. `implemented` also joins
  `terminalStatuses` for RFC-0008 coherence (a `done` US under an `implemented` parent is
  legitimate), but coherence and this required-section check now read **different** keys — the
  decoupling is the fix.
- `eval` already grades section presence/non-stub via its rubric, so the advisory *quality* of
  the As-built section rides existing machinery; the *hard* presence requirement lives in the
  gate.

**2. The ADR-as-divergence-log convention (structural home, minimal code).** A *material*
implementation decision that contradicts the RFC is itself a decision worth recording — i.e. an
**ADR with `parent: RFC-X`**, which the chain (RFC-0003) and coherence gate (RFC-0008) already
track. The RFC is not rewritten to hide the original design; the divergence is *appended* as a
superseding decision, and the `## As-built` section links to it. This is exactly how this
session handled its own divergences (a residue + a correction, not a silent edit), formalized
into a repeatable ritual. Engine cost is near zero — it is a documented workflow over types and
refs that already exist; the only nicety is letting an `## As-built` "see ADR-X" line resolve as
a reference.

**3. The reviewer hook (REVIEWER, keyed).** The swe-flow `reviewer` agent, given the RFC and the
implementing diff, judges whether the code diverged from the design and whether the
`## As-built` section honestly accounts for it. This is the **only** layer that detects
*undocumented* or *dishonest* divergence — the gate merely guarantees a place to write it down.
Opt-in, needs a key, never in no-key CI (RFC-0001).

**4. Reuse RFC-0008's done-flip trigger, retargeted to `implemented`.** The reconciliation nudge
already fires when a doc is written into a terminal status; extend its text to also say "fill the
As-built / Deviations section" and have it recognize the flip *to* `implemented`. It inherits
RFC-0008's honest limitation verbatim: the flip `accepted → implemented` is almost always an
**Edit** of the status line, which `audit-write` defers — so the nudge is best-effort and the
*reliable* prompt remains the CI gate (part 1: any RFC at `implemented` without `## As-built`
blocks). The nudge is the courtesy; the verify check is the enforcement.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Auto-detect divergence deterministically** (compare RFC prose to code) | The single-source dream and impossible without semantics: a stale RFC and a current one have the same lexical fingerprint. The reviewer agent's job, kept out of the gate by construction. |
| **Rewrite the RFC in place to match as-built** | Destroys the design-vs-built delta — and that delta *is* the signal a reviewer needs. Prefer append (Deviations section / a superseding ADR) over silent overwrite. |
| **Hard-block merge unless the RFC was edited in the same PR** | The gate cannot know whether a code change *should* have updated the RFC, so this is pure noise that trains people to make empty RFC edits (the same red→green lying RFC-0008 rejected for staleness). The terminal-conditional required section is the honest, low-false-positive proxy instead. |
| **Free-form "implementation notes" with no gate** | The status quo: nothing forces the note, so silent divergence survives. The whole point is to make the capture *required* at the terminal transition. |
| **A standalone "deviation" doc type** | A new type for what an ADR already is (a decision record). Reuse ADR + `parent` rather than fork the taxonomy. |
| **Key the required section to `terminalStatuses`** (this RFC's own first draft) | `terminalStatuses` includes `accepted`, which precedes implementation. The gate would demand `## As-built` at accept-time (no divergence exists yet ⇒ forced "None") and never re-fire when the divergence becomes real — it would *pass* on the exact divergence it exists to catch. Caught by adversarial review at done-check; rejected for a status keyed *after* implementation (`implemented`). |

## Impact / rollout

- **Non-breaking / opt-in.** The required section fires only for types declaring
  `requiredSectionsByStatus`; absent ⇒ exempt, verify stays green. Adopting it for `rfc` also
  means adding the `implemented` status to `rfc.statuses` — an *additive* enum change (existing
  docs at `draft`/`accepted` stay valid). No migration.
- **Reuses three prior layers:** RFC-0008 `terminalStatuses` (for coherence — `implemented`
  joins it), RFC-0003 refs (link the ADR), and RFC-0008's nudge (extend + retarget the text).
  The new engine surface is one status-keyed section-presence check in `verify` — small and
  well-scoped. Note the required-section trigger reads `requiredSectionsByStatus`, **not**
  `terminalStatuses` — the two checks are deliberately decoupled (see Decision §1).
- **The reviewer half is swe-flow**, keyed, entirely separate from the no-key CLI.
- **Honest residues, stated up front:** (a) a required section forces the *question* not the
  *honesty* — `## As-built: None` can be a lie; this kills *silent* divergence, not *dishonest*
  divergence (the self-attestation residue, recurring). (b) the nudge's Edit-path gap (RFC-0008)
  applies to the "fill Deviations" prompt too. Both are why part 3 (the reviewer) is named the
  reliable layer and the gate only the forcing function.
- **Tests (when built):** (a) an `implemented` doc missing a required section ⇒ violation;
  (b) the same doc with the section present ⇒ ok; (c) an `accepted` doc missing it ⇒ **ok** (the
  status condition — no false positive before implementation; this is the regression test for the
  caught flaw); (d) a `superseded` doc missing it ⇒ ok (only the keyed status requires it, not
  every terminal status); (e) a type without `requiredSectionsByStatus` ⇒ exempt (non-breaking
  floor).
- **Rollback** is removing `requiredSectionsByStatus` (and, if desired, the `implemented` status)
  from config; the check goes dark with no residue on existing docs.

## Open questions

- **Config shape — resolved to a status map.** `requiredSectionsByStatus: { <status>: [regex] }`
  on the verify side, keyed to a specific post-implementation status — *not* `terminalStatuses`
  (which the first draft used and which fired pre-implementation; see Alternatives). The *hard*
  requirement lives in the gate (blocks); the *advisory* quality of the section stays in eval —
  keeping the two trust layers cleanly split. Open sub-question: should `requiredSectionsByStatus`
  accept multiple statuses (e.g. require an abridged note at `accepted` *and* the full as-built at
  `implemented`)? The map shape already allows it; deferred until a second case exists.
- **Who/what flips `accepted → implemented`.** It is a manual authored Edit (the forcing
  function). An author who never flips — leaving an RFC at `accepted` forever after shipping —
  evades the gate; that residual undocumented-divergence is exactly what part 3 (the reviewer)
  and RFC-0008 coherence cover. Named so the gate is not read as catching the never-flipped case.
- **In-body ref resolution.** RFC-0003 resolves front-matter refs only; letting an `## As-built`
  "see ADR-0007" line resolve would need body-ref parsing. Worth it, or keep the link advisory?
- **Intersection with RFC-0009 staleness.** An implemented RFC with `## As-built: None` whose
  `governs:` code later changed is the strongest "go reconcile" signal — should 0009's advisory
  escalate when 0010's section claims "no deviations"? Named for when both exist.
- **Defining "material" divergence.** Which decisions deserve an ADR vs a one-line As-built note
  is a judgment the gate cannot make — it can require the *section*, not adjudicate *materiality*.
  That adjudication is the reviewer's, named so the gate is not expected to draw the line.
