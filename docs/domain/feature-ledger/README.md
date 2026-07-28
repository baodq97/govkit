---
id: DOMAIN-0006
title: FeatureLedger bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: []
related_rfcs: [RFC-0003, RFC-0016]
related_adrs: []
---

# FeatureLedger bounded context

## Purpose

Holds a committed list of "this feature is done" claims, each pointing at the governed document
that specifies it, and guarantees that the **evidence behind a claim cannot vanish** even though
the claim itself may honestly change. It serves the **owner** deciding what has actually shipped,
against an author who might otherwise quietly delete a claim that stopped being true.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — an integrity guarantee over a small committed file | `model.yaml` |
| Business-model role | anti-gaming control; done-ness agents cannot rewrite | `RFC-0016` title |
| Evolution | custom-built; no consumer adoption recorded | `PRD-0001:112-113` |

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Owner / CI | `Ledger` | command | — |
| in | GovernanceSchema | `ledger.path` — a tolerant passthrough, validated here at use time | query | conformist |
| in | git | the committed ledger at HEAD, and HEAD's own `govkit.yml` | query | ACL — both degrade to null, never throw |
| out | StructuralGate | `collectGovernedIds` — the id universe `spec` resolves into | query | **shared kernel** |
| out | GateJournal | `{entries, passing, violations}` | — | supplier |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Claim | a done-ness assertion about a feature | **yes** — Reconciliation: a content-hash claim about a doc |
| Check | the human-readable command that earned `passes` — provenance, never a gate input | **yes** — the CLI's composite `check` entrypoint (`cli.ts:701`) |
| Violation | one of six ledger kinds | **yes** — StructuralGate's nine kinds; two disjoint enums, deliberately not shared |
| Baseline | the last committed ledger at HEAD | **yes** — Calibration: the committed confusion-matrix snapshot |
| Append-only | claims may move, evidence may not vanish | — |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Evidence durability | a removed entry or a dropped `check` must fail the gate | — | `ledger.ts:236`, `:245` | **yes** — the aggregate is the whole ledger, not the entry, because the rule needs the baseline |
| Fail-closed on bad input | unreadable JSON, a bad root shape, a missing `entries` array all fail loud naming which document | — | `ledger.ts:81` | yes |
| Honest degradation | a genuinely missing or unparseable baseline is a SURFACED skip, and layers 1–3 still gate | — | `ledger.ts:219-231` | yes — a fourth layer that can be absent |
| Outside the no-key floor | layer 4 needs git, so `check` never calls this | — | `ledger.ts:12-16` | **yes** — the reason this is its own context |

## Assumptions

*Stated.* A `spec` is a single scalar id resolved through the shared collector (`ledger.ts:183`).

*Inferred, and therefore attackable.* That `check` strings are truthful — the field is free prose
nobody executes, so a claim can cite a command that was never run, or no longer passes. That the
committed baseline is trustworthy: an entry added and committed in the same change is
indistinguishable from one that survived review. That ids are stable — a rename of an entry id
reads as a removal plus an addition, so the append-only rule fires on a legitimate rename with no
way to express one.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Entries with `passes: true` and no `check` | how much done-ness is asserted with no provenance at all | `ledger.ts:18-26` — **measured today: 0 of 24. Every entry carries a `check` string, and 22 of 24 claim `passes: true`** |
| `entry-removed` / `check-removed` violations per quarter | whether the anti-gaming rule ever fires, or is dark | the journal's `ledger.violations` count (`journal.ts:40`) |
| Claims whose `spec` doc is still `draft` | done-ness under an undecided design — the coherence check's ledger-shaped cousin, which is NOT implemented | `ledger.ts` + verify's status data |

## Open questions

- **`AGENTS.md` understates what the one-shot gate runs.** `AGENTS.md:45` describes `bun run
  check` as "biome + typecheck + build + tests + `verify` + `eval`", but `package.json:28` also
  chains `calibrate`, `drift` and `ledger` — all three git-backed and outside the no-key floor. So
  this gate IS enforced here (34 `ledger` lines in the journal), and the repo's own agent-facing
  doc is stale about its own gate. *Owner — a doc fix, not a code one.*
- **No coherence check on `spec`.** StructuralGate refuses to let a terminal doc hang off an
  undecided parent (`verify.ts:309`), but a ledger entry may claim `passes: true` against a `draft`
  RFC and nothing objects. The 24 entries here resolve to 19 RFCs, 4 PRDs and 1 US; nothing checks
  the status of any of them. Deliberate scope, or the same inconsistency one layer down? *Owner.*
- **A legitimate entry rename is indistinguishable from evidence deletion.** No migration path is
  described anywhere.
