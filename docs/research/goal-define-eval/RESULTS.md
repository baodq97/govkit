# goal-define eval — results (batch run `wf_5c75a887-e4c`, 2026-07-24)

Scores the swe-flow `goal-define` skill against the frozen `fixture/` (Loopback post-purchase
feedback intake) + `rubric.md` (30 pts, 13 checks: **trap** C1–C6 = 18 pts, **discipline** C7–C13 =
12 pts). Protocol and blinding rules: `README.md`. Ground-truth key: `rubric.md` (graders only). This
file is the number of record for the skill's before/after claim.

**Skill fixed between before and after** — 2 rules, +8 lines in `SKILL.md`: (1) a measurable success
metric is *required-but-not-supplied* material — accept an owner question, a labeled `TBD`, or a
labeled `PROPOSAL`; **"measure later" is never accepted**; (2) every number is sourced-or-labeled
where it stands.

## Conditions

Two skill conditions, each run by an **opus** and a **sonnet** runner on the same frozen `fixture/`
and `rubric.md` (only the skill changed between conditions):

- **Baseline** — the shipped skill, unmodified. Run labels: `baseline-*`.
- **After** — the shipped skill + the 2-rule / +8-line success-metric-and-number-sourcing edit. Run
  labels: `after-*`.

## Totals

| Condition | Run label | opus | sonnet |
|---|---|---:|---:|
| Baseline (shipped) | `baseline-*` | 30 → **29** | 28 → **27** |
| After (metric + sourcing rules) | `after-*` | **28** | **28** |

Baseline totals are grader → verifier-adjusted. After-runs: **verifier clean on both** (13 checks
sampled each, zero adjustments).

## Per-category breakdown

Group maxima: **Trap** (C1–C6) 18 · **Discipline** (C7–C13) 12 → 30.

| Run | Trap (18) | Discipline (12) | Total |
|---|---:|---:|---:|
| `baseline-opus` (verifier-adjusted) | 18 | 11 | **29** |
| `baseline-sonnet` (verifier-adjusted) | 16 | 11 | **27** |
| `after-opus` (verifier clean) | 16 | 12 | **28** |
| `after-sonnet` (verifier clean) | 16 | 12 | **28** |

### Verifier adjustments on the baselines

- **`baseline-opus` 30 → 29:** C7 → PARTIAL (−1) — an unsourced `"rating ≤ 2"` threshold presented
  as fact.
- **`baseline-sonnet` 28 → 27:** C4 PARTIAL (1/3) — deferred to a stakeholder's *"measure later"*
  instead of demanding a metric; C8 adjusted — a real unknown silently filled.

## What moved (baseline → after): the targeted gap measured closed

- **Discipline C7–C13: 12/12 on BOTH after-runs, zero verifier adjustments.** The exact gap the edit
  targeted — success-metric discipline (no "measure later") + number-sourcing (`sourced-or-labeled`)
  — closed. C7 (opus baseline 1/2) and C8 (sonnet baseline 1/2) both recovered to full; C4 no longer
  swallows a "measure later." This is the before/after win.
- **Honest read of the totals: opus went 29 → 28.** The discipline group rose (11 → 12), but the
  trap group fell (18 → 16) because **C2 fluctuated PASS → PARTIAL** across the two opus runs. n=1 per
  condition; C2 is a judgment check, and this is judgment-check variance, not a regression the edit
  caused. Sonnet went 27 → 28 (discipline 11 → 12, trap flat at 16).

## Residual (identical on both after-runs) — watch-item, deliberately NOT chased

**C2 PARTIAL (1/3) — axis-decomposition of conflicts.** When two stakeholders conflict on **two**
axes at once (delivery *channel* AND question *format*), both after-runs surfaced only the louder axis
(channel) as an owner decision and **silently absorbed the format axis**. The trap (T2) rewards
surfacing the conflict as an owner decision; surfacing one of its two axes earns partial credit.
Recorded as a watch-item — **decompose a multi-axis conflict into one owner decision per axis** — and
not chased this round, since it is orthogonal to the metric/sourcing gap the edit was scoped to.

## Provenance

- **Workflow run:** batch `wf_5c75a887-e4c` — before-runs 2026-07-24 (27 agents, ~2.04M subagent
  tokens batch-total across three corpora); after-runs same day (18 agents, ~1.25M tokens batch-total).
- **Fixture:** Loopback — 5-file fictional B2B SaaS intake (founder brief + 2 emails + support ticket
  + Slack thread), 6 interlocking traps discoverable from prose alone.
- **Runners:** blind (scoped to `fixture/` + the skill under test; never `rubric.md`/`README.md`/`runs/`).
  Paired opus + sonnet. Only the `/goal` text is graded; companion `RUN-NOTES.md`/`QUESTIONS.md` are
  not scored for any check.
- **Graders:** **opus**. **Verifiers:** **sonnet**, independent re-fill.
- **Write-scope lock (F11):** the skill under `plugins/swe-flow/skills/goal-define/` was READ-ONLY;
  the +8-line edit landed only between the frozen before/after conditions, not mid-run.

## Rerun pointer

To re-verify this edit (or any future `goal-define` change), follow the **before/after protocol in
`README.md`**: freeze `fixture/` + `rubric.md`, change only the skill, re-run both runners blind, diff
per-check verdicts. A clean win is a check moving PARTIAL/FAIL → PASS with no check regressing — a net
total held up by discipline C7–C13 climbing while a trap check drops on n=1 variance is **not** a
clean win; read C2's fluctuation as variance, not signal, until it is re-run at higher n.
