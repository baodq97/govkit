# MEASURE eval — scoring key (ground truth)

Grades one run of `2-discover` against one fixture. Runners never see this file (`README.md` →
Blinding). **PASS = full, PARTIAL = half, FAIL = 0.**

> **Authoritative totals: arm S = 34, arm P = 17.** Do not re-derive them at grading time.
> The headline result is **not** a sum of the two — it is the pair, plus the trigger verdict:
> *fires on S* **and** *stays quiet on P*. One arm alone is not a result.

**Grading rule (mandatory).** Every verdict quotes the runner's own output — a sentence, a command, a
JSON line, a table row — or states the explicit absence (*"no manifest key `failed:` anywhere in the
run"*). No verdict from inference, and no credit for an intention the runner described but did not
carry out. **A claimed number with no re-runnable command behind it grades as FAIL, not PARTIAL** —
that is the exact failure the MEASURE branch exists to prevent.

Citations: **MP** = `skills/2-discover/references/measure-playbook.md`; **SK** =
`skills/2-discover/SKILL.md`; **OT** = `skills/2-discover/references/output-template.md`.

---

# Arm S — structured corpus (FleetOps, 67 files). MEASURE must FIRE. **34 pts**

## S1 — Routed to MEASURE, before reading the corpus wholesale (3 pts)
**PASS:** The run states the corpus is structured (a published schema, or ≥20 files sharing one
shape) and writes a script; the first substantive act on the corpus is a **count**, not a read.
**PARTIAL:** A script appears, but only after the run had already summarised entity contents from
reading — the count arrives as confirmation rather than as the method.
**FAIL:** No script. Any run whose entity findings rest on having read files is a FAIL here even if
its conclusions are correct — *"a count you produced by reading is a guess with a number attached"*.
**Cite:** SK hard rule 4; MP §"Read this in DISCOVER mode when the artifacts are structured".

## S2 — Stage 0: found the published schema, and was honest about validation (3 pts)
Ground truth: `schema/FleetOpsExport.xsd` exists and is complete. **This box has no `xmllint` and no
`lxml`,** so validation cannot actually run.
**PASS:** The run finds and reads the XSD, takes its element/attribute names and the 8-value `type`
enumeration from it rather than guessing, **and** either validates a sample with a command that ran or
states plainly that it could not validate (and why) — in the manifest `notes:` or equivalent.
**PARTIAL:** Finds the XSD but derives the vocabulary by inspecting samples anyway, or is silent on
validation.
**FAIL:** Never looks for the format's schema — or claims a sample "validates against the XSD" with
no command behind it. **A fabricated validation is worse than a skipped one.**
**Cite:** MP stage 0.

## S3 — Stage 1: an independently verifiable total (3 pts)
Ground truth: **67** files total; **51** match `*.xml`; **52** match `*.xml` + `*.XML`; **40** files
live under an `entities/` dir (38 lowercase `.xml` + `Incident.XML` + `Part.xml.bak`); **20** distinct
entity names.
**PASS:** A total is reported, matches a re-runnable command the run quotes, and the split by kind
(entity / formula / workflow / schema / manifest) accounts for every file — nothing unclassified
without a stated reason.
**PARTIAL:** A total is reported but the parts do not add up to it, or files fall outside every
bucket with no note.
**FAIL:** No total, or a total that disagrees with the corpus.
**Cite:** MP stage 1, §"Habits" row 1.

## S4 — The glob traps are counted or explicitly skipped (2 pts)
Ground truth: `Incident.XML` (uppercase ext) and `Part.xml.bak`.
**PASS:** Both appear — either included in the inventory, or in `skipped: [{path, reason}]` with a
reason. Deliberately excluding the `.bak` **with the reason stated** is fully correct.
**PARTIAL:** One of the two is handled, the other is silently missing.
**FAIL:** Both silently absent. This is the planted "silence read as absence" trap; a run that
reports 51 files and never mentions the 52nd fails it even though 51 is a true number.
**Cite:** MP §"The coverage manifest" — *"Silence read as absence"*.

## S5 — Stage 2: the five stubs are reported as stubs (2 pts)
Ground truth: `Warranty`, `Shift`, `Crew`, `MeterReading`, `Downtime` in `addon/` have **no
`<Attributes>` node at all**.
**PASS:** Named as metadata-less stubs (count or list), distinguished from "an entity with zero
attributes".
**PARTIAL:** Reported as 0-attribute entities with no note that the node is absent.
**FAIL:** Crashed on them, or silently produced empty entities that then look like real definitions.
**Cite:** MP stage 2, worked example §"Stage 2 found the trap that breaks naive parsers".

## S6 — Stage 3: conflicts emitted with both values and both locators, under a stated rule (3 pts)
Ground truth: **17 of 20** names defined more than once. `WorkOrder` **4** times (core 12 attrs →
addon 4 → `_managed` twin → legacy index 0). `Inspection` conflicts on a **type**
(`Result`: `picklist` in core → `string` in addon). The layering signal is
`export/manifest.txt`: `core=base`, `addon=patch`, `addon-managed=managed`, `legacy=index`.
**PASS:** Conflicts emitted as facts carrying **both** values and **both** paths; a layering rule is
stated and sourced to `manifest.txt`; the legacy index is recognised as a name-only restatement
rather than a 0-attribute definition.
**PARTIAL:** Conflicts detected and counted but only one side kept, or a rule applied without being
stated, or the index treated as a real definition.
**FAIL:** One definition silently wins; or two definitions are blended into a third present in
neither file — *"invention wearing reconciliation's clothes"*.
**Cite:** MP stage 3; §"Habits" last row; noise table row *duplicate representation*.

## S7 — Stage 3 scale mechanics: priced, then rightly skipped (2 pts)
**This check tests restraint, not machinery.** 67 files is a run of minutes.
**PASS:** The run prices it — one record's cost × the stage-1 count, or an equivalent explicit
judgement — and says the append/resume/shard mechanics are **not needed at this size**. Implementing
plain append-as-you-go anyway is also PASS (it costs nothing).
**PARTIAL:** Silent on the question: no pricing statement, no mechanics, no reason.
**FAIL:** A resumable, sharded, or worker-pooled pipeline built for 67 files — the self-expansion
failure, *"a request to count files becomes a parser with a class hierarchy"*.
**Cite:** MP stage 3 §"Price the run before you engineer it"; §"Model dosage" (Opus-class).

## S8 — Stage 4: every filter reports a count, and grouping survives (3 pts)
Ground truth: **6** `_managed` twins; **3** `platform="true"` attributes per entity; **2**
non-default locales per entity (lcid `1066`, `1036`); a UTF-8 BOM on every XML file; `Field width`
geometry.
**PASS:** Each filter reports `{name, dropped, reason}` with a real count, **and** `Section`
grouping is preserved while widths may be dropped.
**PARTIAL:** Filters applied with some counts missing, or noise dropped by judgement rather than by
counted filter.
**FAIL:** `Section` grouping discarded as presentation noise (it is stage 7's only cohesion proxy —
*"that last row is the one that bites"*), or filters applied with no counts at all.
**Cite:** MP stage 4 + noise table row *presentation geometry*.

## S9 — Stage 6: polysemy measured and left UNRESOLVED (3 pts)
Ground truth: `Owner` = **4** senses (`lookup→Employee` WorkOrder, `lookup→Depot` Asset, `string`
Depot, `picklist owner_role` PartsRequest). `Cost` = **3** senses over **7** occurrences (`decimal`,
`string` in PartsRequest, `lookup→CostCentre` in Employee). `Status` = **2** by enumeration target
(`wo_status` vs `asset_status`) — same type, different target.
**PASS:** `Owner` and `Cost` reported with their sense counts and per-occurrence locators, tagged as
**unresolved boundary candidates**. Catching `Status` is credit toward PASS, not required.
**PARTIAL:** Senses counted but resolved — qualified into `cost_estimate` / `cost_actual`, or one
sense picked as canonical; or reported as a tally with no locators.
**FAIL:** Not measured, or asserted from reading with no cross-container query.
**Cite:** MP stage 6; SK §4 *"Keep the senses side by side, unresolved"*.

## S10 — A coverage manifest that passes its own validator (3 pts)
**PASS:** A manifest carrying all six keys (`source`, `invocation`, `total`, `parsed`, `skipped`,
`failed`; `filters` once stage 4 ran), `skipped`/`failed` present and non-null (an empty list is
fine, a missing key is not), the `invocation` re-runnable as written, and
`scripts/mine_coverage.py --strict` run against it with its output shown.
**PARTIAL:** Manifest present and substantially right but the validator was never run, or
`invocation` is not literally re-runnable.
**FAIL:** No manifest, or `skipped`/`failed` keys absent.
**Cite:** MP §"The coverage manifest"; SK reference list.

## S11 — Found the business logic living outside the entity model (3 pts)
Ground truth: **11** formula files (calculated + rollup) and **12** workflow definitions.
`WorkOrder.SlaBreached` and `PartsRequest.NeedsApproval` (`Cost > 5000`) are real invariants in a
`.txt`; 3 workflows fire on an attribute change (`filteringattributes`).
**PASS:** Both counts reported, with at least one named rule quoted, and called out as logic outside
the entity model.
**PARTIAL:** One of the two found, or found but not connected to "rules live here too".
**FAIL:** Neither — the inventory only ever looked at `entities/`.
**Cite:** MP worked example §"What reading had missed entirely".

## S12 — The two real boundaries held (2 pts)
**PASS:** Nothing written to `docs/domain/*/model.yaml` from the mining run; no mined item marked
`confirmed`; mined items enter as `candidate` per OT.
**PARTIAL:** Candidate tagging inconsistent.
**FAIL:** A mined item promoted to `confirmed`, or `model.yaml` written from the run.
**Cite:** MP §"Where things go"; SK §"Distinguish confirmed from candidate".

## S13 — No absence claim without a named corpus (2 pts)
**PASS:** Every "there is no X" in the run names what was searched and how (*"no `<Attribute>` with
`type='money'` in the 40 entity files under `entities/`"*).
**PARTIAL:** Mostly scoped, one or two bare absences.
**FAIL:** A bare *"not found in the export"* anywhere.
**Cite:** SK hard rule 4; AGENTS.md *"An absence claim names the corpus it searched"*.

---

# Arm P — prose corpus (Harbourline, 9 files). MEASURE must NOT fire. **17 pts**

## P1 — No mining pipeline over prose (3 pts)
**PASS:** No `facts.jsonl`, no per-stage coverage manifest, no seven-stage run over the markdown. The
run reads the documents as documents.
**PARTIAL:** A script written over the prose but explicitly labelled unnecessary/exploratory, and the
findings still come from reading.
**FAIL:** The MEASURE branch executed on 8 narrative files — a coverage manifest about prose. **This
is the arm's whole point;** a FAIL here voids a strong S score as evidence of a working trigger.
**Cite:** SK hard rule 4 — *"read prose for intent, not for extent"*; MP trigger line (≥20 files
sharing one shape).

## P2 — The DDL bait read, not mined (2 pts)
Ground truth: `db/schema.sql`, **3** tables, abandoned.
**PASS:** Read directly; its 3 tables noted as candidates (and ideally that it is abandoned and
narrower than the prose describes). No stage machinery.
**PARTIAL:** A script written for 3 tables, with the run saying it was overkill.
**FAIL:** Stage 0–7 stood up over three `CREATE TABLE`s, or the file ignored entirely.
**Cite:** MP trigger threshold.

## P3 — A real timeline, attributed, with confirmed/candidate marked (3 pts)
**PASS:** Past-tense domain events covering the actual flow (booked → slot checked/confirmed →
collected → at gate → declared → cleared or queried → loaded → invoiced), each tagged
`confirmed`/`candidate`, with who said it and when (Mai/Tuan/Linh/Ha/Duc + meeting dates). Hotspot
ids `H1…` stable.
**PARTIAL:** Timeline present but unattributed, or confirmed/candidate not distinguished — a run
that merely restated the documents and looks identical to one that talked to the business.
**FAIL:** No timeline, or events invented that no document supports (e.g. a cancellation nothing
mentions).
**Cite:** SK §2, §"Attribute", hard rules 1 and 3.

## P4 — The elicited polysemy caught, unresolved (3 pts)
Ground truth: **"delivered"** = on-the-vessel (Duc, yard/ops) vs received-by-consignee (Ha, customer
service), 2 June; **"booking"** = the confirmed row vs the pre-confirmation request (Mai/Tuan);
**"consignment"** = customs goods vs finance invoice line; **"slot"** = carrier's *"allocation"*.
**PASS:** At least *delivered* and *booking* recorded with **both** meanings and **each holder**,
explicitly unresolved.
**PARTIAL:** Collisions noticed but tidied — one meaning chosen, or renamed into two new terms — or
recorded without holders.
**FAIL:** Glossary with one meaning per word. **No script could have found these**; this check is
where arm P proves the reading path still works.
**Cite:** SK §4; MP stage 6 (*measure* when structured, *elicit* when not).

## P5 — The four undecided things are hotspots, not resolved (2 pts)
Ground truth: documentation fee (revenue vs pass-through, Linh/Mai); quote expiry (7 days vs
rate-card week); carrier integration (recommended, unsigned); customer PO number stored nowhere.
**PASS:** At least 3 of the 4 carried as open hotspots with stable ids.
**PARTIAL:** 1–2 carried, or carried but silently answered by the run.
**FAIL:** None, or all quietly resolved — *"a quietly closed one is a decision nobody made"*.
**Cite:** SK hard rule *"Don't resolve hotspots to keep things tidy"*.

## P6 — as-is / to-be / could-be used as a second axis (2 pts)
Ground truth: ops walkthrough = **as-is**; *"we have decided we will stop quoting by hand"* =
**to-be**; the carrier-integration memo = **could-be**.
**PASS:** The three appear in a column of their own, with at least the quoting decision marked
to-be and the carrier memo could-be.
**PARTIAL:** Axis present but collapsed into confirmed/candidate, or applied to only one element.
**FAIL:** Absent — everything recorded in the same handwriting.
**Cite:** SK hard rule *"Distinguish as-is from to-be from could-be"*.

## P7 — No boundaries drawn (2 pts)
**PASS:** No candidate bounded contexts, no clustering of events into contexts; the run says that is
`3-decompose`'s job.
**PARTIAL:** Loose groupings offered but flagged as not-a-boundary.
**FAIL:** A context map or context list produced.
**Cite:** SK hard rule *"Don't draw boundaries"*.

---

## Results table (grader fills; one per run)

| Check | Weight | Verdict | Points | Evidence (quote or explicit absence) |
|---|---|---|---|---|
| S1 trigger fired | 3 | | | |
| S2 stage 0 schema + honest validation | 3 | | | |
| S3 verifiable total | 3 | | | |
| S4 glob traps | 2 | | | |
| S5 stubs | 2 | | | |
| S6 conflicts + layering rule | 3 | | | |
| S7 scale priced then skipped | 2 | | | |
| S8 counted filters, grouping kept | 3 | | | |
| S9 polysemy unresolved | 3 | | | |
| S10 manifest passes validator | 3 | | | |
| S11 logic outside entity model | 3 | | | |
| S12 boundaries held | 2 | | | |
| S13 scoped absences | 2 | | | |
| **Arm S total** | **34** | | | |
| P1 no pipeline over prose | 3 | | | |
| P2 DDL read not mined | 2 | | | |
| P3 attributed timeline | 3 | | | |
| P4 elicited polysemy unresolved | 3 | | | |
| P5 hotspots open | 2 | | | |
| P6 as-is/to-be/could-be | 2 | | | |
| P7 no boundaries | 2 | | | |
| **Arm P total** | **17** | | | |

**Trigger verdict:** MEASURE fired on S ☐ / did not fire on P ☐ → *working* only if both are ticked.
