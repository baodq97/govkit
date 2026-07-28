---
id: RFC-0018
title: Governs-existence check — a ghost pathspec is a broken declaration, gated in drift
status: implemented
owner: baodq97
date: 2026-07-08
reconciled: sha256:27d646ef780f623d
governs:
  - packages/govkit/src/commands/drift.ts
---

> Closes the ghost-path class Distill Round 1 named (ledger F-GOVERNS-EXIST): a `governs:`
> pathspec that resolves to no tracked file silently shrinks what both `drift` and `stale`
> cover, and nothing deterministic caught it. The check lands in `drift` — per-pathspec, for
> EVERY governed doc — settling the verify-or-drift layer question the ledger left open. The
> owner delegated approval in-session and implementation ships in the same PR (the RFC-0013/
> 0015 precedent), so this RFC lands directly at `status: implemented`.

## Summary

A doc's `governs:` list is a declaration: "these paths are the code this doc speaks for."
When a governed file moves or is renamed and the doc is not updated, the declaration keeps a
ghost — a pathspec matching nothing — and every downstream reader degrades quietly: `stale`
still evaluates recency off the paths that DO match, `drift` still finds a non-empty manifest
to hash, and the dead spec governs nothing while looking governed. Distill Round 1 caught
exactly this class in the wild. The fix is one deterministic rule: **every `governs:`
pathspec must match at least one tracked file**, checked per-spec (not aggregated), for every
governed doc (opted into the reconciled claim or not), with a violation naming exactly the
dead spec.

## Design

**Where it lives — `drift`, not `verify`.** The ledger left the layer decision open; the
deciding invariant is the same one RFC-0015 § Alternatives already settled: the verify floor
is pure-fs and no-git by construction, and resolving a git pathspec glob (`docs/**`) honestly
requires git's own matcher (`git ls-files`). A pure-fs re-implementation would need a glob
engine (a new dependency, or a partial hand-rolled one that lies on edge cases) — rungs 2–4
of the minimalism ladder all point at the matcher git already ships. So the check joins the
git-gated `drift` gate, reusing the `gitMatchCount` plumbing `stale` has trusted since
RFC-0009.

**Scope — every governed doc.** The reconciled claim check stays opt-in (RFC-0015's
zero-FP-by-construction argument), but the existence check runs for every doc declaring
`governs:`: the declaration itself is the opt-in, and a ghost pathspec is factually broken
regardless of whether the doc also carries `reconciled:`. A governs-only doc with a ghost
spec fails `drift` even though it is still `skipped` for the claim check — the two counters
stay honest about what each covers.

**The verdict.** Per doc, each governs pathspec with zero tracked matches is collected; any
ghosts ⇒ one violation entry naming them verbatim (`ghost: [...]` in the JSON), exit 1. The
ghost check runs BEFORE the claim check — a claim over a broken governed set is not worth
judging. `--ack` can never clear it: an ack rewrites the `reconciled:` value, and the fix a
ghost needs is a hand edit of the `governs:` list itself. Ghost entries are therefore
reported as unackable — including governs-only docs in an ack-all run, which would otherwise
exit 0 while the very next `drift` run stays red.

## Alternatives

| Option | Why rejected |
|---|---|
| **A verify kind** | Breaks verify's no-git purity (the RFC-0015 precedent): honest glob resolution needs git's matcher, and a pure-fs approximation either adds a dependency or lies on edge cases. |
| **Aggregate check (any path matches ⇒ green)** | That is `stale`'s existing dangling rule and precisely the escape: one live path masks every ghost beside it. Per-spec or nothing. |
| **Advisory only (extend `stale`)** | The class is deterministic — a spec matches or it does not; no proxy judgment involved. Deterministic-and-wrong is exactly what gates are for (RFC-0015's thesis). |
| **Opted-in docs only** | Leaves governs-only docs rotting silently, and the ghost class was found on the declaration layer, not the claim layer. |

## Impact / rollout

- Additive to the `drift` command; `verify`/`eval`/`check` byte-for-byte unchanged — the
  no-key CI floor never runs it.
- A repo running `drift` today may newly fail on pre-existing ghosts — that is the point;
  each violation names the dead spec and the fix is editing the `governs:` list.
- An untracked-but-existing file counts as a ghost (the gate reads the index, same as the
  amended claim check) — `git add` it or drop the spec; the message says which spec.
- Rollback is ignoring `drift` exit codes or removing `governs:` keys; nothing else changes.

## Open questions

- Should `stale` also go per-spec for its dangling advisory? Deferred until a consumer hits
  it — the gate now catches the class for any repo running `drift`.
- A glob that matches only the doc itself still degrades to the RFC-0015 "matches no tracked
  file" claim violation (self-exclusion empties the manifest); whether that deserves its own
  wording is deferred as cosmetic.

## As-built

Shipped inside `commands/drift.ts` (the file this RFC governs, alongside RFC-0015): a
per-spec `gitMatchCount` pass over every governed doc ahead of the claim check, a `ghost`
field on the violation entry, unackable reporting in `--ack` (ack-all surfaces non-target
ghost docs), and e2e tests pinning the ghost-among-live case, the governs-only case, and the
ack-all CANNOT case.

## Deviations from design

Review hardening (adversarial review-changes pass, same PR) added two deltas beyond the
original text:

- **Unevaluable ≠ ghost.** A pathspec git refuses to evaluate at all (invalid magic, exit
  128) is named as its own violation class ("git cannot evaluate governs pathspec(s): …"),
  never misdiagnosed as "matches no tracked file" — `gitMatchCount` now returns null for a
  git error, and `stale` treats null as its existing dangling skip.
- **The FAIL header counts governed docs, not opted-in docs.** With a governs-only doc
  failing the existence check, the old "N of M opted-in doc(s) drifted" could render N > M
  while calling the failing doc "skipped"; the header now reads "N governed doc(s) in
  violation (K opted into the claim check)".

## Recommendation

Gate governs-existence per-pathspec in `drift` for every governed doc, reusing git's own
matcher; prefer this over a verify kind (no-git floor), over aggregate matching (the mask is
the bug), over advisory-only (deterministic classes gate), and over claim-scoped checking
(the declaration is the broken layer) — each rejected above.
