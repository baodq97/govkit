---
name: substance-judge
disable-model-invocation: true
description: >
  Runs the keyed Layer-3 substance evaluation (RFC-0019, PRD-0001 R2) over a repo's governed
  docs: discovers the corpus from govkit.yml, gates on the deterministic floor first
  (npx govkit check), proves the judge itself before any verdict (RFC-0020 selftest —
  calibrate green + a strict good-above-weak ranking probe, else refuse), fans out one
  swe-flow:judge per doc against the pinned scoring anchors (rubric substance-v1), appends
  deepeval-compatible verdicts to .govkit/evals/, and in cross-model mode re-judges on a
  second model and reports per-doc agreement spread. Use when asked to "judge substance",
  "score the docs", "run the substance judge", or "chấm chất lượng tài liệu". Opt-in and
  API-keyed — NEVER wire it into no-key CI, hooks, or exit codes.
allowed-tools: Read, Grep, Glob, Bash, Write, Task
---

# Substance Judge

Score whether governed docs are SOUND — the question the deterministic floor is scoped
never to answer (RFC-0001's honest boundary). You orchestrate; the `swe-flow:judge` agent
scores; the floor stays the only thing CI runs. And the judge must prove itself before it
judges (RFC-0020): a judge that cannot rank a known-good doc above known keyword-salad
emits numbers, not measurements — refuse instead.

## Hard boundary (read first)

Everything here needs an API key and is opt-in. Do NOT add it to CI workflows, hooks, or
anything that gates a merge; do not let a verdict change an exit code. If asked to wire it
into CI, decline and cite RFC-0001/RFC-0019 — the no-key invariant outranks the feature.
The selftest below is part of this skill, so it is equally opt-in: its calibrate half
happens to need no key, but the ranking probe is keyed, and neither belongs in CI.

## Procedure

1. **Discover, never assume.** Read `govkit.yml` at the repo root: `docs.root`, the type
   dirs, and the ignore list define the corpus. Collect every governed `.md` (skip ignored
   files). An explicit doc list or type filter from the user narrows this.

2. **Gate on the floor.** Run `npx --yes govkit check --root <root>`. If it fails, STOP and
   report — the judge refuses unfloored docs by contract, and scoring on top of a red gate
   dresses noise as signal.

3. **Prove the judge (selftest, once per invocation — RFC-0020).** Before ANY real doc is
   scored, run both halves; any failure means refuse (below), never "judge anyway".

   - **Deterministic half (no key).** Run
     `npx --yes govkit calibrate --corpus <corpus> --baseline <baseline>` — in this repo,
     `--corpus packages/govkit/eval/fixtures --baseline packages/govkit/eval/baseline.json`;
     in a consumer repo, the consumer's labeled corpus and committed baseline where they
     exist (no corpus to run against → say so in the report; the probe below still gates).
     A nonzero exit means the deterministic sensor underneath the judge is broken or
     regressed — refuse.
   - **Pin the anchors.** Compute the hash of the scoring-anchors file ONCE and pass it to
     every judge dispatch this run (probe and real), so all verdicts pin the same bytes:

     ```
     node -e "const {readFileSync}=require('node:fs'),{createHash}=require('node:crypto');const c=readFileSync(process.argv[1],'utf8').replace(/\r\n/g,'\n');console.log('sha256:'+createHash('sha256').update(c).digest('hex'))" ${CLAUDE_SKILL_DIR}/references/scoring-anchors.md
     ```

     That is `sha256:<hex>` of the anchors file content, CRLF→LF normalized (Windows
     checkouts are first-class). The hash is what makes `rubricVersion` verifiable instead
     of asserted: two records with the same `rubricVersion` but different `anchorsHash`
     mean someone edited the anchors without the RFC-0019 amendment that bumps the version.
   - **Keyed ranking probe.** Dispatch `swe-flow:judge` on the pinned pair —
     `references/selftest-fixtures/good/RFC-0001-webhook-dispatch.md` and
     `references/selftest-fixtures/weak/RFC-0001-webhook-dispatch.md` — same rubric, same
     `anchorsHash`, same model the real run will use. Both fixtures pass the floor by
     construction (see the pair's README); the weak one is floor-passing keyword-salad, so
     the probe tests exactly what the floor cannot. Require
     `score(good) > score(weak)` STRICTLY — a tie fails. In cross-model mode, EACH panel
     model must pass its own probe: (rubric, model) is the unit of comparability
     (RFC-0019), so it is the unit of trust.
   - **Any failure ⇒ refuse.** Print
     `judge not trustworthy: <which half failed and why>`, append one refusal record per
     planned doc-run (per (doc, model) run in cross-model mode) to the step-5 record file —
     the same JSON shape with `"score": null`, `"success": false`, and `reason` starting
     `"refused: judge not trustworthy — …"`, provenance fields included — and STOP. No
     partial verdicts: the record stream stays honest exactly when the judge fails hardest.

4. **Fan out the judge.** For each doc, dispatch one `swe-flow:judge` (Task tool) with the
   doc's path, its `governs:` paths (if any) so the judge can spot-check claims, and the
   `anchorsHash` from step 3. Default panel model is the agent's pinned one; pass the model
   through unchanged so `model` in each verdict is truthful, and temperature is 0 (the
   judge's contract — a sampled verdict is not reproducible).

5. **Record.** Append each verdict as ONE line of JSON to
   `.govkit/evals/substance-<UTC yyyymmdd-HHMM>.jsonl` (create the dir). Do NOT assume
   `.govkit/` is gitignored — a consumer using `docs.root: .govkit` (RFC-0007) COMMITS that
   tree. Check this repo's ignore rules and say in the report whether the record file is
   tracked; committing verdict history is the human's deliberate act, never a silent side
   effect. Do not reformat the judge's JSON; the deepeval-compatible shape
   (`name`/`input`/`score`/`threshold`/`success`/`reason` + `rubricVersion`/`model`/
   `temperature`/`anchorsHash`/`dimensions`) is the contract — the provenance fields are
   what let a score be re-derived and audited after the fact.

6. **Cross-model mode** (when asked, or when a verdict will justify a decision): re-run the
   same docs with the judge on a second model (e.g. pin one run to `sonnet`, one to `opus`),
   same rubric, into the same record file — after that model passed its own step-3 probe.
   Then report per-doc spread = |score_A − score_B| × 100:
   - spread ≤ 10 — agreement; report the mean.
   - spread ≤ 20 — note it; the lower score is the honest headline (uncertainty scores down).
   - spread > 20 — flag the DOC for human reading first: ambiguous substance is the finding,
     not a judge malfunction.

7. **Report.** One table: doc · score (0–100) · success vs threshold · weakest dimension ·
   one-line reason (+ spread column in cross-model mode). Close with the record file path,
   the selftest result, and the (rubricVersion, anchorsHash, model, temperature) tuple(s) —
   scores are comparable only when ALL FOUR match.

## What this skill never does

- Re-implement or second-guess `verify`/`eval`/`calibrate` — the floor is deterministic and
  the skill calls govkit, never the reverse.
- Skip the selftest or judge past a failed probe — a refusal record is the only honest
  output of an untrustworthy judge.
- Edit docs, flip statuses, or push anything — verdicts inform humans; humans act.
- Invent rubric dimensions or bands — the anchors file is pinned; changing it is an RFC-0019
  amendment that bumps `rubricVersion`, never an inline tweak (the `anchorsHash` mismatch
  is how an inline tweak gets caught).
- Edit the selftest fixture pair — it is append-only, like the calibrate corpus.
