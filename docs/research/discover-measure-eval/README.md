# `2-discover` MEASURE evaluation — two-arm trigger + behaviour harness

Grades one thing the skill's own text cannot demonstrate about itself: **does the MEASURE branch fire
where it should, and stay quiet where it should not.** A skill that only ever gets tested on the
corpus it was written from can't tell a rule from a habit.

```
discover-measure-eval/
├── README.md            ← you are here (protocol; names the traps — runners must not read it)
├── rubric.md            ← ground-truth scoring key — GRADERS ONLY
├── make-fixtures.mjs    ← regenerates both fixtures + prints the census the rubric grades against
├── fixture-structured/  ← arm S: 67-file legacy export. MEASURE must FIRE.
├── fixture-prose/       ← arm P: 9 narrative docs. MEASURE must NOT fire.
└── runs/                ← one subfolder per run: the runner's output + the filled rubric
```

## Why two arms

A single positive arm measures nothing about a trigger. Any run told to look at a schema export will
write a script, so arm S alone cannot distinguish *"the skill routes correctly"* from *"the prompt
mentioned XML"*. Arm P is the discriminating half: a prose corpus with **no repeated machine shape**,
carrying one small piece of real DDL as bait. The failure it catches is **over-trigger** — a mining
pipeline stood up over nine narrative documents, which produces a coverage manifest about prose and
loses the elicitation that was the actual job.

Report both arms or neither. A win on S with a fail on P is not a working trigger, it is a skill that
always mines.

## Roles

- **Runner** — an agent that invokes `2-discover` on one fixture, in a scratch copy. Sees the fixture
  and the skill under test, nothing else. One runner per arm; the arms never share a context.
- **Grader** — a *separate* agent, fresh context, that scores one run against `rubric.md`. Never runs
  discovery itself.

## Blinding rules (hard)

A runner reads **only**:
- everything inside its own scratch copy of the fixture, and
- the skill under test: `plugins/ddd-flow/skills/2-discover/` (SKILL.md + `references/` + `scripts/`).

A runner must **never** read `rubric.md`, this `README.md`, `make-fixtures.mjs` (it states every
planted count — reading it turns a measurement into a transcription), `runs/`, the other arm's
fixture, or anything under `/home/bd/personal-projects/self-learning/`. Any leak voids the run.

Both fixtures are leak-audited: no file inside either one contains *EventStorming, bounded context,
ubiquitous language, hotspot, polysemy, coverage manifest, DDD*, or the words *stage* / *mine* used
in this playbook's sense. Every trap has to be found from the corpus.

## Procedure — one run

1. **Set up.** Copy the arm's fixture into a scratch workspace outside the repo. Never let a runner
   write into `govkit/`; a runner that can edit the skill under test is grading itself.
2. **Run.** The runner invokes `2-discover` against the scratch copy and reports every file it
   created, plus the exact commands it ran.
3. **Archive** to `runs/<date>-<arm>-<label>/output/`, including any scripts the runner wrote —
   those *are* the evidence for arm S.
4. **Grade** in a fresh context against `rubric.md`, quoting the runner's own words (or the explicit
   absence) for every verdict. Save as `runs/<date>-<arm>-<label>/rubric-filled.md`.
5. **Record both arm totals in `RESULTS.md`.** A run with only one arm is not a result.

## Before / after protocol (skill regression)

Freeze both fixtures and `rubric.md`; change only
`plugins/ddd-flow/skills/2-discover/`. A real improvement is a check moving FAIL/PARTIAL → PASS on
one arm **with no regression on either**. Re-running `make-fixtures.mjs` is safe (deterministic, no
randomness, no timestamps) — but if the fixture *content* changes, that starts a new baseline and old
totals stop being comparable.

## What the fixtures hide (grader/author orientation — NOT for runners)

### Arm S — "FleetOps", a vendor export of a maintenance system

67 files. Planted so that reading cannot substitute for counting:

- **The format documents itself** — `schema/FleetOpsExport.xsd` is real and complete; stage 0 is
  available to anyone who looks. Note this box has **no `xmllint` and no `lxml`**, so a sample cannot
  actually be validated against the XSD — the honest move is to say so, and a claimed validation with
  no command behind it is a fabrication, not a pass.
- **Two glob traps** — `Incident.XML` (uppercase extension) and `Part.xml.bak`. A `*.xml` glob finds
  51 of the 52 entity-shaped files and says nothing about the miss. This is the "silence read as
  absence" failure the playbook was written for.
- **Five stubs** with no `<Attributes>` node at all — a parser assuming the node crashes, or worse
  reports 0 attributes and is believed.
- **17 of 20 entity names are defined more than once**; `WorkOrder` four times over
  (core 12 attrs → addon 4 → managed twin → legacy index, 0). `Inspection` contradicts core on a
  **type**, not just a count (`Result`: picklist → string). The layering rule is derivable from
  `export/manifest.txt` (`base` → `patch` → `managed`, `legacy` = `index`) but nothing announces it.
- **The legacy monolith is a name-only index** — a checksum, not a definition. Treating its 0
  attributes as a definition inverts the layering.
- **Noise with counts** — 6 `_managed` twins, 3 `platform="true"` attributes per entity, 2
  non-default locales per entity (`1066`, `1036`), a UTF-8 BOM on every XML file, and `Form`/`Field`
  `width` geometry. The geometry is the trap: the widths are droppable, the **`Section` grouping is
  stage 7's only cohesion proxy** and dropping it costs the graph.
- **Polysemy, provable** — `Owner` carries **4** senses (`lookup→Employee`, `lookup→Depot`,
  `string`, `picklist`), `Cost` **3** over 7 occurrences (`decimal`, `string`, `lookup→CostCentre`),
  and `Status` **2** by enumeration target (`wo_status` vs `asset_status`) — the subtle one, same
  type, different target.
- **Business logic outside the entity model** — 11 formula files (calculated + rollup) and 12
  workflow definitions. Reading the entity files alone never finds them; an inventory finds them in
  one pass. `WorkOrder.SlaBreached` and `PartsRequest.NeedsApproval` are real invariants living in a
  `.txt`.
- **Correctly, the corpus is small.** 67 files is minutes, so the right call on the new stage-3 scale
  mechanics is to **price the run and skip them**, saying so. A resumable sharded parallel pipeline
  over 67 files is the self-expansion failure the playbook warns Opus-class about.

### Arm P — "Harbourline", coastal freight, prose only

9 files, 8 of them narrative. Nothing shares a machine shape; the largest structured artifact is
`db/schema.sql` — **3 tables** — which exists to be read directly, not mined.

- **Elicited polysemy, unprovable by script** — *"delivered"* means on-the-vessel (yard/ops) and
  received-by-consignee (customer service), stated as an unresolved argument in the 2 June notes;
  *"booking"* is both the confirmed row and the pre-confirmation request; *"consignment"* is goods
  (customs) and invoice line (finance); *"slot"* is the carrier's *"allocation"*. These are the arm's
  main prize and **no script can find them** — they live in who said what.
- **Four planted hotspots, all explicitly undecided in the text** — the documentation fee (revenue
  vs pass-through), quote expiry (7 days vs rate-card week), carrier integration (recommended, not
  signed off), and the customer PO number nobody stores.
- **Three-axis material** — "we have decided we will stop quoting by hand" is **to-be**; the carrier
  integration memo is **could-be**; everything in the ops walkthrough is **as-is**.
- **Attribution is available and should be used** — Mai/Tuan/Linh/Ha/Duc, with meeting dates.
- **A real invariant stated as an incident** — a booking confirmed before a slot is known to exist.
