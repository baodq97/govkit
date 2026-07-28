# Output Template — discovery artifacts

What `2-discover` writes. Output lands in the **invoking project's** docs folder — never in
this plugin repo. Read before emitting anything.

## Locate the docs root

1. If `docs/domain/` exists → write `docs/domain/discovery/`.
2. Else if `docs/` exists → create `docs/domain/discovery/`.
3. Else → **PAUSE and ask** where docs should live. Do not guess a path.

If `docs/domain/discovery/` already holds artifacts, you are in **UPDATE** mode — discovery is
continuous, so merge a delta rather than overwriting. Preserve anything a human edited, never
delete a recorded finding, and close with a changelog.

## Layout

```
docs/domain/discovery/
├── README.md            # session record: who attended, mode, what was covered, what wasn't
├── timeline.md          # the event storm, in order
├── ubiquitous-language.md
├── hotspots.md          # the open disagreements — the most valuable output
└── model.json           # machine-readable, also what the live preview surface renders
```

## `README.md` — the session record

```markdown
---
id: DOMAIN-DISC-0001
title: <Domain> — discovery session <date>
status: draft
owner: TBD
date: <date>
mode: interview | discover | update
technique: eventstorming-big-picture
---

## Who was in the room
| Role | Present | Notes |
|---|---|---|
| Domain expert | yes — <name> | |
| Real end user | **no** | findings about user behaviour are inference, not evidence |
| Product/strategy | yes — <name> | |
| Developers | yes | |

## Coverage
Covered: <areas walked through>
Not covered: <areas nobody could speak to, and who would be needed>

## Confidence
<N> confirmed elements · <N> candidates still unconfirmed · <N> open hotspots
```

The attendance table is not ceremony. A session with no domain expert produced a literature review,
and the reader six months from now has no other way to know that.

## `timeline.md` — the event storm

One row per element, in time order. `source` distinguishes what a person said from what a document
implied — the single field that keeps this honest.

```markdown
| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | EquipmentAllocated | event | as-is | Depot Clerk / CommitReservation | confirmed | Ha, 2026-07-27 |
| 2 | DepotTransferRequested | event | to-be | — | candidate | ADR-0013 §Decision |
| 3 | whenever a unit goes out of service, cancel its reservations | policy | as-is | — | confirmed | Ha, 2026-07-27 |
| 4 | DepotCapacityForecast | read-model | could-be | — | confirmed | Minh, 2026-07-27 — "we've talked about it" |
```

Types: `event` · `command` · `actor` · `policy` · `read-model` · `external-system` · `aggregate`
(see `eventstorming.md` for the grammar).

**Two independent columns. Do not collapse them.**

`Status` is about **evidence**: `confirmed` (a person said it) or `candidate` (derived from an
artifact, unverified). A run that ends with every element still `candidate` has not discovered
anything, and the README's confidence line should say so rather than presenting the list as findings.

`State` is about **time**: `as-is` happens today · `to-be` is a decided change somebody owns ·
`could-be` is an idea on the wall that nobody has committed to. Default to `as-is` and change it
only on evidence — an element nobody could place is a hotspot, not a guess.

Row 4 shows why they are separate: Minh confirmed, on the record, that the forecast is only an idea.
That element is `confirmed` **and** `could-be` at once, and a single column would have to lie about
one of them.

The cost of skipping this is not tidiness. `3-decompose` can draw a boundary around behaviour that
does not exist and nothing running can falsify it; `5-strategize` can claim differentiation from a
capability the business has only discussed. Both read as confident findings afterwards, and neither
is recoverable from the timeline once the column is gone. `ddd_check.py` reports a timeline with no
`State` column as `discovery-state-unlabelled`.

Modelling all three states is the first thing DDD asks of discovery, and it is what makes a
migration tractable: the as-is rows are what a running system can be checked against, and the
difference between the two sets is the work.

## `ubiquitous-language.md`

```markdown
| Term | Definition | Held by | Status |
|---|---|---|---|
| Transfer | a physical depot-to-depot move of a unit | Operations | confirmed |
| Transfer | a billing line item on the monthly invoice | Finance | confirmed |
```

**Keep both rows when a word means two things.** Do not reconcile them into one definition — the
collision is the finding. It is the strongest boundary signal discovery produces, and merging it
away destroys exactly the information the next step needs.

## `hotspots.md`

```markdown
| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| 1 | Who releases a unit when the depot changes mid-rental? | Ha vs Minh | aggregate boundary | Ops lead |
```

An unresolved hotspot is a finding. A hotspot quietly closed to make the document tidy is a
decision nobody made — and it will surface later as a bug with no traceable owner.

## `model.json`

The same payload the preview surface renders, so the wall and the document cannot disagree:

```json
{
  "schemaVersion": 1,
  "kind": "discovery",
  "source": { "mode": "discover", "date": "<date>", "attendance": { "domainExpert": true, "endUser": false } },
  "timeline": [
    { "seq": 1, "name": "EquipmentAllocated", "type": "event", "status": "confirmed", "state": "as-is",
      "actor": "Depot Clerk", "command": "CommitReservation", "source": "Ha, 2026-07-27" }
  ],
  "ubiquitousLanguage": [
    { "term": "Transfer", "definition": "physical depot-to-depot move", "heldBy": "Operations", "status": "confirmed" }
  ],
  "hotspots": [
    { "question": "Who releases a unit when the depot changes mid-rental?", "raisedBy": "Ha vs Minh", "blocks": "aggregate boundary" }
  ]
}
```

## Hard rules

- Fresh docs start `status: draft`, `owner: TBD`. Setting status is a human act.
- **Never invent** an event, rule, actor or term. A gap is a hotspot, not a blank to fill.
- **Never promote a candidate to confirmed** without a person confirming it — an accepted ADR is
  still a document, not a domain expert.
- **Never let a `to-be` or `could-be` element go unmarked.** Wishes recorded as facts are the one
  error discovery cannot recover from later: downstream, the row is indistinguishable from something
  the business does every day.
- **Never draw context boundaries here.** Clustering into contexts is `3-decompose`'s job;
  doing it here collapses discovery into design and loses the disagreements discovery exists to
  surface.
- In UPDATE mode, preserve human edits and never delete a prior finding — supersede it with a note
  instead.

## Hand-off

`3-decompose` consumes `timeline.md` and `ubiquitous-language.md` as its step-2 input,
replacing the prose-skim it would otherwise do alone. Say this explicitly when finishing, along
with the honest confidence line: the decomposition will be exactly as good as this discovery was.
