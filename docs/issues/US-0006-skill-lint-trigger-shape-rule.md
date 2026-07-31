---
id: US-0006
title: skill-lint rule — a non-orchestrator skill must be trigger-shaped or declare disable-model-invocation
status: open
owner: TBD
date: 2026-07-31
priority: P1
parent: RFC-0032
---

As a govkit maintainer, I want `skill-lint.mjs` to fail when a non-orchestrator skill's
description is not trigger-shaped and the skill does not declare `disable-model-invocation`,
so that the terse, un-routable step skills the F2 finding is about are caught deterministically
by the gate instead of relying on a reviewer to notice them by eye.

## Context

This is RFC-0032 Phase 0 (F5), the systemic cause of F2. Today `lintSurface()` in
`scripts/skill-lint.mjs` enforces only `name`, `description`, the 1024-char budget, and
cosine description-collision — it never checks that a description is *trigger-shaped* (states
when to invoke, not just what it writes). The 9 ddd-flow step skills (the 8 numbered steps plus
`view`) carry a one-line "what it writes" description and no invocation guard, so the router
sees sibling candidates with no orchestration signal (RFC-0032 routing seam).

F5 is sequenced FIRST in the RFC because the rule *auto-flags* F2: once the rule ships, the gate
itself points at every terse step skill instead of trusting review. The rule's escape hatch is
the F2 fix — a skill that declares `disable-model-invocation: true` is orchestrator-only and is
exempt from the trigger-shape requirement.

Note: `lintSurface()` is currently invoked against `plugins/swe-flow` only (via `check-sync.mjs`
Check C and the script's own CLI default). Making the new rule observe the ddd-flow step skills
requires `bun run check` to lint `plugins/ddd-flow` as well — that wiring is part of this slice.

**Sequencing / hard edge.** Landing this rule alone turns `bun run check` RED against this repo's
own 9 ddd-flow step skills — that red is the rule working as designed. Green is restored only when
US-0007 (F2) marks those skills `disable-model-invocation: true`. Therefore this slice and US-0007
**co-land as one change-set** (F5's rule + F2's metadata together), or US-0007 lands immediately
after within the same PR. This slice is authored and reviewed first because its rule is the
deterministic proof that US-0007 is complete.

`Blocked by:` none. `Co-lands with:` US-0007 (its metadata is what satisfies this rule on the
repo's own corpus).

`Touches:` `scripts/skill-lint.mjs`, `scripts/skill-lint.test.mjs`, `scripts/check-sync.mjs`
(Check C already calls `lintSurface`), `package.json` (the `check` chain, if the ddd-flow lint
run is added there).

## Acceptance criteria

- [ ] `lintSurface()` gains a rule: a skill whose `name` is not the surface's orchestrator and
      whose `description` is not trigger-shaped raises an ERROR unless the skill declares
      `disable-model-invocation: true` in front-matter.
- [ ] "Trigger-shaped" is defined by a stated, documented heuristic in the code (e.g. the
      description contains an invocation cue — "use when", "trigger when", "use to", or a
      when-to-use clause) — not left implicit; the heuristic is written next to the rule.
- [ ] A skill that declares `disable-model-invocation: true` passes the rule regardless of its
      description shape (the orchestrator-only exemption).
- [ ] The orchestrator skill of a surface (e.g. `ddd-flow:design`) is exempt from the rule; how
      the orchestrator is identified is stated in the code.
- [ ] `bun run check` runs the rule against `plugins/ddd-flow` (not swe-flow alone), so the 9
      ddd-flow step skills are in scope.
- [ ] `scripts/skill-lint.test.mjs` gains cases proving: (a) a terse non-orchestrator skill with
      no guard FAILS; (b) the same skill with `disable-model-invocation: true` PASSES; (c) a
      trigger-shaped non-orchestrator skill PASSES; (d) the orchestrator PASSES with a terse
      description. The test file is wired into the `check` script (check-sync Check D).
- [ ] With US-0007 co-landed, `bun run check` is green — the rule fires on nothing in this repo
      because every ddd-flow step skill is either trigger-shaped or guarded.
- [ ] No change to any `govkit` CLI subcommand — this lint scores THIS repo's plugins only and
      stays a repo-local script, never a consumer-facing check.

## Non-goals

- Rewriting the ddd-flow step-skill descriptions to be richer trigger sets — RFC-0032 rejects
  that (nine skills competing to win one request deepens the mis-fire); the guard, not richer
  triggers, is the fix. Marking those skills is US-0007's job.
- Enforcing this rule against a consumer's own skills through the `govkit` CLI.
- Any change to the cosine-collision or char-budget rules already in `lintSurface()`.
