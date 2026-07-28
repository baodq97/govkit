---
id: RFC-0022
title: spec-red-team — an adversarial review skill for governed docs (swe-flow)
status: implemented
owner: baodq97
date: 2026-07-08
reconciled: sha256:a263e0b065c9f02f
governs:
  - plugins/swe-flow/skills/spec-red-team
---

> Proposes a new swe-flow skill that runs an adversarial pass over a PRD/RFC/ADR **before its
> status advances**: steelman the doc first, then attack; express every weakness as a
> falsifiable "Fails if ___" failure mode; rank findings by impact × likelihood ×
> cheapness-to-test; self-refute before reporting. Output is ranked findings + the evidence to
> gather + an explicit kill criterion. The skill is **advisory and read-only by construction**
> — it never flips status, never edits the doc it attacks, never gates (the gate stays
> `govkit verify`/`eval`) — with read-only enforced structurally via `allowed-tools`
> front-matter, not by instruction alone. Drafted at `status: draft`; the accept is the owner's.

## Summary

The doc chain has a gap exactly where drafts become commitments. Before a PRD/RFC/ADR
advances (`draft → proposed/accepted`), three surfaces look at it today: the deterministic
gate (`govkit verify` — structure, binary), the deterministic floor (`govkit eval` — shape,
zero-FP by design), and, opt-in, the keyed layer: the `reviewer` agent (a governance verdict
on a **change**: APPROVE / SHIP-WITH-CAVEATS / BLOCK) and the `substance-judge` skill
(RFC-0019: a **score** for a doc's soundness against pinned anchors). None of them answers
the question a human owner most needs answered before flipping a status: **under what
concrete conditions is this design wrong, and what is the cheapest way to find out?** A
score of 78 and a verdict of APPROVE both leave the owner to enumerate the risks alone.

This RFC proposes `spec-red-team`, a swe-flow skill that attacks one governed doc and
returns a decision-support brief. Its method is pinned in the SKILL.md:

1. **Steelman first, then attack.** Restate the doc's strongest case in its own terms before
   probing it — an attack on a weakened version of the argument is noise, and steelmanning
   first is the structural counter to lazy criticism.
2. **Every weakness is a falsifiable failure mode.** Each finding is phrased "Fails if ___"
   — a concrete, testable condition (e.g. "Fails if consumers pin govkit but not the plugin,
   so the skill and engine version-skew"), never a vibe ("seems risky", "might not scale").
   A weakness that cannot be phrased as a failure condition is not reported.
3. **Rank by impact × likelihood × cheapness-to-test.** Cheap-to-test, high-impact failure
   modes rise to the top — the ranking optimizes for what the owner should *check next*, not
   for rhetorical weight.
4. **Self-refute before reporting.** For each candidate finding, the skill first tries to
   defeat it with what the doc and repo already say; findings the doc has already answered
   are dropped, with the answering passage cited. This is the anti-fabrication guard
   (never invent a weakness the doc does not have) and the anti-sycophancy guard runs the
   other way (never suppress one it does have) — the pass must be adversarial *and* honest.
5. **Output = ranked findings + evidence to gather + a kill criterion.** Each finding names
   the observation that would confirm or clear it; the brief ends with one explicit kill
   criterion — the single condition under which the proposal should be abandoned rather than
   patched. A red-team that cannot articulate what would kill the proposal has not finished.

## Design

**A skill, not a command.** `plugins/swe-flow/skills/spec-red-team/SKILL.md` + a
`references/` file pinning the finding format and the ranking rubric. It is LLM-driven and
therefore lives on the keyed, opt-in side of RFC-0001's boundary: invoked by name
("red-team this RFC", "attack RFC-0021 before I accept it"), never wired into no-key CI,
hooks, or exit codes. The deterministic gate and floor are byte-for-byte untouched — the
skill *calls* `npx govkit verify`/`eval` (read-only, to know the doc is structurally sound
before attacking substance) and never reimplements them (the AGENTS.md one-directional rule).

**Read-only enforced structurally, not rhetorically.** The skill's front-matter grants
`allowed-tools: Read, Grep, Glob` plus a narrow Bash allowlist of read-only audit commands
(`npx govkit verify`, `npx govkit eval`, `npx govkit check`, `git log`/`git diff` inspection)
— **no Write, no Edit, no Task**. A red-team that can edit its target has an incentive
problem (soften the doc, then pass it); a red-team that can flip status is a gate. Denying
the tools makes "advisory and read-only" a property of the artifact rather than a promise in
prose. Prior art: the pm-skills `strategy-red-team` skill enforces exactly this posture — its
`allowed-tools` grants only read-only audit commands, alongside the same steelman-then-attack
sequence, "Fails if" framing, and self-refutation step this RFC adopts for governed docs.

**Where it sits in the lifecycle.** Advisory input to the human status-flip: the intended
moment is after `verify`/`eval` are green and before the owner advances
`draft → proposed/accepted` (or `proposed → accepted` for an ADR). The brief lands in the PR
body or a review comment — never in the doc, never in its front-matter, never in INDEX.md.
The owner remains free to advance the status with findings open; the skill produces reasons,
not blocks.

**Relationship to the existing keyed surface.** Three complementary, non-overlapping
questions:

| Surface | Question | Output |
|---|---|---|
| `reviewer` agent | Does this **change** comply with governance? | structural verdict (APPROVE / SHIP-WITH-CAVEATS / BLOCK) |
| `substance-judge` (RFC-0019) | How **sound** is this doc's prose? | anchored 0–100 score, comparable across runs |
| `spec-red-team` (this RFC) | Under what conditions is this design **wrong**, and how do we find out cheaply? | ranked falsifiable failure modes + evidence to gather + kill criterion |

The judge scores; the red-team enumerates falsifiable risks. A doc can score 85 and still
carry one cheap-to-test assumption that kills it — that finding is this skill's whole job,
and no score communicates it.

## Alternatives

| Option | Why rejected |
|---|---|
| **Fold into the `reviewer` agent** | The reviewer answers a compliance question about a change and must stay cheap and decisive (a verdict). Adversarial substance-probing is a different cadence (pre-status-flip, one doc, minutes not seconds) and a different output (ranked failure modes, not a verdict). Merging them either bloats every review or dilutes the attack — and the reviewer reviews diffs, not the argument inside one doc. |
| **Fold into `substance-judge`** | The judge's value is a *stable, comparable* score against pinned anchors (RFC-0019); a red-team's value is *novel, doc-specific* failure modes. Bolting free-form attack onto an anchored scorer breaks score comparability (verdicts would absorb attack findings) and caps the attack at the rubric's dimensions. Different question, different contract — the same reasoning that kept judge and reviewer apart in RFC-0019. |
| **A red-team checklist section in `spec-author`** | Makes the author self-attest adversarialness — the pattern this repo repeatedly rejects (RFC-0012, RFC-0020: asserted-not-measured). The author is structurally the worst attacker of their own doc, and a checklist inside the authoring skill cannot be read-only with respect to the doc by definition. A separate skill with separate tool grants keeps attacker and author distinct. |
| **Make it blocking (a gate)** | An LLM pass in the merge path breaks the invariant that outranks any feature: the gate runs with NO API key. Deterministic gates gate; keyed layers advise. Rejected for the same reason RFC-0019 rejected a `govkit judge` CLI. |

## Impact / rollout

- Plugin-only surface: one skill dir (`SKILL.md` + `references/finding-format.md`);
  swe-flow minor version bump; the govkit engine, `govkit.yml`, and both deterministic
  layers are byte-for-byte untouched.
- Opt-in by invocation; no CI workflow, hook, or exit-code contract references it, and its
  `allowed-tools` cannot write, so the blast radius of a bad run is a bad comment.
- Findings land in PR bodies/comments only; no new record files, no `.govkit/` state, no
  config keys, no migration.
- Rollback is deleting the skill dir.

## Open questions

- **Should briefs be recorded?** RFC-0019 writes verdicts to `.govkit/evals/`; a red-team
  brief is doc-shaped prose, not a metric. Start with PR-body-only; revisit if the R7
  flywheel wants failure-mode → outcome data (did the predicted failure happen?).
- **Kill-criterion quality.** "Never invent a weakness" is enforced by self-refutation, but
  a vacuous kill criterion ("fails if it doesn't work") is the failure mode of the skill
  itself. Does it need its own pinned anchors, or a ranking-probe-style selftest
  (RFC-0020's pattern) once real briefs accumulate?
- **Scope of the Bash allowlist.** `verify`/`eval`/`check` and read-only git are clearly in;
  whether the red-team may run the consumer's test suite (read-only in effect, expensive in
  practice) to test a "Fails if" claim needs real usage data.
- **Fan-out.** One doc per invocation ships first; whether a chain-level attack (PRD + its
  RFCs together, hunting cross-doc contradictions) earns its cost is deferred.

## As-built

Shipped as `plugins/swe-flow/skills/spec-red-team/` (SKILL.md + the pinned
`references/finding-format.md` for the finding template and ranking rubric). Read-only is
structural as designed: `allowed-tools` grants Read/Grep/Glob plus a scoped Bash allowlist
of `npx govkit verify`/`eval`/`check` and `git log`/`git diff` only — no Write, no Edit, no
Task. The five-step method (steelman → "Fails if" attack → self-refutation → impact ×
likelihood × cheapness ranking → brief with one kill criterion) is pinned in the SKILL.md;
briefs return as response text for the PR body or review comment.

## Deviations from design

One tightening: the design's tool posture left room to argue for a narrowly-scoped Write
(a findings-report file). Shipped with Write fully absent — briefs land in the PR body or a
review comment only, never in a file — so the read-only property holds with no carve-out
to police.

## Recommendation

Ship `spec-red-team` as a standalone read-only swe-flow skill: steelman-then-attack,
findings only as falsifiable "Fails if ___" conditions ranked by impact × likelihood ×
cheapness-to-test, self-refutation before reporting, and an output of ranked findings +
evidence to gather + one explicit kill criterion — with read-only enforced via
`allowed-tools` rather than instruction. Prefer this over folding it into the reviewer
(different question and cadence), into the substance-judge (breaks score comparability),
or into a spec-author checklist (self-attestation by the author), and over any blocking
variant (a keyed pass must never gate) — each rejected above. The gate stays
`govkit verify`/`eval`; this skill only hands the human owner better reasons before they
flip a status.
