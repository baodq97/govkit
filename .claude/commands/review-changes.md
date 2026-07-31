---
description: >-
  Review the current branch diff across {correctness, reuse, governance} via
  swe-flow:reviewer, adversarially verify each finding, and surface only the issues that
  survive refutation.
context: fork
---

# /review-changes

A thin front onto the `.claude/workflows/review-changes.js` orchestration — the review->verify
pipeline that reviews the current branch diff across independent dimensions
(`correctness`, `reuse`, `governance`), then adversarially verifies each finding, surfacing only
the issues that survive refutation. Invoke `review-changes.js` (pass your own `dimensions` via
args or take the default three); the pipeline has no barrier — a dimension's findings verify as
soon as that dimension's review completes. This wrapper reimplements none of that logic — the
`.js` stays the single source of truth.

## By-hand fallback — workflows are research-preview and globally disableable

Workflows are research-preview and globally disableable (`disableWorkflows` /
`CLAUDE_CODE_DISABLE_WORKFLOWS=1`) and cannot be bundled in a plugin (there is no `workflows`
field in `plugin.json`). If `review-changes.js` does not run, drive the SAME order BY HAND: for
each dimension dispatch `swe-flow:reviewer` over the diff (inspect both the committed branch diff
and any uncommitted/untracked changes — untracked files are NOT in `git diff`); for each finding,
dispatch a second `swe-flow:reviewer` to refute it, defaulting to refuted when it cannot be
reproduced; keep only the findings that survive. Nothing is lost — the govkit PreToolUse/Stop
hook + CI `govkit verify` gate every governed doc regardless. The workflow is an accelerant, not
the source of truth.

This wrapper dispatches only the subagent `review-changes.js` already dispatches —
`swe-flow:reviewer` (one per dimension for review, a second per finding for refutation). It
introduces no new agent type or skill. It only triages code review: it never flips a governed-doc
`status:` and never assigns an owner (AGENTS.md § Agent constraints).
