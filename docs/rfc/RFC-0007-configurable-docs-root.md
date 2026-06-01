---
id: RFC-0007
title: Configurable docs-root — isolate kit-managed docs under one parent (default unchanged)
status: implemented
owner: baodq97
date: 2026-06-01
governs:
  - packages/govkit/src/config.ts
  - packages/govkit/src/util.ts
---

> Proposed after the RFC-0006 field work: on a real existing repo, `docs/` is already taken
> (a-real-repo has `docs/specs`, `docs/custom-docs`), so there is no clean place to put the
> governed docs the kit *generates* without colliding with the repo's own tree. This RFC adds
> a single configurable parent for kit-managed docs. Default behavior is **unchanged** — the
> feature is purely additive. Drafted at `status: draft`; the flip to accepted is the owner's.

## Summary

Today every governed-doc type carries a full path (`dir: docs/rfc`), and `docs/` is hardcoded
in three places: each `type.dir`, the `init` scaffold (`docs/product/INDEX.md` …), and every
read (`join(repoRoot, def.dir)`). There is **no single knob** for "where do the kit's docs
live." Two costs follow. (1) **Adoption collision:** a real repo's `docs/` already holds its
own content; the docs govkit *scaffolds* (RFC, ADR, PRD) have nowhere isolated to go.
(2) **No consolidation:** a user who wants all kit-managed governance under one folder
(`.govkit/`, easy to `.gitignore`-scope, review, or delete) cannot express it.

This RFC adds **`docs.root`** — a single parent directory, prepended to every type's `dir`.
**Default `"."`, so nothing changes** for any existing repo (including govkit itself): `docs.root`
absent → `"."` → `docs/rfc` exactly as today. Setting `docs.root: .govkit` resolves the same
types under `.govkit/docs/rfc`. It is a backward-compatible prefix, not a restructure.

## Decision

Add one optional config key and resolve every governed-doc directory through it.

- **`docs.root: string` (default `"."`).** The parent for all governed docs, relative to the
  repo root (the CLI's `--root`). Absent ⇒ `"."` ⇒ current behavior, bit-for-bit.
- **One resolution rule, one place.** Every reader (`verify`, `eval`, `adopt`) and the `init`
  scaffold resolve a type's directory as **`join(repoRoot, docs.root, type.dir)`** via a single
  shared helper — so the three readers cannot drift (the recurring lesson: one source of truth
  for a path the whole engine depends on). `type.dir` stays relative (`docs/rfc`); the root is
  the only new segment.
- **`init --docs-root <dir>`** writes `docs.root: <dir>` into the scaffolded `govkit.yml` **and**
  creates the INDEX stubs under that root (`<dir>/docs/rfc/INDEX.md` …). Without the flag,
  `init` scaffolds exactly as today (`docs.root` defaults to `"."`, written explicitly so the
  knob is discoverable).
- **Scope = prefix every type (decided).** The root prepends to **all** types uniformly; there
  is no per-type escape hatch in v1. A repo adopting an **existing** tree (e.g. `docs/specs`)
  keeps `docs.root: "."` and points that type's `dir` straight at it — `docs.root` is the home
  for **kit-managed** docs, not a tool for relocating docs that already live somewhere. The two
  needs (isolate new kit docs vs. govern an existing tree) are served by root vs. `dir`
  respectively, without a mixed mode.

**Why default `"."` and not `.govkit` (decided).** Defaulting to `.govkit` would isolate by
default but **break every existing layout** — this repo's `docs/rfc`, every adopter's config,
and the established `init` convention — forcing a migration and a `schemaVersion` bump for a
purely additive capability. govkit's load-bearing invariant is non-breaking, config-not-code:
the safe default is the current one, with `.govkit` as the **recommended** value for new repos
and adoptions (surfaced via `init --docs-root` and the docs), never an imposed one.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Default `docs.root: .govkit`** (isolate by default) | Breaks this repo + every adopter's layout + the `init` convention; needs a migration and a schemaVersion bump for an additive feature. Rejected — recommend `.govkit`, never default to it. |
| **Per-type "rooted/escape" override** (a type opts out of the prefix to point at an existing tree) | Real flexibility for hybrid repos, but a second path-resolution mode is exactly the drift surface this RFC removes by having one rule. The existing-tree need is already met by `root: "."` + a direct `dir`. Deferred as speculative — add only if a repo genuinely needs kit-docs-under-`.govkit` AND governed-existing-`docs/specs` simultaneously. |
| **Restructure: `docs.root: .govkit/docs` + bare `dir: rfc`** | Cleaner-looking config but a breaking change to every `type.dir`, and it splits the `docs/` segment ambiguously between root and convention. Prefix-the-existing-`dir` is non-breaking and matches the two examples the request gave exactly. Rejected. |
| **A top-level `root:` key (not under `docs:`)** | Collides conceptually with the CLI `--root` (repo root). Nesting under `docs:` and documenting "relative to `--root`" keeps the two roots distinct. Rejected in favor of `docs.root`. |
| **Do nothing — tell users to edit every `type.dir`** | The status quo: to consolidate, a user rewrites N `dir` values and keeps them in sync by hand. The single knob is the point. Rejected. |

## Impact / rollout

- **Zero change for existing repos.** `docs.root` absent ⇒ `"."`. This repo stays `docs/rfc`,
  verify/eval stay 100/100, no migration. The feature is invisible until opted into.
- **`init --docs-root .govkit`** becomes the recommended bootstrap for a new repo or an adoption
  that wants governance isolated from an existing `docs/` tree.
- **Touched surfaces:** `config.ts` (add `root` to the type + default in `loadConfig`), one
  shared path helper in `util.ts`, the three readers (`verify`/`eval`/`adopt`) switched to it,
  `init` (flag + scaffold paths + the template's `docs.root: "."` line). The PreToolUse
  `audit-write` hook resolves the same way, so the per-write gate honors the root for free.
- **Path-safety:** `init` already refuses writes outside `--root`; a `docs.root` that escapes
  the repo (`..`, absolute) must be confined for the write paths (`init`, `adopt --apply`) and
  is at worst a read miss for verify/eval. Validation lives in the impl.
- **Tests:** (a) absent `docs.root` resolves identically to today (the non-breaking floor —
  the most important test); (b) `docs.root: .govkit` resolves types under `.govkit/docs/*` for
  verify and adopt; (c) `init --docs-root .govkit` writes the key and scaffolds under it;
  (d) the three readers agree on the resolved path (one-source-of-truth pin).
- **Rollback** is removing the key; configs without it are unaffected, so there is nothing to
  migrate back.

## Open questions

- **Should a docs-root escaping the repo be a hard error or a warning?** `init`/`adopt --apply`
  must not write outside the repo; verify/eval merely find nothing. Lean: a clear error at
  config-load when `docs.root` resolves outside `--root`, so a typo fails loud rather than
  silently governing nothing (the same fail-loud-not-fail-open principle as RFC-0004's ref
  resolution). To settle in impl, RED-first.
- **Does `init` migrate an existing repo into a new root?** No — `init` scaffolds; moving an
  existing `docs/` into `.govkit/docs/` is a destructive reorganization that belongs to the
  human (or a future `--migrate`), not an idempotent scaffold. Named so a reader doesn't expect
  relocation from `init --docs-root` on a populated repo.
- **Interplay with RFC-0006 Lane 2 vocabulary drift.** Unaffected — drift is per-doc and root
  only changes *where* docs are found, not how they're scored. Recorded so it isn't re-opened.

## As-built

Shipped as designed. `docs.root` (default `"."`) is read in `config.ts` (`loadConfig`); every
governed-doc directory resolves through one shared helper (`typeDir` in `util.ts`), and all
readers go through it — `verify`, `eval`, `adopt`, the `init` scaffold, the `audit-write` hook,
**and** `stale` (RFC-0009, added later, inherited the single resolution rule for free, which is
exactly the one-source-of-truth payoff this RFC argued for). `init --docs-root <dir>` writes the
key and scaffolds the INDEX stubs under it. Default-absent resolves bit-for-bit to today —
govkit's own docs stay `docs/rfc`, verify/eval stay 100/100.

The escaping-root open question resolved the way the RFC *leaned*: a **hard error at config-load**
(`config.ts`: `relative(root, resolve(root, docsRoot))` → reject if it starts `..` or is absolute),
so a typo fails loud instead of silently governing nothing. `init` does not relocate an existing
tree (scaffold-only), as named.

## Deviations from design

- **None material.** The per-type escape hatch was deliberately *not* built (the RFC deferred it
  as speculative) — that is held scope, not a deviation. The escape-root question landed on the
  leaned option (hard error), so the impl matches the design rather than diverging.
- **One thing the design did not foresee:** a *future* reader (`stale`, RFC-0009) would also depend
  on the resolution rule. Because the rule was centralized in `typeDir`, that reader required zero
  new path logic — the decision paid off beyond the readers enumerated at design time. Recorded
  because it strengthens, not weakens, the as-built.
