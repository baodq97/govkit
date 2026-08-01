# ddd-flow artifact shapes — what `ddd_check.py` enforces

Shape only. Each block is a fill-in skeleton. "Enforces" = the `ddd_check` check(s) that read
that file; "Budget" = check 12 line cap (fires `info` >1.15×, `medium/high` >1.5×). Front-matter
is govkit-verify (not ddd_check) but every golden carries it — kept so the template is schema-exact.

Global: any `Qnn`/`Hnn` cited in these files must be defined in `business-model*.md` or
`discovery/*.md`, else check 11 `dangling-reference`. A **definition** is a line that *starts* with
the id (list/table/heading markers allowed) followed by `—`, `-`, `.`, `|`, `:` or `*` — e.g.
`- Q3 — who approves at M0?` or `| Q3 | who approves… |`. `Q3` buried mid-sentence defines nothing.
Classification (core/supporting/…) is read from each context's `model.yaml` `subdomain_type`, NOT
from the prose below.

**Front-matter ids are per-artifact, and the prefix is the convention — follow whatever the repo
already uses and only fall back to these:** `DOMAIN-BM-` business model · `DOMAIN-DISC-` discovery ·
`DOMAIN-CM-` context map · `DOMAIN-FLOW-` message flow · `DOMAIN-CDC-` core domain chart ·
`DOMAIN-ORG-` team topology · `DOMAIN-AGG-` aggregate canvas · `DOMAIN-EM-` event model ·
`DOMAIN-CS-` code structure · `DOMAIN-IDX-` the index · plain `DOMAIN-nnnn` for a context canvas.

**Every governed artifact also needs its row in `docs/domain/INDEX.md`** — create the file if it is
missing. Contexts carry a Risk column, the other sections do not:
`| Id | Title | Risk | Status | Owner | Date |` and `| Id | Title | Status | Owner | Date |`. Omit
`risk:` from front-matter where the artifact has no invariants to be risky about. A doc absent from
INDEX is invisible to `govkit verify`, which is a governance hole, not a formatting slip.

---

## business-model*.md — Budget 150

Enforces: check 11 (this is one of the two files where `Qnn` may be defined) and check 12 (budget).
It is also the **evidence source for checks 1–3** (`classification-mismatch`, `too-many-core`,
`investment-mismatch`, `under-invested-core`), which compare each context's `subdomain_type`
against the business evidence — and those checks go **silently dark** unless the capability table
below parses. `load_business_model` reads *any* table row with ≥4 cells whose **4th cell begins
with** `yes` / `no` / `partial` / `unknown`; cells 1–3 are capability, business role, evolution
stage. Wrong column order, or an evidence sentence in column 4, means zero rows parse and nothing
says so.

`differentiation` here is **evidence, not a verdict**: it answers "does a source state the business
competes on this?" — `unknown` when nobody has, which is a valid and common answer at this step.
Naming the capability core / supporting / generic, or build / buy, is `5-strategize` and
`3-decompose`'s call, so keep those labels out of this table (RULES → Grounding).

```markdown
---
id: DOMAIN-<nnnn>
title: <slice> — business model
status: draft
owner: TBD
date: <yyyy-mm-dd>
related_prds: [<...>]
---

# <slice> — Business Model

## Canvas
<the nine blocks; an unanswered block stays EMPTY and becomes a numbered question below —
 record provenance per block (interview: who/when · document: which file)>

## Capability classification            <!-- checks 1-3 read THIS table; column order is fixed -->
| Capability | Business role | Evolution stage | Differentiation | Evidence |
|---|---|---|---|---|
| <cap> | <what it does for the business> | <genesis/custom/product/commodity> | <yes/no/partial/unknown> | <who said it, when · or which file §> |

## Open questions                       <!-- Qnn defined here; never renumbered -->
- Q1 — <question> · who could answer: <role>
- Q2 — <question> · who could answer: <role>
```

---

## discovery/*.md + discovery/model.json — Budget 120 per markdown file

`model.json` is canonical: check 16 (`grounding-under-ratified`) and check 13
(`discovery-state-unlabelled`) read it first and fall back to the markdown tables only when it is
absent. The fallback **cannot split events from rules**, so grounding degrades to a whole-timeline
ratio — write `model.json`.

Two independent per-element axes, and collapsing them is the classic loss:
`status` = evidence (`confirmed` a person said it · `candidate` an artifact only implied it — only
a human flips it); `state` = time (`as-is` happens today · `to-be` a decided change · `could-be` an
idea nobody committed to). An element can be `confirmed` **and** `could-be` at once — a person
confirming, on the record, that something is only an idea.

Grounding floor (`steps.yml`): `type: "event"` + `status: "confirmed"` feeds `min_confirmed_events`,
`type: "policy"` + `confirmed` feeds `min_confirmed_rules`, and confirmed:candidate must clear
`ratio_floor`. Element types: `event` · `command` · `actor` · `policy` · `read-model` ·
`external-system` · `aggregate`.

```
docs/domain/discovery/
├── README.md              # session record: who was in the room, mode, covered / not covered
├── timeline.md            # the event storm, in order
├── ubiquitous-language.md # keep BOTH rows when a word means two things — the collision is the finding
├── hotspots.md            # Hnn defined here, never renumbered
└── model.json             # canonical; the live surface renders the same payload
```

```markdown
| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | EquipmentAllocated | event | as-is | Depot Clerk / CommitReservation | confirmed | Ha, 2026-07-27 |
| 2 | DepotTransferRequested | event | to-be | — | candidate | ADR-0013 §Decision |

| Term | Definition | Held by | Status |            <!-- ubiquitous-language.md -->
| Transfer | physical depot-to-depot move | Operations | confirmed |
| Transfer | a billing line on the monthly invoice | Finance | confirmed |

| # | Hotspot | Raised by | Blocks | Who could answer |   <!-- hotspots.md; H1.. -->
| H1 | Who releases a unit when the depot changes mid-rental? | Ha vs Minh | aggregate boundary | Ops lead |
```

```json
{
  "schemaVersion": 1, "kind": "discovery",
  "source": {"mode": "discover|interview|update", "date": "<date>",
             "attendance": {"domainExpert": true, "endUser": false}},
  "timeline": [{"seq": 1, "name": "EquipmentAllocated", "type": "event", "status": "confirmed",
                "state": "as-is", "actor": "Depot Clerk", "command": "CommitReservation",
                "source": "Ha, 2026-07-27"}],
  "ubiquitousLanguage": [{"term": "Transfer", "definition": "…", "heldBy": "Operations",
                          "status": "confirmed"}],
  "hotspots": [{"question": "…", "raisedBy": "Ha vs Minh", "blocks": "aggregate boundary"}]
}
```

The README's confidence line (`<N> confirmed · <N> candidate · <N> open hotspots`) and its
attendance table are the only record that a run which merely re-read the schemas was not a
workshop. In UPDATE mode merge a delta: preserve human edits, supersede a finding with a note,
never delete one.

---

## context-map.md — Budget 180

ddd_check reads NO content markers here (only `.exists()` triggers grounding check 16, and the
budget). Cut is validated via `*/model.yaml`, not this file. Shape is free; keep ≤180 lines.

```markdown
---
id: DOMAIN-<nnnn>
title: <slice> — context map
status: draft
owner: <owner>
date: <yyyy-mm-dd>
related_prds: [<...>]
related_rfcs: []
related_adrs: []
---

# <slice> — context map

<scope line>

## Context map
```mermaid
graph LR
  <A> -->|<relationship>| <B>
```

## Sub-domain classification
| Bounded Context | Sub-domain type | Why |
|---|---|---|
| <A> | <core/supporting/master-data/generic> | <one line> |

<other free-form sections as needed>
```

---

## core-domain-chart.md — Budget 150

ddd_check reads NO content markers here (not parsed at all). Differentiation is read from
`business-model.md`, complexity/classification from `model.yaml`. Shape is free; keep ≤150 lines.

```markdown
---
id: DOMAIN-<nnnn>
title: <slice> — core domain chart & build/buy
status: draft
owner: <owner>
date: <yyyy-mm-dd>
related_prds: [<...>]
related_rfcs: []
related_adrs: []
---

# Core Domain Chart — <slice>

```mermaid
quadrantChart
  ...
  "<Capability>": [<x>, <y>]
```

## Placement, evidence, and the decision
| Capability | x — evidence | y — evidence | Quadrant | Build / Buy / Config |
|---|---|---|---|---|
| <cap> | <...> | <...> | <...> | <...> |

<investment-mismatch / trajectory / open questions — free-form>
```

---

## team-topology.md — Budget 150

Enforces (check 9 `unowned-context`, HIGH): EVERY context name from `model.yaml` must appear
somewhere in this file (matched on letters+digits only, so `ParkingGuidance` == "Parking
Guidance"). No section structure enforced beyond that; keep ≤150 lines.

```markdown
---
id: DOMAIN-<nnnn>
title: <slice> — team topology
status: draft
owner: <owner>
date: <yyyy-mm-dd>
related_prds: [<...>]
related_rfcs: []
related_adrs: []
---

# Team Topology — <slice>

## Proposed ownership
| Team | Type | Owns | Cognitive load | Status |
|---|---|---|---|---|
| <team> | <stream-aligned/…> | <MUST name every context> | <...> | proposed — unstaffed |

<interaction modes / ISH / risks — free-form; just keep every context named above>
```

---

## message-flows/<scenario>.md — Budget 90 (per scenario file)

Applies to every `*.md` except `README`/`index`/`proposed*` (those are excluded from all flow
checks). Enforces:
- check 7 `flow-overflow` (HIGH): ≤9 distinct numbered message rows (rows starting `| N |`).
- check 6: message table parsed by header — needs a `Message` column and a `To` column; each
  message row's first cell is the number `N`.
- check 7b `temporal-rule-in-prose` (MED): if the `## Scenario` prose states a `within/after/every
  <n> <unit>` rule, the message table MUST carry a `When` column with a value on some row.

```markdown
---
id: DOMAIN-FLOW-<nnnn>
title: <name> — domain message flow
status: draft
owner: <owner>
date: <yyyy-mm-dd>
contexts: [<A>, <B>]
---

## Scenario

<prose; if it states a timing rule, add the When column below and fill a row>

## Flow
```mermaid
sequenceDiagram
  ...
```

| # | From | Message | Type | Contents | To | When |
|---|---|---|---|---|---|---|
| 1 | <from> | `<Message>` | <command/query/event> | <contents> | <To> | <— or timing> |
<≤9 numbered rows total>

## Findings
| # | Smell | Evidence | What it suggests | Proposed change |
|---|---|---|---|---|
| — | <...> | <...> | <...> | <...> |

## Open questions
- <...>
```

---

## <context>/README.md — context canvas — Budget: core 180 · supporting 90 · generic 35 · master-data 35

Enforces (check 8 `canvas-incomplete`, MED): the three markers `assumption`, `verification
metric`, `open question` (case-insensitive substrings). A canvas counts as "defined" at ≥2 of 3;
below 2 it's skipped as a not-yet-deepened sketch. To pass clean at define-depth include ALL THREE.
Budget is per `subdomain_type` from `model.yaml`.

```markdown
---
id: DOMAIN-<nnnn>
title: <Context> bounded context
risk: <High/…>
status: draft
owner: <owner>
date: <yyyy-mm-dd>
related_prds: [<...>]
related_rfcs: []
related_adrs: []
---

# <Context> — Bounded Context Canvas

## Purpose
<...>

## Assumptions          <!-- marker: "assumption" -->
- <A1> ...

## Verification metrics <!-- marker: "verification metric" -->
- <VM1> ...

## Open questions       <!-- marker: "open question" -->
- <...>

<other canvas sections free-form; stay within the subdomain_type budget>
```

---

## <context>/aggregates/<Name>.md — aggregate canvas — Budget 150

Enforces (check 10 `relaxed-without-policy`, HIGH): if the body contains any of `relax`, `not
enforced`, `eventual`, it MUST also contain the substring `corrective polic` (a Corrective
policies section). No other section markers enforced; keep ≤150 lines.

```markdown
---
id: DOMAIN-<nnnn>
title: <Name> aggregate
risk: <High/…>
status: draft
owner: <owner>
date: <yyyy-mm-dd>
related_prds: [<...>]
related_rfcs: []
related_adrs: []
---

# Aggregate Design Canvas — <Name>

## 3. Enforced invariants
- <INV1> ...

## 4. Corrective policies   <!-- REQUIRED if any "relax/eventual/not enforced" wording appears -->
- <CP1> ...

<other canvas sections free-form; ≤150 lines>
```

---

## Line-budget reference (check 12)

| Artifact glob | Cap |
|---|---|
| business-model*.md | 150 |
| context-map.md | 180 |
| core-domain-chart.md | 150 |
| team-topology.md | 150 |
| code-structure.md | 120 |
| event-model/README.md | 200 |
| discovery/*.md | 120 |
| message-flows/*.md | 90 |
| */README.md (context canvas) | core 180 · supporting 90 · generic 35 · master-data 35 |
| */aggregates/*.md | 150 |

Golden cross-check (all pass): context-map 123, core-domain-chart 84, team-topology 67,
happy-path 55, failure-paths 49, demand/README 133 (core 180), Initiative 151 (150 base, within
1.15× slack).
