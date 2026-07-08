---
id: RFC-0012
title: Gate-outcome journal and confusion-matrix calibration — the deterministic sensor for the learning flywheel (R7)
status: implemented
owner: baodq97
date: 2026-07-07
reconciled: c6840a4b44b3992cb24bb2a2d780da1dcd9dfe9a
governs:
  - packages/govkit/src/journal.ts
  - packages/govkit/src/commands/calibrate.ts
---

> Builds the SENSE half of the R7 learning flywheel, plus the immune system that keeps the loop
> honest: an opt-in `--journal` flag that appends one JSONL record per gate run, and a
> `govkit calibrate` command that scores the gate itself against a labeled corpus and pins the
> confusion matrix. Both are pure Node fs/git-read — the no-key invariant holds. The keyed
> DISTILL step (a learning-distiller proposing rule changes from the journal) is named, not
> built; RATIFY stays a human merge. Drafted at `status: draft`; the accept is the owner's.

## Summary

The PRD's north star is a confusion matrix: the required floor must hold FP=0 (a good doc never
floor-fails) while recall against genuinely weak docs climbs. Today nothing *measures* that
matrix, and nothing *records* what the gate actually did on real runs — the flywheel has no
sensor and no immune system. This RFC ships both as one slice:

- **`--journal` (the sensor):** a global boolean flag on `verify`, `eval`, and `check` that
  appends one JSONL record per run — what ran, on what, what it found, whether it passed, how
  long it took — to a local, gitignored, append-only journal.
- **`govkit calibrate` (the immune system):** a new command that runs the eval layer against a
  labeled corpus (`good/` must pass the required floor, `weak/` must fail it — the exact
  convention `packages/govkit/eval/fixtures` already uses), computes FP/FN/precision/recall/F1
  on the floor, and exits nonzero on any FP or on regression below a committed baseline.

In R7 terms: journal = SENSE (deterministic, no-key), a future keyed distiller = DISTILL
(proposal-only, out of scope here), human merge = RATIFY. Calibrate is what makes that loop
safe against self-weakening: the corpus is append-only, and every gate change must keep FP=0
and non-regressing recall before it can land.

## Motivation

Three lines of evidence converge:

1. **The PRD already names the target.** The north-star confusion matrix exists on paper;
   nothing operationalizes it. A gate whose accuracy is asserted rather than measured is
   exactly the self-attestation problem this repo keeps refusing.
2. **The 2026-07 deep-research sweep found external convergence.** OpenAI's agentic-governance
   cookbook: *"Building guardrails is only half the battle — you need to know they actually
   work"* and *"Run evals on every policy repo change to catch regressions"* — with
   precision/recall/F1 against labeled test data as the mechanism. Anthropic's
   deterministic-enforcement guidance points the same direction. Thoughtworks' fitness
   functions supply the posture: *"gatekeepers are automated, so they don't block the flow."*
3. **A learning loop without an immune system eats itself.** Any future distiller that proposes
   rubric changes from journal data could quietly weaken the floor. Calibrate turns "did this
   change weaken the gate?" from a judgment call into an exit code.

## Design

**Feature 1 — `--journal`.** A global boolean flag accepted by `verify`, `eval`, and `check`,
rejected on every other command (the same pattern `--changed` already uses). Commands stay
pure: after the pure `run*` returns, the CLI layer in `cli.ts` performs the append via a new
`src/journal.ts` helper — the side effect lives at the edge, never inside a command. One JSONL
record per run, with fields:

- `at` (ISO timestamp), `cmd`, `root`;
- `gitSha` via the existing `gitAvailable`/git helpers in `util.ts` — omitted when git is
  absent, never an error;
- `verify` — `{ docs, violations: [{ path, kind }] }` — and/or `eval` — `{ artifacts,
  floorPassRate, advisoryPassRate, averageScore }`, per what ran;
- `ok`, `durationMs`; `changed` (the resolved base ref) when the run was `--changed`-scoped, so
  a 1-doc scoped run is never trended against full-repo runs;
- `error` on a crashed run: a thrown gate still appends `ok: false` with the first line of the
  error before rethrowing — the sensor must stay honest exactly when the gate fails hardest,
  or a dashboard reading the journal undercounts failures precisely during an incident.

The journal path comes from a new optional `journal.path` key in `govkit.yml`, defaulting to
`.govkit/journal.jsonl`; the parent directory is auto-created, and the path is confined under
root using the existing escape-guard posture. **A journal write failure warns on stderr and
NEVER changes the exit code** — the sensor must not break the gate. The journal is append-only
local state, gitignored by convention.

**Feature 2 — `govkit calibrate`.** Runs the eval layer against a labeled corpus directory
containing `good/` and `weak/` subtrees, then scores the gate:

- **FP** = a `good/` doc that floor-failed; **FN** = a `weak/` doc that floor-passed; plus
  precision, recall, F1 on the required floor and advisory-score stats per tree.
- Flags: `--corpus <dir>` (required), `--baseline <file>` (optional), `--update-baseline`
  (writes the current matrix to the baseline file — a deliberate human act, recorded in git),
  `--json`. Config resolves from `--root` like every other command, except that `docs.root`
  (RFC-0007) is forced to `.` inside the corpus trees: the corpus layout is the type dirs
  directly under `good/` and `weak/`, independent of where the host repo keeps its live docs.
- **Nothing fails open.** A `--baseline` path that does not exist is a hard error unless
  `--update-baseline` is bootstrapping it — a missing file must not silently disable the
  regression guard. A corpus doc that exists but cannot be graded (missing/broken
  front-matter, no matching type dir, no rubric) is a fixture-authoring error and fails loud —
  a "weak" stub the floor never even sees would otherwise prove nothing while looking covered.
- **Exit semantics:** FP>0 ⇒ exit 1 always — the FP=0 north star is a hard gate. With a
  baseline: recall below baseline recall, F1 below baseline F1, **or corpus coverage shrunk**
  (current tp+fn or tn+fp below the baseline counts — the committed counts pin coverage, so
  deleting fixtures cannot silently keep recall at 1) ⇒ exit 1. Otherwise 0. The
  baseline-updated confirmation prints to stderr so `--json` stdout stays pure JSON.

The repo wires `calibrate --corpus packages/govkit/eval/fixtures --baseline
packages/govkit/eval/baseline.json` into `bun run check` — a repo-script change only. The CLI
`check` command's semantics are UNCHANGED, so no consumer breaks.

## Invariant check

Both features are pure Node fs plus read-only git: JSONL via `appendFileSync`, the matrix is
arithmetic — zero LLM calls, zero new dependencies, so the no-key CI invariant holds intact.
Nothing crawls `plugins/`. The eval floor's zero-FP scope is unchanged: calibrate MEASURES the
floor, it does not alter scoring. Git is touched only for the optional `gitSha`, degrading to
omission when absent — the same posture as `stale` (RFC-0009).

## Alternatives

| Option | Why rejected |
|---|---|
| **Always-on journaling** (no flag) | Surprising writes from a tool that today never writes on `verify`/`eval`/`check`; the opt-in flag keeps the gates side-effect-free by default. |
| **A manifest file for corpus labels** | The `good/`/`weak/` directory convention already exists in `packages/govkit/eval/fixtures` and is simpler; a manifest is a second source of truth that can drift from the tree it describes. |
| **Fold calibrate into `check`** | Changes a shipped command's semantics and runtime for every consumer. Repo-level wiring gets the same CI coverage with zero breaking change — preferred. |
| **Emit OpenTelemetry spans instead of JSONL** | The OTel GenAI semconv is still experimental (recorded as watch-list in the research sweep); JSONL is dependency-free, greppable, and honest about being local state. |

## Impact / rollout

- **Purely additive:** no existing command changes behavior unless the flag is passed; the new
  command is new surface. Engine minor version bump 0.3.1 → 0.4.0.
- **Repo hygiene:** `.govkit/` added to the repo `.gitignore`; the template `govkit.yml` gains
  a commented `journal:` example (scaffolding the key via `init` is deferred, the RFC-0002
  posture).
- **Rollback** is removing the flag and the command; the journal file and baseline are inert
  data, and nothing else reads them.
- **The published tarball does not ship a corpus.** The npm `files` allowlist stays
  `dist`+`templates`; `packages/govkit/eval/` is this repo's own corpus, not a consumer
  artifact. A consumer authors their own `good/`/`weak/` trees (their governance, their
  fixtures) and points `--corpus` at them — the READMEs document that invocation, so the
  in-repo paths are never mistaken for a shipped surface.

## Open questions

- **Should `stale`/`report` also journal?** Deferred — advisory commands have no pass/fail
  signal worth pinning yet; journaling them would record opinions, not outcomes.
- **Per-rule confusion matrix vs floor-level.** Start floor-level; a per-rule matrix needs
  materially more fixtures per rule before its numbers mean anything.
- **When the corpus grows via escape-log distillation, does baseline update stay a human
  act?** Yes for now — `--update-baseline` is deliberately manual and git-recorded; revisit at
  R7 phase 2 when the distiller exists.

## As-built

Shipped in PR #2 as one slice, both features exactly at the recorded layer split: pure
`runCalibrate`/`parseBaseline` in `commands/calibrate.ts`, record shape + path confinement in
`journal.ts`, every side effect (timing, printing, the append, exit codes) at the cli layer
through a single `runGate` wiring shared by `verify`/`eval`/`check`. An 8-angle adversarial
review pass ran between first implementation and merge; its 15 confirmed findings hardened the
design *before* acceptance — the "nothing fails open" clauses in § Design (missing-baseline
hard error, ungraded-fixture hard error, corpus-shrinkage regression, `docs.root` forced to `.`
inside corpus trees, stderr confirmation under `--json`) entered the text from that review, so
the accepted design and the shipped code are the same object. Validation at merge: 132 tests
(26 new across feature + review fixes), biome + typecheck clean, full `bun run check` exit 0
under bun and stock node, floor matrix tp 4 / fp 0 / fn 0 / tn 4 with baseline comparison ok.

## Deviations from design

- **`parseBaseline` takes a `source` param** (the file path) so operational errors keep naming
  the offending file while the function stays pure — cli.ts retains only the `readFileSync`.
- **`--update-baseline` on a shrink-only run rewrites and exits 0** — a deliberate,
  git-recorded coverage rewrite per § Exit semantics; FP>0 and recall/F1 regressions still
  refuse to write.
- **`journal.path` resolving to the root directory itself is rejected** (the `isInside`
  self-reference case) rather than failing later at the append — surfaced when the confinement
  guard was unified into `util.isInside` during review.
- **Journal `durationMs` includes report printing**, a consequence of restoring
  print-verify-before-eval in `check`; the field measures the observable gate run, which is
  the honest reading of its name.

## Recommendation

Ship both features as one slice: a sensor without the immune system invites gaming (journal
data pressuring the gate looser with nothing guarding the floor), and an immune system without
the sensor has nothing to protect. Wire calibrate into the repo's own `bun run check`;
consumers opt in on their own schedule. Prefer this over always-on journaling (surprising
writes), over a corpus manifest (drift surface), over folding calibrate into `check` (breaking
change), and over OTel emission (experimental semconv, new dependency) — each rejected above.
