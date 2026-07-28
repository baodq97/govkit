---
id: DOMAIN-0008
title: WriteTimeAudit bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: []
related_rfcs: [RFC-0007, RFC-0008, RFC-0010, RFC-0012, RFC-0013]
related_adrs: []
---

# WriteTimeAudit bounded context

## Purpose

Catches an obviously incomplete governed document at the moment it is being written, rather than
minutes later in CI — and, when the write is fine but consequential, says so without standing in
the way. It serves the **author** mid-flow, for whom a rejection now costs a sentence and a
rejection in CI costs a round trip.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — a convenience layer over rules the CI gate owns | `model.yaml` |
| Business-model role | friction reducer; the interactive twin of the gate | `verify.ts:523-528` |
| Evolution | custom-built; `type: command` only, never a model call | `README.md:73-74`; `AGENTS.md:66` |

## Domain roles

**Gate** (it can deny a write) **and** **policy megaphone** (it restates Ratification's rules as
non-blocking reminders). The second role is the finding: this is the *only* code in the repo that
reflects the ratification policy at all, and both of its reminders are explicitly non-blocking —
so the one place the policy surfaces is the one place it cannot bind.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | the harness | a `PreToolUse` payload — `tool_name`, `file_path`, `content` | command | ACL — anything unexpected defers |
| in | GovernanceSchema | required keys, `startStatus`, `terminalStatuses`, `refs`, `requiredSectionsByStatus` | query | conformist; nothing is hardcoded |
| out | the harness | `deny` + reason + context, **or** `additionalContext` + proceed, **or** silence | — | published language — the hook protocol |
| out | Ratification | the born-at-non-`startStatus` nudge and the terminal-flip reminder | — | conformist; it restates, never enforces |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Block | deny this one write, emitted as exit 0 + a deny decision | **yes** — StructuralGate: `blocking` is a risk tier over a whole run |
| Defer | the default: proceed to the normal permission flow | — |
| Remind | inject context and proceed. Never blocks | — |
| Terminal | the trigger for the reconciliation reminder | **yes** — StructuralGate's coherence parent test |
| Governed | this file path lies inside a configured type dir | **yes** — Reconciliation: this doc declares `governs:` |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Never crash-block | any failure on the hook path degrades to defer, silently, exit 0 | — | `cli.ts:851-863` | **yes** — the whole verdict model is three-valued |
| No model call | `type: command` only; a `type: prompt` hook would need a key | — | `AGENTS.md:66`; `README.md:73-74` | yes |
| Single-file by construction | it holds only the content being written, so it cannot judge chain coherence | — | `audit-write.ts:20-28` | **yes** — it is why cross-doc rules stay in StructuralGate |
| Path-resolution parity | must route through the same `typeDir` helper as every reader | — | `audit-write.ts:57` | yes |

## Assumptions

*Stated.* An Edit cannot be judged from partial content (`audit-write.ts:31-35`).

*Inferred, and therefore attackable.* That authors create governed docs with `Write` — a doc
created by `Edit`, by a shell heredoc, or by a script bypasses this context entirely, and nothing
records how often that happens. That a nudge is read: `additionalContext` competes with everything
else in the model's context window, and the effect has never been measured. That blocking mid-flow
is cheaper than failing in CI — plausible, and unmeasured.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Blocks at write time vs the same violation kinds appearing in CI | whether the hook is actually catching things, or CI is catching them anyway | hook logs + `.govkit/journal.jsonl` — **needs a hook log; none exists today** |
| Governed docs created without a preceding hook decision | how much authoring bypasses this context via Edit or shell | git history vs hook log |
| Born-at-non-`startStatus` nudges followed by a corrected status in the same session | whether the provenance nudge changes behaviour at all | session record |

## Open questions

- **`required` is computed WITHOUT `excludeBase` here** (`audit-write.ts:58`) while `verify`
  subtracts it (`verify.ts:541-547`) and `config.ts:100-106` documents the subtraction as the rule.
  A type that excludes a base key would be blocked at write time for a key CI does not require —
  the partnership drifting. *Owner; recorded in `context-map.md` Conflicts.*
- **The Edit-based status flip is an inherited gap**, named in the code itself
  (`audit-write.ts:100-102`). Every reminder here is bypassable by editing instead of writing.
- **No hook log exists**, so every metric above is currently uncollectable.
