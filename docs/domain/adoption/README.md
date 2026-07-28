---
id: DOMAIN-0010
title: Adoption bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0004, RFC-0005, RFC-0006]
related_adrs: []
---

# Adoption bounded context

## Purpose

Gets a repository that already has documents — written by people, in whatever shape they chose —
under governance without asserting a single fact nobody approved, and without demanding the whole
backlog be fixed before the next change can merge. It serves the **team adopting govkit**, for whom
a tool that guesses their metadata wrongly is worse than one that leaves a hole.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — an on-ramp, not the product | `model.yaml` |
| Business-model role | adoption enabler; the wall both proving grounds hit | `PRD-0001:57` (both consumers vendored or side-loaded — "n=2 onboarding wall") |
| Evolution | custom-built across three RFCs (0004, 0005, 0006) | `docs/rfc/INDEX.md` |

## Domain roles

**Gateway** (it translates prose metadata into front-matter) **and** **scope filter** (`--changed`
narrows what the gates hold a team responsible for). Both halves are the same refusal at different
scales: never assert what was not stated, and never make a team retrofit a backlog to merge a fix.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Adopting team | `Init`, `Init --adopt [--apply]`, `--changed [--base <ref>]` | command | — |
| in | GovernanceSchema | required keys, `idPrefix`, `statuses` | query | **partnership** — `init` writes this schema, `--adopt` reads it |
| in | git | changed + untracked `.md` paths vs a base ref | query | ACL; an unresolvable explicit ref is a hard error |
| out | the doc itself | a prepended front-matter block, each line carrying its provenance comment | — (file write, only under `--apply`) | published language |
| out | the team | a suggested `statuses:` enum for vocabulary drift — **never written** | — | the schema is the human's contract |
| out | StructuralGate | docs carrying the `<MISSING — fill in>` sentinel, which that gate then flags | — | conformist by construction |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Drift | a status value real docs use that the configured enum does not list | **yes** — Reconciliation: governed content moved past a recorded claim |
| Extracted | pulled from a DECLARED shape — bold key, line-leading key, first ATX heading, labelled ISO date, id-prefixed filename | — |
| Sentinel | `<MISSING — fill in>`; an absence made loud | — |
| Changed set | new-or-modified governed docs vs a base ref | **yes** — WaiverPolicy: `scope` is a path glob, not a diff |
| Lane | which of the two migrations a doc falls into | — |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Never assert | a wrong value is worse than a missing one | — | `adopt.ts:54-58` | **yes** — it is why extraction is anchored shapes only, and why there is no prose fallback |
| Idempotence | a second run must be a no-op | — | `adopt.ts:148-160` | yes |
| Never fail open | an explicit unresolvable base ref is an error, not a silent full scan | — | `util.ts:299-322` | yes |
| Preview honesty | the dry-run exit code must reflect whether the result would still fail the gate | — | `cli.ts:655-666` | yes |

## Assumptions

*Stated.* The two modes never mix — adopt never scaffolds, `--force` is init-only, `--apply` is
adopt-only (`cli.ts:655-659`).

*Inferred, and therefore attackable.* That English metadata labels are enough: `lineValue` matches
the key name literally, so a repo writing `Trạng thái:` or `Autor:` extracts nothing and every doc
becomes sentinels. That the extraction shapes were derived from real corpora — the code names
"the strong signal real docs use" but cites no corpus. That `--changed` is only ever used during
adoption; nothing stops a mature repo from running it permanently and gating almost nothing.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Sentinels per migrated doc | how much of the corpus adopt could not read — the honest cost of never guessing | `AdoptResult.planned[].hasMissing` (`adopt.ts:21-29`) |
| Docs still scoped out by `--changed` after N weeks | whether adoption is progressing or the flag became permanent | `VerifyResult.scoped.changedDocs` vs `checked` — **`--changed` has never been journalled in this repo (0 of 151 lines)** |
| Wrongly-extracted values corrected by hand | the false-assertion rate the whole design is built to keep at zero | git diffs following an `--apply` commit |
| Consumer repos onboarded via `init` vs vendored | whether the on-ramp works at all | `PRD-0001:57` — **not in this repo** |

## Open questions

- **`adopt` does not pass the per-type `recursive` flag** (`adopt.ts:140`) that `verify` and `eval`
  both pass (`verify.ts:554`, `eval.ts:225`), so a nested design tree is gated and graded but never
  migrated. *Owner — see `context-map.md` Conflicts.*
- **Extraction keys are English-only.** No source states this as a scope decision.
- **No adoption has been measured.** Both proving grounds are outside this repo
  (`PRD-0001:97-100`), so every claim here is read from code.
