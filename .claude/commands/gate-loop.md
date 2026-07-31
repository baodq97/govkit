---
description: >-
  Run the five-station gate loop over one or more governed docs whose status the owner
  intends to advance: verify the gate, reconcile doc drift, red-team each flip, return
  one ratification packet.
context: fork
---

# /gate-loop

A thin front onto the `.claude/workflows/gate-loop.js` orchestration — the five-station gate
loop that runs BEFORE an owner advances a governed doc's status: VERIFY (an independent gate
re-run + doc-keeper drift reconcile), then LIVE (build/pack and run the real artifact — required
at a release gate), then RED-TEAM (one adversarial pass per flip candidate). Invoke
`gate-loop.js` with the caller's args (`verifyCmd`, `changeSummary`, `flips`, `gate`, `live`);
it assembles one ratification packet and logs it. This wrapper reimplements none of that logic —
the `.js` stays the single source of truth.

## By-hand fallback — workflows are research-preview and globally disableable

Workflows are research-preview and globally disableable (`disableWorkflows` /
`CLAUDE_CODE_DISABLE_WORKFLOWS=1`), and cannot be bundled in a plugin (there is no
`workflows` field in `plugin.json`). If `gate-loop.js` does not run, drive the SAME order BY
HAND: dispatch `swe-flow:reviewer` to re-run the real gate from scratch and prove it can fail;
`swe-flow:doc-keeper` to propose (not apply) exact reconcile edits; at a release gate
`swe-flow:verifier` to build/pack and run the real artifact in a scratch dir; then one
`swe-flow:red-teamer` per flip candidate. Assemble the packet by hand. The owner ratifies; the
status flip is a SEPARATE accept commit. Nothing is lost — the govkit PreToolUse/Stop hook + CI
`govkit verify` enforce every gate regardless. The workflow is an accelerant, not the source of
truth.

This wrapper dispatches only the subagents `gate-loop.js` already dispatches —
`swe-flow:reviewer`, `swe-flow:doc-keeper`, `swe-flow:verifier`, and `swe-flow:red-teamer`. It
introduces no new agent type or skill. It never flips a governed-doc `status:` and never assigns
an owner — the human ratifies, and the accept commit lands separately citing the in-session
authorization (AGENTS.md § Agent constraints).
