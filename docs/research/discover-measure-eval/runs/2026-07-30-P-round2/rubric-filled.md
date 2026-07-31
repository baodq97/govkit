# Rubric — filled. Run: 2026-07-30-P-round2 (arm P only)

Graded 2026-07-30 against `rubric.md` arm P (P1–P7, 17 pts). Artifacts graded, not the self-report;
every count in the run record was re-checked against `output/` with the commands listed at the bottom.

| Check | Weight | Verdict | Points | Evidence (quote or explicit absence) |
|---|---|---|---|---|
| P1 no pipeline over prose | 3 | PASS | 3 | Grader-verified absence: `find output/ -type f` returns exactly 4 `.md` + 1 `.json` (README, timeline, ubiquitous-language, hotspots, model.json) — no `facts.jsonl`, no `*.py`, no coverage manifest, no `.ddd-flow/` anywhere under `output/`. The only occurrences of the strings "coverage manifest" / ".ddd-flow" in the output are denial sentences: README.md L52 "So the playbook was **not** entered: no mining scripts, no `.ddd-flow/mine/`, no coverage manifests." Findings come from reading: every timeline row's Source column names a fixture file or a named person + date. The commands the run did quote (`wc -l`, `find … | wc -l`, `grep -c 'CREATE TABLE'`) are the trigger measurement ("The corpus was measured and is not a corpus", README.md L42), not a stage run over the markdown. |
| P2 DDL read not mined | 2 | PASS | 2 | Read directly, all 3 tables as candidates: timeline rows 42–43 "Booking \| aggregate \| … \| db/schema.sql `booking` (6 columns)", "Quote \| aggregate \| … \| db/schema.sql `quote` (5 columns)"; `movement` enters at row 27 ("db/schema.sql `movement(event, noted_at)` — see H16"). Abandoned + narrower-than-prose both caught: timeline.md L70–71 "`db/schema.sql` is prefixed 'The spreadsheet replacement someone started and abandoned' — its three tables are candidate evidence of intent, not of a running system"; H10 "the abandoned schema collapses three surcharges into one `NUMERIC` (`quote.surcharges`)". No stage machinery over it — only one-line greps for the trigger decision (`grep -c 'CREATE TABLE' db/schema.sql → 3`, "3 < 200") and scoped absence checks; no script file exists in `output/`. |
| P3 attributed timeline | 3 | PASS | 3 | 43 rows (grader re-counted: 43 in timeline.md, 43 `seq` entries in model.json) covering the whole flow: BookingRequested(12) → SlotAvailabilityChecked(17)/SlotAvailabilityConfirmed(20) → BookingConfirmed(21) → ContainerCollected(25) → ContainerArrivedAtPortGate(26) → CustomsDeclarationSubmitted(28) → CustomsQueryRaised(30) → ContainerLoaded(33) → InvoiceIssued(35). Every row tagged: "**0 confirmed, 43 candidates**" (timeline.md L3), 0 occurrences of `"status": "confirmed"` in model.json (grader-verified). Attribution present per row, e.g. row 1 "Mai, 2026-05-14", row 39 "Ha, 2026-06-02", and audited by the run itself: "11 of the 43 timeline rows trace to a *named person speaking on a dated record*… counted with `grep -cE '^\| [0-9]+ \|.*(2026-05-14\|2026-06-02)' timeline.md` → 11" (README.md L28–31). Hotspot ids stable: "Ids H1–H23 are stable: future rounds add, never renumber" (hotspots.md L3). No invented events — grader checked each event against the fixture; the tempting inventions are explicitly refused: "No `BookingCancelled`, no `QuoteRejected`, no `ContainerDelivered`(consignee sense). Nothing in the corpus says these occur." (timeline.md L63–64). |
| P4 elicited polysemy unresolved | 3 | PASS | 3 | Both required collisions with both meanings and holders: "delivered — the box is on the vessel — Duc (yard), operations" vs "delivered — the goods have reached the consignee — customers, via Ha (customer service)" (ubiquitous-language.md L15–16, sourced "Ha, 2026-06-02" / "Duc, 2026-06-02", "'Nobody picked one.' (H5)"); "booking — the row in the sheet — staff (sheet practice)" vs "booking — the thing the customer asked for, before anything was confirmed — Mai, Tuan — 'both ways in the same sentence'" (L10–11). consignment (customs goods vs finance invoice line, L13–14) and slot/allocation ("the carrier's word for a slot", L17–18) also carried. Explicitly unresolved: "Colliding senses are kept side by side, deliberately unresolved — the collision is the boundary signal `3-decompose` needs, and qualifying the words apart here would delete it" (L3–5). Matches the fixture glossary and 2 June notes verbatim (grader-checked). |
| P5 hotspots open | 2 | PASS | 2 | All 4 of 4 carried as open hotspots with stable ids, none answered: H3 "Is the documentation fee revenue or a pass-through? 'Both have been true at different times.' — Linh vs Mai"; H4 "How long is a quote good for — 7 days, or the rate-card week? — Mai vs Linh, 2026-05-14"; H9 "Do we integrate with the API carrier? Recommended, not signed off. — 'Nobody has signed off on this yet'"; H11 "Where does the customer's PO number live? Not stored anywhere; kept 'in the notes column when they remember'." Header states the rule: "None is resolved here — an open hotspot is a finding; a quietly closed one is a decision nobody made." (hotspots.md L3–4). |
| P6 as-is/to-be/could-be | 2 | PASS | 2 | A column of its own, kept independent of evidence status: "`Status` is evidence, `State` is time; they are independent columns" (timeline.md L3–4). Quoting decision marked to-be: row 15 "QuoteCalculated (not by hand) \| event \| **to-be** \| … 'We have decided we will stop quoting by hand' — the only decided change in the corpus". Carrier memo marked could-be: row 19 "Carrier — published booking API \| external-system \| **could-be** \| … 'Nobody has signed off on this yet'". Ops walkthrough rows all as-is. Distribution grader-verified in model.json: 37 as-is / 1 to-be / 5 could-be, matching the run record's claim. |
| P7 no boundaries | 2 | PASS | 2 | "**No context clusters.** Rows are in time order only. Grouping them is `3-decompose`'s job." (timeline.md L59); "**No context boundaries were drawn here**; that is `3-decompose`'s job, and the seven live term collisions in `ubiquitous-language.md` are the seams it should be looking at" (README.md L93–94). Grader-verified absence: no context list, no clustering, no `bounded`/`context map` structure anywhere in the five output files; model.json contains only `timeline`, `ubiquitousLanguage`, `hotspots`. |
| **Arm P total** | **17** | | **17 / 17** | |

**Trigger verdict (this arm):** MEASURE did **not** fire on P ☑ — correct behaviour for this arm. (Per
the rubric header, the headline result is the pair; this file scores arm P only.)

## Claims verified against artifacts vs taken on the record's word

**Verified independently by the grader (commands run against `output/` and the fixture):**
- 43 timeline rows: `grep -cE '^\| [0-9]+ \|' timeline.md` → 43; `grep -c '"seq"' model.json` → 43.
- 23 hotspots, contiguous H1–H23: `grep -cE '^\| H[0-9]+ \|' hotspots.md` → 23; `grep -c '"id": "H' model.json` → 23.
- 18 UL rows: `grep -cE '^\| [a-z]' ubiquitous-language.md` → 18; `grep -c '"term"' model.json` → 18; the 7 numbered collisions are in ubiquitous-language.md L31–42.
- 0 confirmed: `grep -c '"status": "confirmed"' model.json` → 0.
- States 37/1/5: `grep -oE '"state": "[a-z-]+"' model.json | sort | uniq -c` → 37 as-is, 1 to-be, 5 could-be.
- No mining artifacts: `find output/ -type f -not -name '*.md' -not -name '*.json'` → empty; `rg 'facts\.jsonl|mine_coverage|coverage manifest|\.ddd-flow' output/` hits only README.md's denial sentences (L52, L82).
- Fixture fidelity: db/schema.sql really is 3 tables with the "started and abandoned" comment; the glossary, both meeting notes, brief, memo, support digest and ops walkthrough contain every quote the artifacts attribute to them (delivered/booking/consignment/slot collisions, "Nobody picked one", "We have decided we will stop quoting by hand", "Nobody has signed off on this yet", the unstored PO number, the confirmed-before-slot pain #1).

**Taken on the record's word (not reconstructable from the archive):**
- The exact ephemeral commands the runner ran during the run (the `wc`/`find`/`grep` trigger measurements and the python3 consistency gate) — no scripts were archived, which is consistent with the claim they were one-liners, but the session transcript is not in the archive.
- The interruption-and-resume narrative (kept 2 files, wrote 3, corrected 22→23) — the end state is consistent with it (README says "23 open hotspots", ids contiguous), but the sequence itself is unverifiable.
- The operator's archive-verification note that the *working directory* held zero `*.py`/`*.jsonl` — the grader could verify only the archived `output/`, which holds none.

## Rubric-gap notes

1. **Negative-space discipline goes unscored.** The "Notes on what is deliberately absent" section
   (no `BookingCancelled`, no consignee-sense `ContainerDelivered`, billing left as H23 instead of
   invented rows) is the strongest anti-hallucination evidence in the run, and P3 only penalises
   invention — it gives no credit for *naming* the refusals.
2. **H22 exceeds P6 but earns nothing.** The driver-sheet practice ("tried, lasted three weeks") is
   honestly declared unplaceable on the three-state axis and parked as a hotspot instead of guessed.
   P6 checks the axis exists; it has no cell for handling an element the axis cannot hold.
3. **No arm-P twin of S13 (scoped absences).** This run backed absence claims with corpus + command
   ("counted with grep…", "no cut-off time appears anywhere in the corpus", the DDL PO-number grep),
   and even audited its own memory ("I initially wrote '18 of 43' from memory… then ran the count and
   corrected it to 11/32"). Arm P has no check that rewards or requires this.
4. **No check for the md/json twin staying consistent.** The run's final consistency gate
   (43/43, 23/23, 18/18, ids contiguous) is exactly the divergence-prevention the output template
   asks for, verified here by the grader — but no arm-P check scores it.
5. **No check for attendance honesty.** "this run discovered nothing. It is a literature review of
   nine documents with orange stickies on it" (README.md L24–25) is hard-rule-1 behaviour that arm P
   never measures; a run that silently posed as a real session could score identically on P1–P7.
6. **P3's example flow lists "cleared", which the fixture never states.** The ops walkthrough
   describes only the query branch; a run that emitted `CustomsCleared` to match the flow would be
   inventing. This run's omission of it is the faithful reading — the rubric's parenthetical could
   mislead a stricter grader into a deduction.
7. **The H1 contradiction (brief's confirmed-before-slot vs walkthrough's phone-first) — the arm's
   planted invariant-as-incident — has no dedicated check.** The run caught it and called it pivotal;
   the rubric only sees it incidentally if it happens to land in a P5 hotspot list, which it is not
   part of.
