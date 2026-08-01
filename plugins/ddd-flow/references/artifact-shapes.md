# ddd-flow artifact shapes — what `ddd_check.py` enforces

Shape only. Each block is a fill-in skeleton. "Enforces" = the `ddd_check` check(s) that read
that file; "Budget" = check 12 line cap (fires `info` >1.15×, `medium/high` >1.5×). Front-matter
is govkit-verify (not ddd_check) but every golden carries it — kept so the template is schema-exact.

Global: any `Qnn`/`Hnn` cited in these files must be defined in `business-model*.md` or
`discovery/*.md`, else check 11 `dangling-reference`. Classification (core/supporting/…) is read
from each context's `model.yaml` `subdomain_type`, NOT from the prose below.

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
