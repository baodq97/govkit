---
id: RFC-0004
title: Adoption on existing repos — gate the changed set, not the whole backlog
status: accepted
owner: baodq97
date: 2026-05-31
---

> Proposes a new public, deterministic surface (root `AGENTS.md` § Lifecycle): a
> `govkit verify --changed [<ref>]` mode that scopes which docs a full-scan gate
> *reports* on. Accepted by the owner (`baodq97`) **before** implementation — the flip
> from `draft` was a human act, never an agent — per the RFC-0002/0003 lesson: a public
> surface rides with an accepted RFC, not after it.

## Summary

govkit governs this repo at 100/100 — but that is **survivorship**: every doc here was
authored already knowing the gate's rules. The honest test is an **existing repo**: docs
written for humans, with no `id/status/owner/date` front-matter, no `RFC-0001-*.md`
naming, no `INDEX.md`. The moment you point `govkit.yml` at such a repo's doc dirs, the
full-scan gate (`govkit verify` / `govkit check` in CI) reports **every legacy doc at
once** — hundreds of violations on day one. That is the classic linter-adoption death:
too much red, the team disables the gate, and govkit ships zero value to the repos that
need governance most.

This RFC closes that cliff with the smallest deterministic change that lets a repo adopt
govkit **incrementally** — block *new* violations without first retrofitting the entire
backlog.

## Where the avalanche actually lives (topology)

The cliff is **only** a full-scan problem. The per-write path already escapes it:

- The **PreToolUse hook** runs `audit-write`, which is **per-file**: it checks front-matter
  presence + required keys of the *single doc being Written*, and nothing else. It never
  re-scans untouched docs, so it never shows the avalanche — it is already "changed-scoped"
  by nature.
- The avalanche is produced solely by **full-scan callers**: `govkit verify` and
  `govkit check`, in CI or run by hand.

So the fix does not need to touch every caller. It needs to tame the one full-scan path.
This is what moves the recommendation *away* from a persisted baseline file (whose main
selling point would be "transparently fixing all callers" — unnecessary when only one
caller is affected) and *toward* a scoping flag on `verify`.

## Decision

Add **`govkit verify --changed [<ref>]`** (default `<ref>`: `origin/main`, falling back to
`HEAD` when no upstream). It scopes which docs the gate **reports** on, by the set of
governed `.md` files that are new-or-modified relative to `<ref>` per
`git diff --name-only <ref>...HEAD` (and, optionally, the working tree).

**The load-bearing rule: scope the REPORT, never the SCAN.**

`runVerify` still reads **all** governed docs to build its global state — the id set for
duplicate-detection and reference-resolution, and the INDEX files — exactly as today. Only
the final emitted violation list is filtered:

```
violations.filter(v => changed.has(v.file) || isIndexOfAChangedType(v))
```

This is non-negotiable for correctness. If `--changed` naively *scanned* only changed
files, a brand-new doc that duplicates an **untouched** doc's id, or whose `parent` points
at a renamed id, would slip through — the gate would report nothing because the colliding
doc was outside the scan. Scoping the report (after a full scan) keeps every cross-doc
check honest while still surfacing only the debt this change is responsible for. (The
INDEX row of a changed doc's type is included in the report scope, because a changed doc
can make an *unchanged* INDEX file stale.)

**Git is invoked only on this opt-in path.** Plain `govkit verify` (no `--changed`) stays
exactly as it is: pure fs, no git, no API key — the load-bearing invariant is untouched.
`--changed` shells out to `git` lazily; if git is unavailable or `<ref>` does not resolve,
it errors clearly rather than silently degrading to a full scan (a silent fallback would
re-introduce the avalanche it exists to prevent — a no-silent-caps violation).

**Adoption recipe (documented, not coded):** an existing repo configures CI to run
`govkit verify --changed origin/main`. New and modified docs must pass the full gate;
legacy docs are reported only when a PR touches them — at which point fixing them is in
scope for that PR. Debt is paid down *as the repo is edited*, never in one big-bang
retrofit.

## Alternatives considered

| Option | Why deferred / rejected |
|---|---|
| **Persisted baseline file** (`.govkit-baseline.json`: a committed ledger of grandfathered violations; gate passes if current ⊆ baseline) | The more *complete* ratchet, and it has one genuine virtue — a **committed debt ledger in git**: debt becomes visible, dated, review-gated, and monotonically shrinking, echoing this project's "auditable in git log" theme. But it is the **bigger build** against a repo that has rejected complexity every round: it introduces a wholly new artifact category (generated/persisted state — neither source-doc nor config), plus fingerprinting, normalization, staleness/pruning, and a subcommand. Worse, it carries a **masking hazard**: a newly-introduced violation that fingerprint-matches a grandfathered one passes silently — the same "enforcement that looks active but isn't" leak the last two rounds fought. Given the hook is already per-write (so no caller needs the transparent inheritance baseline would provide), its cost is not yet justified. **Deferred to a possible RFC-0004.1**, to revisit if `--changed` proves insufficient. |
| `--max-warnings N` numeric threshold | Coarse: counts debt without identifying *which* items, cannot ratchet specific violations, and a threshold drifts meaninglessly as docs are added. |
| Per-doc opt-out front-matter (`govkit: ignore`) | Pollutes the docs, is trivially abused, and makes total debt invisible in aggregate — the opposite of a governance signal. |
| Severity levels (warn vs error) | A different concern, orthogonal to adoption scoping; would not by itself stop the day-one avalanche. Out of scope. |
| Do nothing (tell adopters to retrofit first) | This *is* the status quo, and it is the adoption cliff. Rejected — it confines govkit to greenfield repos. |

## Impact / rollout

- **Greenfield repos see zero change.** `--changed` is an opt-in flag; the default
  `verify`, `check`, `audit-write`, and the hook all behave identically. This repo stays
  100/100 on plain `verify`.
- **No new persisted artifact, no new config key required.** The engine change is a
  filter at the tail of `runVerify` (the *same* architectural shape RFC-0003's
  `checkReferences` and the existing INDEX/duplicate checks already use) plus a thin
  git-diff helper invoked only when the flag is set.
- **Cross-doc correctness is preserved** because the scan stays global; only reporting is
  scoped. A dedicated test must prove the report-scoping does **not** mask a new
  cross-doc violation (new doc duplicating an untouched id; dangling `parent` to a
  renamed id) — that test is the correctness floor for this feature.
- **Rollback** is removing the flag handling; no migration, no persisted state to clean up.

## Open questions

- **Working-tree vs committed diff.** Should `--changed` consider uncommitted edits
  (`git diff` against the working tree) in addition to `<ref>...HEAD`, or only committed
  changes? CI wants committed; a local pre-commit run may want the working tree. A second
  flag (`--changed --working-tree`) or auto-detection?
- **INDEX report scope.** Including the whole INDEX file of a changed doc's type is the
  conservative choice; is it ever too aggressive (surfacing an unrelated stale row the PR
  did not cause)? If so, scope to the specific row instead.
- **Does `eval` need the same `--changed`?** The graded score is already advisory (it does
  not gate), so scoping it matters less. Lean: gate-only for v1; revisit if a repo wants
  per-PR quality deltas.
- **The deferred baseline.** If `--changed` adoption reveals that teams still want a
  green *plain* `verify` (e.g. a dashboard that runs the default), does the committed
  debt-ledger argument become strong enough to build RFC-0004.1 — accepting the masking
  hazard with an explicit, fingerprint-specificity mitigation?
