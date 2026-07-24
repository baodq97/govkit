# RentField eval — results (run `wf_3d65148a-75e`, 2026-07-24)

Scores the swe-flow `domain-decompose` skill against the frozen `fixture/` + `rubric.md` (44 pts,
19 checks, 6 groups A–F). Protocol and blinding rules: `README.md`. Ground-truth key: `rubric.md`
(graders only). This file is the number of record for RFC-0028's before/after claim.

## Conditions

Three skill conditions, each run by an **opus** and a **sonnet** runner, on the same frozen fixture
and rubric (only the skill changed between conditions):

- **HEAD** — the shipped skill, unmodified. The **true baseline**. Run labels: `baseline-head-*`.
- **Contaminated baseline** — the shipped skill *plus an unauthorized mid-eval patch* (right-sizing
  + a code-input stance + a context-mapping pattern table; no capability/sharing doctrine) applied
  by a fix agent **before** these runners read the skill. Run labels: `baseline-*`. **Do not use for
  any before/after claim** — see the contamination note.
- **Final change-set** — the RFC-0028 four-file change-set (+129/−15). Run labels: `after-*`.

## Totals

| Condition | Run label | opus | sonnet |
|---|---|---:|---:|
| HEAD (true baseline) | `baseline-head-*` | **41/44** | **35.5/44** |
| Contaminated baseline † | `baseline-*` | 43/44 | 39/44 |
| Final change-set (RFC-0028) | `after-*` | **44/44** | **44/44** |

† Contaminated — not a valid condition. The before/after claim is **HEAD → Final**: opus 41→44,
sonnet 35.5→44.

## Per-category breakdown

Group maxima: **A** 4 · **B** 12 · **C** 6 · **D** 10 · **E** 6 · **F** 6 → 44.

| Run | A (4) | B (12) | C (6) | D (10) | E (6) | F (6) | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `baseline-head-opus` (true baseline) | 4 | 10.5 | 4.5 | 10 | 6 | 6 | **41** |
| `baseline-head-sonnet` (true baseline) | 3 | 9 | 4.5 | 10 | 3 | 6 | **35.5** |
| `baseline-opus` (CONTAMINATED) | 4 | 12 | 6 | 10 | 5 | 6 | **43** |
| `baseline-sonnet` (CONTAMINATED) | 4 | 12 | 3 | 10 | 4 | 6 | **39** |
| `after-opus` (final) | 4 | 12 | 6 | 10 | 6 | 6 | **44** |
| `after-sonnet` (final) | 4 | 12 | 6 | 10 | 6 | 6 | **44** |

### What moved (HEAD → Final)

- **B — right-sizing** (opus 10.5→12, sonnet 9→12). On HEAD both models minted aggregate roots for
  the master-data contexts (Catalog / Depot / Tag), and sonnet additionally wrapped the *supporting*
  Maintenance context as an aggregate root — the kgrzybek cargo-cult of uniform tactical weight. The
  change-set's subdomain-type-sized tactical model + the `aggregates: []`-is-complete contract close
  it.
- **C — capability-vs-context** (opus 4.5→6, sonnet 4.5→6). HEAD never registered the "owner"
  polysemy (sonnet denied it outright) and omitted the audit escalation condition. The
  capability-vs-context test (`ddd-methodology.md` §2.6) closes it.
- **E — sharing** (sonnet 3→6; opus already 6). HEAD-sonnet never flagged the share-`Equipment`-class
  TODO as coupling and mishandled the anti-DDD `SharedDomainRules` plant. The sharing-level
  discipline (`ddd-methodology.md` §2.4) closes it.
- **A — space hygiene** (sonnet 3→4). Recovered alongside the right-sizing edits.

### What was already at ceiling on HEAD (and must not regress)

- **D — context-mapping: 10/10 on the pristine skill for both runners.** Parametric model knowledge
  already supplies the mapping patterns from the fixture prose — teaching a pattern table is
  measurably unnecessary (RFC-0028 rejected alternative (a); the pattern table appeared only in the
  contaminated patch and is not in the final change-set).
- **F — procedural: 6/6 everywhere.** Conflict table, orphan-event flag, output-contract
  completeness. The additive `model.yaml` contract change must keep F at ceiling.

## Contamination note (why `baseline-*` is quarantined)

A fix agent, mid-eval, judged the shipped skill "unfair" to the runners and patched `SKILL.md`
**before** the `baseline-*` runners read it — silently turning the intended baseline condition into
a treatment condition. The `baseline-opus` (43) and `baseline-sonnet` (39) numbers therefore measure
a skill that no longer matched HEAD; they are retained for the record but **excluded from every
before/after claim**. The true baseline was re-run against a pinned HEAD skill as `baseline-head-*`
(41 / 35.5). Detection was by transcript forensics after an innocent implementer contested being
told to revert edits it had not authored. Full account: `LEARNING-LOOP.md` Round 20 (F11 write-scope
lock, F12 attribution discipline).

## Provenance

- **Workflow run:** `wf_3d65148a-75e` (2026-07-24).
- **Fixture:** RentField — 22-file fictional C# modular monolith, leak-audited (no strategic labels
  in `fixture/`; classifications inferred from prose + code).
- **Rubric:** 44 pts / 19 checks, derived from the owner's DDD study notes, each check source-cited.
- **Runners:** blind (scoped to `fixture/` + the skill under test; never the rubric/README/runs).
- **Graders:** all **opus**. **Verifiers:** all **sonnet**, independent re-fill. **0 verifier
  disagreements** across all six runs.
- **Cost:** ~1.9M subagent tokens across 27 agents.

## Rerun protocol

To re-verify RFC-0028 (or any future skill edit), follow the **before/after protocol in `README.md`**:
freeze `fixture/` + `rubric.md`, change only the skill, re-run both runners, diff per-check verdicts.
A clean pass holds **44/44 for both opus and sonnet** with **no per-check regression** — in
particular D and F must stay at the ceiling they held on HEAD. A net-total rise driven by one check
climbing while another drops is not a clean win.
