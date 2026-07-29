---
id: REL-0005
title: govkit 0.10.1 — the referential gates 0.10.0 claimed but did not wire
status: draft
owner: baodq97
date: 2026-07-29
---

> 0.10.0's own post-publish smoke caught it: a `us` at `done` under an `rfc` at `draft` still
> passed `verify` on a freshly scaffolded repo, because chain-status coherence is checked
> across a *resolved* `refs:` edge and the default schema declared `refs:` on `rel` only.
> `terminalStatuses` without `refs:` is half a gate. This ships the other half, plus the
> end-to-end test that would have caught it before publish rather than after.

## What shipped

Engine `govkit@0.10.1`, a config-template and test change over 0.10.0 — no source change to
any command:

- **`refs: [{ key: parent, type: rfc }]` on `adr` and `us`** in the scaffolded default schema.
  This is what turns on chain referential-integrity (RFC-0003) for the two types that actually
  carry a `parent`, and it is the precondition for chain-status coherence (RFC-0008) seeing the
  US→RFC edge — the most-travelled edge in the whole chain.
- **`terminalStatuses: [accepted, superseded]` on `adr`**, the third gap the same per-type diff
  found. A child hanging off an ADR still at `proposed` is now the same recorded inconsistency
  as one hanging off a draft RFC.
- **An end-to-end regression test** (`init.test.ts`) that scaffolds a repo with `runInit`,
  lands a `us` at `done` under an `rfc` at `draft`, and asserts `verify` rejects it. Asserting
  the config keys existed was not enough — 0.10.0 had `terminalStatuses` and still let the case
  through, because the two keys only gate when wired together. Proven fallible: reverting the
  schema fix turns this test red.

## Migration

None. `init` remains idempotent and will not rewrite an existing `govkit.yml`; a repo
scaffolded by 0.10.0 keeps its config until someone edits it.

To adopt the fix in a repo scaffolded by 0.10.0, add `refs: [{ key: parent, type: rfc }]` under
`docs.types.adr` and `docs.types.us`, and `terminalStatuses: [accepted, superseded]` under
`docs.types.adr`. Expect the first run to fail on any child that really is shipped under an
undecided parent — that is the finding, not a false positive.

## Rollback

`npm i -D govkit@0.10.0` — stateless engine, pin change only. Nothing in a 0.10.1-scaffolded
config is unknown to 0.10.0's loader; the gates simply stop firing.

## Post-publish smoke

Pending publish — filled from the real run before this record flips to `released`.
