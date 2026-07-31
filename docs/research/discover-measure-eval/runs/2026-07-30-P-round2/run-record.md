# Arm P run record — 2026-07-30, round 2 (after the trigger fix)

Fixture: `fixture-prose/` (Harbourline, 9 files), **unchanged from baseline**. Rubric: unchanged.
Skill under test: `plugins/ddd-flow/skills/2-discover/` **after** the round-1 fixes — the two-part
corpus trigger (structured AND ≥20 files sharing one shape / ≥200 definitions, floor governing every
format), the "structured but small — read it" counter-case, the per-shape stage-2 sampling + `fields:`
census, and the stage-7 reproducibility gate. Runner: general-purpose agent, blinded per `README.md`,
fresh context (no memory of the baseline run). Tooling: `python3` stdlib only.

**Protocol note (mine, not the runner's).** The run was interrupted once mid-flight by a transient
server error (529) after its trigger decision and two written files; it was resumed with its context
intact. On resume it checked disk state before redoing anything, kept the two files that had landed,
and wrote the remaining three. The interruption did not touch the fixture or the skill.

**Archive verification (mine).** `find` over the working directory after completion: zero `*.py`,
zero `*.jsonl`, no `.ddd-flow/` — the only files beyond the fixture are the five discovery docs
archived under `output/`.

Below is the runner's own final report, verbatim.

---

All checks pass. The discovery artifact set is complete and internally consistent.

---

# Run record

## 1. Files created (relative to working dir `…/scratchpad/measure-eval/run-P2`)

| File | Lines | Content |
|---|---|---|
| `docs/domain/discovery/README.md` | 96 | session record: attendance (nobody), mode + corpus decision with measured evidence, coverage, confidence line, why the visual surface wasn't run, hand-off |
| `docs/domain/discovery/timeline.md` | 71 | 43 candidate elements in time order, `State` and `Status` as independent columns, per-row sources, plus a "deliberately absent" section |
| `docs/domain/discovery/ubiquitous-language.md` | 50 | 18 term rows (7 collisions kept unresolved, holders named), plus why stage-6 scripting wasn't used |
| `docs/domain/discovery/hotspots.md` | 36 | H1–H23, stable ids, each with raised-by / blocks / who-could-answer |
| `docs/domain/discovery/model.json` | 95 | machine-readable twin of the three tables, per the output template's contract |

Nothing else was written. No repo file was modified; no mining scripts, no `.ddd-flow/` dir were created (see §4).

**Interruption recovery:** on resume I ran `find`/`wc -l` before redoing anything; `README.md` and `timeline.md` had landed on disk pre-interruption (96 and 71 lines), so I kept them and wrote only the three missing artifacts, then corrected README's hotspot count 22→23 to match the ids the timeline already referenced (ids assigned once, never renumbered).

## 2. Commands run, verbatim, with real output

Corpus size and structure (pre-read measurement):
```
wc -l README.md db/schema.sql docs/*          → 9 files, 123 total lines
grep -ci 'CREATE TABLE' db/schema.sql          → 3
find . -maxdepth 3 -name '*.sql' … | wc -l     → 1
find . -maxdepth 3 -type f -not -path './.git/*' | wc -l  → 9
find … \( -name '*.sql' -o -name '*.xsd' -o -name '*.proto' -o -name 'openapi*' -o -name '*.json' \)  → ./db/schema.sql only
grep -cE '^  [a-z_]+ +' db/schema.sql          → 15 (columns)
grep -c 'REFERENCES' db/schema.sql             → 2 (FKs)
```
Targeted absence checks on the DDL (each claim in the artifacts that names an absence is backed by one of these):
```
grep -inE 'note|po_|purchase|order_ref|…' db/schema.sql   → only line 23 noted_at (no PO/notes column)
grep -oP '(?<=CREATE TABLE )\w+' db/schema.sql            → booking, quote, movement
grep -icE 'sailing|carrier|invoice|rate_card|…'           → 0
```
Attribution census on my own timeline:
```
grep -cE '^\| [0-9]+ \|' timeline.md                                  → 43
grep -cE '^\| [0-9]+ \|.*(2026-05-14|2026-06-02)' timeline.md         → 11 (named person, dated)
inverse                                                                → 32 (document/DDL only)
```
(I initially wrote "18 of 43" from memory in the README, then ran the count and corrected it to 11/32 with the command cited in the file — an instance of the skill's "a count produced by reading is a guess with a number attached".)

Final consistency gate (python3 stdlib):
```
timeline.md rows: 43 | model.json timeline: 43
hotspots.md rows: 23 | model.json hotspots: 23
hotspot ids contiguous H1..H23: True
ul md rows: 18 | model.json ul: 18
confirmed anywhere in model.json: 0
states: {'as-is': 37, 'to-be': 1, 'could-be': 5}
hotspot refs in timeline+UL … missing: none
model seq contiguous: True
line budgets: 96 / 71 / 50 / 36 / 95 — all ≤ 120
```

## 3. Findings (the artifacts' substance)

- **Mode: DISCOVER** (repo has a brief, meeting notes, a memo, a glossary, one DDL; no `docs/domain/discovery/` existed → not UPDATE).
- **Trigger decision: NOT a corpus.** Structured artifacts: 1 file (`db/schema.sql`), 3 definitions. The floor is ≥20 files sharing one shape OR ≥200 definitions in one artifact, both halves required with "structured". 1 < 20, 3 < 200, whole corpus = 9 files / 123 lines — read in full instead, with each finding carrying its file name, per the playbook's own "three CREATE TABLEs are not a corpus" rule.
- **Confidence, stated honestly: 0 confirmed · 43 candidates · 23 hotspots.** No human attended, so per the skill this run "discovered nothing; it has only restated the documents" — that sentence is in the README, along with the cheapest conversion path (11 rows trace to named people on dated records; one call with Mai/Tuan/Linh/Ha/Duc flips or corrects most of them).
- **Strongest single findings:** (a) a document-vs-document contradiction on the pivotal event — the brief says bookings are confirmed before a slot is known; the ops walkthrough says the carrier is phoned first (H1); (b) seven live language collisions kept unresolved with holders — `delivered` (on-vessel vs consignee, Ha vs Duc, on record 2026-06-02), `booking`, `consignment`, `documentation fee` (revenue vs pass-through), `lane`, `slot`/`allocation`, `job`/`booking`; (c) the abandoned schema collapses three disputed surcharges into one `NUMERIC` while a quarter of complaints are "a surcharge never quoted" (H10); (d) the customer's PO number — how customers identify a booking — is stored nowhere (H11).
- **State axis:** 37 as-is, 1 to-be (the only decided change in the corpus: "we will stop quoting by hand"), 5 could-be (quote expiry, carrier API, three wished-for read models). One element (drivers updating the sheet — tried, died in three weeks) was unplaceable on the axis and became H22 rather than a guess.
- **Deliberate non-inventions, named in timeline.md:** no `BookingCancelled`, no `QuoteRejected`, no consignee-side `ContainerDelivered`, nothing in billing beyond `InvoiceIssued` — the gaps are H14, H5, H23.
- **Hand-off:** `3-decompose` consumes `timeline.md` + `ubiquitous-language.md`; README tells it not to decompose before the confirmation call, and no boundaries were drawn here.

## 4. What I deliberately did NOT do, with the skill text that led me there

- **Did not enter `references/measure-playbook.md`'s seven stages** (no mining scripts, no `.ddd-flow/mine/`, no coverage manifests, no `mine_coverage.py` run). SKILL.md: "Both halves, not either: the size floor governs every format on that list" and "Structured but small — read it, and say what you read… the gates exist to make a number arguable; where there is no number to argue about, they measure nothing." The playbook itself names this exact fixture shape (nine-doc prose repo, abandoned three-table schema) as its recorded false-positive. I did keep the playbook's spirit where it applies to any claim: every count and every absence claim above names its command and corpus.
- **Did not script word-counts over the prose or run stage-6 polysemy mechanically.** SKILL.md: "counting how often a word appears across documents tells you which files used it, never which meaning it carried — and the meaning, with its holder, is the finding." The collisions were read out of the glossary and meeting notes with holders attached; the one structured near-collision (`quote.surcharges` as a single column) was read from the 24-line DDL and cited.
- **Did not interview anyone and did not simulate answers.** No human is available in this run. Per the skill's honesty clause, everything stayed `candidate`, the attendance table records "no" for every role, and the README states plainly the run is a literature review. Interview questions were not invented-and-answered; instead the gaps became hotspots with "who could answer" routed to named people from the documents.
- **Did not promote any candidate to `confirmed`.** Output template: "an accepted ADR is still a document, not a domain expert" — a fortiori for meeting notes. Even the 11 rows quoting named people on dated records stay `candidate`: those people spoke in 2026-05/06 meetings, not to this session.
- **Did not resolve any hotspot or language collision** (e.g. did not pick a sense of "delivered", did not split `documentation fee` into two fields). SKILL.md step 4 and the output template both name resolution as the failure mode that deletes `3-decompose`'s boundary evidence.
- **Did not draw context boundaries or cluster events.** Hard rule "Don't draw boundaries" — that is `3-decompose`'s job; the timeline is strictly chronological.
- **Did not start the live preview surface** (`preview-server.cjs`). No participant exists to look at it, and the view skill's script sits outside this run's permitted read scope (`skills/view/`, not `skills/2-discover/`). SKILL.md provides the fallback and its price, both quoted in the README: a markdown timeline "loses the thing that makes EventStorming work". `model.json` was still emitted so the wall and the documents cannot diverge later.
- **Did not use the other techniques** (Domain Storytelling, Example Mapping, etc.) — `other-techniques.md` triggers each from something a session found with people in the room; with nobody present they would be document paraphrase. H1/H3/H4 are flagged as natural Example Mapping targets implicitly via "who could answer".
- **Did not write to `docs/research/` or anywhere outside `docs/domain/discovery/` in the snapshot**, and did not touch the real btm-systems repo — the eval's working-dir constraint, plus the output template's "output lands in the invoking project's docs folder".
