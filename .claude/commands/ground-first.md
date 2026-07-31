---
description: >-
  Upstream capstone: DIAGNOSE the flow-block, GROUND-INVENTORY the legacy corpus,
  author a coarse C4-L1 VISION map, emit a GROUNDING-READINESS signal and HALT before
  a breadth-first DECOMPOSE, run a grounding-driven triangulated decompose to a CANDIDATE
  model, then author ONE walking-skeleton RFC and hand off to the sdlc workflow.
  Warning-first; proposes into every human ratification gate and flips nothing.
background: true
---

# /ground-first

A thin front onto the `.claude/workflows/ground-first.js` orchestration — the UPSTREAM
capstone, the mirror image of `sdlc.js`. It automates the half that produces a grounded input:
DIAGNOSE -> GROUND-INVENTORY -> VISION-FIRST -> DECOMPOSE(grounding-driven) ->
WALKING-SKELETON, then hands off to the `sdlc` workflow. Invoke `ground-first.js`; it makes
the grounding ratio VISIBLE and HALTS before a breadth-first decompose rather than run it on
unconfirmed evidence. This wrapper reimplements none of that logic — the `.js` stays the single
source of truth.

## By-hand fallback — workflows are research-preview and globally disableable

Workflows are research-preview and globally disableable (`disableWorkflows` /
`CLAUDE_CODE_DISABLE_WORKFLOWS=1`), and cannot be bundled in a plugin (there is no
`workflows` field in `plugin.json`). If `ground-first.js` does not run, drive the SAME order
BY HAND:

1. Fan out readers to run `ddd_state.py --json` + `ddd_check.py --json` and
   `npx govkit verify` / `npx govkit eval` capturing EXIT codes, and read LEARNING-LOOP.md +
   journals for the stall edge; join them into one warning-only diagnose report by hand.
2. Run the `ddd-flow:2-discover` DISCOVER mode over the legacy corpus and validate with
   `mine_coverage.py --strict`.
3. Follow `ddd-flow:1-understand` then a COARSE `ddd-flow:3-decompose`, and land a C4-L1
   vision map via `swe-flow:spec-author` at draft.
4. COMPUTE the grounding ratio yourself and STOP if confirmed events/rules are below floor —
   do NOT decompose on thin grounding.
5. Follow `ddd-flow:3-decompose` + measure-playbook Stages 6/7 to emit a CANDIDATE model at
   draft.
6. Author ONE thin walking-skeleton RFC via `swe-flow:spec-author` + `swe-flow:work-breakdown`,
   then run the `sdlc` workflow.

Nothing is lost — the govkit PreToolUse/Stop hook + CI `govkit verify` enforce every structural
gate regardless. The workflow is an accelerant, not the source of truth.

This wrapper dispatches only the subagents `ground-first.js` already dispatches —
`swe-flow:reviewer`, `swe-flow:red-teamer`, `swe-flow:doc-keeper`, `swe-flow:analyst`, with the
authoring/discovery phases guided by the `ddd-flow:1-understand`, `ddd-flow:2-discover`,
`ddd-flow:3-decompose`, `swe-flow:spec-author`, and `swe-flow:work-breakdown` skills. It
introduces no new agent type or skill. It is warning-first: it never flips a governed-doc
`status:` and never assigns an owner — every draft lands `owner: TBD` at its START status, and
the terminal flips (the vision PRD, the walking-skeleton RFC at handoff) stay a human act
(AGENTS.md § Agent constraints).
