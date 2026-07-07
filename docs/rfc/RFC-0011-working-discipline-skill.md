---
id: RFC-0011
title: Working-discipline — a trigger-gated thinking-checkpoint skill that reduces agent error and escalation
status: draft
owner: baodq97
date: 2026-07-07
governs:
  - plugins/swe-flow/skills/working-discipline/SKILL.md
  - plugins/swe-flow/skills/working-discipline/references/discipline-items.md
---

> Proposes a new public, LLM-facing surface (root `AGENTS.md` § Lifecycle: a new skill is a
> public-API change → RFC before code is merged). Authored at `draft`; the flip to `accepted`
> is the owner's act, never an agent's. Follows the RFC-0002 precedent: plugin-surface changes
> are governed through the doc chain, not by teaching the engine to crawl `plugins/`.

## Summary

swe-flow's existing skills author *artifacts* (PRD/RFC/ADR/US, workflows). None of them
governs how an agent *works* — how it diagnoses, verifies, decides when to act autonomously
and when to escalate. That layer today lives partly in root `AGENTS.md` (process rules) and
partly nowhere (thinking discipline). The gap shows exactly when a smaller/weaker model runs
the loop: it tunnels on its first hypothesis, trusts green tests, retries the same fix, acts
on assumptions at irreversible boundaries, and either asks too often or fails silently.

This RFC proposes **`working-discipline`** — a swe-flow skill that encodes **21
thinking-checkpoint items**, each in the form **trigger → mandatory question → evidence to
produce**, spanning epistemic discipline (competing hypotheses, sufficient-condition "done",
refute-your-own-fix), risk-scaled autonomy (one-way/two-way door classification, calibration
bands, pre-mortem, loop detection, stop rules, constraints-first, verifiable increments), and
blind-spot coverage (goal-behind-the-request, Chesterton's fence, negative space, disanalogy
check, provenance labeling, independent ensemble). It also carries the escalation protocol
(one packaged question at a one-way door beats ten vague ones) and an escape-log ritual that
turns every gate-escaping error into a new rule.

## Motivation

Two observations drive the design:

1. **You cannot prompt a model into being smarter, but you can prompt it into stopping to
   think at the right moment.** Each item therefore installs a *checkpoint*, not a procedure:
   nothing runs until its trigger fires, and what it demands is evidence (a count, a command
   output, a discriminating observation), never a ritual.
2. **Over-constraining a strong model degrades its output.** A blanket mandatory checklist
   displaces good judgment with ceremony and produces checklist theater — perfunctory answers
   that satisfy the letter of the rule while the model's attention is elsewhere. The skill is
   therefore built to *scale down*: only two items are always-on, everything else is
   trigger-gated, and any fired item may be answered `N/A — <one-line reason>`. The only
   violation is a **silent** skip. A strong model pays near-zero overhead; a weak model is
   forced to externalize its reasoning as checkable artifacts.

## Design

- **One skill, one reference** (the sibling shape): `SKILL.md` carries the trigger
  description, the application contract (trigger-gated · evidence-out · N/A-friendly · no
  silent skip), the two always-on items, and the dosage switch; `references/discipline-items.md`
  carries the full 21-item catalog, the escalation protocol, and the escape-log format.
- **Dosage keyed to the existing Lifecycle change classes** (root `AGENTS.md`): a <200 LoC
  bugfix runs only the always-on core; a feature/public-surface change arms the design-time
  items (pre-mortem, constraints-first, goal restatement); a boundary/arch change arms
  everything including the expensive independent-ensemble item. No new taxonomy is invented.
- **Evidence, not adjectives.** Every fired item outputs an artifact — a call-site count with
  the grep used, ≥2 hypotheses with one discriminating observation, a reproduced-then-gone
  failure — never "checked carefully". Artifacts are what a reviewer (human or
  `swe-flow:reviewer`) can audit.
- **Composes, never invents** (the RFC-0002 rule): the skill dispatches no new agents and
  embeds no gate. Where an item is machine-checkable (destructive-command classification,
  same-test-failed-twice loop detection) it *names* the hook candidate and defers it — hooks
  are engine/config surface, out of scope here.
- **No engine change.** `packages/govkit/**` is untouched; the no-API-key invariant is
  unaffected.

## Impact and rollout

Purely additive: one new skill directory in the plugin, three manifest touches
(`plugin.json`, `marketplace.json`, plugin `README.md` — version 0.3.0 → 0.4.0), and one
root-README mention. No `govkit.yml` change, no engine change, so every existing consumer is
unaffected. A consumer gets the skill on the next `claude plugin install swe-flow@govkit`.
Rollback is deleting the directory and reverting the manifest bumps. Migration risk: the only
new failure mode is the one the design already targets — a model applying items as theater —
mitigated by the evidence-artifact contract and the explicit N/A escape valve.

## Alternatives

| Option | Why rejected |
|---|---|
| Blanket mandatory checklist (all items, every task) | Over-constrains strong models — quality drops as judgment is displaced by ceremony; token cost scales with every turn instead of with risk. The dosage switch and N/A rule exist precisely to reject this. |
| Put the items in root `AGENTS.md` prose instead of a skill | `AGENTS.md` is always-in-context and already carries the *process* rules; 21 items would bloat every turn of every task. A skill loads on demand and ships to consumers via the plugin. |
| Enforce the items with hooks now | Most items need judgment to evaluate ("is this a one-way door?") — a `type: command` hook cannot judge, and a `type: prompt` hook would break the no-key invariant's spirit at the wrong layer. Machine-checkable subsets are named as future hook candidates instead. |
| A new `discipline-reviewer` agent | Violates "compose, never invent" (RFC-0002); the existing `swe-flow:reviewer` already audits the produced evidence. |

## Open questions

- **Hook candidates.** Destructive-command door classification and same-failure-twice loop
  detection are deterministic enough for a `PreToolUse`/`PostToolUse` hook. Worth an RFC of
  their own once the skill's item set stabilizes in use.
- **Escape-log location.** The skill suggests appending to a repo-level log
  (`LEARNING-LOOP.md` continues this repo's precedent); whether consumers get a scaffolded
  location via `govkit init` is deferred — same posture as RFC-0002's init-scaffolding
  question.
- **Item-set versioning.** If real use shows an item never fires or always returns N/A, it
  should be cut; the item catalog is expected to shrink before it grows. The eval signal for
  this is the escape log itself.

## Recommendation

Ship `working-discipline` as one skill plus one reference in swe-flow: 21 trigger-gated
thinking-checkpoint items with an evidence-artifact contract, a two-item always-on core, a
dosage switch keyed to the existing Lifecycle change classes, the packaged-escalation
protocol, and the escape-log ritual — no engine change, no new agents, governed through the
doc chain per the RFC-0002 precedent. Prefer this over a blanket checklist (over-constraint
degrades strong models), over `AGENTS.md` prose (always-in-context bloat), and over premature
hooks (most items need judgment); revisit the deterministic subset as hook candidates once
the item set has survived contact with real use.
