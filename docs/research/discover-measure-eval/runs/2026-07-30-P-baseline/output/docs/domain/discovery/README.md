---
id: DOMAIN-DISC-0001
title: Harbourline — discovery session 2026-07-30
status: draft
owner: TBD
date: 2026-07-30
mode: discover
technique: eventstorming-big-picture
---

## Who was in the room

| Role | Present | Notes |
|---|---|---|
| Domain expert | **no** | nobody was available for this run |
| Real end user | **no** | no customer, no driver — the two roles the corpus most often speaks for |
| Product/strategy | **no** | product-brief.md is a document, not a person |
| Developers | **no** | the author of `db/schema.sql` is named nowhere in the corpus |
| Facilitator | agent | prepared the wall; cannot replace the room |

**Nobody attended.** This run mined 9 files and elicited nothing. Under the skill's own words it
"has discovered nothing; it has only restated the documents". Every element below is therefore
`candidate` — **0 confirmed** — and that is not a formatting choice: no person confirmed or
corrected a single item. The named people in the corpus (Mai · commercial, Tuan · operations,
Linh · finance, Ha · customer service, Duc · yard) are **quoted from meeting minutes**, which is an
artifact quoting a person, not a person in the room. Their names appear in the `Source` column as
attribution; they do not upgrade a row to `confirmed`.

## Coverage

Covered — the whole written corpus, gated by script (`.ddd-flow/mine/out/manifest-stage1.json`:
**9 source files, 9 parsed, 0 failed**, plus 36 paths skipped-with-a-reason because this run
generated them; 9 + 36 = 45 = every file on disk). Independent count of the source corpus:
`find . -type f -not -path './.ddd-flow/*' -not -path './docs/domain/*' -not -path './docs/research/*' | wc -l` → **9**.

- the as-is operational flow, enquiry → invoice (`docs/ops-walkthrough.md`)
- pricing and the rate card (`docs/meeting-2026-05-14-pricing.md`)
- tracking and visibility (`docs/meeting-2026-06-02-tracking.md`)
- the carrier-integration option (`docs/decision-memo-carrier-integration.md`)
- complaint themes (`docs/support-log-digest.md`) — the file itself says "Rough proportions, not counts"
- the abandoned DDL (`db/schema.sql`) — mined by script, 3 tables / 15 columns / 2 FKs / 0 CHECKs

Not covered, and who is needed:

| Gap | Who could close it |
|---|---|
| every event's truth — nothing was confirmed | Mai, Tuan, Linh, Ha, Duc |
| what happens after a box misses a sailing (H17) | Tuan, Ha |
| where a box is once it leaves the yard (H9) | Duc, and the **drivers**, who are quoted by nobody |
| what customers actually mean by "delivered" (H2) | a **real customer** — no end user has ever been asked |
| the carrier's side of slots/allocations (H12) | the two carriers |
| the broker's query loop (H17) | the customs broker |
| real complaint counts, not proportions (H15) | Ha, with the mailbox counted |
| whether `db/schema.sql` is a design anyone stands behind (H19) | its unnamed author |

## Confidence

**0 confirmed elements · 44 candidates still unconfirmed · 19 open hotspots.**

Counted, not estimated: `grep -cE '^\| [0-9]+ \|' timeline.md` → 44,
`grep -c '| confirmed |' timeline.md` → 0.

The honest reading: this is a literature review with orange stickies on it. It is a good starting
wall for a real session — the candidates and the 19 questions are what a facilitator would open
with — and it is not a discovery finding. `3-decompose` will be exactly as good as this was.

## How the numbers here were produced

`db/schema.sql` is DDL, which the measure playbook classifies as a **structured** corpus, so it was
inventoried and queried by script *before* being read, not summarised by reading. Scripts are in
`.ddd-flow/mine/` (they are the provenance of every count), L0 facts in `.ddd-flow/mine/out/`,
L1 in `.ddd-flow/mine/model/`, L2 reports in `.ddd-flow/mine/reports/`. Every stage emitted a
coverage manifest and **all 8 pass `mine_coverage.py --strict`**. The prose was read for intent, and its
*extent* was measured too (`reports/terms-census.json`, `reports/polysemy.json`) so the
ubiquitous-language table carries occurrence counts rather than impressions.

Full mining detail, unbudgeted: `docs/research/discovery-round-1-mining.md`.

## The wall

No browser surface was started. Two reasons, both stated rather than worked around: there were no
participants to watch it, and this run was scoped to read only the `2-discover` skill directory, so
the preview server under `skills/view/` was out of scope. `model.json` is written in the shape that
surface renders, so a facilitator can start it and get the wall with no rework. What is lost by
falling back to markdown is real: everyone seeing the same wall change at the same moment is the
mechanism EventStorming works by, and a text timeline does not reproduce it.

## Next step

`3-decompose` consumes `timeline.md` and `ubiquitous-language.md`. Before it runs, note that no
boundaries were drawn here on purpose — the **7 terms kept with two senses** (4 of them attributed
disagreements) in `ubiquitous-language.md` are the seams it should be reconciled against, and 19
hotspots are open. Because 0 elements are confirmed, a decomposition built on this is a
decomposition of the documents, not of the domain. The cheapest thing that would change that is one
hour with Tuan and one with Mai.

Not done, and why: `ddd_check.py` (which the output contract says flags a missing `State` column as
`discovery-state-unlabelled`) lives outside the `2-discover` directory this run was scoped to read,
so it was not run. The check it performs was done directly instead —
`model.json` reports 0 rows with an unlabelled or invalid `State`.
No `INDEX.md` row was written: this snapshot has no `govkit.yml` and no governed-docs tree, so there
is no index to sync, and inventing one would be a governance decision I have no basis to make.
