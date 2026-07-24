# work-breakdown eval — results (batch run `wf_5c75a887-e4c`, 2026-07-24)

Scores the swe-flow `work-breakdown` skill against the frozen `fixture/` (RentField + RFC-9101 depot
transfer approval flow) + `rubric.md` (32 pts, 14 checks: **A. traps** A1–A6 = 16 pts, **B. general
quality** B1–B8 = 16 pts). Protocol and blinding rules: `README.md`. Ground-truth key: `rubric.md`
(graders only). This file is the number of record for the skill's before/after claim.

**Skill fixed between before and after** — 3 rules, +24 lines in `SKILL.md`: (1) list **touched
files** first, and **derive parallel-safety from disjoint file sets**; (2) label each edge **hard vs
soft**; (3) a **mandatory closing concurrency statement** ("silence is an incomplete breakdown").

## Conditions

Two skill conditions, each run by an **opus** and a **sonnet** runner on the same frozen `fixture/`
and `rubric.md` (only the skill changed between conditions):

- **Baseline** — the shipped skill, unmodified. Run labels: `baseline-*`.
- **After** — the shipped skill + the 3-rule / +24-line touched-files / parallel-safety / concurrency
  edit. Run labels: `after-*`.

## Totals

| Condition | Run label | opus | sonnet |
|---|---|---:|---:|
| Baseline (shipped) | `baseline-*` | **31** | **27** |
| After (touched-files + concurrency rules) | `after-*` | **30.5** | **30** |

Baseline totals are grader fills (no baseline verifier adjustments). After: sonnet **verifier clean**;
opus **verifier upheld all verdicts** but flagged one grader-integrity issue (see below).

## Per-category breakdown

Group maxima: **A. traps** (A1–A6) 16 · **B. general quality** (B1–B8) 16 → 32.

| Run | A traps (16) | B quality (16) | Total |
|---|---:|---:|---:|
| `baseline-opus` | 16 | 15 | **31** |
| `baseline-sonnet` | 14.5 | 12.5 | **27** |
| `after-opus` | 16 | 14.5 | **30.5** |
| `after-sonnet` | 16 | 14 | **30** |

### Where the points sat

- **`baseline-opus` (B 15):** B4 PARTIAL (−1) — declared two slices parallel while **both edit
  `AllocationService.cs`**. The exact gap the edit targets.
- **`baseline-sonnet` (A 14.5 / B 12.5):** worst-fails — **A3/T1 PARTIAL** (same-file coupling merged
  but never surfaced in words), **B2 PARTIAL** (soft reject←accept sequencing mislabeled as a hard
  blocking edge), **B4 PARTIAL** (no concurrency statement). Remaining B deductions minor at n=1
  grader granularity.
- **`after-opus` (B 14.5):** B2 PARTIAL (−1.5) — invented a directional edge (accept *blocking*
  reject) where the code needs only serialization.
- **`after-sonnet` (B 14):** B2 PARTIAL — missed a producer→consumer event edge; **B7 0.5/1** —
  carried a double-upstream slice.

## What moved (baseline → after): the parallel-safety gap measured closed

- **Traps A 16/16 for BOTH after-runs** (opus held 16; sonnet 14.5 → 16). **B4 out of the worst-fails
  for both** — the mandatory concurrency statement + parallel-safety-derived-from-disjoint-files rules
  did their job; no after-run declares same-file slices parallel.
- **A3 surfacing fixed** (sonnet): the same-file coupling in `AllocationService.cs` is now surfaced in
  words, not silently merged. This is the before/after win — the targeted parallel-safety /
  same-file-coupling gap is closed on both models.
- **Honest read of the opus total: 31 → 30.5.** The parallel-safety gap closed, but B2 fluctuated
  into a −1.5 (an *invented* edge rather than a *missing* one). Sonnet rose cleanly, 27 → 30 (+3).

### Grader-integrity flag (`after-opus`, caught by verifier)

The opus verifier **upheld every verdict** but flagged one integrity issue: the grader attributed a
quote to `RUN-NOTES.md` that in fact only exists in the fixture source. The PASS survived — **two
other verbatim quotes independently supported it** — but the misattribution violated the mandatory
quoting rule. Recorded; feeds Round 21 Lesson 2 (citation-verifier station is load-bearing).

## Residual (identical class on both after-runs) — watch-item, deliberately NOT chased

**B2 edge-exactness.** Opus **invented** a directional edge (accept blocking reject, where the code
needs only serialization); sonnet **missed** a producer→consumer event edge while carrying a
double-upstream slice (B7 0.5/1). Both are the same underlying gap from opposite sides: an edge's
*direction and existence* aren't pinned to the artifact that makes it real. Watch-item — **a hard edge
should name the artifact the successor consumes** — not chased this round, since it is orthogonal to
the parallel-safety gap the edit was scoped to.

## Provenance

- **Workflow run:** batch `wf_5c75a887-e4c` — before-runs 2026-07-24 (27 agents, ~2.04M subagent
  tokens batch-total across three corpora); after-runs same day (18 agents, ~1.25M tokens batch-total).
- **Fixture:** RentField snapshot + `fixture/docs/rfc-transfer-approval.md` (RFC-9101), leak-audited
  (no `vertical slice` / `blocking edge` / `XL` / `file-disjoint` labels in prose), 6 planted traps
  discoverable from RFC + code alone.
- **Runners:** blind (scoped to `fixture/` + `SKILL.md`; never `rubric.md`/`README.md`/`runs/`/the
  sibling `domain-decompose-eval` corpus). Paired opus + sonnet.
- **Graders:** **opus**. **Verifiers:** **sonnet**, independent re-fill (traps A 16/16 upheld on both
  after-runs).
- **Write-scope lock (F11):** the skill under `plugins/swe-flow/skills/work-breakdown/` was READ-ONLY;
  the +24-line edit landed only between the frozen before/after conditions.

## Rerun pointer

To re-verify this edit (or any future `work-breakdown` change), follow the **before/after protocol in
`README.md`**: freeze `fixture/` + `rubric.md`, change only `SKILL.md`, re-run both runners blind, diff
per-check verdicts. A clean win is a check moving PARTIAL/FAIL → PASS with no check regressing — and
in particular A must stay at 16/16 and no after-run may declare same-file slices parallel. Watch B2
for edge-exactness before calling it closed.
