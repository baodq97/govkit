---
id: DOMAIN-0009
title: GateJournal bounded context
risk: High
status: draft
owner: baodq97
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0012, RFC-0017]
related_adrs: []
---

# GateJournal bounded context

## Purpose

Writes down what each gate run actually decided, one line per run, so that "how often does this
gate block a legitimate document" can be answered from records instead of memory. It serves the
**owner** trying to improve the gates without weakening them, and it is the sense half of the
learning loop the roadmap is built around.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — a sensor; it observes, it never participates | `journal.ts:6-9` |
| Business-model role | the measurement substrate under the north-star metric | `PRD-0001:64`, theme R7 |
| Evolution | custom-built; the deterministic, no-key half of the flywheel | `PRD-0001:70-78` |

## Domain roles

**Observer.** Every invariant here is about *not perturbing the thing it watches*: it is built
from already-computed results, written after printing, and a write failure warns without touching
the exit code. That is what keeps it a context rather than a shared logging utility — the rules it
protects belong to nobody else.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | StructuralGate | `docs` + `violations{path,kind,tier}` | — | customer; **this context owns the line shape** |
| in | QualityEval | `{artifacts, floorPassRate, advisoryPassRate, averageScore}` | — | customer |
| in | Reconciliation | `{checked, drifted, skipped, ack?}` | — | customer |
| in | FeatureLedger | `{entries, passing, violations}` | — | customer |
| out | `.govkit/journal.jsonl` | one appended JSON line | — (file write) | **published language** — JSONL so a consumer can tail it |
| out | the distiller (RFC-0017) | the same file, read out of band | — | separate ways — nothing in the engine reads a line back |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Record | one gate run, flattened to counts | — |
| Sensor | the stance: it observes the gate, it is never part of it | — |
| Ack marker | `ack: true`, present only on an ack run | **yes** — Reconciliation: the whole re-vouching ritual |
| `ok` | the run's verdict, copied verbatim from whichever gate produced it | **yes** — each gate defines its own |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Non-interference | never delay, suppress or fail the command it observes | — | `journal.ts:6-9`; `cli.ts:568-573` | **yes** — it is the entire model |
| Forward compatibility | old lines must stay parseable as fields are added | — | `journal.ts:11-13` | yes — omit-not-null |
| Confinement | `journal.path` must stay inside the repo root | — | `journal.ts:52` | yes |
| Incremental readability | one JSON object per line, appended | — | `journal.ts:64` | yes |

## Assumptions

*Stated.* Absent `gitSha` is legal, not an error (`util.ts:260-264`).

*Inferred, and therefore attackable.* That counts are enough — the record keeps violation `kind`
and `tier` but not the problem text, so a consumer can see *that* a doc failed on `index` and never
*why*. That the file grows slowly enough to need no rotation: nothing truncates, compacts or bounds
it. That concurrent runs are safe — `appendFileSync` of a whole line is atomic in practice on
POSIX for small writes, but nothing states that assumption or bounds the line length.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of lines carrying `error` | how often the gate aborts rather than returning a verdict instead of failing cleanly | **measured: 0 of 151 lines. Every recorded run reached a verdict** |
| Distinct `cmd` values present | whether every journalling command is exercised, or only `check` | **measured: 3 of 5 — `check` 77, `drift` 40, `ledger` 34. `verify` and `eval` never appear, because CI runs the composite entrypoint** |
| `ok: false` rate | how often the gate actually blocks in practice | **measured: 5 of 151 (3.3%)** |
| Line growth | whether rotation will ever be needed | **measured: 151 lines / 38 KB over 19 days (2026-07-09 → 07-28)** |

## Open questions

- **`calibrate` may not journal.** The `cmd` union admits five commands (`journal.ts:17`) and the
  one that computes the confusion matrix is not among them — so the north-star metric
  (`PRD-0001:37-42`) is the one gate outcome the sensor never records, even though
  `package.json:25` runs it on every `bun run check`.
- **No `--changed` run has ever been journalled** (0 of 151 lines carry `changed`), so the
  adoption-scoping path has no recorded evidence at all.
- **No ack has ever been journalled** (0 lines carry `drift.ack`), so the marker invariant at
  `journal.ts:33-38` is real code with zero observations behind it.
- **No waiver counts in the record.** `WaiverSummary` exists but nothing carries it into a line, so
  the sensor cannot tell an earned green from an excused one.
- **Is `GateRunRecorded` even a domain event?** The type is `JournalRecord`, not an event class,
  and nothing subscribes. The name in `model.yaml` is this model's, and is flagged as such.
