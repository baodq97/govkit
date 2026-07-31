---
id: REL-0007
title: govkit 0.11.0 — plugin-contract conformance (RFC-0032) + init scaffolds path-scoped rules
status: draft
owner: TBD
date: 2026-07-31
---

> An audit against a version-pinned Claude Code best-practice corpus found the three plugins were
> authored to an earlier plugin/skill/agent/hook contract than Claude Code now exposes — in two
> places (F1, F2) doing work the harness would do deterministically, and in one (F1) leaving a
> plugin-only consumer with authoring surfaces and **zero enforcement**. RFC-0032 fixed all eight
> findings across four phases, each slice authored then adversarially verified; this release ships
> them. Drafted at `status: draft`; the flip to released is the owner's, after `npm publish`.

## What shipped

Engine `govkit@0.11.0` (minor — one new consumer-facing scaffold output) + the two plugins that
changed. `design-flow` is untouched.

- **Engine 0.11.0 — `init` scaffolds path-scoped rules (F8).** `npx govkit init` now emits
  `.claude/rules/governed-docs.md` (a `paths: docs/**` lazy-loaded rule file) alongside the slimmed
  `AGENTS.md`, so the governed-doc rules load only when a session touches `docs/**` instead of every
  session. `packages/govkit/src/commands/init.ts` gained the scaffold entry; a content-preservation
  gate (`scripts/agents-rules.test.mjs`) pins that no load-bearing rule can silently vanish across
  the split.
- **swe-flow 0.11.1 → 0.12.0.** Ships the deterministic Stop gate as a **plugin hook**
  (`hooks/hooks.json`) so a marketplace consumer who never runs `init` still gets enforcement
  (F1); a skill-scoped PreToolUse **freeze** hook on `gate-close` that denies an agent status flip
  at the tool boundary (F-freeze); `AskUserQuestion`-structured owner decisions (F9);
  `skills:`-preload on the three mirror agents (F3); four `/` command wrappers over the workflows
  (F-cmd); and live `!verify` state + `LEARNING-LOOP` Gotchas in the gate/authoring skills (F7/F6).
- **ddd-flow 0.2.0 → 0.3.0.** The nine step skills (`1-understand`…`8-code`, `view`) are
  `disable-model-invocation: true` + `paths: docs/domain/**`, so `ddd-flow:design` is the sole
  router and the steps cannot mis-fire (F2). `skill-lint` now errors on a non-orchestrator skill
  whose description is neither trigger-shaped nor guarded (F5) — the systemic guard against F2.

Full detail and the seven as-built deviations (no cross-source hook dedup — measured; the
`replace_all` under-block found and fixed; F7 dropping `allowed-tools`; …) are in
`docs/rfc/RFC-0032-plugin-contract-conformance.md` (`implemented`).

## Migration

None required. `init` now emits `.claude/rules/`, but it **never rewrites an existing consumer
config** — a repo scaffolded by 0.10.2 keeps its whole `AGENTS.md` and passes 0.11.0's gate
unchanged. To adopt the path-scoped split, re-run `npx govkit init` in a repo that has no
`.claude/rules/` yet, or add the rule file by hand. The plugin changes are opt-in the moment a
consumer updates the plugin from the marketplace.

## Rollback

`npm i -D govkit@0.10.2` — stateless engine, pin change only. Nothing a 0.11.0 `init` scaffolds is
unknown to 0.10.2's loader (an extra `.claude/rules/*.md` is inert to it). The plugin hooks travel
with plugin-enable state; disabling the plugin removes them with no migration.

## Pre-publish smoke (executed 2026-07-31)

`npm pack` on `packages/govkit` → `govkit-0.11.0.tgz`, installed into a clean `mktemp -d` git repo
outside this monorepo, driven exactly as a consumer would. Both directions checked:

- **The 0.11.0 feature is live in the shipped artifact.** `npx govkit init` scaffolded
  `.claude/rules/governed-docs.md` (the F8 output) alongside `AGENTS.md`, `govkit.yml`, and the six
  governed-doc dirs.
- **Green on a clean scaffold.** `npx govkit verify` → `OK — 0 doc(s) checked, 0 violations`,
  **exit 0**.
- **Proven fallible.** An RFC authored into `docs/rfc/` with the required `owner:` key removed →
  `npx govkit verify` → `FAIL — 1 doc(s) checked, 1 violation, 1 blocking` naming the missing key,
  **exit 1**. The gate still blocks the thing it exists for.

Post-publish smoke (`npm view govkit version` → `0.11.0`, `npx --yes govkit@latest` in a clean
repo) is recorded here by the owner after `npm publish`, before the `draft → released` flip.
