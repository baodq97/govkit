---
id: RFC-0017
title: Learning-distiller — the keyed DISTILL step of the R7 flywheel, proposal-only by construction (swe-flow:distiller)
status: implemented
owner: baodq97
date: 2026-07-08
reconciled: sha256:02ccf6c2055e1ef5
governs:
  - plugins/swe-flow/agents/distiller.md
  - plugins/swe-flow/skills/distill-learnings/SKILL.md
---

> Ships DISTILL — the third and only keyed step of the R7 learning flywheel — as a plugin
> agent (`swe-flow:distiller`) plus an invoking skill (`distill-learnings`). The distiller
> reads the gate journal, the escape log, and the git delta since the last round, and emits
> PROPOSALS only — corpus fixtures, AGENTS.md rules, config tweaks, ledger entries — always
> as a reviewable change-set, never applied to main. Three hard laws bind it: proposal-only,
> calibrate-audited before the PR, append-only corpus. The owner delegated approval
> in-session and implementation ships in the same PR, so this RFC lands directly at
> `status: implemented`, the RFC-0013 precedent.

## Summary

The R7 flywheel now has two of its three steps: SENSE is `--journal` (shipped, RFC-0012 — one
JSONL record per gate run, including drift and ledger outcomes), and RATIFY is, and remains, a
human merge. This RFC ships the middle step, DISTILL — the only *keyed* step in the loop, and
by construction the only one that may never act, only propose.

The surface is a plugin agent, `swe-flow:distiller`, plus an invoking skill,
`distill-learnings`. The agent reads three inputs: `.govkit/journal.jsonl` (gate outcomes,
including drift/ledger records), `LEARNING-LOOP.md` (the escape log), and `git log` since the
last distill round. From those it produces PROPOSALS only, always packaged as a reviewable
change-set (a branch/PR), never applied to main by the agent itself:

- **(a)** new adversarial corpus fixtures under `packages/govkit/eval/fixtures` (`good/` or
  `weak/`);
- **(b)** rule lines for `AGENTS.md`;
- **(c)** `govkit.yml` tweaks — e.g. a `tiers:` demotion backed by journal FP evidence;
- **(d)** ledger entries for newly discovered work.

## Motivation

Three lines of evidence converge:

1. **The RUCAIBox harness survey** (2026-07 research sweep) names memory / skill-library
   *maintenance* as a pillar of durable agent harnesses. This RFC adopts exactly the
   maintenance leg — and explicitly NOT the multi-agent-orchestration leg, per the
   over-engineering rejection already recorded in the sweep.
2. **Anthropic's long-running-agent guidance** converges on persistent progress artifacts:
   agents that survive across sessions do so through committed, reviewable state, not through
   in-context memory. The corpus, `AGENTS.md`, and the ledger are precisely such artifacts.
3. **This session's own first distill cycle** — escape-derived `AGENTS.md` rules, a new `weak/`
   fixture, and a baseline update, shipped in the same PR — is the reference run: it proves the
   loop closes end-to-end with a human still holding the merge.

## Design

**The three hard laws.** Everything else in this RFC is commentary on these:

1. **Proposal-only.** The distiller never merges, never self-flips a `status:`, and never edits
   the calibration baseline except by proposing the documented `--update-baseline` command for
   a human to run.
2. **Calibrate audits the learner.** Every gate-touching proposal must pass `govkit calibrate`
   with FP=0 and non-regressing recall BEFORE it may enter the PR — the immune system
   (RFC-0012) audits the learner, not the other way around.
3. **The corpus is append-only.** The distiller may add fixtures; it may never remove or weaken
   them. This is the ledger gate's posture (RFC-0016) applied to the corpus: evidence may not
   vanish.

**Cadence.** On-demand via the `distill-learnings` skill, or a scheduled session (a Routine).
Deliberately NOT a hook: a keyed step must never sit in the no-key path — the standing
invariant is explicit ("Any future LLM-judge eval is a separate opt-in layer — it must never
enter the no-key CI path", AGENTS.md, RFC-0001), and a hook is exactly that path.

**Insufficient-data behavior.** With a thin journal the distiller must say "insufficient data"
and stop. A distiller that invents lessons from noise poisons the corpus — fail-honest beats
fail-productive, and law 3 makes a poisoned fixture expensive to undo.

## Alternatives

| Option | Why rejected |
|---|---|
| **Distiller as an engine command** | Couples a keyed LLM step to the no-key core — kills the invariant that lets any contributor be gated identically without an API key. |
| **Auto-applied learning** | A loop that edits its own gates learns to pass itself; `calibrate` exists precisely to prevent this (RFC-0012). RATIFY stays human. |
| **Fine-tuning / embeddings memory** | Heavyweight, opaque, undiffable. The corpus + `AGENTS.md` ARE the memory — reviewable line by line, revertible commit by commit. |
| **Cron-only automation without a human PR gate** | RATIFY is load-bearing, not ceremony: the human merge is the only step an agent cannot game. |

## Impact / rollout

- **Plugin surfaces only.** The govkit engine is untouched; the no-key CI gate never runs the
  distiller. New files: `plugins/swe-flow/agents/distiller.md` and
  `plugins/swe-flow/skills/distill-learnings/SKILL.md`; manifests bump 0.4.0 → 0.5.0.
- **Adoption path:** run the skill after incidents/retros, or wire a Routine; the first
  in-repo cycle ships alongside this RFC as the worked example.
- **Rollback** is deleting the agent and skill files and reverting the manifest bump; nothing
  in the engine or CI reads either.

## Open questions

- **Distill cadence heuristics.** Per N journal records? Weekly? Left to field data — the
  journal itself will show when rounds stop yielding proposals.
- **Cross-consumer distillation once n≥3 consumers exist.** Privacy first: journals are local
  by design, so any aggregation needs an explicit opt-in surface that does not exist yet.
- **Confidence scores on proposals.** Whether each proposal should carry a confidence score,
  or whether the evidence citations already give reviewers a better signal.

## Roadmap fit

Closes the R7 flywheel named in RFC-0012: SENSE (`--journal`, shipped) → DISTILL (this RFC,
keyed, proposal-only) → RATIFY (human merge, unchanged). The distiller is also the consumer
the ledger (RFC-0016) anticipated: proposal kind (d) feeds newly discovered work into the
machine-readable work-queue.

## As-built

Shipped as the agent + skill pair with the manifest bump 0.4.0 → 0.5.0, together with the
first distill cycle run by the session lead as the reference: escape-derived `AGENTS.md`
rules, a new `weak/` fixture, and the baseline update, all in the same PR. The three hard
laws appear verbatim in the agent file; the skill encodes the six-step procedure with the
insufficient-data early exit as step 0.

## Deviations from design

None at ship — review-hardening lands in-PR, keeping accepted design == shipped code (the
RFC-0013 precedent). Recorded here if merge review forces changes.

## Recommendation

Ship DISTILL as a plugin agent + invoking skill bound by the three hard laws: proposal-only,
calibrate-audited before the PR, append-only corpus. Prefer this over an engine command
(couples keyed to no-key), over auto-applied learning (self-passing gates), over
fine-tuning/embeddings memory (opaque and undiffable), and over cron-only automation without
a human gate (RATIFY is load-bearing) — each rejected above.
