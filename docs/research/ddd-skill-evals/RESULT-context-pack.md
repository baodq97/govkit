# A/B: does the context pack make a step cheaper without making it worse?

**No. It cost 38% more tokens and 55% more time for zero measured quality change.**

Run 2026-07-28. Treatment: `ddd_context.py` plus the rewritten Inputs sections in `7-define` and
`4-connect`. Baseline: the same skills at `9836e87`, snapshotted under
`skill-snapshot-pre-context-pack/`. Four evals, both configs, fixture `nordic-freight`.

## Cost

| Eval | tokens | seconds | tool calls |
|---|---|---|---|
| connect / check-then-act-race | 63,330 → 82,151 · **+30%** | 317 → 489 · +54% | 18 → 29 |
| connect / overflow-and-pass-through | 64,677 → 71,096 · **+10%** | 341 → 389 · +14% | 16 → 20 |
| define / interface-critique | 57,763 → 93,839 · **+62%** | 259 → 579 · +123% | 19 → 55 |
| define / right-size | 104,624 → 154,220 · **+47%** | 722 → 1,075 · +49% | 38 → 79 |
| **mean** | 72,598 → 100,326 · **+38%** | 410 → 633 · **+55%** | 91 → 183 |

## Quality

Scored by `grade_deterministic.py`, the same instrument on both sides.

| | baseline | treatment |
|---|---|---|
| define / interface-critique | 6/6 | 6/6 |
| define / right-size | 6/6 | 6/6 |
| connect / check-then-act-race | 2/4 | 3/4 |
| connect / overflow-and-pass-through | 3/4 | 2/4 |
| **total** | **17/20** | **17/20** |

Exactly level. The one visible movement is the fabrication check on check-then-act-race, where the
treatment invented one name against the baseline's four — but overflow moved the other way by the
same amount, so it nets out. With n=4 that is noise, not a finding.

## Why it went the wrong way

Two causes, both identified from the runs' own evidence, both fixed afterwards — so these numbers
measure the version that had them.

**1. The pack reported discovery as empty.** It read `discovery/model.json` only, and the fixture
has just `discovery/timeline.md`. A run was told nothing was there, read the files by hand anyway,
and paid for both. One agent reported the bug in its own summary. Three further defects sat in the
same resolver once the fallback existed: candidates counted as confirmed, hotspots dropped on a
header-name mismatch, stated business rules never carried. Fixed in `d557d4e`.

**2. The pack was additive, not substitutive — and that was the prose, not the script.** The Inputs
section said *"Read the raw artifacts when the pack raises something you need the wording of"*, which
is an open invitation. Tool calls roughly doubled (91 → 183), and one agent's own note reads *"Most
time went on reading the 7 model.yaml files + timeline/context-map/business"* — the exact work the
pack existed to remove. The one run whose reads went **down** (3 against the baseline's 6) was also
the cheapest of the four at +10%, which is the mechanism working when it actually replaces something.

Both skills now say the pack **is** the input, and that a raw artifact is opened only to quote it.

## Pre-registered decision rule for the re-run

Re-running the four treatment runs on the patched version is worth one round. Registering the bar
first, so it cannot move afterwards:

- **Keep** if mean tokens land at or below baseline (≤72,598) **and** quality stays ≥17/20.
- **Revert** `ddd_context.py` and both Inputs sections otherwise.

Parity on cost is not enough on its own to justify the concept — but it would show the mechanism
works, and the fan-out to per-context sub-agents is what the pack was really a precondition for.

---

# Re-run on the patched version — and the verdict

Bar registered above: **keep if mean tokens ≤ 72,598 and quality ≥ 17/20.**

| Eval | baseline | buggy (i2) | patched (i3) |
|---|---|---|---|
| define / interface-critique | 57,763 | 93,839 · +62% | **53,175 · −8%** |
| connect / check-then-act-race | 63,330 | 82,151 · +30% | 71,960 · +14% |
| connect / overflow-and-pass-through | 64,677 | 71,096 · +10% | 82,757 · +28% |
| define / right-size | 104,624 | 154,220 · +47% | 122,111 · +17% |
| **mean tokens** | **72,598** | 100,326 · +38% | **82,501 · +14%** |
| **mean seconds** | **410** | 633 · +55% | **484 · +18%** |
| **quality** | **17/20** | 17/20 | **18/20** |

**Quality PASS (18/20). Cost FAIL (+14%). The rule says revert, so it is reverted.**

Parity was the bar and it was missed by 14%. Restating the reason it was set there: a pack that
costs more than the reading it replaces is not paying for itself, and "it found slightly more" is
the argument every unjustified addition makes.

## What survived, and it is narrow

One configuration beat baseline on every axis: **`7-define` scoped to a single named context** —
−8% tokens, −10% seconds, 14 tool calls against 19, quality level. Its own note: *"5 repo reads, 4
bash calls — one context-pack call did the upstream join."*

Every configuration that lost was one asked to cover a **whole repo**: right-size across seven
contexts (99 tool calls), and both connect runs, which must read all flows regardless. The join is
worth paying for when it is a join across one boundary; it is not when the step needs the whole
model anyway.

That is a result about **scope**, not about the concept, and it points at the fan-out: one sub-agent
per context, each with a scoped pack, is exactly the shape that won. The next experiment is that,
measured the same way — not a third attempt to make a repo-wide pack pay.

## Reverted

`ddd_context.py`, the `inputs:` block in `steps.yml`, and the rewritten Inputs sections in
`7-define` and `4-connect`. Recoverable at `a08b18e`..`d557d4e` if the fan-out needs the resolvers.

Kept, because they were measured separately and are unrelated: the per-step view hints in
`design/SKILL.md`, the as-is/to-be/could-be axis, the process-fidelity fixes, and
`grade_deterministic.py`.
