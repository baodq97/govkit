# FleetOps vendor export — mining record (ungoverned, unbudgeted)

Detail behind `docs/domain/discovery/`. Every number here was produced by a committed script in
`.ddd-flow/mine/`, and the invocation is printed next to it so it can be re-run. Nothing in this
file is a domain finding confirmed by a person; it is a description of a corpus.

## Stage 0 — the format documents itself, but only partly

```
python3 .ddd-flow/mine/stage0_validate.py --xsd schema/FleetOpsExport.xsd \
    --sample export/packages/core/entities/WorkOrder.xml
→ OK   export/packages/core/entities/WorkOrder.xml       (0 findings)

python3 .ddd-flow/mine/stage0_validate.py --xsd schema/FleetOpsExport.xsd --all-xml export
→ root elements seen: {'Entity': 39, 'Workflow': 12, 'Solution': 1}
→ 52 sample(s), 13 with findings
```

`schema/FleetOpsExport.xsd` declares exactly **one** global element, `Entity`, and one enumerated
simple type, `attrType` = {string, memo, int, bigint, decimal, datetime, picklist, lookup}.

**The published schema covers 39 of 52 XML files.** The 12 `<Workflow>` files and the 1 `<Solution>`
file are *outside* it, so every field name taken from them (`primaryentity`, `trigger`, `Step/@type`)
is a candidate derived from the instance, not from a published contract. That is recorded on each
workflow fact in `note`. The `.txt` formula files have no schema at all — an undocumented `key=value`
format, which is why stage 2 mattered more, not less.

There is no `lxml` and no `xmllint` in this environment, so `stage0_validate.py` reads the XSD with
`ElementTree` and enforces the subset the XSD actually uses (`xs:element` with
name/type/minOccurs/maxOccurs, `xs:sequence`, `xs:attribute` with name/type/use,
`xs:simpleType/xs:restriction/xs:enumeration`). It is **not** a general XSD validator: no
substitution groups, no `xs:choice`, no namespaces, no `xs:all`, no key/keyref. The constraints it
checks are read out of the schema file, never hard-coded — but a schema using features outside that
subset would be silently under-checked, and that is a stated limitation of this run.

## Stage 1 — inventory, parsing nothing

```
python3 .ddd-flow/mine/stage1_inventory.py --root export \
    --out .ddd-flow/mine/out/inventory.jsonl --manifest .ddd-flow/mine/out/manifest.stage1.yaml
→ 65 files under export
      39  entity-definition
       1  entity-index
      11  formula-definition
       1  package-manifest
      12  workflow-definition
       1  SKIPPED (with reason)
   !! extension-case anomalies: ['packages/addon/entities/Incident.XML']

find export -type f | wc -l   → 65     (independent count, agrees)
```

Two traps the inventory caught that a glob would not:

**`Incident.XML`, uppercase extension.** A case-sensitive `*.xml` glob finds **51** files; a
case-insensitive one finds **52**. Measured:

```
find export -type f -name  '*.xml' | wc -l   → 51
find export -type f -iname '*.xml' | wc -l   → 52
```

That one file holds a full `Incident` definition. A run that globbed `*.xml` would have reported
`Incident` as defined once instead of twice and missed a `definition-divergence` conflict — and
would have said nothing about it.

**`Part.xml.bak`.** Skipped with the reason "editor/tool backup file, not part of the applied
export", carried forward into stage 3's `skipped` list so the arithmetic still closes at 65. It is
*not* deleted from the count: a `*.xml*` glob would have parsed it as a real definition and inflated
`Part`.

**Package layering, read from the export's own manifest, never guessed:**

| order | package | state | publisher | installed |
|---|---|---|---|---|
| 0 | core | base | fo | 2019-04-11 |
| 1 | addon | patch | fo | 2023-08-02 |
| 2 | addon-managed | managed | fo | 2023-08-02 |
| 3 | legacy | index | flt | 2017-01-30 |

The apply order and the install dates **disagree**: `legacy` is applied last and installed first.
And `legacy`'s declared publisher is `flt` while every schema name inside it is `fo_*` — measured:

```
grep -ho 'schema="[^"]*"' -r export | sed 's/schema="//;s/"//' | sed 's/_.*//' | sort | uniq -c
→ 48 fo          (47 real occurrences + 1 inside Part.xml.bak; zero `flt` anywhere)
```

So there is **no publisher-prefix collapse to perform** — a filter the playbook's worked example
needed and this corpus does not. That is a measured absence, not an untested assumption. It is
hotspot H11.

## Stage 2 — one record, read by eye, fact schema locked

```
python3 .ddd-flow/mine/stage2_sample.py --file export/packages/core/entities/WorkOrder.xml
→ # raw bytes: 2676  BOM: True
→ # 36 facts: {"attribute": 15, "entity": 1, "form": 1, "form_field": 12, "label": 3,
               "relationship": 4}

grep -c '<Attribute '    …/WorkOrder.xml → 15
grep -c '<Relationship ' …/WorkOrder.xml →  4
grep -c '<Field '        …/WorkOrder.xml → 12
grep -c '<Label '        …/WorkOrder.xml →  3
```

Facts and raw source agree on every count. Locked kinds: `entity`, `label`, `attribute`,
`relationship`, `form`, `form_field`, plus `missing_node`, `index_entry`, `workflow`,
`workflow_step`, `formula`, `conflict`. Every fact carries `{kind, source_file, locator}`.

**A bug this stage caught in the tooling, not the corpus.** The first version printed
`BOM: False` for a file that has one — an f-string had `b'\\xef\\xbb\\xbf'`, comparing against a
12-byte literal. Verified independently and fixed:

```
od -An -tx1 -N4 export/packages/core/entities/WorkOrder.xml         → ef bb bf 3c
od -An -tx1 -N4 export/packages/core/workflows/PartsApproval.xml    → 3c 3f 78 6d
python3 (read_bytes()[:3] == b'\xef\xbb\xbf' over export/**/*.xml)  → BOM 40, no-BOM 12
```

**40 of 52 XML files carry a UTF-8 BOM** — all 39 entity files and the legacy index; none of the 12
workflows. Every read uses `encoding="utf-8-sig"`. Had this been left, `ET.fromstring` on the
already-decoded text would have raised on 40 of 52 files.

## Stages 3 and 4 — scale, conflicts, counted filters

Stage 4 is a `--filters` flag on the stage 3 script, precisely so the round-trip property is
testable rather than asserted.

```
python3 .ddd-flow/mine/stage3_extract.py --inventory .ddd-flow/mine/out/inventory.jsonl \
    --root export --out .ddd-flow/mine/out/facts.jsonl \
    --conflicts .ddd-flow/mine/out/conflicts.jsonl \
    --manifest .ddd-flow/mine/out/manifest.stage3.yaml --filters none
→ conflicts: 17
→ 63 parsed / 64 in work list; 2 skipped, 0 failed
→ 257 attribute · 39 entity · 34 form · 155 form_field · 11 formula · 8 index_entry
  · 102 label · 5 missing_node · 49 relationship · 12 workflow · 36 workflow_step   (708 facts)
```

**Price of the run, out loud.** Stage 2 on one 2.7 KB file is a few milliseconds; 63 files at that
rate is well under a second. Measured, not estimated:

```
/usr/bin/time -f … python3 .ddd-flow/mine/stage1_inventory.py …   → 0.06 s
/usr/bin/time -f … python3 .ddd-flow/mine/stage3_extract.py …     → 0.10 s
/usr/bin/time -f … python3 .ddd-flow/mine/stage7_graph.py …       → 0.06 s  (25 Louvain runs)
```

63 files × ~1.6 ms. So this corpus needs **none** of parallelism, sharding or a resume-by-row-count
scheme. Append-as-you-go and resume-by-source-file
were implemented anyway because they are ~10 lines and they are what makes the reproducibility gate
below meaningful; nothing else from the "past that line" list was built, deliberately.

### The gates, run

```
mine_coverage.py --manifest out/manifest.stage1.yaml --corpus 'export/**/*' --strict → OK
mine_coverage.py --manifest out/manifest.stage3.yaml --corpus 'export/**/*' --strict → OK
mine_coverage.py --manifest out/manifest.stage4.yaml --corpus 'export/**/*' --strict → OK
mine_coverage.py --manifest out/manifest.stage3.resumed.yaml --corpus 'export/**/*' --strict → OK
```

```
cmp facts.clean-run.reference.jsonl facts.jsonl
→ DETERMINISM: two clean runs byte-identical
simulated crash after 20 of 63 source files (301 of 708 fact lines kept), then --resume
→ RESUME GATE: killed-and-resumed fact set == clean fact set (sorted)
→ RESUME GATE: conflict set byte-identical too
cmp facts.clean-run.reference.jsonl facts.jsonl   (after the --filters default run)
→ STAGE4 GATE: --filters none still byte-identical to the stage 3 reference
```

### The 17 conflict facts — both values, both locators, unresolved

**4 attribute-level conflicts, all on `Inspection`, between two packages of the same system:**

| subject | name | core | addon |
|---|---|---|---|
| Inspection | Inspector | `lookup → Employee` | `string` |
| Inspection | Result | `picklist → result` | `string` |

**13 definition-divergences.** In every single case the *later* package holds **fewer** attributes
than the base it is meant to patch:

```
Asset         6 (addon)  vs 12 (core)      MeterReading  0 (addon)  vs  6 (core)
Contract      5          vs  8             PartsRequest  6          vs 10
Crew          0          vs  6             Shift         0          vs  6
Depot         5          vs  8             Warranty      0          vs  5
Downtime      0          vs  6             WorkOrder     7          vs 15
FuelLog       5          vs  7             Incident      6          vs  8
Inspection    6          vs  8
```

The manifest says "later packages patch earlier ones". Applying that as last-wins would delete 8
attributes from `WorkOrder`, 6 from `Asset`, and **every** attribute from `Crew`, `Downtime`,
`MeterReading`, `Shift` and `Warranty`. So the layering rule this run states is: **definitions are
kept per package and never blended**; no third definition was synthesised. Which one the running
system applies is H3 and needs a human.

**The 5 stub files** — the trap the playbook warns about at stage 2:

```
python3 .ddd-flow/mine/queries.py … → q_files_with_no_attributes_node
  packages/addon/entities/{Crew,Downtime,MeterReading,Shift,Warranty}.xml
```

These have no `<Attributes>` node at all. A parser that assumes the node exists either crashes or
reports zero attributes and is believed. This run emits a `missing_node` fact whose `note` says
"zero attributes is a FACT ABOUT THE FILE, not about the entity".

### Filters — five, each with a count and a reason

708 → 421 facts. `708 − 102 − 68 − 117 = 421`.

| filter | dropped | reason |
|---|---|---|
| platform-attributes | 102 | `platform="true"` audit columns (`fo_createdon`, `fo_modifiedon`, `fo_versionnumber` × 34 files) — exporter-created, never authored |
| nondefault-locale-labels | 68 | `lcid != 1033`. **Measured first**: every non-1033 value is the 1033 value plus a language suffix, so no locale carries a different *meaning* — that would have been a stage 6 finding, not noise |
| managed-twin | 117 | 6 `addon-managed` files whose fact bodies are equal to an unmanaged package's. **The twins match `core`, not their own `addon` package** (H20) |
| volatile-identity | 0 | 28 form GUIDs **masked, not deleted** — they are join keys |
| presentation-geometry | 0 | 112 pixel widths nulled; **field identity, section label and ordinal kept**, because grouping is the only proxy for "looked at together in one task" and stage 7 needs it |

Noise classes the playbook lists that this corpus does **not** have: naming-era prefix drift (zero
`flt_` names), duplicate generated mirrors beyond the managed twins, and a localisation set with
divergent meaning. Each was measured, not assumed.

## Stage 5 — L1, 20 subject files

```
python3 .ddd-flow/mine/stage5_normalise.py --facts .ddd-flow/mine/out/facts.clean.jsonl \
    --conflicts .ddd-flow/mine/out/conflicts.jsonl --outdir .ddd-flow/mine/model
→ L1: 20 subject files ; unattached workflows: 0
```

All 12 workflows resolve to a defined entity by `primaryentity` schema name, so nothing is orphaned.
A bug caught here and fixed: sections were first keyed by `(form, section)`, which merged `core`'s
and `addon`'s two different "General" sections into one list that existed in neither file. They are
now keyed by `(source_file, form, section)`. **L1 is never hand-edited** — the fix went into the
script and the layer was regenerated.

## Stage 6 — polysemy, measured

```
python3 .ddd-flow/mine/stage6_polysemy.py --facts .ddd-flow/mine/out/facts.clean.jsonl …
→ 20 containers · 55 distinct attribute names
→ names in >1 container: 9 ; multi-sense: 3 ; attribute-name-is-also-an-entity: 10
   Cost   3 senses across Asset, Contract, Employee, FuelLog, Part, PartsRequest, WorkOrder
   Owner  4 senses across Asset, Depot, PartsRequest, WorkOrder
   Status 2 senses across Asset, WorkOrder
```

Run on the unfiltered L0 as well, to show what the filters changed: **12** names in >1 container
instead of 9 (the three platform columns are in 34 containers each), and the **same 3** multi-sense
names. The filters removed noise, not signal — demonstrated rather than claimed.

- `Cost` = `decimal` money (5 entities) · `lookup → CostCentre` (Employee) · `string` (PartsRequest)
- `Owner` = `lookup → Depot` (Asset) · `lookup → Employee` (WorkOrder) · `picklist → owner_role`
  (PartsRequest) · `string` (Depot)
- `Status` = `picklist → asset_status` · `picklist → wo_status`
- `Downtime` is an **entity** and a `decimal` field on WorkOrder — the sharpest of the ten
  entity/field name collisions; the other nine are lookups pointing at their namesake, i.e. a
  reference rather than a second sense.

None of these was resolved. `PartsRequest.Cost` staying `string` while `WorkOrder.TotalCost` sums it
is exactly the kind of consequence that a tidied glossary would have hidden.

## Stage 7 — graph, with the warning attached

```
python3 .ddd-flow/mine/stage7_graph.py --facts …/facts.clean.jsonl --polysemy …/polysemy.jsonl
→ nodes=20 edges=45 runs=25
→ articulation points: ['Asset']
→ bridges: Asset--Category, Asset--Downtime, Asset--MeterReading, Asset--PmSchedule, Asset--Warranty
→ top edge betweenness: Asset--Depot=19.9, Asset--Category=19.0, Asset--Downtime=19.0, …
→ unresolved references: 3
→ runs with internally disconnected communities: 0
```

`networkx`, `igraph` and `leidenalg` are **not installed** and there is no network, so all three
algorithms are implemented in stdlib inside the script and named: **Louvain** (Blondel et al. 2008,
local-moving + aggregation, weighted, resolution parameter), **Tarjan** for articulation points and
bridges, **Brandes** for edge betweenness. **Leiden was not run** — that needs `leidenalg`. Because
Louvain can emit internally disconnected communities, the script checks each community for internal
connectedness; 0 of 25 runs produced one.

Resolutions swept `[0.5, 0.75, 1.0, 1.25, 1.5]` × seeds `[1,2,3,4,5]` = 25 runs; community count
moves 2 → 4 → 5 across the sweep, so the default resolution is demonstrably not a fact about this
domain. Only groupings stable across **all 25** runs are reported:

`{Asset, Category, Downtime, FuelLog, Incident, MeterReading, PmSchedule, Warranty}` ·
`{CostCentre, Employee, WorkOrder}` · `{Contract, Supplier}` · `{Crew, Shift}` ·
`{Part, PartsRequest}` · `{Depot}` · `{Inspection}` · `{Region}`

**These are cohesion candidates, not boundaries, and this corpus is exactly the trap the warning
describes**: the graph is built from a legacy foreign-key structure, so clustering it reproduces the
legacy's table groups with a modularity score on top. `docs/domain/discovery/` therefore draws no
boundaries at all, and the report carries the warning in its own first paragraph.

Reconciling stage 7 with stage 6 is the interesting part, and it disagrees: Louvain puts
`{CostCentre, Employee, WorkOrder}` together, while stage 6 says `Cost` means three different things
across `Employee`, `WorkOrder` and `PartsRequest`. Cohesion and language point different ways there.
That is H21/H22's territory and a human has to settle it.

**3 references that resolve to nothing**, reported rather than dropped:

| class | from | target | locator |
|---|---|---|---|
| lookup-target-not-an-entity | WorkOrder | `SystemUser` | `core/entities/WorkOrder.xml#…Attribute[11]` |
| relationship-target-not-an-entity | WorkOrder | `SystemUser` | `core/entities/WorkOrder.xml#…Relationship[3]` |
| formula-ref-head-not-an-entity | WorkOrder | `Priority.SlaHours` | `core/formulas/WorkOrder_SlaBreached.txt#1` |

`SystemUser` is plausibly a platform identity table (an external system). `Priority.SlaHours` is
not: `Priority` is a picklist option set, `SlaHours` appears nowhere in 65 files, and a live formula
reads it. That is H7.

## What reading alone would have missed

Held against the five things a read-only pass tends to produce on a corpus like this:

1. **11 formula files and 12 workflow files — 100% of the business logic — live outside the entity
   model.** 36 workflow steps, all `condition → setvalue → sendmail`; 7 calculated and 4 rollup
   fields. **Four** formulas carry dotted cross-subject references — `Asset.NextPmDue` →
   `PmSchedule.{LastRun,IntervalDays}`, `Asset.Utilisation` → `Downtime.Hours` +
   `MeterReading.Value`, `WorkOrder.TotalCost` → `PartsRequest.Cost`, `WorkOrder.SlaBreached` →
   `Priority.SlaHours` (which resolves to nothing).
2. **0 of 257 attributes is `required`.** Not one invariant is declared. A read would have described
   rules from the formulas and never noticed the schema declares none.
3. **8 picklist option sets named, zero option values exported.** Every state machine in FleetOps is
   named and unexported; the sole state literal in the corpus is `'closed'`, inside one formula.
4. **The addon package is a patch that shrinks 13 entities and empties 5.** Reading `addon/` first
   would have produced a 4-attribute `WorkOrder`.
5. **`Incident.XML`.** One byte of case, one whole entity definition, and a silent absence.
