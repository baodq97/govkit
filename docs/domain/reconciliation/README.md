---
id: DOMAIN-0002
title: Reconciliation bounded context
risk: Critical
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0009, RFC-0015, RFC-0018]
related_adrs: []
---

# Reconciliation bounded context

## Purpose

Keeps a design document honest about the code it claims to describe. A document may name the code
it governs and record the exact content state it was true as of; when that content moves, the
document is called out until someone either updates it or explicitly vouches that the change did
not invalidate it. It serves the **owner** deciding whether a design still reflects reality, and
the **contributor** who would otherwise discover the divergence at review time.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` — the one place a source outside this repo is cited for differentiation | `PRD-0001:64` (Fowler SDD review: *"no tool has deterministic drift detection"*) |
| Business-model role | revenue/adoption driver — the capability the roadmap points at | `PRD-0001:64`, theme R7 |
| Evolution | custom-built, and amended in flight once (commit-sha claims → content-hash claims) | `RFC-0015` as amended; `drift.ts:14-24` |

Carried, not re-derived.

## Domain roles

**Execution context** (the blocking claim gate) **and** **analysis context** (the advisory recency
proxy). Naming both surfaced the reason they are one boundary rather than two: they read the same
`governs:` declaration through one deliberately shared scanner, and `util.ts:143-146` states that
sharing as a correctness property — *"ONE scanner so the two governs-readers can never disagree"*.
Their verdict vocabularies differ (`drifted` vs `stale`/`fresh`/`dangling`/`uncommitted`), which is
the language-shift that would justify a split if the scanner ever forked.

## Inbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Owner / CI | actor | `CheckDrift`, `CheckStale` | command | — |
| Owner (authorized) | actor | `AckDrift [--ack <doc>]` | command | the ritual; the gate never acks itself |
| GovernanceSchema | bounded context | type dirs, `docs.root`, the `recursive` flag | query | conformist |
| git | external system | index manifest (blob OIDs) · commit times · match counts | query | ACL — every call degrades to null, never throws |

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| GateJournal | bounded context | `{checked, drifted, skipped, ack?}` | — | supplier; the `ack: true` marker is this context's contribution to the line shape |
| the governed doc itself | artifact | a rewritten `reconciled:` value token | — (file write) | **published language, ours** — the claim lives in someone else's front-matter |
| Ratification | bounded context | `drift --ack` as an R1 transition | — | honor-system; nothing here checks a citation |

## Swimlanes — what this context actually decides

| Message in | Decision made here | Message(s) out |
|---|---|---|
| `CheckDrift` | does every `governs:` pathspec match a tracked file at all? | ghost / unevaluable violations — **for every governed doc, opted in or not** |
| the same run, opted-in docs only | does the recorded claim match the current governed content hash? | a `DriftEntry`, or nothing |
| `AckDrift` | is there drift, and is there a current hash to vouch for? | a surgical token rewrite, or an `unackable` refusal |
| `CheckStale` | is the governed code's newest commit later than the doc's? | `stale` / `fresh` / `dangling` / `uncommitted` — **advisory, never an exit code** |

The third lane is where the ritual's honesty lives: an ack that cannot vouch (`currentSha === null`)
leaves the doc red and makes the whole ack report failure (`drift.ts:353-367`).

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Drift | the governed **content** no longer matches the recorded claim | **yes** — Adoption: a status value outside the configured enum (`adopt.ts:31`) |
| Stale | the governed code has newer commits than the doc. A proxy, never "doc wrong" | **yes** — StructuralGate: an INDEX row out of sync |
| Claim | `sha256:<hex>` over git blob OIDs | **yes** — FeatureLedger: a done-ness assertion about a feature |
| Ack | re-vouching, in a separate deliberate act | no — but it is an R1 transition, so Ratification also has rules about it |
| Dangling | the glob cannot be evaluated for recency | **yes** — StructuralGate: a `refs` value resolving to no id |

## Business decisions

The eighteen rules with citations are in `model.yaml`. The three that are judgement, not mechanism:

| Rule | Source |
|---|---|
| The claim is a CONTENT hash, never a commit sha — squash merges rewrite every branch sha without changing a byte, which orphaned every pre-merge ack | `drift.ts:14-24`; RFC-0015 as amended |
| A doc can never drift itself; its own path is always excluded, or the ack ritual could not converge | `drift.ts:131` |
| git absent degrades to a note and exit 0 — a gate you cannot run is reported, never failed | `drift.ts:187-198`; `stale.ts:46-53` |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Stability across history rewrite | a claim must survive squash, rebase and CRLF checkouts | — | `util.ts:198-203` | **yes** — it is why the claim is a blob-OID manifest and not a commit sha |
| Honest degradation | git absent, glob matching nothing, doc uncommitted must each be *named*, never read as green | — | `stale.ts:66-77`; `drift.ts:164-171` | **yes** — four verdict values instead of a boolean |
| Non-mutation under `--hook` | `--ack` may never combine with a blocking hook | — | `cli.ts:528-533` | yes |
| Outside the no-key floor | git-gated, so `check` calls neither half | — | `drift.ts:17-20`; `cli.ts:701-711` | **yes** — it is why this is a separate context from StructuralGate at all |
| Convergence | an ack must make the next run green, or say why not | — | `drift.ts:353-367` | yes |

## Assumptions

*Stated.* Blob OIDs are stable where commit shas are not (`util.ts:198-203`). A claim prefix of 8–64
hex is enough (`drift.ts:26-28`).

*Inferred, and therefore attackable.* That the **index** is the right ground truth — the manifest
comes from `git ls-files -s`, so a change that is written but not staged does not drift the claim,
and one that is staged but not committed does. Nothing states that as intended. That one `governs:`
list per doc is enough granularity: a doc governing ten files re-drifts when any one moves, with no
way to say which part of the doc that file backs. That the author who acks has actually re-read the
design — the whole gate reduces to that, and nothing can check it.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Acks per drift-detected event, over time | whether the ritual is reconciliation or rubber-stamping. A ratio approaching 1.0 means the gate has become a formality | `.govkit/journal.jsonl` `drift.ack` marker (`journal.ts:33-38`) — **collectable today** |
| Ghost-path violations per 100 runs | whether `governs:` lists rot faster than they are maintained | journal + `drift --json` |
| Docs carrying `governs:` but no `reconciled:` (the `skipped` count) | how much of the corpus opted into the advisory but not the gate | `DriftResult.skipped` (`drift.ts:57-58`) — **measured in this repo today: 29 governed docs declare `governs:` (27 of 28 RFCs, plus both ADRs); 14 also declare `reconciled:`. So 15 opted into the recency advisory and NOT into the blocking claim gate** |
| Consumer repos with any `reconciled:` doc | whether the differentiator is adopted or self-use only | consumer repos — **not in this repo**; `PRD-0001:112-113` records the risk |

## Open questions

- **Is index state or commit state the right ground truth?** `gitIndexManifest` reads the index, so
  an unstaged edit does not drift and a staged one does. Deliberate, or an artifact of choosing
  `ls-files -s`? Nothing in RFC-0015 or the code comments says.
- **What does an ack mean when `governs:` names ten files?** One claim covers the whole list; a
  reviewer cannot tell which file the acker actually looked at.
- **Nothing checks the R1 citation.** `govkit.yml:146` lists `drift --ack` as R1, requiring a packet
  runId and a policy sha in the commit; `drift.ts` reads neither. *Owner — is the gap intended?*
- **Adoption of this differentiator is unmeasured.** `PRD-0001:112-113` names the risk in the
  owner's own words: the advanced chain features "were built for govkit's own repo and adopted by
  neither consumer".

## Interface critique

1. **Names.** `DriftEntry.problem` carries both "your claim is broken" and "your governs list is
   broken" — two different fixes, one field, distinguishable only by the presence of `ghost`.
2. **Types.** `--ack` is a command that mutates governed docs from the same binary as a read-only
   gate. The guard is a flag-combination check (`cli.ts:528-533`), not a boundary.
3. **Size.** Eighteen invariants across two verdict vocabularies is large for one aggregate. It
   holds because both read one declaration; it would not hold if `stale` grew its own opt-in.
4. **Internals.** The `reconciled:` token is rewritten by byte-span surgery on someone else's
   front-matter (`drift.ts:278-289`). That is this context's internals reaching into another
   context's artifact — accepted, priced, and the reason the rewrite refuses rather than guesses.
5. **Belongs elsewhere.** The ghost-path check (RFC-0018) is about a *declaration* being valid,
   which is a structural property. It could live in StructuralGate — except it needs git, and
   StructuralGate may not.

## Perturbation experiments

- **Move the ghost-path check to StructuralGate.** Improves: a broken `governs:` list is caught by
  the no-key CI gate everyone runs, not by an opt-in git-gated sibling. Costs: StructuralGate would
  need git, breaking the load-bearing invariant (`README.md:68-77`). *Rejected — the invariant wins.*
- **Split `stale` into its own context.** Improves: two clean verdict vocabularies. Costs: two
  `governs:` readers, which `util.ts:143-146` names as the exact failure it was built to prevent.
  *Not moved; recorded in `context-map.md` Conflicts.*

## Changed in 7-define

Canvas added over the first-pass model. Swimlanes, quality attributes, assumptions, verification
metrics and the critique are new; the eighteen invariants are carried unchanged. One metric is
marked collectable today with its current value measured from this repo. No `model.yaml` delta.
