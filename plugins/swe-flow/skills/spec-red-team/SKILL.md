---
name: spec-red-team
disable-model-invocation: true
context: fork
description: >-
  Runs the keyed adversarial pass over ONE governed PRD/RFC/ADR before its status advances:
  steelman first, then attack; phrase every weakness as a falsifiable "Fails if ___";
  self-refute each candidate against what the document and the repository already say; rank
  survivors by impact times likelihood times cheapness-to-test; return ranked findings plus
  one explicit kill criterion. Use when asked to "red-team this RFC", "attack RFC-NNNN before
  I accept it", "phản biện tài liệu này", or before any draft-to-proposed or proposed-to-accepted
  advance. Advisory and read-only by construction — it never flips a status, never edits its
  target, never gates; NEVER wire it into no-key CI, hooks, or exit codes.
allowed-tools: Read, Grep, Glob, Bash(npx govkit verify:*), Bash(npx govkit eval:*), Bash(npx govkit check:*), Bash(git log:*), Bash(git diff:*)
---

# Spec Red Team

Answer the one question the gate, the floor, the reviewer, and the judge all leave open:
**under what concrete conditions is this design wrong, and what is the cheapest way to find
out?** You attack one governed doc and hand its human owner a decision-support brief before
they flip a status. The reviewer verdicts a change; the judge scores prose; you enumerate
falsifiable failure modes. A doc can score 85 and still carry one cheap-to-test assumption
that kills it — that finding is your whole job.

## Hard boundary (read first)

Everything here needs an API key and is opt-in. Do NOT add it to CI workflows, hooks, or
anything that gates a merge; do not let a finding change an exit code. The gate stays
`govkit verify`/`eval` — you call them, never reimplement them (AGENTS.md one-directional
rule). Read-only is structural, not rhetorical: this skill's `allowed-tools` grant no Write,
no Edit, no Task — a red-team that can edit its target has an incentive problem, and one
that can flip status is a gate. The brief lands in the PR body or a review comment — never
in the doc, never in its front-matter, never in INDEX.md, never in a new file. The owner
stays free to advance the status with findings open; you produce reasons, not blocks.

## Procedure

1. **Confirm the target and the moment.** One governed doc per invocation (chain-level
   attack is out of scope — RFC-0022 defers it). Read the doc, its `status:`, and the flip
   the owner intends (`draft → proposed/accepted`, or `proposed → accepted` for an ADR).

2. **Check the floor before attacking substance.** Run `npx govkit verify` and
   `npx govkit check` (read-only). If the doc is structurally red, STOP and report — attack
   findings on top of a red gate dress noise as signal; structure is the floor's business.

3. **Steelman first.** Restate the doc's strongest case in its own terms — the problem it
   solves, the mechanism, why the rejected alternatives lose. An attack on a weakened
   version of the argument is noise; write the steelman before probing anything.

4. **Attack.** Enumerate candidate weaknesses. Every candidate MUST be phrased as
   "Fails if ___" — a concrete, testable condition (e.g. "Fails if consumers pin govkit but
   not the plugin, so the skill and engine version-skew"), never a vibe ("seems risky",
   "might not scale"). A weakness you cannot phrase as a failure condition is not a finding;
   drop it silently. Use `git log`/`git diff` and Grep to ground candidates in what the repo
   actually does, not in what a generic project might do.

5. **Self-refute before reporting.** For each candidate, first try to defeat it with what
   the doc and repo already say. A candidate the doc has already answered is DROPPED, with
   the answering passage cited in the brief's "refuted" list. This guard runs both ways:
   never invent a weakness the doc does not have, and never suppress one it does — the pass
   must be adversarial AND honest.

6. **Rank the survivors** by impact × likelihood × cheapness-to-test, using the pinned
   rubric in `references/finding-format.md`. Cheap-to-test, high-impact failure modes rise
   to the top: the ranking optimizes for what the owner should *check next*, not for
   rhetorical weight.

7. **Write the brief** in the pinned template (same reference file): steelman, ranked
   findings — each with its "Fails if" condition and the evidence that would confirm or
   clear it — the refuted-candidates list, and ONE explicit kill criterion: the single
   condition under which the proposal should be abandoned rather than patched. A red-team
   that cannot articulate what would kill the proposal has not finished; a vacuous kill
   criterion ("fails if it doesn't work") is the failure mode of this skill itself. Return
   the brief as your response text, ready to paste into a PR body or review comment.

## What this skill never does

- Flip a `status:`, edit the doc under attack, or write ANY file — the tool grants make
  this impossible; do not ask for wider ones.
- Gate, block, or touch an exit code — deterministic gates gate; keyed layers advise.
- Re-implement or second-guess `verify`/`eval` — the floor is deterministic and already ran.
- Report an unfalsifiable weakness, or one the doc already answers — self-refutation is
  mandatory, not optional polish.
- Attack more than one doc per invocation, or hunt cross-doc contradictions — deferred by
  RFC-0022 until the single-doc pass earns its cost.
