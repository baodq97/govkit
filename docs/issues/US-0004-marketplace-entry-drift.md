---
id: US-0004
title: swe-flow marketplace entry drifted from plugin.json — version and description stale
status: in-progress
owner: baodq97
date: 2026-07-08
priority: P2
---

As a swe-flow marketplace consumer, I want the marketplace entry to always match the
plugin's own `plugin.json` surface, so that I see (and can install) the plugin the repo
actually ships instead of a stale description of a previous release.

## What happened (observed in this repo)

`plugins/swe-flow/.claude-plugin/plugin.json` is at `version: 0.6.0` — bumped in commit
`2efd8bd`, which added the `substance-judge` skill and the `judge` agent (RFC-0019) and
updated the plugin description to name both. `.claude-plugin/marketplace.json` still lists
the swe-flow entry at `version: 0.5.0`, with a description that omits `substance-judge`
and the `judge` agent entirely.

This is a missed sync, not intentional independent versioning: git history shows the two
files moved in lockstep at 0.3.0, 0.4.0, and 0.5.0 — every prior plugin bump updated both.
The 0.6.0 bump is the first that touched only `plugin.json`.

## Impact

Marketplace consumers browse the marketplace entry, not the plugin's own manifest. With
the entry frozen at 0.5.0, they may never see that the 0.6.0 update (the keyed Layer-3
substance evaluation) exists, and the stale description misrepresents the plugin's skill
and agent surface.

## Acceptance criteria

The class rule matters as much as the instance fix (working-discipline item 7: record the
one concrete rule that makes the *class* impossible, not just patch the escape).

- [ ] **Instance fix:** the swe-flow entry in `.claude-plugin/marketplace.json` carries
      `version: 0.6.0` and a description matching the current `plugin.json` surface —
      including `substance-judge` and the `judge` agent.
- [ ] **Class rule (version sync):** a deterministic repo check in `scripts/`, wired into
      the root `package.json` `"check"` chain, fails when
      `plugins/swe-flow/.claude-plugin/plugin.json` and the swe-flow entry in
      `.claude-plugin/marketplace.json` disagree on `version`. Given the two files agree,
      when `bun run check` runs, then the check passes; given they disagree, then it fails
      naming both files and both versions.
- [ ] **Class rule (root↔template sync):** the same check byte-compares an **explicit
      allowlist** of intentionally-identical root↔template file pairs —
      `.claude/workflows/sdlc.js` ↔ `template/.claude/workflows/sdlc.js` and
      `.claude/hooks/session-freshness.mjs` ↔ `template/.claude/hooks/session-freshness.mjs`.
      Allowlist only — no directory-wide sweep — because `template/.github/workflows/ci.yml`
      intentionally differs from the root CI workflow and must not be flagged.
- [ ] The check runs with **no API key** and no network (root `AGENTS.md` constraint: the
      deterministic gate/check layer is keyed-nothing); it is plain file/JSON comparison.
- [ ] The check does **not** couple the govkit CLI version (`packages/govkit/package.json`,
      currently 0.7.0): the CLI is a separate deliverable and versions independently of
      the plugin — asserting plugin↔CLI version equality would be a false positive.

## Non-goals

- Reworking how the marketplace entry is generated (it stays hand-maintained; the check
  only makes silent drift impossible).
- Extending the byte-compare beyond the named allowlist pairs.
