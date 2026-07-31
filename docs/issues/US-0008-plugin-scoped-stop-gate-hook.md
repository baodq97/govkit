---
id: US-0008
title: Plugin-scoped Stop hook so a plugin-only consumer gets the gate (with a LIVE cross-source dedup probe first)
status: open
owner: TBD
date: 2026-07-31
priority: P1
parent: RFC-0032
---

As a consumer who enables `swe-flow@govkit` (or ddd-flow / design-flow) from the marketplace but
never runs `govkit init`, I want the plugin itself to carry the Stop gate, so that I do not end up
with the authoring skills and agents and **zero enforcement** — which is the F1 correctness gap.

## Context

This is RFC-0032 Phase 1 (F1), the enforcement seam. Today the only carrier of the PreToolUse/Stop
gate is the consumer's `settings.json`, written once by `init`
(`packages/govkit/templates/settings.default.json`). None of the three
`plugins/*/.claude-plugin/plugin.json` files carries a `hooks` block, and there is no
`plugins/*/hooks/hooks.json`. So the most attractive adoption path — enable the plugin — delivers
surfaces with no gate.

The chosen direction (RFC-0032 F1 option (a), (b) and (c) rejected) is a plugin-bundled hook that
shells the **byte-identical** Stop command the settings template already runs:

```
npx --yes govkit check --hook --root "${CLAUDE_PROJECT_DIR}"
```

`${CLAUDE_PLUGIN_ROOT}` is deliberately NOT used: the command resolves the engine through `npx` and
roots on `${CLAUDE_PROJECT_DIR}`, so byte-identity with the template — not a plugin-local path — is
what any dedup would key on.

### The open question this slice must resolve BEFORE writing the hook

RFC-0032's open question (and the F1 trade-off) is unresolved in the best-practice corpus: Claude
Code's documented hook dedup ("Identical hook handlers … run only once") is scoped to *settings
locations*; the corpus does **not** confirm that a `[Plugin]`-source Stop hook dedups against a
`[Project]`/`[Local]`-source hook. A plugin hook is always-on when the plugin is enabled, so in a
consumer that ALSO ran `init` it can double-fire against the identical settings hook.

**This must be verified live, first, and the probe is a blocking step of this slice.** The hook is
not authored until the probe's result is recorded, because the result decides whether the mirror
pair below is load-bearing (dedup spans sources → byte-identity collapses the pair) or merely a
graceful-degradation story (dedup does not span sources → both fire, but the command is idempotent,
so a double-fire is duplicate work, not a contradiction).

`Blocked by:` none in artifact terms — but its acceptance is gated on the live probe (below), which
must complete and be recorded before the hook is written. Independent of US-0006/US-0007 (disjoint
files → parallel-safe with them).

`Touches:` one of `plugins/*/.claude-plugin/plugin.json` (add a `hooks` block) **or**
`plugins/*/hooks/hooks.json` (new file) per plugin; `scripts/check-sync.mjs` (a new mirror-pair
entry); `scripts/check-sync.test.mjs`. Reads `packages/govkit/templates/settings.default.json` as
the byte source of truth (does not modify it).

## Acceptance criteria

- [ ] **BLOCKING — live dedup probe runs and is recorded BEFORE the hook is written.** In a scratch
      consumer that has BOTH a `[Plugin]`-source Stop hook and an identical `[Project]`/`[Local]`-source
      Stop hook, observe whether the command runs once or twice on a single Stop. The observed
      answer (dedups-across-sources: yes/no) is written into this US or a linked note with the
      evidence (how it was observed).
- [ ] The plugin-bundled Stop hook shells the command **byte-identical** to the Stop hook in
      `packages/govkit/templates/settings.default.json`:
      `npx --yes govkit check --hook --root "${CLAUDE_PROJECT_DIR}"` — same flags, same root, no
      `${CLAUDE_PLUGIN_ROOT}` substitution.
- [ ] A `check-sync.mjs` mirror pair pins the plugin hook command byte-identical to the settings
      template's Stop command, so a future edit to one and not the other fails the gate (the same
      guard class RFC-0031/US-0004 use for template mirror pairs).
- [ ] `scripts/check-sync.test.mjs` gains a case proving the new mirror pair FAILS when the plugin
      command and the template command diverge, and PASSES when they match. The test is wired into
      the `check` chain (check-sync Check D).
- [ ] A plugin-only consumer (plugin enabled, `init` never run) gets a Stop gate — demonstrated by
      enabling the plugin in a scratch project with no `.claude/settings.json` gate and observing the
      Stop hook fire `govkit check`.
- [ ] The decision recorded by the probe is reflected in the US: if dedup spans sources, the mirror
      pair is documented as the correctness requirement that lets the two hooks collapse; if it does
      not, the double-fire is documented as idempotent duplicate work, not a contradiction.
- [ ] `bun run verify` remains green — this is plugin/authoring + script change, no governed-doc edit.

## Non-goals

- Bundling a gate binary inside the plugin for `npx`-free self-containment — rejected in RFC-0032
  (option (b)): it violates the single-engine invariant (PRD-0001 / RFC-0001), creating a second,
  drifting copy of the gate. `npx govkit` staying resolvable on PATH/registry is an accepted
  limitation — this slice narrows the gap, it does not make the plugin fully standalone (RFC-0032
  open question "F1 self-containment", recorded not resolved).
- Relocating or deleting the settings-template gate — the template gate stays; this slice adds a
  second, byte-identical carrier.
- Adding the plugin hook to only one plugin if the probe/design calls for all three — scope of which
  plugins carry the hook is settled during implementation, but the mirror-pair and byte-identity
  requirements apply to whichever do.
- Resolving the `--docs-root` remap breadth (that is F2's open question, not F1's).
