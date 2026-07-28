---
id: RFC-0013
title: Hook-wireable gates — a blocking-hook contract for verify/eval/check (--hook)
status: implemented
owner: baodq97
date: 2026-07-07
reconciled: sha256:62d74946f823334b
governs:
  - packages/govkit/src/cli.ts
  - template/.claude/settings.json
---

> Makes the gate consumable as an in-loop agent guardrail, not just a CI step: a `--hook` flag
> on `verify`/`eval`/`check` that maps gate failure to **exit code 2** (the blocking-hook
> convention) and routes the human report to **stderr** so a harness relays violations straight
> to the model. Pure exit-code/stream routing at the cli edge — the no-key invariant holds.
> The owner delegated approval in-session and implementation ships in the same PR, so this RFC
> lands directly at `status: implemented`, the RFC-0012 precedent.

## Summary

Agent harnesses already speak a deterministic guardrail protocol: a hook command whose exit
code 2 means *deny, and feed stderr back to the model*, while exit 1 reads as a non-blocking
operational error. govkit's gates today speak CI: exit 1 on failure, report on stdout. That
mismatch forces every consumer who wants govkit in the agent loop to write a wrapper script
that re-derives the mapping — and every wrapper drifts independently. This RFC adds one global
boolean flag, `--hook`, accepted by `verify`, `eval`, and `check` and rejected everywhere else
via the existing flag-scope table. Same run, two changes at the edge:

1. **Gate FAILURE exits 2** — the blocking-hook convention (Claude Code: exit 2 = deny +
   stderr is fed to the model; exit 1 reads as non-blocking error).
2. **The human report routes to stderr** so the harness relays the violations to the model;
   stdout stays reserved (`--json` still emits its payload on stdout).

The template ships a commented Stop-hook example running `npx govkit check --hook`, so a
session cannot end with a red gate. This closes the loop the audit-write hook opened for
writes: govkit becomes an in-loop guardrail, not only a merge-time gate.

## Motivation

The 2026-07 deep-research sweep (R7/F3 candidate) found the external convergence directly.
Anthropic's hooks guidance: *"A PreToolUse hook can inspect any tool call and exit code 2 to
deny it"*, and — the posture this repo keeps choosing — *"When there's something that
absolutely must not happen, an instruction is the wrong tool... A real guardrail needs to be
deterministic, and the enforcement methods are hooks and permissions."* govkit is exactly such
a deterministic enforcement method already; the only thing missing is speaking the protocol.
Internally, the audit-write hook proved the pattern for writes; gate runs are the read half of
the same loop. Without `--hook`, every consumer bridges the gap with a bespoke wrapper — the
mapping lives in N places and drifts.

## Design

**The flag.** `--hook` is a global boolean flag on `verify`, `eval`, and `check`, rejected on
every other command through the existing flag-scope table (the `--changed`/`--journal`
pattern). It changes nothing about what runs — same pure `run*` call, same violations — only
how the outcome leaves the process:

- **Exit mapping:** gate failure ⇒ exit 2. Gate pass ⇒ exit 0, unchanged.
- **Stream routing:** the human-readable report prints to stderr, because that is the channel
  the harness feeds back to the model on a blocking exit. stdout stays reserved: `--hook
  --json` still emits its machine payload on stdout, untouched.
- **Fail-closed:** under `--hook`, an operational error (bad config, unresolvable ref, crash)
  ALSO exits 2. This is a deliberate design decision, stated as such: a broken guardrail must
  block, not wave through. In CI mode exit 1 vs 2 distinguishes "gate said no" from "gate
  broke"; in hook mode both must deny, and the stderr text carries the distinction for the
  model and the human.

**The template.** `templates/settings.example.json` ships a commented block wiring a Stop hook
to `npx govkit check --hook` — block ending a session while the doc gate is red. A separate
example file rather than editing live `.claude/settings.json` because mutating a consumer's
live settings from a template is intrusive; the implementer records whichever form ships (see
As-built).

## Invariant check

Zero LLM calls, zero new dependencies, zero network: the feature is exit-code and stream
routing at the cli layer, after the pure command returns. The no-key CI invariant holds
untouched. Command purity holds too — `run*` functions never learn the flag exists; the edge
(cli.ts) owns the mapping, the same layer split RFC-0012 pinned for `--journal`.

## Alternatives

| Option | Why rejected |
|---|---|
| **Exit 1 + a wrapper script per consumer** | Every consumer re-derives the exit-2/stderr mapping independently; N copies drift. The contract belongs in the tool, once. |
| **A separate `govkit hook` subcommand** | Duplicates verify/eval/check — two code paths for one gate, guaranteed to diverge. Rejected for the same reason calibrate stayed out of `check`. |
| **Emit the PreToolUse JSON decision protocol from verify itself** | That protocol is for tool-call interception — the audit-write hook's job. Gate runs are simple exit-code hooks; speaking a richer protocol here is speculative surface. |

## Impact / rollout

- **Purely additive:** no behavior change unless `--hook` is passed; existing CI consumers see
  identical exit codes and streams. Ships in the same engine minor bump as RFC-0014
  (0.4.0 → 0.5.0).
- **Template-only settings surface:** the commented example is inert until a consumer
  uncomments it; nothing is wired into any live harness by install.
- **Rollback** is removing the flag and the commented template block; no state, no migration.
- **Docs:** the README gains the Stop-hook recipe so the flag is discoverable as the intended
  agent-loop integration, not an easter egg.

## Open questions

- **Should `--hook` also gate `calibrate`?** Deferred — calibrate is a repo-CI concern, not an
  agent-loop concern, until a consumer proves otherwise.
- **Should the exit-2 mapping be configurable?** No — a contract that can be reconfigured is
  not a contract; revisit only with evidence of a harness that speaks a different convention.

## Roadmap fit

Extends R5 (glue/loop plugins) per the F3 research candidate: the gate becomes wireable into
any harness's hook surface with one flag. The no-key invariant is untouched — pure exit-code
and stream routing, no new capability.

## As-built

Shipped as recorded in PR #4, together with RFC-0014, at the recorded layer split: the mapping
lives entirely in cli.ts after the pure `run*` returns, and the template gained the commented
Stop-hook block in `settings.example.json` (the non-intrusive form § Design left to the
implementer). Validation at merge: full `bun run check` green, the test suite extended to
cover the exit-2 mapping, the stderr routing, the `--json`-on-stdout preservation, and the
fail-closed operational-error path; engine version bumped 0.4.0 → 0.5.0.

**Addendum (2026-07-28, drift reconcile):** two things have moved since the original ship,
both by later accepted work, and are recorded here so this doc reads true against current
code. (1) `--hook` is now accepted on `drift` and `ledger` as well (RFC-0015/RFC-0016 extended
the sensor set); the flag-scope table in cli.ts remains the single rejection point, and the
new `doctor` command correctly rejects it. (2) The template now ships the Stop hook **live**,
not commented: `template/.claude/settings.json` wires `npx --yes govkit check --hook`
directly, and no `settings.example.json` exists — the intrusiveness concern § Design raised
was resolved in favour of working-by-default when the template moved to a full consumer
scaffold. The exit-code mapping, stream routing, fail-closed posture, and run*-purity layer
split are all unchanged.

## Deviations from design

None at ship time — any post-review hardening lands in this same PR before merge, keeping
accepted design == shipped code (the RFC-0012 precedent, where review findings entered the
design text before acceptance rather than accruing as divergence).

## Recommendation

Ship `--hook` as the single blocking-hook contract for all three gate commands, fail-closed on
operational errors, with the commented Stop-hook example in the template. Prefer this over
per-consumer wrapper scripts (drift), over a duplicate `hook` subcommand (two code paths for
one gate), and over emitting the PreToolUse JSON protocol from verify (wrong protocol for a
gate run) — each rejected above.
