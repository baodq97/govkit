---
id: REL-0004
title: govkit 0.10.0 — init scaffolds the whole schema, not four hardcoded dirs
status: released
owner: baodq97
date: 2026-07-29
---

> Closes a gap found by running `npx govkit@0.9.0 init` in a clean repo and comparing the
> result against what this monorepo actually ships: the published scaffold was two doc types
> and three gates behind `template/`. A consumer taking the CLI path got front-matter and
> INDEX sync; chain referential-integrity, chain-status coherence, and the as-built gate were
> all present in the engine but never wired by the config `init` wrote. Three engine commits
> over 0.9.0 (`97f2a72`, `98851b0`, `855517a`), all in `init` and the bundled defaults — no
> change to `verify`, `eval`, `check`, or any command's contract.

## What shipped

Engine `govkit@0.10.0`, additive over 0.9.0 (minor bump — no API change, but a fresh `init`
now produces a materially different scaffold):

- **`init` derives its INDEX stubs from the scaffolded schema** instead of a hardcoded list of
  four. The premise printed at the top of every `govkit.yml` — doc dirs are config, not
  hardcoded in the CLI — did not hold for `init` itself: adding a type to the default schema
  silently left it un-scaffolded. `typeIndexStubs()` now reads `docs.types` and emits one stub
  per declared dir, titled from `idPrefix`.
- **Two doc types join the default schema**: `domain` (the ddd-flow modelling tree, recursive,
  no id↔filename convention) and `rel` (release records, with the `released` as-built sections).
  `init` scaffolds six INDEX dirs where 0.9.0 scaffolded four.
- **Gates that shipped inert are now partly wired by default**: `terminalStatuses` on rfc / us
  / rel, `refs:` on rel, and `requiredSectionsByStatus` on rfc / rel (RFC-0010).
  **Incompletely** — see Post-publish smoke: `refs:` never reached adr or us, and
  `terminalStatuses` never reached adr, so RFC-0003 and RFC-0008 stayed inert across the
  US→RFC edge. `govkit@0.10.1` closes that; 0.10.0 should be treated as superseded.
- **`ratification:` tiers ship in the default schema** (R0_owner / R1_packet / R2_lead), so the
  authority split the plugins' agents read is present from the first commit rather than being
  something a consumer has to discover in this repo and copy.
- **`settings.default.json` carries `extraKnownMarketplaces` + `enabledPlugins`** for
  swe-flow, ddd-flow, and design-flow. Claude Code offers the three authoring plugins on first
  open; declining still leaves every no-key surface working.

## Migration

None required, and nothing changes for an existing repo. `init` is idempotent and skips every
file already present, so re-running it on a 0.9.x scaffold creates only the two new INDEX dirs
and touches no existing `govkit.yml`.

Adopting the new gates in an existing repo is a deliberate edit, not an upgrade side-effect:
copy `terminalStatuses`, `refs:`, and `requiredSectionsByStatus` from a freshly scaffolded
`govkit.yml` into yours. Expect them to fail loudly the first time — that is the point, and it
is why they are opt-in for anyone already running.

## Rollback

`npm i -D govkit@0.9.0` — stateless engine, pin change only. A `govkit.yml` written by 0.10.0
loads unchanged under 0.9.0: the added keys are the same keys 0.9.0's loader already reads for
this repo's own config, so the gates simply stop firing rather than erroring.

## Post-publish smoke

Executed 2026-07-29 after workflow run 30442482865 (check → pack proof → npm publish →
GitHub Release, all green), real commands and real exit codes:

- `npm view govkit dist-tags` → `latest: 0.10.0`.
- `npx --yes govkit@latest init` in a clean git repo → **9 created**, six INDEX dirs
  (`product rfc adr issues domain releases`), exit 0. 0.9.0 created seven and four.
- The scaffolded `.claude/settings.json` offers all three plugins
  (`swe-flow@govkit, ddd-flow@govkit, design-flow@govkit`).
- **The smoke found the release incomplete.** Replaying the exact case that motivated it —
  a `us` at `done` whose `parent` is an `rfc` at `draft` — `npx govkit@0.10.0 verify` still
  returned **OK, 0 violations, exit 0**. Cause: `terminalStatuses` alone cannot fire
  RFC-0008, because coherence is checked across a *resolved* `refs:` edge, and the default
  schema declared `refs:` on `rel` only. A per-type diff against this repo's own `govkit.yml`
  then showed two gaps, not one: `refs:` missing on adr and us, `terminalStatuses` missing
  on adr.
- Both are closed in `govkit@0.10.1` (REL-0005), which re-runs this same case as its own
  smoke. **0.10.0 delivers the six-type scaffold and the plugin wiring, but not the
  referential gates its summary claimed** — pin 0.10.1 or later.
