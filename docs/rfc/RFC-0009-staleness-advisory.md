---
id: RFC-0009
title: Staleness advisory — link a doc to the code it governs and warn when the code moved on
status: implemented
owner: baodq97
date: 2026-06-01
---

> Builds the ADVISORY half RFC-0008 named-but-deferred: a `governs:` front-matter glob linking a
> doc to the code it describes, plus a git-recency check that warns when the governed code has
> commits newer than the doc. Honest scope first: this is a **proxy, not a truth** — any commit
> to a governed path trips it, so it can NEVER block (a blocking version would train people to
> touch the doc meaninglessly to turn red green, the exact lie RFC-0008 rejected). It is the
> `eval`-class sibling of RFC-0008's gate-class coherence check, and it lives behind git, opt-in,
> outside the no-key pure-fs floor. Drafted at `status: draft`; the accept is the owner's.

## Summary

RFC-0008 made structural drift between *documents* loud (chain-status coherence). It explicitly
left the other half — drift between a **document and the code it describes** — as a named, not
built, advisory: RFC-0009. The user's original ask had two halves; this is the second. *"Track
docs nào outdate"* needs a link from a doc to the code it governs and a signal when that code has
moved on without the doc being reconciled.

The honest realization, stated so it is not overclaimed (the recurring discipline): **whether the
code moving *invalidated* the doc is a semantic question a no-key check cannot answer.** A rename,
a lint autofix, or a typo fix in a governed path all make the code "newer than the doc" while
changing nothing the doc claims. So git-recency is a **proxy** — it answers "did the governed code
change since the doc was last touched?", never "is the doc now wrong?". That gap is exactly why
this must be ADVISORY and never a gate, and why the real judgment is deferred to the human / the
`reviewer` agent (RFC-0001). Promising it *detects* staleness would repeat the overclaim reflex.

It sits precisely on the RFC-0001 trust line, as the sibling RFC-0008 already drew:

- **GATE class (RFC-0008, shipped):** chain-status coherence — zero-false-positive, blocks.
- **ADVISORY class (this RFC):** staleness — a `governs:` link + git-recency proxy. Necessarily
  advisory; surfaces, never blocks.

## The load-bearing constraint: this cannot live in the no-key floor

govkit's defining invariant (README, "The invariant that shapes everything"): the deterministic
core runs in CI **with no API key and pure-fs**; **git is touched only on the opt-in `--changed`
path**, never by default `verify`/`eval`/`check`. Staleness *needs* git history (a commit
timestamp) — so it **cannot** be folded into `eval`, despite being "eval-class" in spirit. It
must be a **separate, git-gated, opt-in command** (`govkit stale`), exactly as `--changed` is the
only other git-touching path. `govkit check` (the CI gate) does **not** call it. This keeps the
no-key floor intact: a contributor with no key, or a build with no git, runs the full gate
unaffected, and reaches for `stale` only when they want the advisory.

A second trap, named so the implementation cannot fall in it: the recency comparison MUST use
**git commit time on both sides** (`git log -1 --format=%ct -- <path>`), never filesystem mtime.
After a fresh CI clone every file's mtime is the checkout instant, so an mtime-based check is pure
noise in the exact environment the invariant cares about. The doc's baseline is its last commit
time; the governed baseline is the **max** commit time across the glob matches; code-newer ⇒
advisory.

## Decision

**1. A per-doc `governs:` front-matter key (the link).** A doc may declare
`governs: [glob, …]` (a single string is accepted and normalized) naming the code paths it
describes — e.g. RFC-0008 `governs: ["packages/govkit/src/commands/verify.ts"]`. It is a
**front-matter** key, not a config field: *which* code a doc governs is the doc's own claim, like
its `parent`. Opt-in at the doc level — a doc with no `governs` simply does not participate, so the
feature is non-breaking and dark until a doc opts in. (Unlike `refs`, `governs` is not enforced by
the gate at all — it feeds only the advisory `stale` command.)

**2. A git-gated `govkit stale` command (the proxy).** Read-only, advisory, **always exits 0**.
For every governed doc that declares `governs`:

- `docTime` = the doc file's last commit time (`git log -1 --format=%ct`).
- `codeTime` = the **max** last-commit-time across the `governs` glob matches.
- `codeTime > docTime` ⇒ report **stale**: "governed code has moved since this doc was last
  touched — reconcile the doc or supersede it." Else **fresh**.

It never affects an exit code and is never called by `check` — gating on a proxy is the precise
thing the gate/eval split (RFC-0001) exists to forbid.

**3. Skip-cases degrade to skip, never error — and the dangling glob is surfaced, not silent.**
Mirroring RFC-0003/0008's reference skips:

- **git unavailable / not a work tree** → the whole command degrades to a single explanatory note
  and exits 0 (it is an advisory tool; absence of git is not a failure).
- **doc not yet committed** (no commit time) → skip that doc (`uncommitted`); nothing to compare.
- **`governs:` glob matches zero tracked files** → this is the analogue of RFC-0003's dangling
  `parent`: surface it as its **own advisory line** (`governs matches no tracked files: <glob>`),
  never silently treat it as "fresh" — a typo'd glob that reads green is worse than no check.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Block CI on staleness** (`check` fails when code is newer than its doc) | The RFC-0008 avalanche reborn, and worse: any trivial commit (rename, lint autofix, typo) to a governed path turns the gate red, training people to make empty doc edits to turn it green — turning "doc updated" into noise and lying to the gate. Staleness MUST be advisory; that is the whole reason RFC-0008 split it out. |
| **Fold into `eval`** (so `check` covers it) | Breaks the load-bearing no-key/pure-fs invariant: `eval` must run with no git in CI. Staleness needs commit history, so it lives behind the opt-in git path (`govkit stale`), the same gate `--changed` sits behind. |
| **Filesystem mtime instead of commit time** | mtime is checkout-time on a fresh clone → the check is pure noise in CI, the one place it must work. Commit time on both sides is the only honest baseline. |
| **A config-level `governs` (per-type)** | *Which* code a doc governs is doc-specific, not type-uniform — a per-type glob would over-claim (every RFC governs the same paths?). A per-doc front-matter key is the honest granularity, like `parent`. |
| **Diff the prose against the code semantically** | The single-source dream; impossible without semantics and out of scope by construction (the `reviewer` agent's job). `stale` only ever says "the code moved", never "the doc is wrong". |
| **A "significance" threshold** (ignore "small" code changes) | "Significant?" is the exact semantic question the no-key layer cannot answer; guessing it would manufacture false confidence. Deferred to the human reading the advisory (or the reviewer agent). |

## Impact / rollout

- **Non-breaking / opt-in, twice over:** a doc without `governs` does not participate, and the
  whole feature is a *separate command* — existing `verify`/`eval`/`check`/`report` are untouched,
  and the no-key CI gate is byte-for-byte unchanged.
- **Reuses the git plumbing of `--changed`:** the same `execFileSync('git', …)` discipline (errors
  surfaced, never a silent fallback) already in `util.ts`; this adds a `gitCommitTime` /
  `gitMatchCount` pair next to `gitChangedDocs`.
- **Honest residues, stated up front:** (a) it is a **proxy** — "code moved" ≠ "doc wrong"; a
  green `stale` does not certify currency and a red one does not prove rot (the self-attestation
  problem's cousin). (b) it sees only the **single** governed glob set per doc, not transitive
  governance. (c) it cannot judge *significance* — that is the reviewer's / the human's. All three
  are why it is advisory, not a gate.
- **Tests (when built):** on a temp git repo — (a) doc committed, then a governed file committed
  later ⇒ **stale**; (b) governed file committed, then the doc committed later ⇒ **fresh**; (c) a
  `governs` glob matching no tracked file ⇒ a **dangling** advisory line, not "fresh"; (d) an
  uncommitted doc ⇒ **skipped**, not crashed; (e) a repo with no `governs` anywhere ⇒ "no docs
  declare governs", exit 0; (f) git absent ⇒ a note, exit 0.
- **Rollback** is removing the `governs` keys (or simply not running `stale`); nothing else is
  affected because nothing else calls it.

## Open questions

- **Intersection with RFC-0010 (named, not wired).** An RFC at `implemented` whose `## As-built`
  section says "no deviations" *and* whose `governs:` code later changed is the single strongest
  "go reconcile" signal in the system — the gate says the as-built ritual happened, the proxy says
  the code moved anyway. Escalating `stale` when 0010's section claims "None" is deferred on
  purpose: build each newborn feature clean, note-but-don't-wire the coupling (one line each).
- **Where `governs` is validated.** v1 does not gate `governs` at all (only `stale` reads it). A
  future option: a *dangling-governs* check in `verify` (a glob matching nothing is a typo) —
  but that needs git (to know what is tracked), which `verify` must not touch. So it stays in the
  advisory `stale` lane, surfaced there. Recorded as the same no-key boundary `--changed` honors.
- **Granularity of recency.** v1 uses last-commit-time of the doc file. A doc edited for a typo
  resets its own clock and reads "fresh" though its substance is old — the mirror of the code-side
  proxy noise. Both directions are why this is advisory. A content-hash baseline is a future,
  heavier option, deliberately not v1.

## As-built

Shipped as `commands/stale.ts` (`govkit stale`) with the `governs:` front-matter key (string or
list). Recency uses git **commit time** (`git log -1 --format=%ct`), never mtime, via
`gitCommitTime`/`gitMatchCount`/`gitAvailable` in `util.ts`. It is git-gated and lives OUTSIDE the
no-key pure-fs floor by construction — `check` never calls it, it never affects an exit code. The
four skip-cases (`stale`/`fresh`/`dangling`/`uncommitted`) are surfaced honestly, never silently
read as fresh. Proven live this session: after the bun migration, `govkit stale` reported
**2 declare governs, 0 dangling, 2 fresh** — including the governs reconciliation it predicted.

## Deviations from design

- **A masking bug the design did not anticipate, caught by the dogfooded reviewer.** The first
  implementation compared only `gitMatchCount > 0` to decide a glob was evaluable — but a governed
  path that is *staged but never committed* matches `ls-files` (count > 0) yet has **no commit
  time** (`gitCommitTime` → null), so the code silently read it as "fresh". That violates this
  RFC's own §3 ("never silently fresh"). Fixed by folding `codeTime === null` into the `dangling`
  branch (so both "matches nothing" and "matches only uncommitted" land on the same honest skip),
  plus a regression test. The RFC's principle was right; the first code betrayed it; the repo's own
  reviewer agent caught it before merge — the self-correcting loop working.
- **Weak-by-default adoption (named, not hidden).** Only ADR-0001 (and now ADR-0002) declare
  `governs:`. The capability is proven but barely *used* — broad "which doc governs which source"
  adoption is deferred to the owner, so a green `stale` today certifies very little coverage. This
  is the honest as-built state, not a claim of repo-wide staleness tracking.
