# ddd-flow thinning — measured results (2026-07-31 → 2026-08-01)

Frozen evidence for the change set on `optimize/ddd-flow-thin`. Numbers only, with how each was
obtained; the reasoning lives in the commits and in LEARNING-LOOP Round 25.

The scratch trees these were produced in are deliberately **not** committed — they are ~3k lines of
generated domain model whose value is the score, not the text. Reproduction instructions are below.

## 1. Size

| Surface | Before | After | Δ |
|---|---:|---:|---:|
| 8 step skills (`1-understand … 8-code`) | 92.5 KB | 22.8 KB | **−75%** |
| `design` orchestrator | 16.7 KB | 15.2 KB | −9% |
| `view` | 9.0 KB | 8.4 KB (+ lazy `references/model-json.md`) | −7% |

The orchestrator was thinned to 11.0 KB and **reversed** — see §4.

## 2. Isolation

Both eval arms ran against `../btm-pilot-v1`, split by commit rather than by hand:

```
arm    = git archive ebab64a        # last commit BEFORE any domain artifact — ROADMAP + 11 PRDs
golden = git archive HEAD docs/domain
```

The arm carries no `.git`, so the golden is unreachable through history. Verified that the scaffold
`docs/domain/INDEX.md` present at `ebab64a` is an empty header — it leaks none of the golden's
context names (`demand`, `access`, `taxonomy`, `discovery`, `message-flows`).

## 3. Phase A — the grounding gate, with no human available

The arm ran `1-understand` → `2-discover` from documents alone, reaching **0 confirmed / 117
candidate** (0 events, 0 rules, 17 hotspots). `ddd_check` was **green**, because check 16 is guarded
on a decompose artifact existing.

`3-decompose` then **refused to cut**: 0 `context-map.md`, 0 `model.yaml`, and a halt record
(`decompose-gate.md`) instead. Two things it was not told to do:

- it argued the numeric floor is *necessary, not sufficient*, tabulating 6 of 10 polysemy clusters
  against the exact boundaries they govern — so a token 1-event/1-rule ratification would clear the
  floor without making any cut sound;
- it declined to write a stub `context-map.md`, reasoning that doing so would make `ddd-flow:design`
  read the step as done.

This is the `btm-systems` failure — a context map cut from 0 confirmed events, two days stalled, a
full rollback, every structural gate green throughout — not reproduced.

## 4. Orchestrator parity — two blind judges, labels swapped

`design`/`view`, pre-thin vs post-thin, presented as unlabelled variants. Judge 1 saw A-then-B,
judge 2 saw B-then-A. Both ranked the **pre-thin orchestrator higher** and named the same losses:
the pre-decompose and `8-code` readiness rows, the `?doc=` grammar and its eight ids, the numbered
skill ids, `--json`, `--deviation`/`--room`/`--artifact`/`--note`, `discovery/model.json` as the
grounding source, the `info` severity token, the nine-message limit.

Decisive finding: **check 16 is silent before a decompose artifact exists** (`ddd_check.py:881`),
so deleting the human-judgement readiness row made silence read as a pass. Restored, with the
defects the judges found in the *old* version corrected rather than reinstated (`--review` does not
write, it prints; `ddd_check` has no `--config`).

## 5. Phase B — model quality, operator ratification replayed

The 68 human turns of the original pilot were mined from the Claude Code transcripts and the
operator's decisions replayed as confirmation (H1–H7, M0 scope, the 7 AuthZ dimensions, the weight
profile). Two judges, labels swapped, scored 0–5 per axis and returned **identical** per-axis
scores — no position bias.

| Axis | golden (heavy skills + real operator) | arm (thin skills + replay) |
|---|---:|---:|
| Grounding | 3 | **5** |
| Boundaries | 4 | **5** |
| Right-sizing | **5** | 3 |
| Honesty | 3 | **5** |
| Usefulness | **5** | 3 |
| **Total** | 40/50 | **42/50** |

> "ALPHA is the stronger domain model; BETA is the stronger deliverable."

Both judges independently named the same six **enforced** invariants in the golden that no source
states: freeze-on-approve, an approve cardinality guard, a seed-import rejection rule, a
ranking-scope exemption, AuthZ as five dimensions where the operator's own words say seven, and a
`currency` attribute lifted from a milestone three ahead. One judge found none in the arm; the other
found two, both self-labelled by the arm as inference.

**A golden built by a richer process is a stronger deliverable, not a more grounded one.**
Golden-match is therefore the wrong scoring function; grounded-vs-source is the right one.

## 6. Router accuracy — 44 utterances × 3 independent routers

Anti-circular by construction: ground truth from `steps.yml` (`question:`/`artifacts:`), the corpus
author forbidden to read the descriptions, each router seeing **only** the description surface.
Utterance wording lifted from the 68 verbatim operator turns; half Vietnamese.

| Slice | Score |
|---|---|
| Overall | **129/132 (98%)** — all 3 errors one case, `split: []` |
| Negatives (PRD · failing test · release · review · migration · CI) | **24/24 — zero false claims** |
| Orchestration · step-specific · view | 8/8 · 20/20 · 4/4 |
| Vietnamese · English | 100% · 95% |

`skill-lint`'s two warned pairs produced **zero** errors; the one real confusion
(`3-decompose`↔`4-connect`, 43.6%) sits *below* the warn floor. Lexical cosine did not track
measured mis-routing — recorded as a caveat inside `skill-lint.mjs` rather than a threshold change.

**Limits.** 44 cases, 3 routers, one corpus author, descriptions in isolation; cross-plugin
negatives untested against the ~30 skills a live session carries. By the rule of three, 0/8 clean
negatives bounds the true false-claim rate at ≈≤12%, not zero. This licenses keeping the reversal of
RFC-0032 F2; it does not prove the guard was unnecessary. Decision pending in **US-0015**.

## 7. Defects this eval found (all fixed on the branch)

| Defect | How it surfaced | Fix |
|---|---|---|
| `business-model.md` capability table stopped parsing → `ddd_check` checks 1–3 silently dark | executing `load_business_model` over three corpora: 13 rows, 8 rows, **0** | shape added to `artifact-shapes.md`; 16/16 on re-run |
| `load_business_model` dropped any capability *named* `Capability …` | a blind run named one that way | redundant header guard removed; RED test in the gate |
| `context-is-future-only` fired per context — 4 findings for an honest greenfield model, 0 for one mislabelled `as-is` | comparing the two eval arms | collapsed to one finding naming every context |
| `4-connect` description did not carry the plugin's own spanning-invariant doctrine | the single router miss | description clause added, justified from `design` §2 not from the test |

## Reproducing

```bash
# arms
cd ../btm-pilot-v1 && git archive ebab64a | tar -x -C <scratch>/arm
git archive HEAD docs/domain | tar -x -C <scratch>/golden

# operator turns  (transcripts are local to the machine that ran the pilot)
python3 <scratch>/extract-ops.py ~/.claude/projects/-home-bd-personal-projects-btm-pilot-v1/*.jsonl

# checker over either arm
python3 plugins/ddd-flow/skills/design/scripts/ddd_check.py --root <scratch>/<arm> --json
```

The workflow scripts for the three multi-agent runs (ops mining, phase B, router accuracy) are in
this session's `workflows/scripts/` and can be re-invoked with `resumeFromRunId` for cached replay.
