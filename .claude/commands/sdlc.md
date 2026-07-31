---
description: >-
  Drive the doc chain PRD -> RFC -> ADR -> US -> Foundation -> Code, one
  reviewer-gated phase at a time; fan out file-disjoint implementer packages
  in dependency-ordered waves during the Code phase.
background: true
---

# /sdlc

A thin front onto the `.claude/workflows/sdlc.js` orchestration — the SDLC capstone that
drives the doc chain PRD -> RFC -> ADR -> US -> Foundation -> Code as one deterministic,
reviewer-gated script. Invoke `sdlc.js` with the caller's args (`feature`, `skipPrd`,
`skipAdr`); the workflow sequences the phases and gates each with `swe-flow:reviewer`. This
wrapper reimplements none of that logic — the `.js` stays the single source of truth.

## By-hand fallback — workflows are research-preview and globally disableable

Workflows are research-preview and globally disableable (`disableWorkflows` /
`CLAUDE_CODE_DISABLE_WORKFLOWS=1`), and cannot be bundled in a plugin (there is no
`workflows` field in `plugin.json`). If `sdlc.js` does not run, drive the SAME order BY HAND:
invoke the `swe-flow:spec-author` skill for each artifact (PRD -> RFC -> ADR -> US, each at
its START status, `owner: TBD`, with its INDEX.md row and `npx govkit verify` clean), then
author the shared Foundation and fan out `swe-flow:implementer` packages over file-disjoint
allowed paths in dependency-ordered waves. Nothing is lost — the govkit PreToolUse/Stop hook +
CI `govkit verify` enforce every gate regardless. The workflow is an accelerant, not the
source of truth.

This wrapper dispatches only the subagents `sdlc.js` already dispatches — `swe-flow:reviewer`
(the phase gates) and `swe-flow:implementer` (Foundation + the Code fan-out), with authoring
phases guided by the `swe-flow:spec-author` skill. It introduces no new agent type or skill.
It never flips a governed-doc `status:` and never assigns an owner — a reviewer verdict controls
CONTROL FLOW only; the status transition stays a human act (AGENTS.md § Agent constraints).
