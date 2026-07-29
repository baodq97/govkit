---
id: RFC-0029
title: report --aging — time-in-status flow signals for the lifecycle view
status: accepted
owner: baodq97
date: 2026-07-29
governs:
  - packages/govkit/src/commands/report.ts
  - packages/govkit/src/util.ts
  - packages/govkit/src/config.ts
  - packages/govkit/src/cli.ts
  - packages/govkit/src/render.ts
---

> Extends the advisory lifecycle report (RFC-0008, RFC-0021) with the dimension it is
> missing: TIME. `govkit report --aging` annotates every governed doc with the date its
> current `status:` was set (from git), so a doc stuck at `proposed` for 90 days stops
> being invisible. Opt-in flag, opt-in config thresholds, advisory by construction —
> report keeps exiting 0 always. Drafted at `status: draft`; the accept is the owner's.

## Summary

`report` today answers "where is every doc" — a per-type status histogram. It cannot
answer "how LONG has it been there", and that is the question that finds the two failure
modes a status snapshot hides:

- **The stuck doc.** An RFC at `proposed` for a week is under review; the same RFC at
  `proposed` for a quarter is an abandoned decision blocking its chain (`terminalStatuses`
  coherence, RFC-0008) — and the histogram renders both identically.
- **The zombie backlog.** A US at `open` whose author moved on ages silently until an
  audit. The lifecycle view counts it forever as healthy inventory.

The evidence that consumers want this is that a consumer-shaped repo already hand-rolled
it: btm-platform (a governed-docs monorepo from the same template family, surveyed
2026-07-29) ships a quarterly `audit.sh` whose first check is exactly "ADR/RFC stuck in
`proposed` > 90 days". That script is the manual workaround for the signal this RFC puts
in the engine — deterministic, no-key, and config-grounded instead of hardcoded.

**Proposal:** a new opt-in flag on the existing command. `govkit report --aging` computes,
per governed doc, the commit date on which the current `status:` line last changed
(`statusSince`), derives `ageDays` at run time, and marks a bucket entry with an advisory
`⚠` when the type's opt-in config threshold is exceeded. No flag → today's behavior,
byte-for-byte.

## Design

**Mechanism: blame the status line.** For each governed doc, `git blame` the single
front-matter `status:` line and read the commit's author date. One subprocess call per
doc, no history walk; a doc not yet committed (or a repo without git) reports
`statusSince: null` and is listed under an explicit `(untracked)` note — never silently
dropped, per the report's existing NO_STATUS posture. Using git puts `--aging` in the same
class as `stale` (RFC-0009) and `drift` (RFC-0015): advisory commands that read local git,
still no-key, no network. The DEFAULT `report` path stays git-free exactly as RFC-0021
pinned it.

**Thresholds are config, not opinion.** A new optional per-type map in `govkit.yml`:

```yaml
docs:
  types:
    rfc:
      aging: { proposed: 90, draft: 180 }
```

Only configured (type, status) pairs ever get a `⚠`. No defaults ship — a hardcoded 90
would be exactly the config-can't-justify guess the report deliberately refuses to make
(see the RFC-0008 comment block in `report.ts`). A repo that never adds `aging:` gets
dates and ages, no judgments.

**Output shape.**
- Plain: each bucket line gains `oldest: <id> (<ageDays>d)`; entries over threshold are
  flagged `⚠ over <n>d`.
- `--json`: each doc entry gains `statusSince` (ISO date | null) and `ageDays` (number |
  null); buckets gain `overThreshold: [ids]`.
- `--pr-body --aging`: the table gains a **`since` column with dates only** — no
  `ageDays`, no `⚠`. Both derive from "now", and RFC-0021's idempotency contract is
  byte-identical output on unchanged repo state; a date column only changes when a status
  actually changes, so the determinism guarantee survives. Age math is the reader's.

**Funnel view for free.** The histogram already carries per-status counts; with
`statusSince` in `--json`, a caller can build entered/left flow between two runs. A true
transition history (every status the doc passed through, with dates) is deliberately NOT
in v1 — see Open questions.

## Alternatives

| Option | Why rejected |
|---|---|
| **Extend `stale` instead** | `stale` answers "the code moved on after the doc" (doc↔code axis); aging answers "the doc itself stopped moving" (lifecycle axis). Folding both under one name conflates two different repairs — re-reconcile vs. decide-or-kill. |
| **A new `govkit flow` command** | Same reasoning that rejected a separate `pr-body` command in RFC-0021: it duplicates report's traversal and config plumbing for "the same data, one more column". The lifecycle view has one owner. |
| **Always-on (no flag)** | Adds a git dependency and a per-doc subprocess to every `report` call, and breaks RFC-0021's pinned byte-identical default output. Opt-in costs one flag. |
| **Journal-based transition history (RFC-0012) as the source** | The journal records gate RUNS, not status transitions, and only on repos that wired `--journal`. Git is the system of record for the status line on every repo, wired or not. The journal remains interesting for v2 flow analytics — as a supplement, not the source. |
| **Ship default thresholds (90d)** | An invented vocabulary the config can't justify — the exact judgment `report` has refused to make since RFC-0008. btm's 90 is btm's; another repo's review cadence is monthly. Config-only. |
| **`git log -L` full history per doc** | Orders of magnitude more git work to answer a question v1 doesn't ask (full transition history). Blame answers "since when" with one cheap call. |

## Impact / rollout

- **Additive and non-breaking.** No flag → no behavior change; `--json` shape only gains
  keys under `--aging`; default `--pr-body` block unchanged. Exit code stays 0 always —
  nothing here enters the blocking path, the RFC-0001 invariant holds (no key, no
  network; git is local).
- **Config:** `aging:` is optional per type; `init` templates do not pre-fill it
  (thresholds are earned from a repo's own cadence, RFC-0024 spirit).
- **Cost:** one `git blame -L` per governed doc. At this repo's scale (~60 docs) that is
  well under a second; batching is an open question for 1000-doc corpora, not a v1 need.
- **Windows/CRLF:** blame line addressing must survive CRLF checkouts (AGENTS.md
  first-class constraint); the status-line locator reuses the front-matter parser's line
  index, not a regex over raw bytes.
- **Tests:** (a) statusSince matches the commit that last edited the status line, not the
  doc; (b) untracked file → null + `(untracked)`, never dropped; (c) no-git root → clean
  advisory note, exit 0; (d) threshold marker appears only for configured (type, status)
  pairs; (e) `--pr-body --aging` twice on an unchanged tree is byte-identical; (f) default
  outputs without the flag are byte-identical to pre-RFC behavior.

## Open questions

- **Transition history (funnel v2).** Entered/left counts per period need every
  transition, not just the latest — `git log -L` archaeology per doc, or a journal-side
  accumulation once RFC-0012 sensors are widespread? Deferred; v1's `statusSince` diffing
  between two runs may prove enough.
- **Where does `⚠` surface in CI?** A stuck-doc warning in a PR body tempts someone to
  gate on it, which advisory output must never invite (RFC-0021). v1 keeps `⚠` off the
  pr-body surface entirely; revisit only with a consumer pull.
- **Status set at birth vs. flipped.** Blame dates the last edit of the line — a doc born
  at `accepted` (the anti-pattern RFC-0024 documents) shows a plausible statusSince. Aging
  does not try to detect provenance violations; that stays the honor-system + hook layer's
  job. Worth a note in the docs so nobody reads aging as a provenance check.

## As-built

Shipped as `--aging` on `report`: `gitLineCommitTime` in `util.ts` (git blame `-L n,n
--porcelain`, committer time, all-zero boundary sha → null), a local `statusLineNo` in
`report.ts` scoped to `frontMatterSpan` (top-level `status:` only), per-bucket `docs[]`
(`statusSince` ISO date + `ageDays`) and `overThreshold` (present only when the type's
`aging:` config names that status), an `agingNote` degrade when git is absent, the plain
rendering's `oldest / ⚠ over threshold` lines, and a dates-only `since` column on
`--pr-body`. Config gains the per-type `aging: {status: days}` map, validated loud (the
`tiers` stance). Six e2e tests in `test/report-aging.test.ts` pin the RFC's Impact list;
`--aging` is report-scoped in the CLI flag table.

## Deviations from design

- **The "front-matter parser's line index" is a block span.** The parser exposes
  `frontMatterSpan`, not per-key line numbers; the locator counts lines inside that span
  (CRLF-safe, one grammar owner) — same guarantee, different mechanism than the RFC's
  wording implied.
- **`ageDays` clamps at 0** for a status committed "in the future" relative to the
  clock (clock skew, backdated fixtures) — unpinned by the design, chosen over a
  negative age.
- **The uncommitted-doc note renders per bucket** (`uncommitted, no age: …`) rather
  than as one global `(untracked)` list — the bucket is where the reader already is.
- **Committer time, not author date.** The design read "the commit's author date"; the
  implementation reads blame's `committer-time`, matching `%ct` in every other git-backed
  reader (`stale`, `drift`). Visible on rebase/squash-merge repos, where committer time is
  the landing date: the aging clock starts when the status change reached the branch,
  which is the time-in-status the report means.

## Recommendation

Ship `--aging` as an opt-in flag on the existing advisory `report`: git-blame-dated
`statusSince` per doc, run-time `ageDays`, config-only thresholds with advisory `⚠`,
dates-not-ages on the idempotent pr-body surface. Preferred over extending `stale`
(different axis, different repair), a new command (duplicate plumbing), always-on (breaks
the git-free default and RFC-0021 determinism), journal-sourced history (wrong system of
record, sparse coverage), and shipped default thresholds (a judgment the config can't
justify) — each rejected above.
