---
id: RFC-0026
title: Gate-loop hardening — round 2 of the dogfood loop
status: accepted
owner: TBD
date: 2026-07-23
governs:
  - scripts/check-sync.mjs
  - .claude/workflows/gate-loop.js
  - plugins/swe-flow/agents/verifier.md
  - plugins/swe-flow/agents/implementer.md
  - AGENTS.md
parent: PRD-0001
---

> Encodes four lessons from the round-1 gate-loop dogfood (LEARNING-LOOP Round 17 + the F9
> addendum) as the smallest change each admits: a green-claim contract that binds a green to the
> FULL gate AND to the act it authorizes, a deterministic orphan-artifact detector in
> `check-sync.mjs`, a reconcile-as-you-go rule so drift is paid down at edit time not close time,
> and a dispatch preflight/fallback in `gate-loop.js`. No engine change, no new CLI subcommand,
> no `govkit verify`/`eval` change. Drafted at `status: draft`; the accept is the owner's.

## Summary

Round 17 built RFC-0025 end to end and logged nine findings — none in the deterministic core, all
in the layer around it. Five are cheap to close deterministically or by contract; this RFC does
exactly that and nothing more. The fifth, C5, was not in the Round-17 log at all — it was
discovered DURING this RFC's own dogfood close, when the first production invocation of
`gate-loop.js` hit a real caller shape the design had not anticipated. That is the strongest
evidence the loop works: it caught a live defect in itself while closing itself. It is a
hardening pass, not a platform: each lesson lands at its lowest-cost surface.

| # | Lesson (Round-17 evidence) | Surface |
|---|---|---|
| C1 | **Green-claim contract** — a green is valid only from the full gate, and *acting* on it must be conditional on that green in the same execution (F9 push-after-capture; the round-1 false-green) | `verifier.md` + `implementer.md` contract lines + one AGENTS.md Coding-rules bullet |
| C2 | **Orphan-artifact detector** — a test/script wired to no gate is invisible (F4: `skill-lint.test.mjs`) | `scripts/check-sync.mjs` |
| C3 | **Reconcile-as-you-go** — drift discovered at close-time is an accumulation failure (round-1 BLOCK on RFC-0017/0019/0022 `reconciled:` hashes) | one AGENTS.md bullet + `implementer.md` line |
| C4 | **Dispatch preflight/fallback** — `swe-flow:*` cannot resolve pre-release (F7) | `.claude/workflows/gate-loop.js` |
| C5 | **JSON-string args tolerance** — gate-loop args arrive as a JSON-encoded string from real callers (F10: observed live, run `wf_3ce99e82`, fixed in commit `9647f13`); the workflow now parses string args, failing loud on malformed JSON | `.claude/workflows/gate-loop.js` |

## Motivation

The deterministic gate (`verify`/`eval`/`drift`) did not break in Round 17; every escape lived in
the human/agent/runtime edges. Two of those edges are addressable with code (C2, C4), two with a
contract line agents cannot skip (C1, C3). The evidence:

- **C1** — the `implemented`-flip commit ran `bun run check`, captured `FINAL_GATE=1`, and pushed
  anyway, because the push sat unconditionally after the capture in one compound command. A red
  gate reached the remote. Separately, the round-1 false-green was green pre-commit and red
  post-commit on `reconciled:` hashes — a narrower command (`node cli.js check`, no drift) would
  have missed it entirely. Both collapse to one contract: a green claim is only valid from the
  full repo gate, and acting on it must be conditional on that same green.
- **C2** — `skill-lint.test.mjs` shipped wired to no gate. `bun run check` never ran it; nothing
  did. A test no gate executes is a dead test, and no deterministic check noticed.
- **C3** — the branch edited `distiller.md`/`judge.md`/`spec-red-team`'s `SKILL.md` (all under a
  governed doc's `governs:`) without updating each RFC's `reconciled:` hash. The drift red piled
  up silently and detonated at integration close.
- **C4** — the freshly-built role agents could not be dispatched by name: `agentType` resolves
  against the INSTALLED plugin (still 0.7.0). The e2e sim fell back to generic agents reading the
  role files at runtime — a pattern that worked and should ship, not stay a sim workaround.
- **F10** — the FIRST production invocation of `gate-loop.js` failed at arg-parse: the caller
  passed `args` as a stringified JSON blob, not an object, so `args?.verifyCmd` read `undefined`
  and the workflow threw its own "required" error, naming the missing arg instead of silently
  proceeding. Fail-loud did its job, but the premise was wrong — the caller's shape was valid
  JSON, just string-encoded. Tolerance for that shape was added the same session (commit
  `9647f13`).

## Design

### C1 — the green-claim contract

Two clauses, added verbatim to `verifier.md` and `implementer.md` and mirrored as one
AGENTS.md Coding-rules bullet:

1. **A "gate is green" claim is valid only from the FULL repo gate** (`bun run check` — drift
   included), never a narrower command. `node cli.js check` is verify+eval only; it does not run
   drift, so it cannot back a green claim.
2. **Acting on a green — push, status flip, publish — is conditional on that green in the same
   execution.** `bun run check && git push`, never `check; …; push`. A captured-but-unchecked
   exit code is as good as no gate.

This is contract, not code: the verifier's evidence report already carries the generalized form
(a `proven` claim needs a real exit code); C1 names it as a hard rule at both the writer and the
independent-verifier surfaces so neither can assert green from a partial run.

### C2 — the orphan-artifact detector

`scripts/check-sync.mjs` gains a deterministic, keyless check over `scripts/`:

- every `scripts/*.test.mjs` must be invoked by a `package.json` script that is reachable from
  `check` (walking the script-to-script references), and
- every non-test `scripts/*.mjs` must be either referenced by a `package.json` script or imported
  by another script.

A file that satisfies neither is an orphan and fails the check. Zero-FP is proven against the
current repo (every existing script resolves through `package.json` or an import). Fallibility is
proven by a temporary orphan probe — a throwaway `scripts/__orphan_probe.mjs` created, the check
shown red, the probe removed and the check shown green — so the detector is demonstrated capable
of failing, not merely asserted.

### C3 — reconcile-as-you-go

One AGENTS.md bullet states the rule directly: **any change that edits a file under a governed
doc's `governs:` pathspec must, in the same change, either update that doc's as-built/reconciled
record or explicitly hand the ack decision to the owner.** Drift red found at close-time is an
accumulation failure — each edit that defers its reconcile compounds the debt. The ack itself
stays the owner's act (the RFC-0015 drift ritual is unchanged); the rule only forbids *silently*
accumulating unreconciled edits behind the gate's committed-content blind spot.

`implementer.md` does not restate that bullet verbatim — it enforces the same intent through a
role-appropriate clause in the report contract instead. Two duties were added to what the
implementer must hand back: `verifierShouldRun` must name the FULL gate command (e.g. `bun run
check`), never a narrower one, since `node cli.js check` is verify+eval only and cannot back a
green claim (`plugins/swe-flow/agents/implementer.md:93-96`); and a new `governedDocsTouched`
field requires a governs-grep over `filesWritten` (`grep 'governs:' docs/rfc -A5`) so that any hit
is named for the doc owner instead of silently accumulating as drift. The implementer still never
performs the reconcile itself — naming the hit is how the ack reaches the owner.

### C4 — dispatch preflight/fallback

`.claude/workflows/gate-loop.js` wraps every plugin-agent dispatch in a helper that, when the
installed plugin cannot resolve the `agentType`, falls back to a generic agent instructed to read
the role file (`plugins/swe-flow/agents/<name>.md`) and execute it. This is the sim's proven
pattern (Round 17 F7) promoted into the shipped workflow. The `template/.claude/workflows/gate-loop.js`
copy stays byte-identical, so the drift assertion in `check-sync.mjs` continues to hold.

### C5 — JSON-string args tolerance

`.claude/workflows/gate-loop.js` now normalizes its `args` parameter before reading any field:
`const ARGS = typeof args === "string" ? JSON.parse(args) : (args ?? {})`. Real callers were
observed passing `args` as a JSON-encoded string rather than an object (F10, run `wf_3ce99e82`);
the workflow accepts either shape transparently. A malformed string still throws at
`JSON.parse` — the tolerance widens the accepted input shape, it does not widen the failure mode
into a silent default.

## Alternatives considered

- **(a) Put the orphan check in `skill-lint.mjs` instead of `check-sync.mjs`.** Rejected:
  `skill-lint.mjs` scores the *plugin* surface (agent/skill front-matter, description budget,
  collision matrix). Orphan detection is *repo-level* wiring sync — "is every script reachable
  from the gate" — which is exactly `check-sync.mjs`'s altitude (it already asserts byte-identity
  of the `gate-loop.js` copies and the manifest sync). Altitude, not convenience, decides.
- **(b) A hard registry API for the C4 preflight.** Rejected: the workflow sandbox has no fs or
  registry access to enumerate installed plugin agents ahead of dispatch. The only honest probe is
  to try the namespaced dispatch and catch the resolution failure — try-and-fallback is the
  mechanism the runtime actually permits.

## Impact / rollout

- **`scripts/check-sync.mjs`** gains one check (+ its `node --test` cases). Repo-local, keyless,
  no new dependency.
- **`.claude/workflows/gate-loop.js`** gains a dispatch wrapper; `template/` copy updated to stay
  byte-identical (drift-gated).
- **`verifier.md`, `implementer.md`, AGENTS.md** gain contract/rule lines. No behaviour change to
  any deterministic command.
- **C5 (commit `9647f13`)** — the same `gate-loop.js`/`template/` pair also gains the JSON-string
  `args` tolerance; both copies stay byte-identical, so no separate drift-gating surface is needed.
- **C4's dispatch fallback was proven live, not merely designed, on this RFC's own close**: the
  `swe-flow:red-teamer` dispatch errored because the installed plugin was still on 0.7.0, and
  `dispatchRole`'s file-read fallback caught the resolution failure and returned the verdict
  anyway — the mechanism this RFC shipped is the one that closed it.
- **No engine change, no `govkit verify`/`eval` change, no new CLI subcommand, no `govkit.yml`
  change.** Nothing enters the no-key CI path except the additive `check-sync.mjs` step.
- **Rollback** is per-surface: revert the `check-sync.mjs` check, the workflow wrapper (including
  the C5 args tolerance), and the contract lines. No migration, no state.

## Open questions

- **Does the orphan check false-positive on a genuinely-standalone tool script?** Current repo has
  none; if one lands (e.g. a one-off maintenance script never wired to the gate), the answer is an
  explicit allowlist entry, not loosening the rule — kept as a follow-up, unneeded until the first
  real case.
- **Can the C4 fallback mask a genuinely-missing agent?** The generic fallback reads a role file
  that must exist on disk; a missing role file fails loudly. The residual risk is a stale role
  file diverging from an updated plugin agent — out of scope here, and the byte-identity/manifest
  sync in `check-sync.mjs` already covers the workflow copies.
- **C1/C3 are contract, not gate.** They bind agent behaviour, not a deterministic check. That is
  deliberate — the failures were execution-ordering and edit-discipline, which no keyless gate can
  see — but it means their enforcement rests on the contract being read. Revisit if Round 18 logs
  a repeat.
