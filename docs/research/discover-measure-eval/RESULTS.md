# MEASURE eval — results

Frozen pair: `fixture-structured/` + `fixture-prose/` + `rubric.md`. Only
`plugins/ddd-flow/skills/2-discover/` changes between rounds.

## Round 2 — after the round-1 fixes, 2026-07-30 (arm P re-run only)

| Arm | Total | MEASURE fired? | Correct? | Δ vs round 1 |
|---|---|---|---|---|
| **P** — prose, 9 files | **17 / 17** | no | ✅ yes | +5, P1 FAIL→PASS, P2 FAIL→PASS |
| **S** — structured, 67 files | not re-run | — | — | see below |

**Trigger verdict: fires on S (round 1) ☑ / stays quiet on P (round 2) ☑.** A clean before/after on
the same fixture and the same rubric: P1 and P2 moved FAIL→PASS with no other check regressing —
exactly the shape the protocol calls a real improvement. The grader verified the absences itself:
the output tree holds 4 markdown files + 1 `model.json`, zero scripts/jsonl/manifests, and the only
occurrences of "coverage manifest"/".ddd-flow" anywhere in the output are the run's own denial
sentence. Every artifact claim checked against the fixture held; not one artifact-vs-record
disagreement was found.

Run: `runs/2026-07-30-P-round2/` (`run-record.md`, `rubric-filled.md`, `output/`).

**Caveat, stated rather than buried: the round-2 result is partially contaminated.** The round-1 fix
wrote the measured false-positive into the playbook as a worked incident — *"a nine-document prose
repo containing one abandoned three-table schema"* — which describes this fixture. The round-2
runner cited that passage alongside its own measurements. The floor itself is fixture-independent
and the runner measured before citing (`1 < 20` files, `3 < 200` definitions, commands quoted), so
the fix is real; but a skeptic can say the skill now names the test. The uncontaminated confirmation
is a **third fixture with a different small-structured shape** (e.g. one 40-table DDL — above any
per-file count, below 200 definitions, honest answer still "read it"… or rather that one is
*designed to argue*: 40 tables in one file is structured, sizeable, and forces the ≥200-definitions
line to earn its keep). Future round.

**Arm S was not re-run in round 2.** The round-1 fixes added requirements S's baseline never saw
(per-shape sampling, the `fields:` census, the stage-7 byte-identical gate), so its 33/34 baseline
is not comparable forward — and the S-side fixes were themselves derived from S's graded defects
(field coverage, stage-7 variance), making a same-fixture re-run partially contaminated in the same
way. A fresh S-shaped fixture is the right instrument for both. Future round.

**Round-2 rubric gaps** (grader's, on top of round 1's): the "deliberately absent" section —
refusing to invent `BookingCancelled`/`ContainerDelivered` — is the run's strongest
anti-hallucination evidence and earns nothing; H22's honest "unplaceable on the state axis" exceeds
P6 with no cell to credit it; arm P still has no twin of S13 even though this run scoped every
absence and self-corrected a from-memory count (18 → 11/32) with the command cited; no check scores
md/json twin consistency; no check for attendance honesty — a run posing as a real session could
score identically; P3's parenthetical example flow lists "cleared", an event the fixture never
states, so the rubric's own example could mislead a stricter grader into demanding an invention; and
the planted invariant-as-incident (H1, confirmed-before-slot) has no dedicated check despite being
the fixture's headline contradiction — this run caught it anyway.

## Round 1 — baseline, 2026-07-30 (ddd-flow 0.2.0 working tree)

| Arm | Total | MEASURE fired? | Correct? |
|---|---|---|---|
| **S** — structured, 67 files | **33 / 34** | yes | ✅ yes |
| **P** — prose, 9 files | **12 / 17** | yes | ❌ **no** |

**Trigger verdict: BROKEN.** Fires on S ☑ / stays quiet on P ☐. Per the harness's own rule, a run
that mines whichever corpus it is handed is not a working trigger, so **arm S's 33/34 is not evidence
the routing works** — it is evidence that the mining method itself is sound once entered.

Runs: `runs/2026-07-30-S-baseline/`, `runs/2026-07-30-P-baseline/` (each: `run-record.md`,
`rubric-filled.md`, `output/`).

### Arm S — 33/34, one deduction

Every check PASS except **S13 scoped absences (PARTIAL, 1/2)**: two bare absence claims with no
corpus and no query — *"'PM' is never expanded anywhere"*, *"'Tin' is never expanded"*.

The grader re-ran the whole pipeline in a scratch copy rather than trusting the record, and `out/` +
`model/` came back byte-identical. Independently confirmed: 708 facts → 421 clean
(`708−102−68−117`); 17 conflicts each carrying **both** values, **both** locators and `UNRESOLVED`;
`Part.xml.bak` skipped-with-reason and `Incident.XML` counted; `Section` grouping present in L1 as
`form_groups`; `Cost`/`Owner`/`Status` tagged `UNRESOLVED — boundary candidate` with no
canonicalisation; nothing written to a `docs/**/*.yaml`, `confirmed: 0`; all four manifest
`invocation:` strings re-run verbatim at `rc=0`, `--strict`-green; the negative test reproducing 4
findings and exit 1.

### Arm P — 12/17, and the trigger failure

| Check | Verdict | Pts |
|---|---|---|
| P1 no pipeline over prose | **FAIL** | 0/3 |
| P2 DDL read not mined | **FAIL** | 0/2 |
| P3 attributed timeline | PASS | 3/3 |
| P4 elicited polysemy unresolved | PASS | 3/3 |
| P5 hotspots open | PASS | 2/2 |
| P6 as-is/to-be/could-be | PASS | 2/2 |
| P7 no boundaries | PASS | 2/2 |

All three P1 disqualifiers exist as files: `facts.jsonl`, eight per-stage coverage manifests, and a
stage-numbered ladder. **The over-trigger was not confined to the DDL** — `manifest-stage1.json`'s 9
parsed files include all 8 narrative docs, `manifest-stage6-terms.json` runs a counted filter over
prose, `manifest-stage6.json` names its source as *"8 prose files"*, and stage 7's graph edges are
weighted by prose filenames. Six of 19 hotspots are script-produced findings over prose.

The reading path survived: P3–P7 clean, every quote verified against the fixture, no fabrications.

## What round 1 found — defects in the skill, not the runners

Both runners followed the text they were given. Three findings, in the order they matter:

1. **The trigger has no size floor** (cause of the P failure). `SKILL.md` named "DDL" as structured
   outright, so a 568-byte three-table file entered the branch; `≥20 files sharing one shape` read as
   an *additional* arm of the test, not a floor over all of it. The runner quoted that line as its
   justification and was reading it correctly. → fixed in round 2.
2. **Coverage manifests certify FILE coverage, not FIELD coverage** — found on arm S, and the more
   interesting of the two. Every manifest was green while `filteringattributes` was silently dropped
   from all 7 workflows carrying it, because stage 2 locked the fact schema from **one sample of one
   of three shapes**. The cost is visible in the run's own output: hotspot **H14** *infers* that
   `AssetTransfer` changes `Owner`, which the dropped attribute states outright
   (`filteringattributes="owner"`), and **H6** misses `PartsRejectNotify`'s `="status"`. This is
   S4's "silence read as absence" one level down, and no gate in the playbook could see it.
   → fixed in round 2.
3. **Stage 7 is the only unreproducible stage.** 12 runs on byte-identical inputs gave 4 distinct
   `reports/graph.*` outputs. Variance is confined to per-run Louvain modularity rows — stable
   groupings, articulation point, bridges and betweenness are invariant — so no claim in `docs/` is
   falsified, and the run never claimed stage-7 determinism. But nothing gated it either.

Two artifact/summary disagreements on arm S, artifacts winning, both minor and both the runner's
rather than the skill's: `run_all.sh:8` `rm -rf out` deletes `manifest.NEGATIVE-TEST.yaml` and never
recreates it, so "one command rebuilds everything" is false for the fallibility demo; and
`manifest.stage3.resumed.yaml`'s `invocation:` omits `--resume`, so it cannot reproduce the state it
documents.

## Rubric changes proposed, deliberately NOT applied

Applying these would break comparability with round 1, so they wait for a new baseline. Recorded here
so they are not lost:

- **P1 should gate the arm, not subtract from it.** At 3-of-17 a run can fail the arm's entire
  purpose and still read 71%.
- **P2's PARTIAL and FAIL clauses overlap** — this run satisfied both.
- **Arm P has no S13** (scoped absence claims), which is where the P run was strongest.
- **Neither arm rewards refusing to fabricate the room** — arguably each run's most consequential act
  (P: a "who was present" table of five *no*s and `confirmed: 0` proven by `grep`).
- **No reproducibility check on either arm**, though re-running is exactly what exposed the P run's
  self-contamination bug (stage-1 total 9→15, `booking` 15→45, *while every gate stayed green*) and
  arm S's stage-7 variance.
- **A field-coverage check** for defect 2 above — S11's ground truth names `filteringattributes` but
  no verdict tier tests whether it was consumed.
- **S3's ground truth (67) counts the fixture's own scaffolding README**, so a mechanical grader would
  penalise a run that correctly declares `source: export` and reports 65. Word it as "a total that
  matches its declared source".
