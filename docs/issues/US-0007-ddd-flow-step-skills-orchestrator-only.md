---
id: US-0007
title: Mark the 9 ddd-flow step skills orchestrator-only (disable-model-invocation + paths)
status: open
owner: TBD
date: 2026-07-31
priority: P1
parent: RFC-0032
---

As an operator running the ddd-flow domain-modelling loop, I want the 8 numbered step skills and
`view` to be reachable only through the `ddd-flow:design` orchestrator (or a deliberate `/` type),
never auto-routed by the model, so that a domain-modelling request cannot mis-fire into one of 9
sibling step skills and the orchestrator stays the single router.

## Context

This is RFC-0032 Phase 1 (F2), the correctness half of the routing seam. The 9 non-orchestrator
ddd-flow skills — `1-understand … 8-code` plus `view` — carry a one-line "what it writes"
description and no invocation guard, so they are auto-discoverable, cannot win routing against
each other, and can mis-fire outside the orchestrator (RFC-0032 F2).

The chosen fix (RFC-0032, F2/F5 alternatives) is to add two front-matter keys to each of the 9:

- `disable-model-invocation: true` — the **primary guard**. It blocks *auto*-routing while
  leaving the skill user-typable via `/ddd-flow:3-decompose`, which an operator legitimately does
  to resume mid-loop. (`user-invocable: false` was rejected as too far — it removes a real
  affordance.)
- `paths: docs/domain/**` — a scoping **belt-and-suspenders**, not an independent guard. It
  narrows *where* the skill could ever apply; it does not by itself suppress auto-invocation the
  way `disable-model-invocation` does.

`ddd-flow:design` (the orchestrator) and `ddd-flow:view` — note the RFC scopes F2 to the 8
numbered steps **plus `view`**, i.e. `view` IS one of the 9 and gets the guard; `design` is the
orchestrator and is left untouched.

**Sequencing / hard edge.** This slice's metadata is exactly what satisfies the US-0006 (F5) lint
rule on this repo's own corpus. US-0006 landing alone turns `bun run check` red against these 9
skills; this slice restores green. The two **co-land as one change-set** (F5 rule + F2 metadata),
or this slice lands immediately after US-0006 within the same PR.

`Blocked by:` none (the metadata edit stands alone and can be authored before or with US-0006).
`Co-lands with:` US-0006 — its rule is the deterministic proof this slice is complete.

`Touches:` `plugins/ddd-flow/skills/1-understand/SKILL.md`,
`.../2-discover/SKILL.md`, `.../3-decompose/SKILL.md`, `.../4-connect/SKILL.md`,
`.../5-strategize/SKILL.md`, `.../6-organise/SKILL.md`, `.../7-define/SKILL.md`,
`.../8-code/SKILL.md`, `plugins/ddd-flow/skills/view/SKILL.md` (9 SKILL.md files). Does NOT touch
`plugins/ddd-flow/skills/design/SKILL.md`.

## Acceptance criteria

- [ ] Each of the 9 step-skill SKILL.md files (`1-understand`, `2-discover`, `3-decompose`,
      `4-connect`, `5-strategize`, `6-organise`, `7-define`, `8-code`, `view`) has
      `disable-model-invocation: true` added to its front-matter.
- [ ] Each of the same 9 files has `paths: docs/domain/**` added to its front-matter.
- [ ] `plugins/ddd-flow/skills/design/SKILL.md` (the orchestrator) is NOT modified — it keeps
      auto-routing so it remains the single router.
- [ ] Each edited skill remains user-typable via `/` (the guard blocks model auto-invocation only,
      not manual `/ddd-flow:<step>` invocation); this is asserted against the `disable-model-invocation`
      semantics, not `user-invocable: false`.
- [ ] After this slice + US-0006 co-land, the US-0006 lint rule finds zero violations among the
      ddd-flow skills, and `bun run check` is green.
- [ ] `bun run verify` remains green — this change is plugin authoring metadata and touches no
      governed doc.

## Non-goals

- Adding `user-invocable: false` to any step skill — rejected in RFC-0032 (it removes the operator's
  resume-mid-loop affordance).
- Giving each step skill a richer `when_to_use` trigger set — rejected in RFC-0032 (deepens the
  9-way collision this slice exists to resolve).
- Making `paths:` config-derived from a remapped `--docs-root` (RFC-0007). RFC-0032 records this as
  an open question deferred to Phase 1 detail; this slice uses the literal `docs/domain/**` glob and
  leaves config-derivation to a later change.
- Touching the swe-flow or design-flow surfaces.
