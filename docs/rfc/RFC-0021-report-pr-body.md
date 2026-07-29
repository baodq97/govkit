---
id: RFC-0021
title: report --pr-body — render governance state as an idempotent fenced markdown block for PR bodies
status: implemented
owner: baodq97
date: 2026-07-08
reconciled: sha256:49d984e99ec06b36
governs:
  - packages/govkit/src/commands/report.ts
---

> Extends RFC-0008's advisory lifecycle report with a human-readable output mode: a new
> `--pr-body` flag on the existing `govkit report` command that emits the governance state as a
> markdown block fenced by stable HTML comment markers, so re-running REPLACES the section in a
> PR body idempotently instead of duplicating it. Deterministic, no-key, read-only, and never an
> exit-code effect — report stays advisory by construction. Drafted at `status: draft`; the
> accept is the owner's.

## Summary

govkit already computes everything a reviewer needs to judge the governance state of a change:
the lifecycle view (`report`, RFC-0008), the gate and eval outcomes (`verify`/`eval`,
RFC-0001), and the drift/stale advisories (RFC-0015/RFC-0009). But every one of those surfaces
is machine-shaped — `--json` JSONL-ish payloads or terminal text — and **JSONL is a hostile
review surface**. A reviewer opening a PR sees none of it unless they check out the branch and
run the CLI; a CI job that pastes raw JSON into a PR comment produces an unreadable wall; and a
naive "append the report each run" bot duplicates the section on every push until the PR body
is mostly stale copies.

This RFC proposes **`govkit report --pr-body`**: the existing advisory report command gains a
flag that renders the governance state as GitHub-flavoured markdown — the per-type lifecycle
histogram as tables, with terminal (decided/shipped) statuses marked — wrapped in **stable HTML
comment markers**:

```markdown
<!-- govkit:report:begin -->
### govkit governance report
| type | status | count | ids |
|---|---|---|---|
| rfc | implemented ✔ | 19 | RFC-0001 … |
| rfc | draft | 2 | RFC-0020, RFC-0021 |
<!-- govkit:report:end -->
```

The markers are the idempotency contract: any injector — a CI step, `gh pr edit`, a skill —
finds the `begin`/`end` span in the existing PR body and **replaces** it, appending the block
only when no span exists yet. Re-running on unchanged repo state yields a byte-identical block
(sorted ids, sorted statuses, no timestamps), so the splice is a no-op diff. The command itself
stays exactly what RFC-0008 made it: **read-only, no network, no exit-code effect** — it emits
the block to stdout; writing it into an actual PR body is the caller's job, so `report` never
gains a reason to fail CI and never tempts anyone to gate on advisory output.

**Prior art:** repository-harness renders its changeset JSONL into markdown tables injected
idempotently into SUMMARY/PR bodies, for exactly this reason — "JSONL is a hostile review
surface". The marker-fenced replace-not-append pattern is lifted from there; this RFC brings it
to govkit's governance state so non-Claude reviewers and plain CI get the same readable view.

## Design

**One flag on the existing command, not a new surface.** `govkit report --pr-body [--root
<dir>]` prints the fenced markdown block to stdout and exits 0, unconditionally — the same
advisory posture as `report` today. `--pr-body` and `--json` are mutually exclusive (two
machine channels on one stdout would be ambiguous); plain `report` output is unchanged.

**Block content, v1.** The rendered state is the `ReportResult` the command already computes
(RFC-0008): one markdown table per doc type with status buckets, counts, and ids, marking which
statuses are terminal per the config's `terminalStatuses`. Gate/eval outcomes and drift/stale
advisories are the natural next sections of the same block — a reviewer wants "did the gate
pass, is anything drifted/stale" next to the lifecycle — but folding four commands' results
into `report` widens its read-only contract (drift/stale need git), so v1 ships the lifecycle
view and reserves named sub-sections (`govkit:report:gate`, `govkit:report:advisories`) inside
the same outer fence for a follow-up. The outer markers are the stable API; inner layout may
evolve.

**Determinism is the idempotency guarantee.** No timestamps, no run-ids, no absolute paths in
the block; ids and statuses sorted (the underlying `runReport` already sorts both). Two runs on
the same tree produce the same bytes, so an injector that replaces the span produces zero diff
noise on pushes that didn't change governance state — the block only changes when the state
does, which is precisely when a reviewer should re-read it.

**Injection stays outside the engine.** govkit emits; it never talks to GitHub. The documented
recipe (README + the swe-flow skills) is: read the current PR body, replace the
`<!-- govkit:report:begin -->…<!-- govkit:report:end -->` span (append the block if absent),
write it back via `gh pr edit --body-file`. Skills and workflows **call** `govkit report
--pr-body` and splice — they never reimplement the report, per the AGENTS.md one-directional
rule. The invariant check holds: this is the deterministic no-key layer, runnable by any
contributor and any CI; no LLM-judge involvement anywhere near it.

## Alternatives

| Option | Why rejected |
|---|---|
| **Leave as-is** (reviewers read `--json` / CLI text) | The status quo being complained about: JSONL is a hostile review surface, and governance state that reviewers cannot see without a local checkout is governance that does not inform review. |
| **A separate `govkit pr-body` command** | Duplicates `report`'s traversal and config plumbing for a second name meaning "the same data, rendered differently" — an output mode, not a command. A flag on the existing advisory command also inherits its never-blocks posture for free, rather than having to re-assert it. |
| **A docs generator** (render the report into a committed `docs/STATUS.md`) | Turns advisory output into a governed artifact that itself drifts, churns every commit, and invites merge conflicts — the report's value is being recomputed at review time, not snapshotted into the tree. Rejected rather than layered on: a caller that wants a committed copy can redirect stdout. |
| **Skill-side rendering** (a swe-flow skill formats the `--json` into markdown) | Reimplements the report's presentation outside the engine — versus the rule that skills call govkit, never reimplement it — and gives non-Claude contributors and plain CI nothing. The rendering belongs in the no-key binary everyone runs. |
| **Append-only injection** (no markers, add a comment per run) | The duplication failure mode this RFC exists to prevent: N pushes ⇒ N stale copies. Markers cost two comment lines and buy replace-instead-of-append. |

## Impact / rollout

- **Additive and non-breaking.** A new flag on an existing command; no config keys, no schema
  change, no new dependency (string rendering over the existing `ReportResult`). Default
  `report` output and `--json` are byte-for-byte unchanged.
- **Exit-code contract untouched.** `report` keeps exiting 0 always; `--pr-body` is a rendering
  choice, not a gate. The RFC-0001 gate/eval split is unaffected — nothing here enters the
  blocking path.
- **Consumers:** the template's CI recipe and the swe-flow PR-opening skills gain the documented
  splice step (call the flag, replace the marker span via `gh pr edit`). Opt-in per repo; a repo
  that never injects loses nothing.
- **Tests:** (a) block opens/closes with the exact marker strings; (b) two runs on the same
  fixture tree are byte-identical (determinism/idempotency); (c) `--pr-body` with `--json`
  is a usage error; (d) exit code is 0 even on an empty/degenerate doc tree; (e) a fixture
  splice replaces an existing span without duplicating it (recipe-level test).
- **Rollback** is removing the flag; no persisted state, no migration. Stale marker spans in old
  PR bodies are inert comments.

## Open questions

- **Block content stability vs. richness — diff noise risk.** Every id listed in the block means
  every new doc edits the PR-body span; on a large repo the block could churn or bloat. Cap ids
  per bucket (count + first N, `+K more`)? Counts-only mode? Needs real-repo sizing before
  hardening the inner layout.
- **Gate/eval/drift/stale sections.** Should the block grow the other governance surfaces
  (verify/eval outcomes, drift/stale advisories) in-process, or should each command grow its own
  `--pr-body` emitting an inner-marked section the caller composes? The latter keeps `report`
  git-free; the former gives one-command convenience. Deferred to the follow-up named in Design.
- **Should govkit own the splice?** A `--into <file>` that performs the marker replacement on a
  body file would remove per-caller recipe drift but adds a write path to a read-only command.
  Lean no for v1 — emit-only keeps `report` pure; revisit if the recipe proves error-prone.
- **Marker versioning.** If the block format ever changes incompatibly, do the markers carry a
  version (`govkit:report:v2:begin`)? Lean no — the outer markers are a span-location contract,
  not a schema; the content is for humans.

## As-built

Shipped as `renderReportPrBody` in `commands/report.ts` plus the `--pr-body` flag wiring in
`cli.ts`: the block opens/closes with exactly `<!-- govkit:report:begin -->` /
`<!-- govkit:report:end -->`, renders one GFM table per doc type with
`| type | status | count | ids |` columns, and marks terminal statuses with ✔ (U+2714).
`--pr-body` with `--json` is rejected exit 2 (one stdout, one machine channel); plain
`report` and `--json` output are byte-unchanged. Ten tests in
`packages/govkit/test/report-pr-body.test.ts` pin the markers, determinism, exclusivity,
and the unchanged plain output. The caller-side splice recipe is documented in
`plugins/swe-flow/README.md` with a pointer from `template/AGENTS.md`.

## Deviations from design

- **Table shape reconciled.** The Design text said "one markdown table per doc type" while
  the Summary's example showed a single typed table. Shipped per-type tables that each carry
  the `type` column — a reading that satisfies both texts; the columns match the example
  exactly.
- **Recipe-level splice test deferred** (Impact's test (e)): the splice is caller-side by
  design, so the engine suite pins only the emitted block; the recipe lives as documentation
  (`plugins/swe-flow/README.md` + the template pointer), not as a fixture test.
- **Zero-doc type renders a header-only table** — a case the RFC left unpinned; the
  header keeps the type visible rather than silently dropping it.

## Recommendation

Ship `--pr-body` on the existing advisory `report` command: a deterministic, no-key,
read-only markdown rendering of the lifecycle view, fenced by stable
`<!-- govkit:report:begin/end -->` markers so injection replaces rather than duplicates, with
splicing left to callers (skills/CI call govkit, never reimplement it). Preferred over a
separate command (duplicate plumbing), a committed docs generator (snapshot churn), skill-side
rendering (reimplements the engine's output outside the no-key binary), and append-only
injection (the duplication failure mode itself) — each rejected above.
