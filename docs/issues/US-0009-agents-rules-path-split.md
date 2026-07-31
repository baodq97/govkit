---
id: US-0009
title: Split AGENTS.md's per-path rules into path-scoped .claude/rules/*.md for lazy governance load
status: done
owner: baodq97
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As an agent starting a session in a govkit-governed repo, I want the per-surface rules (the
governed-doc authoring rules, the code-change rules) to load only when the session touches matching
files, so that the always-on `AGENTS.md` shrinks to the genuinely-global contract and I do not pay
the full 178-line context load on a session that only edits, say, `docs/`.

## Context

This is RFC-0032 Phase 2 (F8), context economy. Today the root `AGENTS.md` (178 lines) loads whole
every session regardless of what the session touches. Claude Code supports `.claude/rules/*.md` with
a `paths:` frontmatter glob that lazy-loads a rule file **only when the session touches a matching
file** (verified against the CC best-practice corpus README/CLAUDE.md; the `InstructionsLoaded` hook
exposes a `path_glob_match` reason). The direction chosen in RFC-0032 (§F8, "leave AGENTS.md whole"
rejected): move the PER-PATH / per-surface rule blocks out of the always-on file into path-scoped
rule files (e.g. governed-doc rules on `docs/**`, code-change rules on `packages/**` / `plugins/**`),
while keeping the genuinely-GLOBAL contract — the authority split ("agents author, never flip
status"; main-agent-vs-sub-agent) and the change-class / Lifecycle table — in `AGENTS.md`.

### Two AGENTS surfaces — and a correction to the finding's mirror claim (grounded on disk)

The RFC-0032 finding text says `AGENTS.md` is "MIRRORED byte-identical to
`packages/govkit/templates/AGENTS.default.md` and `template/AGENTS.md`". **That is not what the tree
holds — verified with `diff`, not inferred:**

- The root **`/AGENTS.md`** is the monorepo's own **dogfood** contract — **178 lines**. It is the
  literal subject of F8 ("178 lines loads whole"). It is **NOT** in the `check-sync.mjs` mirror set,
  and it is **NOT** byte-identical to the consumer scaffold (`diff` reports them different).
- The **consumer scaffold** is a separate, shorter file — `packages/govkit/templates/AGENTS.default.md`
  (**101 lines**) — that `check-sync.mjs` Check B (`mirrorPairs`) pins **byte-identical to
  `template/AGENTS.md`** (also 101 lines; `diff` reports them IDENTICAL). `runInit()` emits a
  consumer's `AGENTS.md` from `AGENTS.default.md` (`packages/govkit/src/commands/init.ts:92`,
  idempotent — an existing `AGENTS.md` is skipped, never clobbered).

So there are **two** surfaces to split, and only ONE mirror pair is load-bearing today:

1. **Dogfood surface** — root `/AGENTS.md` → new `.claude/rules/*.md` in THIS repo. Not mirror-pinned.
2. **Consumer-scaffold surface** — `AGENTS.default.md` (== `template/AGENTS.md`) → consumer
   `.claude/rules/*.md` emitted by `init` and shipped by `template/`. This IS mirror-pinned, and any
   new consumer rule file needs a new `check-sync` pair or it drifts silently.

**Does the consumer scaffold (init / templates) need to emit the new `.claude/rules/*.md`? Yes.** If
the split lands only on the dogfood surface, a scaffolded consumer keeps the whole `AGENTS.default.md`
inline and never gets the lazy-load benefit F8 is about. Emitting them requires, in lockstep: a
bundled template per rule file (`packages/govkit/templates/rules/<name>.default.md`), a byte-identical
copy under `template/.claude/rules/<name>.md`, a new `mirrorPairs` entry per file in
`scripts/check-sync.mjs` Check B, and a new scaffold entry per file in `scaffold()`
(`packages/govkit/src/commands/init.ts:74`) — the hardcoded array does not read the rules dir, so an
un-added file silently un-scaffolds.

**Hard constraint (recorded, corrected):** keep the `AGENTS.default.md ↔ template/AGENTS.md` mirror
pair green (they stay byte-identical after the split), and give EACH new consumer rule file its own
byte-identical `mirrorPairs` entry. The root `/AGENTS.md` is edited on its own — no pair guards it, so
its split is verified by the content-preservation test below, not by a mirror check.

`Blocked by:` none. Sibling RFC-0032 Phase 2 slices (F-freeze skill-hook, F9 `AskUserQuestion`) touch
skill `hooks:`/prompt surfaces, disjoint from this slice's files — parallel-safe with them. The only
overlap risk is any concurrent slice that also edits `scripts/check-sync.mjs` / `check-sync.test.mjs`
(this slice adds `mirrorPairs` entries there); if one is in flight, this slice waits on it or they
merge, since two hands editing `mirrorPairs` collide.

`Touches:` `AGENTS.md` (root dogfood — move per-path rules out, keep the global contract); new
`.claude/rules/*.md` (dogfood, each with a `paths:` glob); `packages/govkit/templates/AGENTS.default.md`
and `template/AGENTS.md` (consumer scaffold — same split, stay byte-identical); new
`packages/govkit/templates/rules/*.default.md` + `template/.claude/rules/*.md` (bundled consumer rule
templates + their mirror); `scripts/check-sync.mjs` (Check B `mirrorPairs` — one entry per new consumer
rule file); `scripts/check-sync.test.mjs` (prove the new pair fails on divergence, passes on match);
`packages/govkit/src/commands/init.ts` (`scaffold()` emits the consumer `.claude/rules/*.md`) and
`packages/govkit/test/init.test.ts` (assert they appear in `created`).

**Testable? Yes.** Each criterion below can be pinned by a failing unit test: mirror-pair drift is
already the `check-sync.test.mjs` pattern (US-0004/US-0008); content-preservation and
`paths:`-frontmatter presence are grep/parse assertions over the files; the scaffold emission is a
`runInit()` assertion. This slice carries no governed-doc content change, so `govkit verify` is
unaffected.

## Acceptance criteria

- [ ] Root `AGENTS.md` retains ONLY the genuinely-global contract: the authority split (main-agent
      vs sub-agent — "agents author, never flip status") AND the change-class / Lifecycle-gates table
      remain in `AGENTS.md` itself. A test asserts these canonical anchors are present in `AGENTS.md`
      (not only inside a path-scoped rule that would fail to load on an unrelated session).
- [ ] Every per-path / per-surface rule block moved out of `AGENTS.md` lands in a
      `.claude/rules/<name>.md` that carries a non-empty `paths:` frontmatter glob (the lazy-load
      trigger). A test asserts each file under `.claude/rules/` has a `paths:` key and that `AGENTS.md`
      itself carries NO `paths:` key (it is the always-on file, not path-scoped).
- [ ] No content loss: a test checks that every load-bearing rule from the pre-split `AGENTS.md`
      (a pinned inventory of canonical anchors — e.g. the "never pipe a gate through `head`" rule, the
      reconcile-as-you-go rule, the minimalism ladder, the authority split) is present in the UNION of
      the post-split `AGENTS.md` + all `.claude/rules/*.md`. A dropped rule fails the test.
- [ ] The consumer-scaffold mirror pair stays green: `packages/govkit/templates/AGENTS.default.md`
      and `template/AGENTS.md` remain byte-for-byte identical after the split (`check-sync.mjs`
      Check B passes for that pair).
- [ ] The consumer scaffold emits the split: for each consumer `.claude/rules/<name>.md`, a bundled
      template exists at `packages/govkit/templates/rules/<name>.default.md`,
      `template/.claude/rules/<name>.md` ships a byte-identical copy, and `runInit()` scaffolds
      `.claude/rules/<name>.md` — asserted by an `init.test.ts` case that finds each file in the
      `created` list (idempotently skipped, never clobbered, on a re-run).
- [ ] `scripts/check-sync.mjs` Check B (`mirrorPairs`) gains one entry per new consumer rule file,
      pinning `packages/govkit/templates/rules/<name>.default.md` ↔ `template/.claude/rules/<name>.md`
      byte-identical; the OK-summary count reflects the added pairs.
- [ ] `scripts/check-sync.test.mjs` gains a case proving a new rule-file mirror pair FAILS when the
      bundled template and the shipped `template/` copy diverge and PASSES when they match (same guard
      class as the existing `AGENTS.default.md ↔ template/AGENTS.md` pair). The test is wired into the
      `check` chain (check-sync Check D).
- [ ] `bun run check` is green after the split — check-sync OK (all mirror pairs byte-identical, no
      orphan rule templates), and `govkit verify` / `eval` unchanged because no governed-doc content
      moved.

## Design & risks

**Mechanism.** Claude Code loads `.claude/rules/<name>.md` only when the session touches a path
matching that file's `paths:` frontmatter glob (`InstructionsLoaded` hook `path_glob_match` reason;
CC best-practice corpus). `AGENTS.md` stays the always-on file. The split relocates mechanical,
path-local rule blocks — governed-doc authoring rules keyed `paths: docs/**`, code-change rules keyed
`paths: "packages/**"` / `"plugins/**"` — out of the 178-line always-on load, leaving the global
contract (authority split, change-class table) in `AGENTS.md`. The dogfood surface and the
consumer-scaffold surface are split with ONE shared rule taxonomy (which rules are global, which are
path-scoped) so the two surfaces cannot diverge in what loads where; that is why they are one slice,
not two.

**Failure mode 1 — content loss (a rule silently vanishes).** Moving prose between files can drop a
rule; a session that never touches the trigger path then never sees a rule it used to see on every
session. Attack surface for the reviewer: (a) pick a rule that MUST be global (the authority split,
the change-class table, "act-on-green is conditional") and confirm it was NOT demoted into a
`paths:`-scoped file that fails to load on an unrelated session — a demoted global rule is a silent
governance regression the gate cannot see. (b) Attack the content-preservation test's anchor
inventory: is it complete, or can a dropped line slip through because no pinned anchor covers it? An
inventory that only checks headings, not the load-bearing sentences under them, gives false assurance.

**Failure mode 2 — mirror drift, amplified by the mis-stated constraint.** The RFC-0032 finding
asserts all three AGENTS files are byte-identical; they are not (verified: root `/AGENTS.md` is 178
lines and outside the mirror set; the pinned pair is the 101-line `AGENTS.default.md ↔
template/AGENTS.md`). An implementer who trusts the finding and edits root `AGENTS.md` expecting a
pair to guard it gets NO drift signal on the consumer scaffold — and vice-versa. Attack surface: for
EACH new consumer rule file, confirm all THREE of {bundled template `.../templates/rules/<name>.default.md`,
shipped `template/.claude/rules/<name>.md`, a `check-sync` `mirrorPairs` entry} exist. A rule added to
only two of the three drifts the instant one is edited — the exact US-0004 / RFC-0031 failure this
check exists to prevent (a copy bumped without its twin). Also attack the `init` path: `runInit()` is
idempotent and SKIPS existing files, and `scaffold()` is a hardcoded array that does not read the
rules dir — a rule file not added as its own scaffold entry silently un-scaffolds for every new
consumer (the same premise-break caught 2026-07-29 when `domain`/`rel` joined the schema and `init`
kept emitting four dirs), and a consumer who ran an older `init` will only receive the new rules
because they are missing files `init` creates, not because it re-clobbers `AGENTS.md`.

## Non-goals

- The `<important if="...">` tag (RFC-0032 §F8 caveat) is **deferred as non-load-bearing** — it is
  third-party-sourced (hlyr.dev), not an official Claude Code doc. This slice does **not** require it;
  a reviewer must not treat its absence as a gap.
- Re-authoring the rule prose for richness, or re-deciding which rules are global vs path-scoped
  beyond the F8 direction (global = authority split + change-class table; path-scoped = the mechanical
  per-surface rules). Taxonomy calls at the margin are settled in implementation, but the split does
  not rewrite the rules.
- Any change to the `govkit verify` / `eval` engine, or to the settings-template hooks / the plugin
  Stop hook (F1's surface, US-0008) — this is an agent-facing-context change only.
- Splitting or governing the roadmap / vision content, or touching any governed doc under a
  `governs:` — no lifecycle-doc content moves in this slice.
