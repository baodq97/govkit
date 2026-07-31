# Arm S run record — 2026-07-30, baseline

Fixture: `fixture-structured/` (FleetOps, 67 files: 65 under `export/`, plus `schema/` and
`README.md`). Skill under test: `plugins/ddd-flow/skills/2-discover/` at the 0.2.0 working tree
(measure-playbook with the stage-3 scale mechanics and the stage-7 algorithm table). Runner:
general-purpose agent, blinded per `README.md`. Tooling: `python3` stdlib only; no `networkx`, no
`igraph`/`leidenalg`, no `lxml`, no `xmllint`, no DuckDB.

Artifacts as produced are under `output/`. Below is the runner's own final report, verbatim.

**Protocol notes (mine, not the runner's).** Two minor deviations, neither touching the answer key:
the runner initially wrote three scratch files to the scratchpad *root* rather than its working dir
and deleted them after noticing; and it ran `git -C /home/bd/personal-projects/btm-systems status
--porcelain` to prove it had written nothing outside its sandbox, which is a path outside its
permitted read set. Neither reaches `docs/research/`, `rubric.md`, `README.md` or
`make-fixtures.mjs`, so the run stands.

---

## Run record — `ddd-flow:2-discover` on the FleetOps export snapshot

Working dir: `…/scratchpad/measure-eval/run-S` (all paths below are relative to it).

---

### 1. Mode detection and skill files read

Read in full: `SKILL.md`, `references/measure-playbook.md`, `references/output-template.md`, `references/eventstorming.md`, `references/interview-guide.md`, `scripts/mine_coverage.py`. Not read: `references/other-techniques.md` (no technique switch was needed — big-picture EventStorming was the right level and the corpus, not a room, was the input), `references/worked-example.md` (output shape was clear from the template).

**Mode = DISCOVER**, and the corpus is **structured**: `schema/FleetOpsExport.xsd` is a vendor-published schema and 52 XML files share one shape — over the ≥20-file threshold. So the corpus was scripted **before** being read, per the measure playbook. No `docs/domain/discovery/` existed, so this is not UPDATE.

---

### 2. Files created

**Scripts (the provenance) — `.ddd-flow/mine/`**
```
stage0_validate.py   stage1_inventory.py   stage2_sample.py   stage3_extract.py
stage5_normalise.py  stage6_polysemy.py    stage7_graph.py    queries.py
build_discovery_model.py                   run_all.sh
```
(stage 4 is `stage3_extract.py --filters default`, deliberately, so `--filters none` byte-identity is testable.)

**L0 / manifests — `.ddd-flow/mine/out/`**
`inventory.jsonl`, `facts.jsonl` (708), `facts.clean.jsonl` (421), `facts.clean-run.reference.jsonl`, `facts.resumed.jsonl`, `conflicts.jsonl` (17), `conflicts.clean.jsonl`, `conflicts.resumed.jsonl`, `manifest.stage1.yaml`, `manifest.stage3.yaml`, `manifest.stage3.resumed.yaml`, `manifest.stage4.yaml`, `manifest.NEGATIVE-TEST.yaml`

**L1 — `.ddd-flow/mine/model/`** — 20 subject YAMLs + `_unattached.yaml`

**L2 — `.ddd-flow/mine/reports/`** — `polysemy.md`, `polysemy.jsonl`, `polysemy.unfiltered.md`, `polysemy.unfiltered.jsonl`, `graph.md`, `graph.json`, `queries.txt`

**Discovery output — `docs/domain/discovery/`**
`README.md` (102), `timeline.md` (83), `ubiquitous-language.md` (107), `hotspots.md` (67), `model.json` (144)

**Unbudgeted detail — `docs/research/fleetops-export-mining.md`** (334)

Nothing outside the working dir was written (`git -C /home/bd/personal-projects/btm-systems status --porcelain` → empty). I did initially write three scratch files to the scratchpad *root* (`a.txt`, `b.txt`, `bad-manifest.yaml`); I deleted them and redid that work inside the working dir.

---

### 3. Commands and real output

**Stage 0 — the format's own schema**
```
$ python3 .ddd-flow/mine/stage0_validate.py --xsd schema/FleetOpsExport.xsd \
    --sample export/packages/core/entities/WorkOrder.xml
xsd: schema/FleetOpsExport.xsd
  global elements: ['Entity']
  simpleType enumerations: {'attrType': ['string','memo','int','bigint','decimal','datetime','picklist','lookup']}
OK   export/packages/core/entities/WorkOrder.xml
1 sample(s), 0 with findings

$ python3 .ddd-flow/mine/stage0_validate.py --xsd schema/FleetOpsExport.xsd --all-xml export
root elements seen: {'Entity': 39, 'Workflow': 12, 'Solution': 1}
52 sample(s), 13 with findings
```
Gate met (one real sample validates). **Finding: the published XSD covers 39 of 52 XML files.** 12 `<Workflow>` + 1 `<Solution>` are outside it; the 11 `.txt` formula files have no schema at all, so every field name from those is a candidate derived from the instance.

**Stage 1 — inventory, parsing nothing**
```
$ python3 .ddd-flow/mine/stage1_inventory.py --root export --out .ddd-flow/mine/out/inventory.jsonl \
    --manifest .ddd-flow/mine/out/manifest.stage1.yaml
65 files under export
    39  entity-definition
     1  entity-index
    11  formula-definition
     1  package-manifest
    12  workflow-definition
     1  SKIPPED (with reason)
!! extension-case anomalies: ['packages/addon/entities/Incident.XML']

$ find export -type f | wc -l
65
$ find export -type f -name  '*.xml' | wc -l   → 51
$ find export -type f -iname '*.xml' | wc -l   → 52
$ python3 <mine_coverage.py> --manifest .ddd-flow/mine/out/manifest.stage1.yaml --corpus 'export/**/*' --strict
mine_coverage: OK — accounts for every file matched by export/**/*
```

**Stage 2 — one record by eye, fact schema locked**
```
$ python3 .ddd-flow/mine/stage2_sample.py --file export/packages/core/entities/WorkOrder.xml
# raw bytes: 2676  BOM: True
# 36 facts: {"attribute":15,"entity":1,"form":1,"form_field":12,"label":3,"relationship":4}
$ grep -c '<Attribute '/'<Relationship '/'<Field '/'<Label ' …WorkOrder.xml   → 15 / 4 / 12 / 3
```
Gate met. A tooling bug was caught here: the first version printed `BOM: False` on a file that has one (an f-string compared against `b'\xef\xbb\xbf'`). Verified independently and fixed:
```
$ od -An -tx1 -N4 export/packages/core/entities/WorkOrder.xml      →  ef bb bf 3c
$ od -An -tx1 -N4 export/packages/core/workflows/PartsApproval.xml →  3c 3f 78 6d
$ python3 (read_bytes()[:3]==BOM over export/**/*.xml)  → BOM count: 40  no-BOM count: 12
```

**Stages 3 + 4, gates, and the whole pipeline from scratch** — `bash .ddd-flow/mine/run_all.sh` reproduces everything. Real output:
```
== stage 3 (filters none) ==
conflicts: 17;  63 parsed / 64 in work list; 2 skipped, 0 failed
257 attribute · 39 entity · 34 form · 155 form_field · 11 formula · 8 index_entry
· 102 label · 5 missing_node · 49 relationship · 12 workflow · 36 workflow_step   (708 facts)
mine_coverage: OK
== stage 3 gate — determinism and kill/resume ==
  OK two clean runs byte-identical
  simulated crash after 20/63 source files (301/708 fact lines)
  OK killed-and-resumed fact set == clean fact set
  OK conflict set byte-identical
mine_coverage: OK   (manifest.stage3.resumed.yaml)
== stage 4 ==
  filter platform-attributes:       dropped 102
  filter nondefault-locale-labels:  dropped 68
  filter managed-twin:              dropped 117
  filter volatile-identity:         dropped 0   (28 form GUIDs masked, not deleted)
  filter presentation-geometry:     dropped 0   (112 widths nulled; grouping KEPT)
mine_coverage: OK
  OK --filters none still reproduces stage 3 byte-identically
```
`708 − 102 − 68 − 117 = 421` ✓. All four coverage manifests green under `--strict`.

**Negative test (the gate is fallible)** — `manifest.NEGATIVE-TEST.yaml` with `total: 51`, one skip stripped of its reason, one unknown key:
```
4 finding(s) — 3 high, 1 medium
[HIGH] coverage-arithmetic · [HIGH] coverage-total-mismatch (glob export/**/* → 65)
[HIGH] skip-without-reason · [MEDIUM] manifest-unknown-key (unrecognised: coverage)
exit code: 1
```

**Stage 5** → `L1: 20 subject files; unattached workflows: 0`. A normalisation bug was caught and fixed *in the script, never in L1*: sections were keyed `(form, section)`, merging `core`'s and `addon`'s two different "General" sections into a list existing in neither file; now keyed `(source_file, form, section)`.

**Stage 6 — polysemy**
```
20 containers · 55 distinct attribute names
names in >1 container: 9 ; multi-sense: 3 ; attribute-name-is-also-an-entity: 10
  Cost   3 senses across Asset, Contract, Employee, FuelLog, Part, PartsRequest, WorkOrder
  Owner  4 senses across Asset, Depot, PartsRequest, WorkOrder
  Status 2 senses across Asset, WorkOrder
(unfiltered L0 for comparison: 12 names in >1 container, same 3 multi-sense — filters removed noise, not signal)
```

**Stage 7 — graph**
```
nodes=20 edges=45 runs=25
articulation points: ['Asset']
bridges: Asset--Category, Asset--Downtime, Asset--MeterReading, Asset--PmSchedule, Asset--Warranty
top edge betweenness: Asset--Depot=19.9, Asset--Category=19.0, Asset--Downtime=19.0, …
runs with internally disconnected communities: 0
unresolved references: 3
  lookup-target-not-an-entity        WorkOrder -> SystemUser
  relationship-target-not-an-entity  WorkOrder -> SystemUser
  formula-ref-head-not-an-entity     WorkOrder -> Priority.SlaHours
```

**Timings (real, not estimated)** — `/usr/bin/time -f`: stage1 `0.06 s`, stage3 `0.10 s`, stage7 (25 Louvain runs) `0.06 s`. 63 files × ~1.6 ms, so the run was priced and none of parallelism/sharding was built.

**Claim verification** — `grep -rho "'[^']*'" export` → `'closed'` (one hit), confirming "the only state literal in the corpus".

---

### 4. Findings

**Corpus traps a reading pass would have missed**
1. **`Incident.XML`** — one byte of extension case. `*.xml` = 51 files, `*.[xX][mM][lL]` = 52. A whole `Incident` definition, and the `definition-divergence` conflict with it, would have vanished silently.
2. **`Part.xml.bak`** — skipped with a reason and carried forward into stage 3's `skipped[]` so arithmetic still closes at 65. A `*.xml*` glob would have parsed it as real.
3. **5 stub files with no `<Attributes>` node** (`addon/{Crew,Downtime,MeterReading,Shift,Warranty}.xml`) — a parser that trusts the node reports 0 attributes and is believed. Emitted as `missing_node` facts.
4. **40 of 52 XML files carry a UTF-8 BOM** (all 39 entity files + the index; zero workflows).
5. **Layering is contradictory.** `manifest.txt` says later packages patch earlier ones, and `addon` (`state=patch`, 2023) holds **fewer** attributes than `core` on **13** entities: WorkOrder 7 vs 15, Asset 6 vs 12, PartsRequest 6 vs 10, and 0 vs 6/6/6/6/5 for Crew/Downtime/MeterReading/Shift/Warranty. Last-wins would **delete** definitions. Rule stated: definitions kept per package, **never blended**; 13 `definition-divergence` conflict facts with both counts and both locators.
6. **`addon-managed` twins match `core`, not their own `addon`** (4 of 6); `Employee`/`Part` have no `addon` sibling at all. 117 facts dropped and counted.
7. **`legacy` is an index, not a definition** — 8 of 20 names, `state=index`, listed *last* in apply order but `installed=2017-01-30` (earliest), and declared `publisher=flt` while every schema name in it is `fo_*`. Measured: `48 fo`, zero `flt` anywhere — so **no publisher-prefix collapse was needed**, a measured absence rather than an untested assumption.

**Domain-level findings**
- **100% of business logic lives outside the entity model**: 11 formula files (7 calculated, 4 rollup) + 12 workflows (36 steps, every one `condition → setvalue → sendmail`; triggers 7 update / 3 create / 2 scheduled). 4 formulas reach across subjects.
- **0 of 257 attributes carries `required="true"`.** Not one invariant is declared anywhere.
- **8 picklist option sets named, zero option values exported.** Every state machine is named and unexported; `'closed'` inside one formula is the only state literal in 65 files.
- **`WorkOrder.TotalCost = Cost + Sum(PartsRequest.Cost) * 1.1`** sums `PartsRequest.Cost`, which is typed **`string`** — the polysemy has a runtime consequence.
- **`WorkOrder.SlaBreached` reads `Priority.SlaHours`**; `Priority` is a picklist option set, not an entity, and `SlaHours` exists in none of the 65 files.
- **`Inspection.Inspector`** = `string` (addon) vs `lookup→Employee` (core); **`Inspection.Result`** = `string` vs `picklist→result`. Same word, two definitions, both shipped in one system.
- **`Downtime`** is a first-class entity *and* a `decimal` on `WorkOrder`.
- **`Asset`** is the graph's only articulation point (degree 14; all 5 bridges are `Asset--*`).
- Stage 7 and stage 6 **disagree**: Louvain groups `{CostCentre, Employee, WorkOrder}` while `Cost` means three different things across those. Recorded as a disagreement, not resolved.

**Discovery artifacts** — 58 timeline elements, 51 language entries, **23 hotspots `H1`…`H23`** (never renumbered). **0 confirmed, 109 candidates**, because no human attended. Every timeline row is `as-is` and every row is `candidate` — verified by script (`non-candidate timeline rows: 0`, `rows missing a State value: 0`). `model.json` is *generated from* the three markdown tables so the wall and the document cannot disagree.

---

### 5. Deliberately not done

- **No boundaries drawn.** Stage 7's stable groupings are labelled cohesion candidates, carry the "cohesion, not language boundaries" warning inside `graph.md`'s first paragraph, and are excluded from `docs/domain/discovery/`. Clustering is `3-decompose`'s job.
- **No hotspot resolved and no candidate promoted.** `Cost`/`Owner`/`Status`/`Inspector`/`Result`/`Downtime` senses sit side by side, unresolved, in `ubiquitous-language.md`. Nothing was set to `confirmed`; `status: draft`, `owner: TBD`.
- **No `to-be` / `could-be` rows invented.** A vendor export cannot evidence a decision or an idea. The one candidate (`addon`) is unplaceable, so it is **H3** rather than a guessed row. Similarly, **no commands were invented** — not one imperative exists in 65 files, so every `Actor / command` cell is an actor or a dash, and commands are **H17**.
- **The visual preview surface was not started.** No participant was present, and `skills/view/scripts/preview-server.cjs` is outside the paths this run was permitted to read. `model.json` is emitted in the surface's own format; the cost (nothing was challenged live) is stated in the README.
- **The docs root was not confirmed.** `docs/` did not exist; the output template says *pause and ask*. There was no one to ask, so the tree went to the skill's default path and the question is open as **H18**, with a note that the directory can be moved wholesale.
- **Leiden was not run** — `igraph`/`leidenalg` absent, no network. Louvain, Tarjan and Brandes are implemented in stdlib inside `stage7_graph.py` and named with seed + resolutions; because Louvain can emit internally disconnected communities, the script checks for that (0 of 25 runs).
- **`stage0_validate.py` is not a general XSD validator** — no `xs:choice`/`xs:all`, no namespaces, no substitution groups, no key/keyref (no `lxml`, no `xmllint` available). It enforces the subset this XSD actually uses, read out of the schema file; a schema using other features would be under-checked. Stated in `docs/research/`.
- **DuckDB/SQL over `facts.jsonl` not used** — not installed; the same queries are in `queries.py`, committed, so every number in the docs is re-runnable.
- **No parallelism, sharding, or masking beyond formids** — priced out loud first (0.10 s for the whole extract), so building it would have been self-expansion.
- **`model.json` is 144 lines, over the 120-line budget.** It is generated, one record per line, so its length is set by the number of findings. The budget sheds rationale, never findings — nothing was cut, and the overrun is recorded in the README instead.
