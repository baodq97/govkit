---
id: REL-0002
title: govkit 0.8.0 — the design-tree, waiver and citation features reach npm; the engine gates its own repo again
status: draft
owner: baodq97
date: 2026-07-29
parent: RFC-0016
---

> The release that closes `F-ENGINE-SKEW`: since `b931315` this repo's own corpus has
> depended on engine features (named design trees, `idFilenameConvention: false`) that the
> published 0.7.1 does not have — `npx govkit check` failed on govkit itself, caught by the
> gate-loop reviewer in packet `wf_885a7193-6ae`. 0.8.0 publishes the 6-commit line
> `v0.7.1..HEAD` so the published binary and the repo it governs agree again.

## What shipped

Engine `govkit@0.8.0`, additive over 0.7.1 (minor bump):

- **Named design trees** (`b931315`/`776bb18`): per-type `recursive: true` walks a nested
  tree; `idFilenameConvention: false` lets a tree name files after concepts while ids stay
  numbered handles; the `domain` doc-type pattern this repo's own `docs/domain` uses.
- **Waivers** (RFC-0014 seam closed): a `waivers:` block with mandatory `expires` /
  `authorized_by`; a blocking finding covered by an active waiver is reported-but-not-fatal,
  marked `waivedBy` in `--json` and `waived` in the journal — a signed exception never reads
  as a broken gate.
- **Citation check** (opt-in `--check-citations`): every `path:line` claim a governed doc
  makes is resolved against the code it cites; off by default, out of the no-key blocking
  path until calibrated.
- **`doctor`** (new command) and **standalone `adopt`**: the self-explaining CLI — config
  state, per-type counts, ungoverned-markdown listing, next-action ladder; per-command help
  pages, `Fixes:` remedy tables and computed `Next:` footers.
- **Kind vocabulary grows to eleven** (`citation`, `waiver`) by RFC-0014's declared growth
  mechanism; `tiers:` accepts the new keys.
- **Internals** (behaviour-identical, deep-finding sweep): cli split into help/render/cli;
  one `walkGovernedDocs` corpus walk shared by six readers; `effectiveRequired` shared by
  verify/adopt/audit-write (the excludeBase hook-blocks-what-the-gate-exempts bug fixed);
  drift git spawns 74 → 30; pattern caches. 378 tests green; `pack:proof` now runs in the
  release workflow itself.
- **Templates ship the unified consumer surface**: `govkit.default.yml` +
  `settings.default.json` (three-hook shape) + `session-freshness.default.mjs`, read by
  `init` at runtime — one source of truth with the `template/` scaffold, check-sync-guarded.

## Migration

None required. All config surface is additive (`recursive`, `idFilenameConvention`,
`waivers:`, new `tiers:` keys, `--check-citations` opt-in). A 0.7.x consumer's config runs
byte-identically; new strictness exists only at config LOAD (malformed `waivers:` and
non-boolean `recursive`/`idFilenameConvention` now fail loud instead of being ignored).

## Rollback

`npm i -D govkit@0.7.1` — stateless engine, pin change only. Journal lines written by 0.8.0
carry only additive fields (`waived`) older readers ignore. Configs using the new keys must
drop them on rollback (0.7.1 ignores `recursive`/`idFilenameConvention` silently — the exact
skew this release closes; see `F-ENGINE-SKEW`).

## Post-publish smoke

Executed 2026-07-29 after workflow run 30416333171 (build → test → pack:proof → npm publish,
success), real commands and real exit codes:

- `npm view govkit dist-tags` → `latest: 0.8.0`.
- The published bundle gates **this repo**: `npm install govkit@0.8.0` into a scratch dir,
  then its `node_modules/.bin/govkit check` from the repo root → verify OK 55 docs /
  0 violations, eval floor 100%, **exit 0** — the F-ENGINE-SKEW closer. (In-repo
  `npx govkit` resolves the workspace and 127s; the scratch-installed bin is the honest
  spelling of "a consumer's govkit".)
- Clean-dir scaffold: `govkit init` in a fresh mktemp dir → gate exit 0; the three-hook
  `settings.json` AND `.claude/hooks/session-freshness.mjs` are scaffolded (the 0.8.0
  template unification); authoring a doc missing `owner:` flips the gate to exit 1.
- All five consumer repos exit 0 under the published 0.8.0 binary: alert-triage-agent,
  customs-platform, mandat, augur, demo-foundation-tobacco-industry.
