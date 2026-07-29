---
id: REL-0003
title: govkit 0.9.0 — report --aging brings time-in-status to the lifecycle view
status: released
owner: baodq97
date: 2026-07-29
parent: RFC-0029
---

> Ships RFC-0029: the lifecycle report gains the TIME dimension. `govkit report --aging`
> dates every governed doc's current `status:` line from git blame, so a doc stuck at
> `proposed` for a quarter stops rendering identically to one under review for a week.
> Two engine commits over 0.8.0 (`efd5e4e`, `1487b73`); everything else in the line is
> docs, plugin skills and governance record.

## What shipped

Engine `govkit@0.9.0`, additive over 0.8.0 (minor bump):

- **`report --aging`** (RFC-0029): per-doc `statusSince` (ISO date) + `ageDays`, computed
  by blaming the ONE top-level `status:` line — a body edit never resets the clock. The
  default `report` path stays git-free and byte-identical (pinned by tests); git-absent
  degrades to a surfaced note on every rendering, exit 0 always.
- **Opt-in `aging:` config** per type (`aging: {proposed: 90}`): only configured
  (type, status) pairs ever get the advisory `⚠ over threshold` mark. No defaults ship —
  a threshold is a repo's own review-cadence judgment. Malformed maps fail loud at config
  load (the `tiers:` stance).
- **`--pr-body --aging`**: the idempotent PR-body block gains a dates-only `since` column;
  `ageDays` and `⚠` derive from "now" and are banned from that surface, so RFC-0021's
  byte-identical splice contract survives.
- Six e2e tests (`report-aging.test.ts`) pin the RFC's Impact list, including
  green-by-construction cases: untracked docs surface as age-less rather than dropping,
  and no-flag output is byte-unchanged against 0.8.0.

## Migration

None required. `--aging` is a new opt-in flag; `aging:` is a new optional config key. A
0.8.x consumer's config and every default output run byte-identically. New strictness
exists only at config load: a malformed `aging:` map (non-number, negative, or list) now
fails loud instead of being silently ignored.

## Rollback

`npm i -D govkit@0.8.0` — stateless engine, pin change only. Configs that added `aging:`
must drop the key on rollback (0.8.0's loader does not know it; an unknown key is
passthrough-ignored there, so rollback without dropping it is also safe — the flag simply
disappears).

## Post-publish smoke

Executed 2026-07-29 after workflow run 30423542973 (check → pack:proof → npm publish →
GitHub Release, all green), real commands and real exit codes:

- `npm view govkit dist-tags` → `latest: 0.9.0`.
- The published bundle gates **this repo**: `npm install govkit@0.9.0` into a scratch dir,
  then its `node_modules/.bin/govkit check` from the repo root → verify OK 58 docs /
  0 violations, eval floor 100% (avg 99/100), **exit 0**.
- The shipped feature works from the published bundle: the scratch bin's
  `report --aging` from the repo root renders real ages (`PRD-0001 — 21d in status`,
  `oldest: RFC-0001 — 57d`), exit 0.
- Clean-dir scaffold: the scratch bin's `init` in a fresh mktemp dir, then `check` →
  exit 0.
