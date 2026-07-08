---
id: RFC-0014
title: Risk-tiered verify checks — advisory vs blocking, per kind, in config
status: implemented
owner: baodq97
date: 2026-07-07
reconciled: sha256:81769a1804677c1c
governs:
  - packages/govkit/src/commands/verify.ts
  - packages/govkit/src/config.ts
---

> Lets a repo declare, in `govkit.yml`, which verify check kinds hard-block and which merely
> warn: a `tiers:` map from check kind to `blocking` | `advisory`, defaulting every kind to
> `blocking` so existing consumers see zero change. Deterministic by construction — tier
> assignment is config read at load time, no judgment call in the loop. The owner delegated
> approval in-session and implementation ships in the same PR, so this RFC lands directly at
> `status: implemented`, the RFC-0012 precedent.

## Summary

Every verify violation today blocks equally: a stale INDEX row and a broken cross-artifact
reference carry the same weight as a missing owner field. That uniformity is safe but blunt —
it makes the gate's false-positive pressure land hardest exactly where the blast radius is
lowest, and it is the single thing standing between govkit and safe low-risk auto-merge. This
RFC adds an optional top-level `tiers:` map in `govkit.yml`, keyed by verify check kind, with
values `blocking` or `advisory`:

- The canonical kinds are the nine verify emits today: `coherence`, `duplicate`,
  `frontmatter`, `id`, `index`, `placeholder`, `reference`, `section`, `status`.
- **Default for every kind: `blocking`** — an absent or empty `tiers:` map reproduces today's
  behavior bit-for-bit; zero change for existing consumers.
- An unknown kind in `tiers:` is an **operational error** — fail loud. A typo must not
  silently leave a check blocking (or advisory) against intent.

Every violation carries its `tier`; `ok` is computed from blocking-tier violations only;
advisory-tier violations print as warnings and appear in `--json` and in the journal record
(RFC-0012) with their tier, so calibrate-side analysis can see them.

## Motivation

The 2026-07 deep-research sweep's F5 candidate is OpenAI's practical guide: *"Assess the risk
of each tool... assigning a rating—low, medium, or high—based on factors like read-only vs.
write access, reversibility... Use these risk ratings to trigger automated actions, such as
pausing for guardrail checks before executing high-risk functions or escalating to a human."*
The same shape as swe-flow working-discipline's one-way/two-way door classification: the door
sets the bar, and tiers are the doors of the doc gate. The payoff, named plainly: tiering is
what makes low-risk auto-merge safe — advisory absorbs low-blast-radius friction (the FP
pressure the confusion matrix measures) while high-risk structural violations still
hard-block. Calibrate (RFC-0012) plus tiers are the two halves of "ship faster without
failing open": one measures the gate's accuracy, the other prices its failures.

## Design

**Config.** A new optional top-level `tiers:` key in `govkit.yml`, parsed and validated in
`config.ts`: a map from check kind to the literal `blocking` or `advisory`. Validation is
strict on both axes — an unknown kind and an unknown tier value are each operational errors at
load time, before any doc is read. The nine-kind vocabulary is the closed set verify emits;
growing it is a code change that extends the validator in the same commit.

**Verify.** `runVerify` stamps each violation with its resolved tier and computes `ok` from
blocking-tier violations only. Advisory violations are never dropped: they print as warnings
in the human report, ride along in `--json`, and land in the journal record with their tier.
A run whose only violations are advisory exits 0.

**Scoping — verify only.** The eval layer is untouched: it already has its own
required-floor/advisory split by construction (RFC-0001), and `tiers:` does not reach it. This
scoping is deliberate and stated explicitly — one tiering mechanism per layer, no overlap.

**Deterministic by construction.** Tier assignment is config read at load time — no judgment
call in the loop, no per-run classification. This answers the research sweep's open question
("can tier assignment itself stay zero-LLM?") with yes-for-verify-kinds: the risk rating is a
human decision recorded in reviewed config, and the runtime only looks it up.

## Invariant check

Zero LLM calls, zero new dependencies: a map lookup at load time and a filter at result time.
The no-key CI invariant holds. The default-blocking posture means the gate can only get looser
by an explicit, git-recorded config edit — the gate never loosens itself, and calibrate's
corpus catches a tier edit that would let a `weak/` fixture through the floor.

## Alternatives

| Option | Why rejected |
|---|---|
| **Per-doc-type tiers** (kind × type matrix) | Speculative complexity with no consumer demand; classify up (kind-level) and add the matrix later behind evidence — the RFC-0002 posture. |
| **Severity levels** (info/warn/error triple) | Two tiers map to the only two behaviors that exist: block or don't. A third level is UI, not semantics — rejected as decoration. |
| **Tiering eval rubric rules** | The eval layer already has exactly this split by construction (required floor vs advisory score); duplicating it in `tiers:` creates two sources of truth for one behavior. |

## Impact / rollout

- **Zero behavior change by default:** every kind is `blocking` absent config; existing
  consumers' exit codes, reports, and JSON are unchanged until they opt in. Ships in the same
  engine minor bump as RFC-0013 (0.4.0 → 0.5.0).
- **Journal/JSON shape grows a `tier` field** on violations — additive, and the journal is
  local gitignored state, so no consumer contract breaks.
- **Template:** the template `govkit.yml` gains a commented `tiers:` example (the RFC-0002
  posture: document the key, don't scaffold it).
- **Rollback** is deleting the `tiers:` key — the default restores today's uniform blocking.

## Open questions

- **Should `--hook` runs (RFC-0013) treat advisory violations as blocking under a strict
  mode?** Deferred — the agent-loop consumer may want a harder bar than CI; wait for a real
  consumer before adding a mode flag.
- **Should calibrate grow a verify-layer matrix now that tiers make verify outcomes richer?**
  Deferred to the per-rule-matrix open question in RFC-0012 — same fixture-volume prerequisite.

## Roadmap fit

Extends R1 (generality hardening): the tier vocabulary is config, so any repo tunes its own
bar — the same "schema is config, engine is generic" move that RFC-0007 made for doc layout,
applied to enforcement strength.

## As-built

Shipped as recorded in PR #4, together with RFC-0013, at the recorded split: strict `tiers:`
validation in `config.ts` (unknown kind and unknown tier value both fail loud at load), tier
stamping and blocking-only `ok` computation in the pure `runVerify`, warning-styled advisory
rendering at the cli edge. Validation at merge: full `bun run check` green, the test suite
extended to cover default-blocking equivalence, advisory-only exit 0, the unknown-kind
operational error, and tier presence in `--json` and journal records; engine version bumped
0.4.0 → 0.5.0.

## Deviations from design

None at ship time — any post-review hardening lands in this same PR before merge, keeping
accepted design == shipped code (the RFC-0012 precedent, where review findings entered the
design text before acceptance rather than accruing as divergence).

## Recommendation

Ship the two-tier `tiers:` map, verify-scoped, default-blocking, fail-loud on unknown kinds.
Prefer this over a kind × type matrix (speculative, add behind evidence), over a three-level
severity scheme (a third level is UI, not semantics), and over tiering eval rules (that layer
already has the split) — each rejected above. With calibrate measuring the floor and tiers
pricing the failures, low-risk auto-merge stops being a leap of faith.
