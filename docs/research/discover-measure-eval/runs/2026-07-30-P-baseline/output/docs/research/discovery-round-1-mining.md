# Discovery round 1 — mining record (Harbourline, 2026-07-30)

Ungoverned and unbudgeted, per the measure playbook: the detail lives here so
`docs/domain/discovery/` can stay inside its 120-line budget without shedding a finding. Every
number below names the command that produced it. Every script is committed under `.ddd-flow/mine/`
because the script *is* the provenance.

## Why a script at all, on a 568-byte file

`db/schema.sql` is DDL, which the playbook names as a **structured** corpus outright — the
"≥20 files sharing one shape" threshold is an *additional* trigger, not the only one. So the DDL was
inventoried and queried before being read. It was read afterwards, once, for the stage-2 eyeball
gate.

**The run was priced before it was engineered.** Stage 1: 9 files, 6,136 bytes. Stage 2 on its one
record: under 50 ms. 50 ms × 1 file ≈ 50 ms. That multiplication is the whole argument for what was
*not* built: no append-as-you-go flushing, no resume-on-source-file, no sharding, no parallel
workers. Those exist for the 3,664-file case in the playbook's worked example; here they would be
self-expansion. Seven small scripts, one question each, plus one 30-line shared predicate
(`corpus.py`) and one generator (`build_model_json.py`).

Honest counter-argument, recorded rather than hidden: on a corpus this small a careful read would
have produced the same table of columns. What it would *not* have produced is the six absence
findings (H1, H8, H11, H13, H16, H18) — because a read produces "I didn't see a rate card", and a
probe list with a corpus and a match rule produces "24 of 26 prose nouns have no name in the DDL".
The second one can be re-run and disagreed with.

## Stage-by-stage, with the gate that had to pass

| Stage | Script | Result | Gate |
|---|---|---|---|
| 0 Ground | `ground.py` | DDL executes in sqlite3 3.45.1; engine catalog reports `{table: 3, index: 3}` | one real sample validates — it did, by executing |
| 1 Inventory | `inventory.py` | 9 source files, 9 parsed, 0 failed, 12 facts, 3 `CREATE TABLE`; + 36 generated paths skipped with a reason (9+36 = 45 = every file on disk) | independent count of the source corpus → 9 (command below) |
| 2 Sample | (read of facts vs source) | 6+5+4 = 15 columns, 2 FKs, 0 CHECKs | read by eye against `db/schema.sql`; agreed |
| 3 Scale | `mine_schema.py` | 23 facts: 15 column, 3 db_object, 2 foreign_key, 3 index; **0 conflict facts** | re-run is byte-identical (sha256 `7853e23a…`) |
| 4 De-noise | `mine_schema.py --filters` | one filter, `drop-platform-autoindex`, dropped 3 | `--filters none` → 26 facts; `diff` shows exactly 3 removed lines |
| 5 Normalise | `mine_schema.py --model` | `model/booking.yaml`, `quote.yaml`, `movement.yaml` | human-reviewable diff; header forbids hand-editing |
| 6 Polysemy | `polysemy.py`, `terms_census.py` | 0 proven schema-internal senses; 7 terms kept with two senses, 4 of them attributed disagreements | senses emitted unresolved, each with a locator |
| 7 Graph | `graph.py` | G1: 3 nodes/2 edges; G2: 6 nodes/5 edges after a counted filter | report names the algorithms and carries the warning inside it |
| — Absence probe | `absences.py` | 26 prose nouns probed, 24 absent from the DDL | every probe's prose presence verified by the script |

All 8 coverage manifests pass `mine_coverage.py --strict`.

## The worst bug in this pipeline was mine, and re-running found it

After writing the discovery documents I re-ran the whole pipeline to prove it reproduced. It did
not. Cause: **the scanners were reading their own output.** `docs/domain/discovery/*.md` and
`docs/research/*.md` are markdown under the scanned root, so the second run swept them as corpus.

Measured, not guessed:

```
$ python3 -c "import json; m=json.load(open('.ddd-flow/mine/out/manifest-stage1.json'));
  print('stage1 total now:', m['total'])"            # 15   (was 9)
$ # 'booking' occurrences in terms-census.json        # 45   (was 15)
```

Every number would have inflated monotonically on every re-run **while passing every gate**,
because the manifest honestly described the wrong corpus. This is the playbook's own warning
("silence read as absence") in its mirror form: silence read as *coverage*.

Fix, in `corpus.py` — the one shared helper in this pipeline, added at the fourth site that needed
the rule, not the first. Generated paths are put in the manifest's `skipped` list **with a reason**
rather than filtered away, so 9 parsed + 36 skipped = 45 = every file on disk, and the exclusion is
visible instead of implicit. After it: two consecutive full runs hash identically
(`f6fe1aa7bb35…`), and every original number returns — `booking` 15 in 7 documents, 24 of 26 nouns
absent from the DDL, 9 of 15 identifiers absent from the prose.

The generalisable lesson: **a mining pipeline whose output lands inside its own scan root is
self-contaminating, and the only thing that reveals it is re-running and comparing.** A single run
looks perfect.

**The gate caught me once, too.** Validating `manifest-stage6-terms.json` I passed `--corpus '**/*.md'`
(7 files) against a script that had scanned `.md + .txt + .sql` (9). `mine_coverage.py` returned
`coverage-total-mismatch: manifest total=9, glob **/*.md → 7` and exited 1. The manifest was right
and my invocation was wrong — which is exactly the failure mode the manifest exists to catch, in the
direction nobody expects it.

## Stage 3 — what the DDL actually declares

3 tables, 15 columns, 2 foreign keys, 0 CHECK constraints, 0 enumerations, 0 indexes an author
wrote, 0 conflicts. Both FKs point the same way: `quote.booking_id → booking.id` and
`movement.booking_id → booking.id`.

**Dialect finding.** The types authored are `SERIAL`, `NUMERIC(12,2)`, `TIMESTAMP`, `DATE` — a
PostgreSQL vocabulary. sqlite executed the file anyway, and that is not evidence the authors targeted
sqlite; proven, not assumed:

```
$ python3 -c "import sqlite3; c=sqlite3.connect(':memory:');
  c.executescript('CREATE TABLE probe (x NOT_A_REAL_TYPE, y SERIAL);');
  print([(r[1], r[2]) for r in c.execute('PRAGMA table_info(probe)')])"
[('x', 'NOT_A_REAL_TYPE'), ('y', 'SERIAL')]
```

sqlite stores any type name it is given. So: types are recorded **verbatim as authored**, and the
`not_null: false` on each `SERIAL PRIMARY KEY` is sqlite's semantics, not the authors' intent —
PostgreSQL's `SERIAL` implies `NOT NULL`. Flagged rather than silently normalised.

**Extraction provenance is per fact.** `check_constraint` and `enumeration` facts would have been
tagged `extraction: lexical` because sqlite publishes no catalog for CHECK bodies. Zero of them were
emitted — and that zero is a true absence in the source (verified by eye at stage 2), not a parser
that quietly failed to find them.

## Stage 6 — the polysemy actually lives in the prose

Schema-internal (the playbook's proof form): only `id` and `booking_id` appear in more than one
table. `id` is `SERIAL` in all three; `booking_id` is `INT → booking.id` in both. One type, one
target each → **0 proven senses**. A 24-line DDL with no enumerations has nowhere to *put* a
disagreement, so the absence of schema polysemy is a fact about the artifact, not about the domain.

Schema-vs-prose, measured (`reports/polysemy.json`): **9 of 15** schema identifiers occur in **0**
prose files — `booking_id`, `customer_name`, `event`, `id`, `movement`, `noted_at`, `quoted_on`,
`status`, `wanted_on`. The schema's tracking vocabulary (`movement` / `event` / `noted_at`) and its
state vocabulary (`status`) are words no document in this business uses. That produced H13 and H1.

The four attributed collisions, all in prose, all kept unresolved (7 terms carry two rows in all): **booking**, **delivered**,
**container**, **documentation fee**. Detail and holders in
`docs/domain/discovery/ubiquitous-language.md`. The corpus states three of the four are unresolved
*in its own words*, which is stronger evidence than my inference.

Blind spots, stated: matching is whole-word, case-insensitive, singular/plural only. Synonyms are
**not** resolved — `box`↔`container`, `allocation`↔`slot`, `job`↔`booking` are three synonym pairs the
census scores as unrelated tokens. Collapsing them would have deleted the boundary evidence; leaving
them means the per-term counts undercount those concepts. Both facts are in the manifest notes.

## Stage 7 — and why to distrust it here

The warning is inside `reports/graph.json`, not only here: clustering finds cohesion, not language
boundaries, and on a legacy FK graph it reproduces the legacy's own tables.

- **G1 (foreign keys)**: 3 nodes, 2 edges, 1 component. Tarjan reports `booking` as the single
  articulation point and both edges as bridges. A 3-node star has exactly one cut vertex *by
  construction* — this is a property of the shape, and carries no information about the domain. It is
  recorded as no information, on purpose.
- **G2 (term co-occurrence)**: nodes are the 6 glossary-declared terms; documents substitute for the
  playbook's "same form / view / screen" cohesion proxy, because this corpus contains no forms,
  views, reports or screens. The substitution is stated in the report rather than assumed.
  - First run produced **15 of 15 possible edges — the complete graph**. Cause: the glossary is the
    document that *declares* every term, so every pair co-occurs there. Fixed in the script (not in
    the output) with a counted filter `drop-declaring-document` (dropped 6). Result: 5 edges,
    3 components. `booking–lane` is the heaviest edge (4 shared documents).
  - `consignment` and `delivered` fall out **isolated**: outside the glossary, neither co-occurs with
    any other declared term. The term whose ambiguity is the best-documented in the whole corpus is
    also the least connected to the rest of the writing.
- **Not run: Leiden and Louvain.** `networkx` is absent (`ModuleNotFoundError`) and this run is
  stdlib-only; and on 3 nodes a modularity score is a parameter artifact. Because no modularity
  method ran there is no resolution to sweep and no seed to report — stated so the absence does not
  read as an omission. Algorithms that did run: BFS components, Tarjan articulation points and
  bridges, Brandes edge betweenness. All deterministic.

## The largest unmeasured set

The business runs on "a shared spreadsheet and a WhatsApp group" (README.md:3-4). **Neither is in the
corpus.** Every count in this round therefore describes 9 files of writing *about* the business, not
the business's actual system of record. Nothing here is evidence about a running system, because no
running system is in the corpus. That sentence is the honest ceiling on this round.

## Files

| Path | What |
|---|---|
| `.ddd-flow/mine/{corpus,ground,inventory,mine_schema,polysemy,terms_census,absences,graph,build_model_json}.py` | the scripts — provenance of every number |
| `.ddd-flow/mine/out/facts.jsonl` | L0, 23 facts, append-shaped, one per line |
| `.ddd-flow/mine/out-nofilter/facts.jsonl` | the `--filters none` round-trip, 26 facts |
| `.ddd-flow/mine/out/manifest-*.json` | 7 coverage manifests (+1 in `out-nofilter/`) |
| `.ddd-flow/mine/model/*.yaml` | L1, generated, never hand-edited |
| `.ddd-flow/mine/reports/*.json` | L2 — polysemy, terms census, absences, graph. Regenerable |
| `.ddd-flow/discovery/model.json` | mirror of the discovery model for the preview surface |
