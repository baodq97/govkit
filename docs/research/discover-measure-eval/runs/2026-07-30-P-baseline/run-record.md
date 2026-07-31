# Arm P run record — 2026-07-30, baseline

Fixture: `fixture-prose/` (Harbourline, 9 files). Skill under test:
`plugins/ddd-flow/skills/2-discover/` at the 0.2.0 working tree (measure-playbook with the stage-3
scale mechanics and the stage-7 algorithm table). Runner: general-purpose agent, blinded per
`README.md`. Tooling: `python3` stdlib only; no `networkx`, no `lxml`, no `xmllint`.

Artifacts as produced are under `output/`. Below is the runner's own final report, verbatim.

---

The run is complete. Final state verified.

## Run record — `2-discover` on the Harbourline snapshot

### 1. Mode detection and the structured-corpus branch

`docs/domain/discovery/` absent, repo has prose docs + DDL → **DISCOVER** mode. `db/schema.sql` is DDL, which `references/measure-playbook.md` names as structured outright (the "≥20 files sharing one shape" test is an *additional* trigger), so it was inventoried and queried by script **before** being read. Prose was read for intent; its extent was also measured.

**Who to involve — said out loud before starting:** people who build/test software, people with domain knowledge, product/strategy, people who know the customers, and real end users. **None was available.** The skill's instruction for that case is to record it and leave the dependent areas as hotspots, not confident findings — which is what I did: **0 of 44 elements are `confirmed`**. I did not invent a persona, did not simulate an interview, and did not promote anything from a document.

### 2. Files created (paths relative to the working directory)

**Discovery output (the skill's contract):**
- `docs/domain/discovery/README.md` (102 lines) · `timeline.md` (74) · `ubiquitous-language.md` (67) · `hotspots.md` (47) · `model.json`
- `docs/research/discovery-round-1-mining.md` (169 lines — ungoverned/unbudgeted, per playbook)
- `.ddd-flow/discovery/model.json` (mirror for the preview surface)

**Scripts (the provenance):** `.ddd-flow/mine/` — `corpus.py`, `ground.py`, `inventory.py`, `mine_schema.py`, `polysemy.py`, `terms_census.py`, `absences.py`, `graph.py`, `build_model_json.py`

**L0/L1/L2:** `.ddd-flow/mine/out/facts.jsonl`, `out/inventory-facts.jsonl`, `out/ground.json`, `out/manifest-{stage0,stage1,stage3,stage6,stage6-terms,stage7,absence-probe}.json`, `out-nofilter/{facts.jsonl,manifest-stage3.json}`, `model/{booking,quote,movement}.yaml`, `reports/{polysemy,terms-census,absences,graph}.json`

No corpus file was modified.

### 3. Commands run, with real output

| Command | Output |
|---|---|
| `python3 .ddd-flow/mine/inventory.py --root . --out .ddd-flow/mine/out` | `{"files": 9, "parsed": 9, "skipped": 36, "failed": 0, "facts": 12}` |
| `find . -type f -not -path './.ddd-flow/*' -not -path './docs/domain/*' -not -path './docs/research/*' \| wc -l` | `9` — matches manifest |
| `python3 .ddd-flow/mine/ground.py --ddl db/schema.sql --out .ddd-flow/mine/out` | `validated: true`, `engine sqlite3 3.45.1`, `catalog_kinds {"index":3,"table":3}` |
| `python3 .ddd-flow/mine/mine_schema.py … --model .ddd-flow/mine/model` | `23 facts` — `column 15, db_object 3, foreign_key 2, index 3`; filter `drop-platform-autoindex dropped 3` |
| `… --out out-nofilter --filters none`; `diff` | `26 facts`; diff shows **exactly 3** removed lines = the declared drop |
| `sha256sum out/facts.jsonl` ×2 | `7853e23a…` both times |
| `python3 -c "…executescript('CREATE TABLE probe (x NOT_A_REAL_TYPE, y SERIAL)')…"` | `[('x','NOT_A_REAL_TYPE'),('y','SERIAL')]` |
| `python3 .ddd-flow/mine/polysemy.py …` | `identifiers 15`, `proven_schema_internal_senses []`, cross-corpus hits for 6 identifiers |
| `python3 .ddd-flow/mine/terms_census.py …` | `booking 15/7 docs`, `job 2/2`, `consignment 1/1`, `delivered 2/2`, `slot 3/3`, `lane 5/5` |
| `python3 .ddd-flow/mine/absences.py …` | `absent from DDL: 24 \| in DDL: ['surcharge','customer'] \| probe not in prose: ['expiry']` |
| `python3 .ddd-flow/mine/graph.py …` | G1 3 nodes/2 edges, artic pt `booking`; G2 6 nodes/5 edges, 3 components |
| `rg -i -e cancel -e void -e abort README.md db docs -g '!domain' --stats` | `0 matches … 9 files searched, 6136 bytes searched` |
| `mine_coverage.py --manifest <each> --strict` (8 manifests) | all `OK — accounts for every file` |
| two consecutive full pipeline runs, hashed | `f6fe1aa7bb35…` both — **idempotent** |

### 4. Findings

**Measured on the DDL:** 3 tables, 15 columns, 2 FKs (both → `booking.id`), **0 CHECK constraints, 0 enumerations, 0 conflicts, 0 author-written indexes**. Types are PostgreSQL (`SERIAL`, `NUMERIC(12,2)`, `TIMESTAMP`) — sqlite executing them proves nothing, demonstrated with the `NOT_A_REAL_TYPE` probe, so types are recorded verbatim and `not_null` on PKs is flagged as sqlite semantics.

**Timeline:** 44 candidate elements — 26 events, 4 actors, 4 policies, 4 read-models, 3 external systems, 3 aggregates. States: 39 `as-is`, 1 `to-be`, 4 `could-be`, **0 unlabelled**. Two pivotal events marked.

**Ubiquitous language:** 26 rows, **7 terms deliberately kept with two senses side by side** (`booking`, `delivered`, `container`, `documentation fee`, `lane`, `quote`, `consignment`); 4 are attributed disagreements. Nothing was qualified into `cost_estimate`-style tidiness. Synonym pairs `box`/`container`, `allocation`/`slot`, `job`/`booking` left uncollapsed, with the undercount that causes stated in the manifest.

**Stage 6 result worth naming:** **0 proven schema-internal senses** (`id`, `booking_id` each have one type and one target) — the polysemy in this domain is entirely in the prose. And **9 of 15 schema identifiers occur in 0 of 8 prose files** (`movement`, `event`, `status`, `noted_at`, …): the schema invented vocabulary the business does not use.

**Absence, as a set not a sentence:** of 26 business nouns verified present in the prose, **24 have no name in the DDL** — only `surcharge` and `customer` do.

**19 hotspots, H1–H19, none resolved.** Five are declared unresolved by the corpus itself ("Nobody picked one", "Left unresolved", "Not decided", "We have not decided", "Nobody has signed off"). Six exist only because a script measured a hole (H1, H8, H11, H13, H16, H18).

**Two bugs I found in my own work, both recorded in the research doc:**
1. `mine_coverage.py --strict` caught *my invocation*: I validated a 9-file scan against `--corpus '**/*.md'` (7 files) → `coverage-total-mismatch`, exit 1.
2. Re-running the pipeline revealed **self-contamination** — the scanners were sweeping their own markdown output. Stage-1 total went 9→15 and `booking` occurrences 15→45, *while every gate stayed green*. Fixed in `corpus.py` (added at the fourth repetition, not the first), with generated paths going into `skipped` **with a reason** (9 parsed + 36 skipped = 45 = every file on disk) rather than filtered away silently. Original numbers all return; runs now hash identically.

### 5. Deliberately not done

- **No interview, no invented confirmations.** No human was available. Per the skill, the run says plainly it "has discovered nothing; it has only restated the documents", every element stays `candidate`, and the areas needing absent people (drivers, customers, carriers, the broker, the DDL's author) stay hotspots.
- **No browser wall.** No participants to watch it, and `skills/view/scripts/preview-server.cjs` is outside the directory this run was scoped to read. `model.json` is written in the shape that surface renders, and the README states what a markdown fallback loses.
- **No boundaries drawn.** That is `3-decompose`'s job; the timeline notes it explicitly.
- **The top-ranked pain is not an event row.** "A booking is confirmed before we know a slot exists" is an ordering *condition*; naming it `BookingConfirmedBeforeSlotKnown` would put my coinage in a column of the business's words, so it is H10 instead.
- **No Leiden/Louvain.** `networkx` confirmed absent under the stdlib-only constraint, and on 3 nodes a modularity score is a parameter artifact. Stated in the report along with "no seed and no resolution sweep, because no stochastic method ran". Algorithms that did run are named: BFS, Tarjan, Brandes. G1's `booking`-as-cut-vertex is reported as **no information** (a 3-node star has one by construction).
- **No append-as-you-go / resume / sharding / parallelism.** Priced out loud: 9 files, 6,136 bytes, ~50 ms.
- **No `ddd_check.py` run** (lives outside the readable scope); its `State`-column check was performed directly instead — `model.json` reports 0 invalid states.
- **No `INDEX.md` row, no status flip.** Docs are `status: draft`, `owner: TBD`. The snapshot has no `govkit.yml`, and setting status or owner is a human act.
