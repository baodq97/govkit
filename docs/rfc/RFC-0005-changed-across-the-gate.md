---
id: RFC-0005
title: Complete --changed across the gate — eval and check honor adoption scoping
status: draft
owner: TBD
date: 2026-05-31
---

> Resolves the open question RFC-0004 explicitly deferred ("does `eval` need the same
> `--changed`?") into a decision, extending the *accepted* `--changed` surface to the two
> sibling commands. Authored at `draft` — no owner, no acceptance — pending a human flip,
> per the RFC-0002/0003/0004 lesson: a public surface rides with an accepted RFC, not after it.

## Summary

RFC-0004 shipped `verify --changed`, but scoped it to `verify` alone. `eval` and `check`
still **full-scan against a *blocking* floor** — so an existing repo that runs the
**documented CI entrypoint**, `govkit check` ("the single no-key gate a CI calls"), still
hits the day-one avalanche, now from the eval **required floor** instead of verify. The
adoption recipe RFC-0004 promised therefore only works for a repo that abandons `check`
and runs bare `verify --changed`, dropping the quality layer entirely. That is half a
feature. This RFC closes the other half: make `--changed` consistent across the whole gate
so `check --changed <ref>` is a genuinely adoptable CI entrypoint.

## Decision

Thread `--changed` (and its `--base <ref>`) into **`eval`** and **`check`**, reusing the
exact git-changed-set helper RFC-0004 added (`gitChangedDocs` / `resolveChangedBase`) — no
new git surface, no new persisted artifact.

- **`eval --changed`**: score **only** the artifacts in the changed set. The required
  floor (`ok`), the advisory average, and both pass-rates are computed over that subset.
  An existing repo's un-touched legacy docs no longer tank the floor or the average — the
  PR is judged on what it changed.
- **`check --changed`**: thread the flag into *both* its `verify` and `eval` calls, so the
  one entrypoint a CI actually invokes is adoptable as a unit.
- Output **names the scope** on both commands (no silent caps), exactly as `verify` does.

**Why this is simpler than `verify --changed` — and carries no masking hazard.** `eval`
scores each artifact **independently**: there is no cross-document check (no duplicate-id,
no reference-resolution) whose violation could be reported against an *untouched* file.
So `verify`'s load-bearing rule ("scope the REPORT, never the SCAN", with global-integrity
kinds always reported to avoid masking a new collision) has **no analogue here**: with no
cross-doc edge, scoping *which artifacts are scored* is safe and cheaper than scoring all
and filtering. The asymmetry is the point — the masking floor that constrained RFC-0004
does not exist for a per-artifact grader, and the RFC states so rather than copy the
heavier mechanism out of false symmetry.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| Score all artifacts, report only changed (mirror verify's scan-all/report-subset) | Wasted work with no correctness payoff: eval has no cross-doc dependency, so a full scan buys nothing. Rejected in favor of scoping the scored set. |
| A separate `eval` baseline file | Same persisted-state cost RFC-0004 rejected for `verify`, with the same masking-by-fingerprint hazard — and eval needs it even less (no cross-doc state). Rejected. |
| Leave eval/check full-scan; document "use bare `verify --changed`" | The status quo, and it is the gap: it tells adopters to drop the quality layer to adopt at all. Rejected — half a feature masquerading as done. |
| Scope only the floor, keep the advisory average over all docs | The legacy docs would still drag the headline score, misrepresenting the PR. If we scope, scope consistently. Rejected. |

## Impact / rollout

- **Greenfield repos see zero change.** `--changed` stays opt-in; bare `eval` / `check`
  behave identically. This repo stays 100/100 on the un-flagged path.
- **`check --changed origin/main` becomes the real adoptable CI entrypoint** — the whole
  no-key gate (structural + quality floor), scoped to the PR's docs.
- **Inherits RFC-0004's git semantics**: two-dot `git diff <ref>` (ref-vs-working-tree,
  capturing uncommitted + untracked), a clear error on an unresolvable ref (never a silent
  full-scan).
- **Tests**: eval-scoping is correctness-simpler than verify's (no masking floor to prove),
  but a test must pin that (a) a low-quality *untouched* doc does NOT fail `eval --changed`
  when the PR didn't touch it, and (b) a low-quality *changed* doc still does.
- **Rollback** is removing the flag threading; no migration, no persisted state.

## Open questions

- **Single-doc PR advisory average.** `eval --changed` on a one-doc change reports that
  doc's score as the "average" — accurate but easy to misread as a repo-wide trend. Is a
  label ("avg over 1 changed doc") enough, or should the advisory average always stay
  repo-wide while only the *floor* scopes? (Lean: scope both, label clearly — a per-PR
  delta is what a PR gate should show.)
- **`audit-write` parity.** The per-write hook is already per-file, so it needs no
  `--changed`. Confirmed out of scope — recorded so a future reader does not re-open it.
