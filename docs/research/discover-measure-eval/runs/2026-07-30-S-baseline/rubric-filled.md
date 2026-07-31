# Filled rubric — arm S, run `2026-07-30-S-baseline`

Graded against `rubric.md` (arm S only, 34 pts). Grader ran no discovery; every verdict below quotes
the runner's own output or states an explicit absence. Where the run record and `output/` disagree,
`output/` wins and the disagreement is named.

**Independent re-run.** The whole pipeline was re-executed in a scratch copy of
`fixture-structured/` (`bash .ddd-flow/mine/run_all.sh`, exit 0). `out/` and `model/` came back
**byte-identical** to the archived artifacts; `reports/graph.{md,json}` did not (see rubric-gap
notes). Every number spot-checked below was reproduced, not taken on the record's word.

## Results

| Check | Weight | Verdict | Points | Evidence (quote or explicit absence) |
|---|---|---|---|---|
| S1 trigger fired | 3 | PASS | 3 | `docs/domain/discovery/README.md:35` — *"The artifacts are **structured** (a vendor-published XSD plus 52 XML files sharing one shape), which is over the ≥20-file threshold, so the corpus was mined **by script before being read**"*. Order is enforced by `run_all.sh`: stage 0 (schema) → stage 1 `stage1_inventory.py` (*"inventory (parses nothing)"*) → stage 2 *"one record, full fidelity"*. The by-eye read is stage **2**, after the count. Every entity finding traces to `out/facts.jsonl` via `queries.py`, which I re-ran; none rests on a read. |
| S2 stage 0 schema + honest validation | 3 | PASS | 3 | The 8-value enumeration is **extracted from the file**, not typed in: `stage0_validate.py:29-32` `load_xsd()` walks `xs:simpleType`/`xs:enumeration`, and re-running it printed `simpleType enumerations: {'attrType': ['string','memo','int','bigint','decimal','datetime','picklist','lookup']}` — identical to `FleetOpsExport.xsd:5-8`. A command **ran**: `OK export/packages/core/entities/WorkOrder.xml` / `1 sample(s), 0 with findings` (reproduced, rc=0). The caveat is plain and precise: `docs/research/fleetops-export-mining.md:28-34` — *"There is no `lxml` and no `xmllint` in this environment… It is **not** a general XSD validator: no substitution groups, no `xs:choice`, no namespaces, no `xs:all`, no key/keyref… a schema using features outside that subset would be silently under-checked, and that is a stated limitation of this run."* I checked the XSD against that list: it uses **only** `xs:simpleType/restriction/enumeration`, `xs:element`, `xs:complexType`, `xs:sequence`, `xs:attribute` — i.e. exactly the implemented subset, so the checker is complete *for this schema* and the caveat is honest scoping, not a fig leaf. No claim of "validates against the XSD" beyond what the command output supports. |
| S3 verifiable total | 3 | PASS | 3 | `65 files under export` with a quoted independent command — `find export -type f \| wc -l → 65` — which I re-ran: `65`. Full split, nothing unclassified: `39 entity-definition · 1 entity-index · 11 formula-definition · 1 package-manifest · 12 workflow-definition · 1 SKIPPED (with reason)` = 65. Glob split quoted and reproduced: `-name '*.xml' → 51`, `-iname '*.xml' → 52`. 20 distinct entity names reported (`README.md:58` *"39 entity definitions over 20 distinct entities"*). **Caveat, stated:** the runner never reports the figure **67** — it declares a narrower corpus (`source: export` in all four manifests) and reports 65 for it. `schema/FleetOpsExport.xsd` sits outside the arithmetic but is the entire subject of stage 0; the fixture's own `README.md` is cited as a source (`discovery/README.md:22`) but never inventoried. Boundary declared, parts add up, nothing silently unclassified → PASS. |
| S4 glob traps | 2 | PASS | 2 | Both present in the manifests, verified in the archived files. `Part.xml.bak` — `manifest.stage1.yaml`: `skipped: - path: packages/core/entities/Part.xml.bak / reason: editor/tool backup file, not part of the applied export`, and carried into `manifest.stage3.yaml`'s `skipped[]` so the arithmetic still closes at 65 (`mine_coverage: OK`, re-run). `Incident.XML` — **counted, not skipped**: `inventory.jsonl:8` `{"ext": ".XML", "kind": "entity-definition", "source_file": "packages/addon/entities/Incident.XML"}`, flagged in `manifest.stage1.yaml` notes as *"extension-case anomalies (a case-sensitive '\*.xml' glob MISSES these)"*, and it earns a real conflict fact: `conflicts.jsonl` carries `locator_a: packages/addon/entities/Incident.XML` vs `locator_b: packages/core/entities/Incident.xml`. |
| S5 stubs | 2 | PASS | 2 | Exactly 5 `missing_node` facts in `facts.jsonl` (verified by parsing the file): `Crew, Downtime, MeterReading, Shift, Warranty`, all `packages/addon/entities/*.xml`. Each carries the distinction the check asks for verbatim: `"note": "entity file carries no Attributes node — zero attributes is a FACT ABOUT THE FILE, not about the entity"`. Survives to L1: `model/Crew.yaml` → `files_with_no_Attributes_node: - packages/addon/entities/Crew.xml` (vs `null` on `WorkOrder.yaml`). No crash: `0 failed` in every manifest. |
| S6 conflicts + layering rule | 3 | PASS | 3 | `conflicts.jsonl` = **17** lines (counted). Both values **and** both locators on every entry, verified by parsing: attribute-level, e.g. `{"dimension": "attribute-type", "all_values": ["picklist","string"], "locator_a": "packages/addon/entities/Inspection.xml#/Entity/Attributes/Attribute[1]", "locator_b": "packages/core/entities/Inspection.xml#/Entity/Attributes/Attribute[2]", "resolution": "UNRESOLVED — both definitions kept"}` — the planted `Inspection.Result` **type** conflict. Definition-level entries carry `attribute_counts` across **all** layers, e.g. WorkOrder `{addon-managed: 15, addon: 7, core: 15}`. Layering rule stated **and** sourced to `manifest.txt`: `stage3_extract.py:9-13` *"Layering rule (stated, not guessed): export/manifest.txt gives an apply order and a state per package… NEVER blended"*, with the base/patch/managed/index table reproduced in `docs/research/…:74-79`. Legacy index recognised as name-only: separate fact kind `index_entry` (8), `"note": "names only — a checksum, not a definition"`, and L1 exposes it as `present_in_legacy_index: true` rather than as a 0-attribute definition. No blended third definition anywhere (`resolution` on all 13 divergences: *"No blended third definition was created."*). |
| S7 scale priced then skipped | 2 | PASS | 2 | Priced with **measured**, not estimated, numbers: `docs/research/…:145-150` `stage1 → 0.06 s`, `stage3 → 0.10 s`, `stage7 → 0.06 s`, *"63 files × ~1.6 ms. So this corpus needs **none** of parallelism, sharding or a resume-by-row-count scheme."* I read what was actually built rather than what was claimed: `grep 'class \|multiprocessing\|threading\|concurrent\|Pool\|shard\|--workers' *.py` → **no hits** in any of the 9 scripts. `stage3_extract.py` is one flat function-per-shape module; the append is `fh.flush()  # append-as-you-go: a crash costs this file only` (line 264), which the rubric blesses explicitly. The one thing beyond that is an 8-line `--resume` (lines 211-218, 240-242), declared and reasoned: *"Append-as-you-go and resume-by-source-file were implemented anyway because they are ~10 lines and they are what makes the reproducibility gate below meaningful; nothing else from the 'past that line' list was built, deliberately."* Priced, refused the expensive mechanics, kept the cheap one to ~10 lines with a stated reason. (Withheld nothing, but see rubric-gap note 3 — the 29-line crash-simulation gate in `run_all.sh:36-64` is the one place this run does spend effort on machinery about machinery.) |
| S8 counted filters, grouping kept | 3 | PASS | 3 | All five filters carry `{name, dropped, reason}` in `manifest.stage4.yaml`, with real counts including the two zeros, which state what they masked instead: `platform-attributes / dropped: 102`, `nondefault-locale-labels / dropped: 68`, `managed-twin / dropped: 117`, `volatile-identity / dropped: 0 / "volatile identity masked, not deleted: 28 form GUIDs kept as join keys"`, `presentation-geometry / dropped: 0 / "112 pixel widths nulled. Field identity, section label and ordinal KEPT — grouping is the only proxy for 'looked at together in one task' and stage 7 needs it"`. Arithmetic verified independently: `facts.jsonl` = **708** lines, `facts.clean.jsonl` = **421**, and `708 − 102 − 68 − 117 = 421` ✓. **Grouping really survives into L1**, not just into the reason string: `model/WorkOrder.yaml` → `form_groups: - {source_file: packages/core/…, form: main, section: General, fields: [Name, Owner, Cost, CostCentre]}` and a second `section: Details` block; `grep -c section model/*.yaml` → non-zero on all 20 subject files. Every planted noise class is counted, not judged: 6 managed twins, 3 platform columns × 34 files, lcid `1066`/`1036`, `BOM 40, no-BOM 12`, 112 widths. |
| S9 polysemy unresolved | 3 | PASS | 3 | Left **unresolved** — checked in the machine-readable report, not just the prose. `reports/polysemy.jsonl`: `Owner` `"sense_count": 4` with the exact four planted senses (`lookup→Depot`, `lookup→Employee`, `picklist→owner_role`, `string`), `Cost` `"sense_count": 3` (`decimal`, `lookup→CostCentre` on Employee, `string` on PartsRequest) over 7 containers, `Status` `"sense_count": 2` by **enumeration target** (`asset_status` vs `wo_status`) — the subtle one, caught. Every sense carries per-occurrence locators, e.g. `"PartsRequest @ packages/core/entities/PartsRequest.xml#/Entity/Attributes/Attribute[4]"`, and every record is tagged `"resolution": "UNRESOLVED — boundary candidate"`. No canonicalisation anywhere: `ubiquitous-language.md:19-27` lists each sense as its own row, all `candidate`, under *"Collisions — kept side by side, deliberately unresolved"*; `hotspots.md:64-66` — *"H4, H8, H21 and H22 all look like tidy-ups… Resolving them here would delete the exact linguistic seams `3-decompose` needs"*. No `cost_estimate`/`cost_actual`-style invention exists in any output file. |
| S10 manifest passes validator | 3 | PASS | 3 | Four manifests, each carrying all six keys plus `filters`; `skipped`/`failed` present and non-null everywhere (`failed: []`). I ran each manifest's `invocation:` string **verbatim** via `shlex.split` from the working dir — all four `rc=0`, so it is literally re-runnable as written. I then ran the plugin's own validator against each: `mine_coverage: OK — .ddd-flow/mine/out/manifest.stage1.yaml accounts for every file matched by export/**/*` (and the same for stage3, stage4, stage3.resumed). The gate is shown to be fallible: re-running it against `manifest.NEGATIVE-TEST.yaml` reproduced the claim exactly — `4 finding(s) — 3 high, 1 medium`, `[HIGH] coverage-arithmetic`, `[HIGH] coverage-total-mismatch (glob export/**/* → 65)`, `[HIGH] skip-without-reason`, `[MEDIUM] manifest-unknown-key`, `exit=1`. |
| S11 logic outside entity model | 3 | PASS | 3 | Both counts, from the manifest not from prose: `manifest.stage1.yaml` `"formula-definition": 11, "workflow-definition": 12`, and `facts.jsonl` carries `formula: 11`, `workflow: 12`, `workflow_step: 36`. Named rules quoted: `ubiquitous-language.md:87` `NeedsApproval \| Cost > 5000 \| core/formulas/PartsRequest_NeedsApproval.txt`, `:86` `SlaBreached \| ClosedOn > OpenedOn + Hours(Priority.SlaHours)`. Connected to the point explicitly: `docs/research/…:322` — *"**11 formula files and 12 workflow files — 100% of the business logic — live outside the entity model.**"*, and each formula fact carries `"note": "business logic outside the entity model"`. (PASS as written; but see rubric-gap note 2 — the run silently dropped the `filteringattributes` attribute this check's own ground truth names.) |
| S12 boundaries held | 2 | PASS | 2 | Explicit absence, verified: `find output/docs -name '*.yaml'` returns **nothing** — no `model.yaml` was written anywhere under `docs/domain/`. Nothing marked confirmed: the only occurrences of the word are negations — `discovery/README.md:29` *"Not one item is `confirmed`, because a schema cannot confirm anything — only a person can"*, `hotspots.md:67` *"**No promotions.** Nothing was moved to `confirmed`."*, `model.json:143` `"confidence": {"candidates": 109, "confirmed": 0, …}`. Candidate tagging is consistent and machine-checked, and the check reproduced on my re-run: `non-candidate timeline rows (must be 0 with no human present): 0` / `rows missing a State value: 0`. Front-matter is `status: draft`, `owner: TBD`. No boundaries drawn either (not this check, but clean): `hotspots.md:61` *"**No boundaries.** No hotspot proposes a bounded context."* |
| S13 scoped absences | 2 | PARTIAL | 1 | Most absences name their corpus and often the query: *"named with zero option values in the whole export"* (with `queries.py q_picklists_named_but_no_values` cited), *"the anomaly **threshold is in none of the 65 files**"*, *"`SlaHours` appears in **none** of the 65 files"*, *"the recipient is nowhere in the export"*, *"zero `flt` anywhere"* behind a quoted `grep`, *"no PRD, no ADR, no roadmap anywhere in the snapshot"*. But two are bare, with no corpus and no command: `ubiquitous-language.md:72` — *"\"PM\" is never expanded anywhere"* — and `:75` — *"\"Tin\" is never expanded"*. Neither names what was searched, and no query in `queries.py`/`queries.txt` backs either. A third, `:102` *"`Priority.SlaHours` is referenced by a formula and defined nowhere"*, is bare in that sentence but scoped one sentence earlier in the same paragraph and again in `docs/research/…:315`. That is exactly the rubric's PARTIAL: *"Mostly scoped, one or two bare absences."* |
| **Arm S total** | **34** | | **33** | 12 PASS, 1 PARTIAL, 0 FAIL |

**Trigger verdict (arm S half):** MEASURE fired on S ☑ — and firing was **correct**. The corpus is 52
XML files over one published XSD, well past the ≥20-file threshold; the run routed on that stated
reason (`README.md:35`), not on the word "XML". Arm P is not graded here, so this is half a result:
per `README.md`, *"Report both arms or neither."*

---

## Rubric-gap notes

**1. Coverage manifests certify *file* coverage, not *field* coverage — and no check catches the
difference.** This is the most substantive gap I found. All four manifests are green under
`--strict`, and every file in `export/` is accounted for; yet `stage3_extract.py`'s `workflow_facts()`
extracts only `name`, `primaryentity`, `trigger` and `Step/@type`, and therefore **silently drops
`filteringattributes` from all 7 workflows that carry it** (`grep -rn filteringattributes output/`
→ no hits; the fixture has `WorkOrderClose="status"`, `AssetRetire="status"`,
`PartsRejectNotify="status"`, `InspectionFail="result"`, `AssetTransfer="owner"`,
`WorkOrderEscalation="priority"`, `CrewAssign="lead"`). The cost is real and visible in the run's own
hotspots: **H14** reasons *"`AssetTransfer` fires on Asset update, but the only depot-ish field on
`Asset` is `Owner:lookup→Depot`"* — arriving by inference at exactly what the dropped attribute
states outright (`filteringattributes="owner"`), and **H6** asks where a rejection is recorded
without noticing `PartsRejectNotify` declares `filteringattributes="status"`. The root cause is
structural: stage 2 locked the fact schema from **one** sample of **one** of the three shapes
(`core/entities/WorkOrder.xml`), never a `<Workflow>` or a `.txt` formula. Suggested new check:
*"stage 2 sampled one record of every distinct shape stage 1 found, and stage 3 reports the
attributes it chose NOT to extract."* A manifest that counts files cannot detect this class of loss,
which makes it the exact "silence read as absence" failure S4 tests for, one level down.

**2. S11's ground truth names a fact its verdict tiers cannot test.** The `filteringattributes`
detail is written into S11's ground-truth line but appears in none of its PASS/PARTIAL/FAIL
conditions, so a run can miss it entirely and still PASS. Either promote it into the PASS wording or
move it out of the ground truth.

**3. S7 has no tier for "priced correctly, then built one cheap mechanic anyway".** The FAIL clause
names *"a resumable… pipeline"* while the PASS clause blesses *"plain append-as-you-go"* — and
`--resume` is 8 lines sitting directly on top of append-as-you-go. The PARTIAL tier is defined as
*silence*, which does not fit a run that priced the question out loud in measured milliseconds. I
resolved it as PASS on the substance (no classes, no pool, no shards, explicit refusal of
parallelism/sharding), but a rubric that hinges 2 points on the word "resumable" should say whether a
`--resume` flag counts. Note also what a strict reading would catch and mine did not: `run_all.sh:36-64`
spends 29 lines simulating a crash to gate the resume — the only place in this run where effort goes
into machinery about machinery rather than into the corpus.

**4. No check rewards, or tests, reproducibility of the L2 reports — and this run is not
reproducible there.** Re-running `run_all.sh` on a scratch copy returned `out/` and `model/`
**byte-identical**, but `reports/graph.{md,json}` differed. Running `stage7_graph.py` 12 times on
byte-identical inputs produced **4 distinct outputs** (`md5sum … | sort | uniq -c` → `9 fdc515…`,
`1 82024e…`, `1 e4b12c…`, `1 e9170307…`; the archived file is the last of these, so it is genuine
output, not fabricated). The variance is confined to the per-run `communities`/`modularity` rows of
the Louvain sweep — e.g. `\| 1.25 \| 5 \| 3 \| 0.2218 \|` in the archive vs `\| 1.25 \| 5 \| 4 \| 0.2292 \|`
on re-run. The `## Groupings stable across EVERY resolution and seed` section, the articulation
point, the bridges, the betweenness table and `0 internally disconnected` are **invariant** across
variants (diffed), so no number the run carries into `docs/` is falsified — but the record's
*"named with seed + resolutions"* framing implies a determinism that `seed` alone does not deliver
here. The run gated stage-3 determinism explicitly (`OK two clean runs byte-identical`) and never
claimed it for stage 7, so this is not an overclaim — it is an untested surface the rubric has no
check for.

**5. A summary claim the artifacts contradict.** `discovery/README.md:43-46` says *"Everything above,
with every gate, is one command: `bash .ddd-flow/mine/run_all.sh`"* and, two sentences later, that
`out/manifest.NEGATIVE-TEST.yaml` *"is a deliberately broken manifest kept so the gate can be shown
to be fallible"*. But `run_all.sh:8` is `rm -rf "$M/out" …` and nothing recreates that file — my
re-run **deleted** it (`diff -r` reported `Only in ORIG-out: manifest.NEGATIVE-TEST.yaml`). So the
fallibility demonstration is a hand-made artifact that the advertised single command destroys rather
than reproduces. It does not touch S10 (the validator provably ran on the four real manifests, and
the negative test itself reproduces exactly when pointed at the archived file), but "one command
rebuilds everything" is, strictly, false. Relatedly, `manifest.stage3.resumed.yaml`'s `invocation`
omits `--resume`, so re-running it as written produces a clean run rather than the resumed one it
documents — `rc=0` and `--strict`-green, so S10 stands, but the invocation does not reproduce the
state the manifest describes.

**6. Real strength the rubric gives no credit for: tooling bugs found and fixed in the script, not
in the data.** Two are documented with independent verification — a BOM comparison against a
12-byte f-string literal, caught by `od -An -tx1 -N4 … → ef bb bf 3c`; and an L1 normalisation that
keyed sections `(form, section)` and so *"merged `core`'s and `addon`'s two different \"General\"
sections into one list that existed in neither file"*, fixed by re-keying on
`(source_file, form, section)` — *"**L1 is never hand-edited** — the fix went into the script and the
layer was regenerated."* That second bug is precisely S6's *"invention wearing reconciliation's
clothes"*, caught by the run on itself, one layer above where S6 looks. Nothing in the rubric scores
"the run's own gates caught its own fabrication."

**7. S3's ground-truth 67 is ambiguous about the fixture's scaffolding.** The census counts
`fixture-structured/README.md` — the fixture's own orientation note — as a corpus file. This run
declares `source: export` and reports 65, handling the XSD at stage 0 and citing the fixture README
as a source but never inventorying it. A mechanical grader would mark a correct run down for not
totalling 67. Recommend S3 state the expected total as *"65 under `export/`, plus `schema/` and the
fixture README"* and say which of those a run must bucket.

---

## What I verified against artifacts vs took on the record's word

**Verified independently (command re-run or file parsed):**

- `facts.jsonl` = **708** lines; `facts.clean.jsonl` = **421**; `708 − 102 − 68 − 117 = 421` ✓. Kind
  histogram matches the record exactly (`attribute 257 · entity 39 · form 34 · form_field 155 ·
  formula 11 · index_entry 8 · label 102 · missing_node 5 · relationship 49 · workflow 12 ·
  workflow_step 36`).
- `conflicts.jsonl` = **17** entries; every entry parsed and confirmed to carry **both** values
  (`all_values` / `value_a`+`value_b` / `attribute_counts`) **and both** locators
  (`locator_a`, `locator_b`, `all_locators`), each with an `UNRESOLVED` resolution string.
- `Part.xml.bak` in `skipped[]` with a reason; `Incident.XML` in `inventory.jsonl` as a counted
  `entity-definition`, flagged in manifest notes, and present as a conflict locator.
- `Section` grouping present in L1 (`form_groups` with `section:` on all 20 subject files), not only
  claimed in a filter reason string.
- Polysemy left unresolved in the machine-readable layer (`resolution: UNRESOLVED — boundary
  candidate` on `Cost`, `Owner`, `Status`), with per-occurrence locators and no canonicalisation
  anywhere in `docs/`.
- No `*.yaml` under `output/docs/`, `confirmed: 0`, every item `candidate`.
- All four manifests: six keys present, `invocation` re-runnable verbatim (`rc=0` on each),
  `mine_coverage.py --strict` → `OK` on each.
- The negative test: `4 finding(s) — 3 high, 1 medium`, `exit=1`, findings reproduced verbatim.
- Environment claims: no `lxml`, no `xmllint` on this box — confirmed. The XSD uses only the subset
  `stage0_validate.py` implements — confirmed by reading `FleetOpsExport.xsd`.
- Absence of parallelism machinery: `grep 'class \|multiprocessing\|threading\|concurrent\|Pool\|shard\|--workers'`
  over all 9 scripts → no hits; 1752 total LoC across `.py` + `.sh`.
- `find export -type f | wc -l` → 65; `-name '*.xml'` → 51; `-iname '*.xml'` → 52.
- Full-pipeline determinism of `out/` and `model/` (byte-identical) and **non**-determinism of
  `reports/graph.*` (4 distinct outputs in 12 runs).
- `filteringattributes` absent from every output file while present on 7 fixture workflows.

**Taken on the record's word (not independently checkable by a grader):**

- The claimed *timings* (`0.06 s` / `0.10 s` / `0.06 s` via `/usr/bin/time`) — plausible and my
  re-run was likewise sub-second, but I did not reproduce the exact figures.
- That the corpus was scripted **before** being read as a matter of wall-clock sequence. The
  artifact evidence (script order in `run_all.sh`, stage 2 after stage 1, every doc number traceable
  to `queries.py`) is strong and consistent, but the actual transcript order is not in `output/`.
- *"Nothing outside the working dir was written"* — unverifiable from the archive. The archivist's
  own protocol note records two deviations (three scratch files written to the scratchpad root then
  deleted; a `git -C …/btm-systems status` outside the permitted read set), neither reaching
  `rubric.md`, `README.md` or `make-fixtures.mjs`.
- The two self-reported tooling bugs (BOM f-string, `(form, section)` L1 keying) — the *fixed* state
  is verifiable in the committed scripts and in L1; the buggy intermediate state is not archived.
