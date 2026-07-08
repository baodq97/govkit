---
name: substance-judge
description: >
  Runs the keyed Layer-3 substance evaluation (RFC-0019, PRD-0001 R2) over a repo's governed
  docs: discovers the corpus from govkit.yml, gates on the deterministic floor first
  (npx govkit check), fans out one swe-flow:judge per doc against the pinned scoring anchors
  (rubric substance-v1), appends deepeval-compatible verdicts to .govkit/evals/, and in
  cross-model mode re-judges on a second model and reports per-doc agreement spread. Use when
  asked to "judge substance", "score the docs", "run the substance judge", or "chấm chất
  lượng tài liệu". Opt-in and API-keyed — NEVER wire it into no-key CI, hooks, or exit codes.
allowed-tools: Read, Grep, Glob, Bash, Write, Task
---

# Substance Judge

Score whether governed docs are SOUND — the question the deterministic floor is scoped
never to answer (RFC-0001's honest boundary). You orchestrate; the `swe-flow:judge` agent
scores; the floor stays the only thing CI runs.

## Hard boundary (read first)

Everything here needs an API key and is opt-in. Do NOT add it to CI workflows, hooks, or
anything that gates a merge; do not let a verdict change an exit code. If asked to wire it
into CI, decline and cite RFC-0001/RFC-0019 — the no-key invariant outranks the feature.

## Procedure

1. **Discover, never assume.** Read `govkit.yml` at the repo root: `docs.root`, the type
   dirs, and the ignore list define the corpus. Collect every governed `.md` (skip ignored
   files). An explicit doc list or type filter from the user narrows this.

2. **Gate on the floor.** Run `npx --yes govkit check --root <root>`. If it fails, STOP and
   report — the judge refuses unfloored docs by contract, and scoring on top of a red gate
   dresses noise as signal.

3. **Fan out the judge.** For each doc, dispatch one `swe-flow:judge` (Task tool) with the
   doc's path and its `governs:` paths (if any) so the judge can spot-check claims. Default
   panel model is the agent's pinned one; pass the model through unchanged so `model` in
   each verdict is truthful.

4. **Record.** Append each verdict as ONE line of JSON to
   `.govkit/evals/substance-<UTC yyyymmdd-HHMM>.jsonl` (create the dir). Do NOT assume
   `.govkit/` is gitignored — a consumer using `docs.root: .govkit` (RFC-0007) COMMITS that
   tree. Check this repo's ignore rules and say in the report whether the record file is
   tracked; committing verdict history is the human's deliberate act, never a silent side
   effect. Do not reformat the judge's JSON; the deepeval-compatible shape
   (`name`/`input`/`score`/`threshold`/`success`/`reason` + `rubricVersion`/`model`/
   `dimensions`) is the contract.

5. **Cross-model mode** (when asked, or when a verdict will justify a decision): re-run the
   same docs with the judge on a second model (e.g. pin one run to `sonnet`, one to `opus`),
   same rubric, into the same record file. Then report per-doc spread =
   |score_A − score_B| × 100:
   - spread ≤ 10 — agreement; report the mean.
   - spread ≤ 20 — note it; the lower score is the honest headline (uncertainty scores down).
   - spread > 20 — flag the DOC for human reading first: ambiguous substance is the finding,
     not a judge malfunction.

6. **Report.** One table: doc · score (0–100) · success vs threshold · weakest dimension ·
   one-line reason (+ spread column in cross-model mode). Close with the record file path
   and the (rubricVersion, model) pair(s) — scores are comparable only within one pair.

## What this skill never does

- Re-implement or second-guess `verify`/`eval` — the floor is deterministic and already ran.
- Edit docs, flip statuses, or push anything — verdicts inform humans; humans act.
- Invent rubric dimensions or bands — the anchors file is pinned; changing it is an RFC-0019
  amendment that bumps `rubricVersion`, never an inline tweak.
