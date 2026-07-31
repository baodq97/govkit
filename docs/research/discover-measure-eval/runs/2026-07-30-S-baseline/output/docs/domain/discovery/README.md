---
id: DOMAIN-DISC-0001
title: FleetOps maintenance system — discovery session 2026-07-30
status: draft
owner: TBD
date: 2026-07-30
mode: discover
technique: eventstorming-big-picture
---

## Docs root — one unresolved decision

`docs/` did not exist in this repo. `references/output-template.md` step 3 says **pause and ask**
where docs should live rather than guess. There was no human in the session to ask, so this tree
was created at the skill's own default path and the question is left open as **H18**. If the answer
is a different path, move this directory wholesale — nothing here depends on the location.

## Who was in the room

| Role | Present | Notes |
|---|---|---|
| Domain expert | **no** | nobody on the current team wrote FleetOps; the original analysts have left (`README.md`) |
| Real end user | **no** | every claim about how a depot clerk or inspector behaves would be inference |
| Product / strategy | **no** | no PRD, no ADR, no roadmap anywhere in the snapshot |
| Developers | **no** | |
| Testers | **no** | |

**So: this run has discovered nothing. It has mined a vendor export.** Every element below is
`candidate`. Not one item is `confirmed`, because a schema cannot confirm anything — only a person
can. The value of what follows is that it is *measured*, re-runnable, and names its own gaps; it is
not shared understanding, and `3-decompose` should treat it as a proposal list, not as findings.

## Mode and method

DISCOVER. The artifacts are **structured** (a vendor-published XSD plus 52 XML files sharing one
shape), which is over the ≥20-file threshold, so the corpus was mined **by script before being
read**, per `references/measure-playbook.md`. Seven stages, each gated, each script committed:

`.ddd-flow/mine/stage0_validate.py` · `stage1_inventory.py` · `stage2_sample.py` ·
`stage3_extract.py` (stage 4 is its `--filters` flag) · `stage5_normalise.py` ·
`stage6_polysemy.py` · `stage7_graph.py` · `queries.py` · `build_discovery_model.py`

Everything above, with every gate, is one command: **`bash .ddd-flow/mine/run_all.sh`**. It rebuilds
`out/`, `model/` and `reports/` from nothing, and it fails loudly rather than quietly if any gate
regresses. `out/manifest.NEGATIVE-TEST.yaml` is a deliberately broken manifest kept so the gate can
be shown to be fallible (it exits 1 with 3 high findings).

L0 facts: `.ddd-flow/mine/out/facts.jsonl` (708 lines, lossless) →
`facts.clean.jsonl` (421 lines, 5 counted filters) → L1 `.ddd-flow/mine/model/*.yaml` (20 files) →
L2 `.ddd-flow/mine/reports/`. Coverage manifests per stage, all four green under
`scripts/mine_coverage.py --strict`. Every number in these documents is reproducible by
`python3 .ddd-flow/mine/queries.py --facts … --clean …`; the full detail lives in
`docs/research/fleetops-export-mining.md`.

## Coverage

**Covered** — 65 of 65 files under `export/` accounted for (63 parsed, 2 skipped with a stated
reason). 39 entity definitions over 20 distinct entities; 1 legacy index (8 names); 12 workflows;
11 formulas.

**Not covered, and who is needed:**

| Gap | Who could close it |
|---|---|
| Whether any of the 20 entities is still in use | current FleetOps operators |
| The option values behind 8 named picklists — none are in the export (H1) | an operator, or the live database |
| Which of the two `Inspection` definitions the running system actually applies (H4) | whoever owns the addon package |
| Every business rule: **0 of 257 attributes is marked `required`** (H2) | domain expert; incident history |
| The 8 unexported picklist option sets, the 5 magic constants, and 12 `sendmail` recipients (H1, H13, H12) | operators; finance; whoever is on the notification list |
| What a work order, a parts request, a downtime *mean* to the business | domain expert, real end users |
| Whether the addon package is a live patch or an abandoned branch (H3) | release history, the publisher `fo` |

## Confidence

**0 confirmed elements · 109 candidates (58 timeline elements + 51 language entries) · 23 open
hotspots (`H1`…`H23`).**

The confidence line is the finding. A reader six months from now should take the timeline as a list
of questions with locators attached, not as a description of a business.

*Length budget.* Four of the five files are inside the 120-line budget. `model.json` is 144 lines:
it is **generated** from the three tables by `.ddd-flow/mine/build_discovery_model.py`, one record
per line, so its length is fixed by the number of findings. The budget sheds rationale, never
findings, so nothing was cut — the overrun is recorded here instead.

## Visual surface — not started

The skill asks for the live preview surface first, because a text timeline loses the thing that
makes EventStorming work: everyone seeing the same wall at once. It was not started here — there
was no participant to watch it, and this run was not permitted to reach outside the corpus for the
`view` plugin's server script. `model.json` is written in the surface's own format so the wall can
be raised unchanged the moment a human is available. **The cost is real:** nothing below was
challenged by anyone while it was being written, which is exactly the failure mode the surface
exists to prevent.

## Next step

`3-decompose` consumes `timeline.md` and `ubiquitous-language.md` as its step-2 input. It will be
exactly as good as this discovery was — and this discovery had no domain expert in it. The
responsible order is: run one session with a FleetOps operator against `hotspots.md` first, promote
what they confirm, and only then decompose. Deliberately **no boundaries are drawn here**; the
stage 7 cluster report is one input to reconcile with stage 6, not a context map.
