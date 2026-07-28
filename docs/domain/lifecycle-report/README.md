---
id: DOMAIN-0011
title: LifecycleReport bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: []
related_rfcs: [RFC-0008, RFC-0021]
related_adrs: []
---

# LifecycleReport bounded context

## Purpose

Shows where every governed document currently sits in its lifecycle, grouped by kind and status,
and marks which of those statuses count as decided — so "what is still open, what has shipped"
is answerable at a glance and, in a pull request, without anyone pasting it by hand.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — read-only, never blocks | `report.ts:6-12`; `cli.ts:764-775` |
| Business-model role | visibility; the advisory half of RFC-0008 | `RFC-0008` title |
| Evolution | custom-built, extended once with an idempotent PR-body renderer | `RFC-0021` |

## Domain roles

**Projection.** It owns no state and makes exactly one judgement, and that judgement is
config-grounded. Its most interesting property is a refusal: it declines to invent a "retired" or
"stale" axis, because a presence-only layer cannot tell whether a document is trash, and a
hardcoded retirement vocabulary would be a guess the config cannot justify.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Owner / CI | `Report [--pr-body]` | command | — |
| in | GovernanceSchema | `terminalStatuses` — the only key it judges by | query | conformist |
| in | StructuralGate | the same type dirs, through the same `typeDir` helper | query | conformist |
| out | *(caller)* | `ReportResult`, or a marker-fenced markdown block | synchronous return | **published language** — the markers are the API |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Decided | this status is in the type's `terminalStatuses` | **yes** — StructuralGate: "terminal" is the coherence parent test |
| Bucket | one status and its sorted ids, within a type | — |
| `(no status)` | a visible label for a governed doc with none | — |
| Span | the begin/end marker pair an injector replaces between | **yes** — Reconciliation: a byte span inside front-matter |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Zero exit-code effect | read-only, always | — | `cli.ts:764-775` | yes |
| Byte-identical re-render | unchanged state must produce unchanged output | — | `report.ts:51-56` | **yes** — it forbids timestamps and absolute paths in the model's output |
| Marker stability | the begin/end pair is the contract; the content between may evolve | — | `report.ts:44-49` | yes |
| No double-counting | unparseable docs are verify's to report, not this context's to bucket | — | `report.ts:86-89` | yes |

## Assumptions

*Stated.* A status not in `terminalStatuses` is simply not decided (`report.ts:81`).

*Inferred, and therefore attackable.* That a flat scan is the whole corpus — this context does not
pass the per-type `recursive` flag its two neighbours pass, so a nested design tree is governed and
graded but under-counted here. That an injector exists at all: the marker contract is published
(`report.ts:44-49`) and nothing in this repo splices it, so the idempotency property has no
in-repo consumer. That ids are short enough to list inline in a table cell.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| `report --pr-body` output diffed across two runs on unchanged state | the idempotency claim, directly | run it twice — **collectable today, no code needed** |
| Doc count here vs `verify`'s `checked` | whether the `recursive` gap is real and how large | both commands — **collectable today** |
| PRs carrying the marker block | whether the published contract has any consumer at all | GitHub — **currently zero in this repo** |

## Open questions

- **The `recursive` gap.** `report.ts:85` omits the flag that `verify.ts:554` and `eval.ts:225`
  both pass. On a nested tree this view silently under-reports the corpus it claims to summarise.
  *Owner — the same question `adoption` raises about `adopt.ts:140`.*
- **Is this a context at all?** It survives the capability-vs-context test on one config-grounded
  judgement and one stated refusal. It is the thinnest boundary in this model and a live candidate
  to fold into StructuralGate — see `context-map.md`, Declined context candidates, and
  `structural-gate/README.md`, Perturbation experiments.
- **The marker contract has no consumer.** Published, versioned by convention, unused.
