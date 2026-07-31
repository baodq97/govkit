# Arm P rubric — filled

Run: `runs/2026-07-30-P-baseline/`. Fixture: `fixture-prose/` (Harbourline, 9 files).
Graded against `rubric.md` arm P (P1–P7, 17 pts). Every verdict below quotes the run's own
artifacts under `output/`, or names the explicit absence. Where `run-record.md` and `output/`
disagree, `output/` wins.

| Check | Weight | Verdict | Points | Evidence (quote or explicit absence) |
|---|---|---|---|---|
| P1 no pipeline over prose | 3 | **FAIL** | 0 | All three of the rubric's disqualifiers are present as files. `output/.ddd-flow/mine/out/facts.jsonl` exists (23 lines). Eight per-stage coverage manifests exist: `manifest-stage0.json`, `-stage1.json`, `-stage3.json`, `-stage6.json`, `-stage6-terms.json`, `-stage7.json`, `-absence-probe.json` (+ one in `out-nofilter/`), and `docs/research/discovery-round-1-mining.md` gates them: *"All 8 coverage manifests pass `mine_coverage.py --strict`."* The seven-stage run is written out as a table with the stage numbers in the left column — *"\| 0 Ground \| `ground.py` \|"* through *"\| 7 Graph \| `graph.py` \|"*. It is not confined to the DDL: `manifest-stage1.json` is a coverage manifest over the narrative files (`"total": 45, "parsed": 9`, with all 8 prose files enumerated in `inventory-facts.jsonl` as `"file_kind": "prose"`); `manifest-stage6-terms.json` scans the prose (`"invocation": "python3 .ddd-flow/mine/terms_census.py --root . --glossary docs/glossary-draft.txt"`, `"total": 9, "parsed": 9`, one counted filter); `manifest-stage6.json` names its source as *"`facts.jsonl` + 8 prose files"*; `manifest-stage7.json` builds a term co-occurrence graph whose edge weights are prose filenames (`"booking--lane": {"documents_shared": 4, "documents": ["db/schema.sql", "docs/meeting-2026-05-14-pricing.md", ...]}`). PARTIAL is unavailable on both of its clauses: the scripts are **not** labelled unnecessary or exploratory — the research doc argues the opposite (*"What it would *not* have produced is the six absence findings (H1, H8, H11, H13, H16, H18)"*) — and six of the nineteen hotspots are findings the scripts produced over the prose rather than findings from reading (`hotspots.md`: *"H1, H8, H11, H13, H16 and H18 are not disagreements anyone voiced — they are holes a script found"*). This is a coverage manifest about prose, which is the FAIL condition verbatim. See gap note 1: the run's justification quotes the skill's own trigger line accurately, so the defect this FAIL records is in the skill, not in the runner's compliance. |
| P2 DDL read not mined | 2 | **FAIL** | 0 | The FAIL condition — *"Stage 0–7 stood up over three `CREATE TABLE`s"* — is matched literally over a 568-byte file. `manifest-stage0.json`: `"stage": "0-ground"`, `"source": "db/schema.sql"`. `manifest-stage3.json`: `"stage": "3-scale"`, `"source": "db/schema.sql"`, `"notes": "1 DDL file / 568 bytes"`. Stage 5 emitted `.ddd-flow/mine/model/{booking,quote,movement}.yaml`; stage 7 built `G1-foreign-key` over the 3 tables. Nine scripts were written (`corpus.py`, `ground.py`, `inventory.py`, `mine_schema.py`, `polysemy.py`, `terms_census.py`, `absences.py`, `graph.py`, `build_model_json.py`). The PARTIAL clause is also arguably satisfied — the run does concede *"on a corpus this small a careful read would have produced the same table of columns"* — but it rebuts the concession in the next sentence and built the full stage ladder anyway, so the more specific planted FAIL governs. Recorded against the run's credit: the PASS-side *content* is all present and correct — 3 tables noted as candidates (`timeline.md` rows 42–44, `"candidate"`), flagged abandoned (*"An abandoned file is weaker evidence than a meeting minute, not stronger for being machine-readable"*), and its narrowness measured (H13, H16). The rubric has no path to credit that; see gap note 3. |
| P3 attributed timeline | 3 | **PASS** | 3 | `timeline.md` carries 44 rows in time order covering the whole flow: `BookingWrittenToSheet` (4) → `SpaceCheckedWithCarrier` (8) → `SlotAvailabilityConfirmedByPhone` (11) → `BookingConfirmed **(pivotal)**` (12) → `BoxPickedUp` (17) → `BoxArrivedAtPortGate` (18) → `DeclarationSubmittedToBroker` (22) → `BrokerQueryRaised` (24) → `BoxLoadedOnVessel **(pivotal)**` (27) → `InvoiceIssued` (31). Every row carries a `Status` of `candidate` and a `Source`; human attribution with dates is used where the corpus supplies it — *"\| 7 \| Rate card — weekly, per lane, per container type \| read-model \| as-is \| — \| candidate \| Mai, 2026-05-14, meeting-2026-05-14-pricing.md:5 \|"*, likewise Tuan (row 35) and Duc (row 21); Ha and Linh are attributed with dates in `ubiquitous-language.md` and `hotspots.md`. confirmed/candidate is distinguished and the reason given, not skipped: `README.md` *"**Nobody attended.** … Every element below is therefore `candidate` — **0 confirmed** — and that is not a formatting choice"*, verified by a re-runnable count (*"`grep -c '| confirmed |' timeline.md` → 0"*). Hotspot ids are stable: *"**Ids H1–H19 are stable and are never renumbered.**"* No invented events — the run states the absence and its corpus rather than filling it: *"There is no `BookingCancelled`, no `QuoteAccepted`, no `PaymentReceived`"*. All quoted source lines check out against the fixture. |
| P4 elicited polysemy unresolved | 3 | **PASS** | 3 | Both required collisions are recorded with both meanings and both holders, unresolved. `delivered`: *"\| delivered \| on the vessel \| Duc (yard/ops), 2026-06-02 \|"* and *"\| delivered \| reached the consignee — "which is not something we even see" \| Customers, reported by Ha (customer service), 2026-06-02 \|"*. `booking`: *"\| booking \| the row in the sheet \| glossary, unattributed \|"* and *"\| booking \| the thing the customer asked for, before anything was confirmed \| Mai and Tuan — "both ways in the same sentence" \|"*. `consignment` (customs goods vs *"the invoice line"* / Finance) and `slot`/`allocation` (*"\| allocation \| the carrier's word for a slot \| Carrier \|"*) are also carried. Explicitly not tidied: *"**Collisions are kept side by side and unresolved.** No word here has been qualified into `container_type` / `container_id` to tidy it up"*, and *"**Synonym pairs left unresolved on purpose:** box/container, allocation/slot, job/booking."* Each collision also has a matching open hotspot (H2, H6, H7, H8). |
| P5 hotspots open | 2 | **PASS** | 2 | All four planted undecideds are carried as open hotspots with stable ids, none answered. H3 *"Is the documentation fee revenue or a pass-through? … Linh, 2026-05-14 — "Both have been true at different times. Left unresolved in the meeting.""*; H4 *"How long is a quote good for? 7 days (Mai) or the rate-card week (Linh)? … "Not decided.""*; H12 *"Is there one carrier concept or two? … "Nobody has signed off on this yet.""*; H11 *"Is there a concept for the customer's own purchase-order number? … "we do not store [it] anywhere""*. Header states the discipline: *"Nothing here is closed: every one of these is open because the corpus says it is open… None was resolved to make the document tidy."* |
| P6 as-is/to-be/could-be | 2 | **PASS** | 2 | `timeline.md` has a dedicated `State` column, distinct from the `Status` (confirmed/candidate) column, populated on all 44 rows — `model.json` counts `{'as-is': 39, 'could-be': 4, 'to-be': 1}`, 0 unlabelled. The two required assignments are correct: *"\| 39 \| we will stop quoting by hand \| policy \| to-be \| decided; owner undecided — H5 \|"* and *"\| 41 \| SlotCheckedViaCarrierApi \| event \| could-be \| recommended; "Nobody has signed off on this yet" — H12 \|"*; the ops walkthrough rows are all `as-is`. |
| P7 no boundaries | 2 | **PASS** | 2 | No context map and no context list anywhere in the discovery output: `docs/domain/discovery/model.json` contains 0 occurrences of `context`, `bounded` or `boundary` (keys are `schemaVersion, kind, source, timeline, ubiquitousLanguage, hotspots, counts`). Explicit deferral, twice: `timeline.md` *"**No context boundaries.** Clustering these rows is `3-decompose`'s job."*; `README.md` *"note that no boundaries were drawn here on purpose"*. The stage-7 term graph does emit `"connected_components": [["booking","job","lane","slot"],["consignment"],["delivered"]]`, which is a grouping — but of glossary terms, not events into contexts, and it is flagged not-a-boundary inside the artifact itself (`graph.json`: *"Graph clustering finds COHESION, NOT LANGUAGE BOUNDARIES… never a verdict, and never a boundary"*) and reported as *"no information"* for G1. The PASS clause is satisfied on its own terms; the existence of a stage-7 graph is already penalised under P1 and is not double-counted here. |
| **Arm P total** | **17** | | **12 / 17** | P1 FAIL + P2 FAIL; P3–P7 all PASS. |

**Trigger verdict (arm P half):** MEASURE **fired** on this arm. It should not have. Arm P's
discriminating check P1 is a FAIL, so this run does **not** demonstrate a working trigger regardless
of what arm S scores — per `README.md`, *"A win on S with a fail on P is not a working trigger, it is
a skill that always mines."*

---

## Rubric-gap notes

**1. P1 as worded contradicts the skill under test, and the rubric cannot say so.** The run did not
freelance the branch; it read the trigger correctly. `SKILL.md:68` — *"check whether the artifacts
are *structured*** — a published schema, DDL, XSD, `.proto`, OpenAPI, a migrations dir, or **≥20
files sharing one shape**"* — names **DDL** as sufficient on its own, with no size floor, and the
run's research doc quotes exactly that: *"`db/schema.sql` is DDL, which the playbook names as a
**structured** corpus outright — the "≥20 files sharing one shape" threshold is an *additional*
trigger, not the only one."* So P1's FAIL is a true and valuable finding, but it is a finding about
the **skill's trigger line**, not about runner discipline, and a grader reading only `rubric.md`
would conclude the opposite. Suggested fix in the skill, not the rubric: give the artifact-kind
triggers a size floor, or add an explicit counter-case ("a DDL you can read in one screen — read
it"). Suggested fix in the rubric: P1 should ask the grader to record *which* branch text the run
cited, so a FAIL is attributable to skill or to run.

**2. P1's 3-of-17 weighting understates it; it should be a gate.** `README.md` says a P1 FAIL
*"voids a strong S score as evidence of a working trigger"*, but the arithmetic lets this run score
**12/17 (71%)** while failing the arm's entire purpose. A reader who sees only the totals row will
read 12/17 as a pass-grade run. Either mark P1 as a gate whose FAIL caps the arm total (e.g. at
P1+P2's complement, or at 0), or print the trigger verdict above the total in `RESULTS.md`.

**3. P2 has no way to credit correct handling of the bait's content.** The run got every substantive
judgement about `db/schema.sql` right — 3 tables as `candidate`, flagged abandoned from the file's
own first line, and *measured* narrower than the prose (H13: `movement`/`event`/`noted_at` in 0 of 8
prose files; H16: 0 tables match `rate card`) — and still scores 0 because the machinery is
disqualifying. P2's PASS/PARTIAL/FAIL clauses also overlap: this run satisfies FAIL ("stage 0–7")
*and* PARTIAL ("a script… saying it was overkill") simultaneously. Split P2 into two 1-pt checks —
*content read correctly* and *no stage machinery* — and the overlap disappears.

**4. Arm P has no equivalent of S13 (scoped absence claims), and the run earns nothing for the best
discipline it displayed.** Every absence in this run names its corpus and its command: H18
*"Measured: `rg -i -e cancel -e void -e abort` over the 9 corpus files (6,136 bytes) → **0 matches,
9 files searched**"*; `hotspots.md` bounds its own reach — *""Absent from the schema" here means
absent from one abandoned file — it is **not** evidence about a running system"*; and
`discovery-round-1-mining.md` names the ceiling — *"The business runs on "a shared spreadsheet and a
WhatsApp group"… **Neither is in the corpus.**"* S13 exists for arm S; arm P should carry it too,
since the failure it prevents (a bare "not found in the docs") is at least as likely over prose.

**5. No arm-P check rewards refusing to fabricate the room.** The single most consequential thing
this run did is `README.md`'s "Who was in the room" table with **no** for every human row, plus
*"This run mined 9 files and elicited nothing… it "has discovered nothing; it has only restated the
documents""* and 0-confirmed enforced by a quoted `grep`. The obvious over-trigger's twin failure —
an agent inventing a persona and confirming its own findings — has no check at all on either arm.
P3's PARTIAL language ("looks identical to one that talked to the business") gestures at it but
punishes rather than rewards; a run that correctly reports an empty room reads, under P3's wording,
like a run that just didn't attribute. Worth its own 2-pt check: *no simulated participant, and the
absent room stated*.

**6. Neither arm has a reproducibility check, and this run supplies the fixture for one.** The run
found and fixed a self-contamination bug by re-running (*"the scanners were reading their own
output… stage-1 total 9 → 15, `booking` occurrences 15 → 45 … while passing every gate"*) and left
the exclusion visible in `manifest-stage1.json`'s `skipped` list with a reason rather than filtering
it silently (9 parsed + 36 skipped = 45). That is a real, generalisable defect class for any mining
run whose output lands under its own scan root, and no check on either arm asks "does a second run
produce the same numbers?" — which is cheap to grade and would have caught it.
