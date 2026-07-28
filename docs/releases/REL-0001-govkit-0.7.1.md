---
id: REL-0001
title: govkit 0.7.1 — the engine on npm, backfilled as the first governed release record
status: draft
owner: baodq97
date: 2026-07-29
parent: RFC-0016
---

> Backfilled 2026-07-29: the `rel` doc type existed with zero documents while the engine
> shipped 0.3.0 → 0.7.1 unrecorded — a gate that had never fired. This record covers the
> release currently live on npm (`0.7.1`, tag `v0.7.1`, 2026-07-09, commit `5b5b73d`); its
> facts are reconstructed from the tag, the npm registry, and the release workflow, and the
> post-publish smoke below was RE-RUN at backfill time rather than asserted from memory.

## What shipped

Engine `govkit@0.7.1` to the public npm registry (`npm view govkit dist-tags` → `latest:
0.7.1`; versions on the registry: 0.3.0, 0.3.1, 0.6.0, 0.7.0, 0.7.1). The published artifact
is the tsup single-bundle `dist/cli.js` plus `templates/` (the `files:` allowlist), Node ≥ 20,
no runtime dependencies (`yaml` inlined via `noExternal`). Feature surface at that version:
verify / eval / check with `--hook` and `--journal`, drift with content-derived
`reconciled:` claims, ledger, calibrate, stale, report `--pr-body`, `init` (with its
`--adopt` migration lane), audit-write — the RFC-0001…0022 line as recorded in
`docs/ledger.json` (RFC-0023's config-generality features were implemented at the tag;
`doctor` and the standalone `adopt` command land AFTER this release and are not in the
published 0.7.1 bundle).

## Migration

None. 0.7.x is additive over 0.6.0 for consumers: no config key removed or renamed, no exit-
code contract change. A consumer pinning `govkit@^0.6` upgrades by bumping the pin; absent
`tiers:` / `waivers:` blocks keep byte-identical behaviour.

## Rollback

`npm i -D govkit@0.6.0` (previous dist-tag survivor on the registry) — the engine is
stateless, so rollback is purely a pin change; `.govkit/journal.jsonl` lines written by 0.7.x
carry only additive fields older readers ignore.

## Post-publish smoke

Re-run at backfill time (2026-07-29), from a clean scratch dir:

- `npm view govkit dist-tags` → `latest: 0.7.1` — the registry serves the version this record
  describes.
- The five consumer repos on this machine run the gate green against the shipped surface:
  alert-triage-agent (19 docs), customs-platform (28), mandat (25 — Go repo, CI-pinned
  `govkit@0.7.1` via `npx --yes govkit@0.7.1 check`), measured 2026-07-28 and recorded in
  `docs/ledger.json` `F-R1-N3`.
- `--provenance` remains OFF (private source repo; `F-R0-PROVENANCE` stays red until public).
