# Learning loop — govkit dogfooding itself (3 iterations)

**Goal (user):** after shipping the `workflow-author` skill, use *this repo + its own config*
to improve the repo itself, learning-loop style, **at least 3 times** — and treat friction as
the signal: *"nếu không ổn thì có vẻ config của repo này chưa tối ưu."*

**Method:** run each layer of govkit's config against the repo's own working tree, observe what
it does (and does **not**) catch, and act on the gap — or conclude honestly that the layer held.
No `packages/govkit/**` source was touched (the user's uncommitted eval redesign stays its WIP);
the no-API-key invariant is preserved.

> This file lives at the repo root, **outside** `docs/`, so the govkit gate never checks it —
> which is itself Loop-1's finding, demonstrated in place.

---

## Loop 1 — run the gate on itself

```
govkit verify: OK — 2 doc(s) checked, 0 violations.        exit 0
govkit eval:   OK — 2 artifact(s); floor 100%; advisory avg 100/100, 100% ≥ 70.  exit 0
```

This session shipped a **new public, LLM-facing surface** — the `workflow-author` skill, the
`review-changes.js` workflow, and three manifest version bumps (`plugin.json`,
`marketplace.json`, `README.md`). The gate said **nothing about any of it**: it checked the two
governed docs (RFC-0001, ADR-0001) and reported green.

**Finding (the silence is the signal).** `govkit.yml` governs four dirs only —
`docs/product | rfc | adr | issues`. The entire `plugins/**` and `.claude/workflows/**` surface
is outside the gate **by design**. A contributor can add or alter a skill, an agent, or a
workflow with zero gate, zero record. That is correct (the deterministic no-key core must stay
independent of the LLM-facing layer) — but it means *plugin-surface changes are governed only by
discipline, through the doc chain*, not by the engine.

**Action → Loop 2.** Don't teach the engine to crawl `plugins/` (that couples the core to the
layer it must stay free of — the over-engineering this project rejects). Instead, *use the
existing doc chain* to record the change.

---

## Loop 2 — close the gap via the doc chain (author RFC-0002)

Authored `docs/rfc/RFC-0002-workflow-author-skill.md` (complete front-matter first pass — the
`PreToolUse` hook accepted it with no bounce, the dogfood working) and synced `docs/rfc/INDEX.md`.

```
govkit verify: OK — 3 doc(s) checked, 0 violations.        exit 0   (was 2)
govkit eval:   OK — 3 artifact(s); floor 100%; advisory avg 100/100.
               RFC-0002 … 100/100 [rfc]                              (now in scope)
```

The loop closes: the doc chain now governs the plugin-surface change, and the gate actively
verifies it — INDEX sync, id↔filename, status enum, front-matter, and the quality rubric all
fire. **Config-not-code in action: no engine change, the bar was met by writing the doc.**

**Finding.** The gate checks docs that *exist*; nothing *forced* the RFC to exist. The lifecycle
rule "a new public surface needs an RFC" (root `AGENTS.md`) is real but **unenforced for non-doc
surfaces** — adoption is by discipline. Enforcing it (e.g. "a `plugins/` change in a PR must ride
with a new `docs/rfc/` entry") is a candidate, but borderline over-engineering — recorded as an
open question in RFC-0002, not built.

---

## Loop 3 — run the dogfood workflow end-to-end → **executed; it found real defects**

> **Record correction.** The first pass of this file (written while Loop 3 was *blocked*)
> concluded the config was "optimal for its scope" and called the items below "non-findings" and
> "over-engineering, not built." A blocked loop cannot find what only running it reveals. After a
> `/reload-plugins` exposed the `swe-flow:*` agents in the registry, Loop 3 **actually ran** — and
> reversed those calls. The corrected record is below; the earlier verdict was premature.

**It would not even parse first.** The Workflow runtime rejected `review-changes.js` with *"meta
must be a pure literal: non-literal node type … BinaryExpression"* — the `meta.description` was
built with string concatenation (`"…" + "…"`). Fixed to a single literal. **This exposed a
generator gap:** `node --check` treats concatenation as valid JS, so the `workflow-author`
validation checklist (which relied on `node --check`) never caught it. Added a deterministic
`meta`-pure-literal check (an `awk` range grep for `+ / ${ / ...`) to the skill's
`authoring-workflows.md` §5 so the next generated workflow can't repeat it.

**Then it ran end-to-end:** 8 agents, Review→Verify pipeline over the working state, **4 issues
survived adversarial refutation:**

| # | Dim | File | Confirmed finding | Action |
|---|---|---|---|---|
| 1 | correctness | `.claude/workflows/review-changes.js` | review prompt targeted `git diff` only → **misses all untracked new files** (the skill, the RFC, the workflow itself) | **Fixed** — prompt now inspects committed diff **and** untracked via `git status` + direct read |
| 2 | correctness | `…/workflow-author/references/authoring-workflows.md` | fan-out skeleton calls `buildWaves(args.stories)` with **no null-guard** → crashes when run with no args | **Fixed (generator)** — guarded `(args && args.stories) || []` + clear throw, matching the pipeline skeleton's idiom |
| 3 | reuse | `packages/govkit/test/eval-hardening.test.ts` | `evalUs` duplicated the `evalAdr` harness | **Fixed** — extracted shared `evalDoc(spec, body, config)`; 33/33 tests still green |
| 4 | governance | `docs/rfc/RFC-0002-workflow-author-skill.md` | **BLOCK** — the public skill shipped (plugin.json/marketplace.json/README at 0.3.0) **before RFC-0002 reached `accepted`** (still `draft`) — a lifecycle-ordering violation | **Surfaced, not auto-resolved** — flipping status is a human doc-owner act (AGENTS.md forbids self-flip); see Handoff |

Finding #1 directly **reverses** the earlier "non-finding (it's an assumption, not a defect)."
Finding #4 directly **reverses** the earlier "borderline over-engineering, recorded but not
built" — an independent reviewer called it a hard BLOCK on confirmed evidence.

---

## Verdict — does the config cut it? (revised, per the user's success test)

The user's test was explicit: *"nếu không ổn thì có vẻ config của repo này chưa tối ưu."* Running
the loop for real produced friction — so by that test, **the config was not yet optimal, and the
loop earned its keep by finding exactly where.**

**The deterministic docs-as-code core held throughout** — 33/33 tests green, `govkit check` 100/100
on all three docs, the `PreToolUse` hook clean. Nothing in `packages/govkit/**` engine logic was a
defect. *That* layer is sound.

**The real config gap — three latent bugs in the `workflow-author` skill its own deterministic
checklist did not catch.** These are the unambiguous proof the config was not yet optimal: each is
a defect in the skill's deliverables that shipped clean past `node --check`:

| # | Was the config optimal? | What closed the gap |
|---|---|---|
| meta-literal | No — checklist trusted `node --check`, which can't see it | Added an `awk` pure-literal check to the skill |
| 1 git-diff scope | No — dogfood example had a real coverage hole | Broadened the reviewer prompt |
| 2 args guard | No — fan-out skeleton (the generator) could crash | Guarded it; now matches the pipeline skeleton |
| 3 test dup | Minor — reuse smell in the hardening suite | Extracted `evalDoc` |

**Finding #4 is a different category — not a skill-code defect but an unfinished human governance
step.** The reviewer's BLOCK is correct and valuable (it proves the lifecycle ordering is real and
catchable), but the fix is not code: it is a doc-owner accepting RFC-0002. Kept separate so the
core claim above is not diluted.

**So the revised verdict: the deterministic core is optimal; the authoring layer was not, and the
loop fixed it.** The three skill-code gaps (+ the reuse smell) are now closed and verified (33
tests + gate 100/100 + `node --check`); #4 is a pending one-line accept-step a human owns. This is
the loop doing its job — not confirming the config was perfect, but **catching that it wasn't and
tightening it.**

---

## #4 closed — the human governance act (done by the doc-owner)

Finding #4 was the one item an agent must not resolve alone. The doc-owner closed it:

- **RFC-0002 → `status: accepted`, `owner: baodq97`** (front-matter + INDEX row synced). The flip
  was an explicit human act on the owner's say-so — never agent self-flip — exactly as `AGENTS.md`
  requires. `govkit verify` + `eval` re-run green afterward (3 docs, 0 violations, 100/100).
- The lifecycle-ordering violation (public skill at 0.3.0 ahead of an accepted RFC) is now resolved
  in the cleanest way: the RFC exists, is accepted, and the gate verifies it.
- A heavier enforcement ("a `plugins/` change in a PR must ride with an accepted RFC") remains a
  candidate but is still likely over-engineering against the simplicity thesis — left as RFC-0002's
  open question, **now backed by a real reviewer BLOCK** rather than speculation.

The dogfood workflow itself is both **structurally valid and executed** (`node --check` clean, ran
end-to-end with 8 agents) — no longer a deferred step. **All four Loop-3 findings are now closed.**

---

# Round 2 — Move 2 (chain referential-integrity), built with the repo's own tooling

**Goal (user):** keep using what this repo already ships to build the next thing — `govkit check`
as the gate, the `review-changes.js` workflow as the reviewer — treat every failure as a lesson and
fix it, so the repo trends toward correcting its own errors. (The user's own framing: *"fail gì sửa
đó, để cuối cùng repos này có thể tự sửa lỗi chính nó."*)

**What was built:** the resolve-only chain referential-integrity check from `IMPROVEMENTS.md` Move 3
— `refs: [{ key, type? }]` in `govkit.yml`, a `reference` violation kind in `verify.ts`, dogfooded
with `US-0001` (`parent: RFC-0003`) and a dangling-ref test pair. **RFC-0003 was authored and
accepted _before_ implementation**, deliberately applying Loop-3's #4 lesson.

## The deterministic half self-corrected (no human needed)

Two failures, both caught by the repo's own tooling before they could propagate:

1. **`govkit check` blocked RFC-0003** for a missing INDEX row — fixed in place, re-verified green.
2. **biome flagged** an over-long string in the `evalDoc` refactor — auto-fixed.

This is the honest, load-bearing sense of "self-correcting": the **deterministic, no-key layer**
catches its own drift deterministically. That worked exactly as designed.

## The dogfood reviewer caught a real legitimacy gap (the sharp lesson)

Running `review-changes.js` over this diff (12 agents) surfaced six items. One was a true code smell
(a `checkReferences` comment overclaimed it *reused* duplicate-detection's id set — it builds its own
Set; **comment fixed**). The other governance findings (#1/#3/#5, sharpened by #4 "circular
self-governance") were, on first read, tempting to dismiss as "the reviewer can't see the chat where
the human authorized the accept." **That dismissal would have been the superficial answer.** The
reviewer applied govkit's _own thesis_ to govkit's own docs and found something true:

> **Nothing durable distinguishes an _authorized_ accept from a _self-serving_ one.** RFC-0003 reads
> `status: accepted`, `owner: baodq97` in the file; the authorization for that flip lived only in an
> ephemeral agent conversation — invisible to the gate, to CI, and to a non-Claude contributor
> reading the repo later. That is precisely the **leaky-enforcement failure mode** `IMPROVEMENTS.md`
> named as govkit's whitespace: *"a model with Write access can weaken its own enforcement."*

The status flips were genuinely human-authorized (the owner said so, in-session) — so they stay
`accepted`; nothing is reverted. But the reviewer was right that the *legitimacy is not durably
verifiable*, and RFC-0003 carries this harder than RFC-0002 (RFC-0002 was authored `draft` in a
prior session and accepted later — a clean sequence; RFC-0003 was authored, gated, recommended, and
accepted inside one flow the agent drove — real authorization, but thin provenance).

## The fix is commit discipline, not a new engine field

The honest, on-thesis remedy makes the authorization **gate-visible in history** rather than adding
an `accepted-by` field to the engine (which the simplicity thesis rejects — commit history already
carries provenance):

- Commit each governed doc at its **start status** first (RFC `draft`), then a **separate** commit
  performs the accept, its message citing the in-session owner authorization (`owner baodq97
  authorized accepting RFC-0003 on 2026-05-31`).

**This narrows the gap; it does not close it — name the residue honestly.** Commit discipline makes
the accept **auditable**: durable, timestamped, deliberate (a distinct commit), with rationale. But
it is **not independently verifiable**: the commit is authored under the same `baodq97` git identity
and the authorization is *self-attested in a message the agent wrote* — which is the **same
write-access class** the reviewer named (*"a model with Write access can weaken its own
enforcement"*), just relocated from front-matter to `git log`. True closure would need the human's
own signed commit, independent of the agent — deemed **out of scope** (and likely over-engineering
against the simplicity thesis). So: the *ephemeral/invisible* half is closed; the *self-attestation*
half is named, not closed.

**Open question (leaning _against_):** is an authorization-provenance convention worth its own RFC?
Probably not — commit history is the provenance, and adding an engine field re-introduces exactly the
ceremony govkit was built to avoid. Recorded, not built.

**Round-2 verdict:** the deterministic core self-corrected twice; the dogfood review earned its cost
by surfacing the one thing the deterministic layer structurally _cannot_ see — that a self-driven
accept looks identical to an authorized one on disk — and the answer is honest history, not more
engine. The loop is doing exactly what the user asked: each pass tightens the repo against its own
blind spots.

---

## Round 3 — Move 3 (RFC-0004 `verify --changed`): the "existing repo" question

The user asked the sharpest adoption question yet: *"if I have an existing repo, how does this go?"*
That one question exposed a gap my earlier PO brief had ranked **below** npm-publish:

- **This repo's 100/100 is survivorship.** Every doc here was authored already knowing the gate's
  rules. An existing repo's docs were written for humans — no `id/status/owner/date`, no
  `RFC-0001-*.md` naming, no INDEX. Point `govkit.yml` at them and full-scan `verify` reports
  **every legacy doc at once**: the linter-adoption death (too much red → team disables the gate).
- **Re-ranking the PO brief:** npm-publish makes govkit *installable*, **not** *adoptable*. A repo
  that installs it and hits the avalanche bounces. So the adoption unblock outranks distribution.

**A cheap topology check moved the design.** Before committing to a (heavy) persisted baseline file,
I checked how the gate is actually invoked: the PreToolUse hook runs `audit-write` **per-file**, so
the avalanche is purely a *full-scan/CI* problem — only one caller is affected. That killed
baseline's main selling point ("transparently fixes all callers") and pointed at a small
`verify --changed <ref>` scoping flag instead. **Lesson: verify the caller topology before choosing
between a flag and a new persisted-state artifact — the smaller build was hiding behind an
untested assumption.**

**The implementation found a bug in my own RFC.** RFC-0004's Decision sketched the filter as
`changed.has(v.file) || isIndexOfChangedType(v)`. Writing it, I hit the hazard the RFC's own
correctness floor had named: a **new** doc duplicating an **untouched** doc's id produces a
`duplicate` violation whose reported `file` is the *alphabetically-first* colliding doc — often the
untouched one — so the naive filter would **mask** it. That is the exact "looks-enforced-but-isn't"
leak govkit exists to prevent, recurring inside the very feature meant to aid adoption. Fix:
global-integrity kinds (`duplicate`, `reference`) are **always reported**; only per-doc + index kinds
are scoped. Two `NO-MASK FLOOR` tests pin it. **Lesson: an RFC's illustrative code is a hypothesis;
the no-mask floor is the spec. When they conflict, the floor wins and the divergence gets recorded
(here, in the implementation commit message) — not silently smoothed over.**

**What shipped is the `verify` half — name the other half (narrows, not closes, round three).**
`--changed` scopes `verify` only. `eval` and `check` still **full-scan against a *blocking* floor**,
so an existing repo that runs the *documented* CI entrypoint — `govkit check`, "the single no-key
gate a CI calls" — still hits the avalanche, now from the eval required-floor instead of verify. The
adoption recipe therefore works **only** for a repo that runs bare `verify --changed` and forgoes the
eval layer. This is not a regression — RFC-0004's open questions explicitly deferred eval scoping —
but it is exactly why this repo's survivorship-green state hid it: eval never blocks here, so no test,
gate, or e2e in this round could surface it. The honest claim is "the structural-gate half of
existing-repo adoption shipped"; `check --changed` / `eval --changed` is the natural next move if the
*whole* CI gate is to be adoptable. **Lesson: the overclaim reflex ('adoption shipped') recurred a
third time — scope every done-claim to what was actually exercised.**

**Second RFC↔code divergence, logged for honesty:** the impl uses `git diff --name-only <ref>`
(ref-vs-working-tree, two-dot) where RFC-0004's Decision text wrote `<ref>...HEAD` (three-dot
merge-base). The two-dot form is arguably better — it captures uncommitted edits and still works in
CI — but it is a delta from the RFC, recorded here the same way the duplicate/reference refinement
was. Also: adoption was exercised only against synthetic temp-dir repos (the suppression test proves
quieting), never a real messy legacy repo — unit-validated, not field-validated.

**Round-3 verdict:** the loop's value this round came not from the deterministic gate catching
something, but from a *user question* ("existing repo?") re-ranking the backlog, and from the
discipline of dogfooding the gate's own anti-pattern (silent masking) against the new feature. Git
now lives only on the opt-in `--changed` path; plain `verify` stays pure-fs/no-key — the load-bearing
invariant survived a feature that, done carelessly, would have broken it. Each pass keeps tightening
the repo against its own blind spots — including the ones in its own RFCs, and the overclaim reflex
in its own author.

---

## Round 4 — RFC-0005 (`eval --changed` / `check --changed`): close the half Round 3 named

Round 3 ended by naming, not closing, a gap: `--changed` scoped `verify` only, so `govkit check` —
the documented CI entrypoint — still avalanched an existing repo from the **eval** required-floor.
This round closes it. RFC-0005 (drafted, owner-accepted, then implemented — the now-standard
provenance order) threads `--changed` into `eval` and `check`.

- **The asymmetry is the lesson.** `verify` needed "scope the REPORT, never the SCAN" + always-report
  global-integrity kinds, because a duplicate/reference violation can implicate an *untouched* file.
  `eval` scores each artifact **independently** — no cross-doc edge — so there is **nothing to mask**;
  scoping *which artifacts are scored* is both safe and cheaper. I resisted copying verify's heavier
  mechanism out of false symmetry, and the RFC states the contrast explicitly. **Lesson: the right
  amount of machinery is a property of the check's data dependencies, not a house style to apply
  uniformly.** The eval-scoping tests are correspondingly simpler (rubric-agnostic: scope a failing
  doc out → gate passes; scope it in → still blocks) — no NO-MASK FLOOR test, because there is no
  floor to breach.

- **What is now true, scoped honestly.** The *whole* no-key gate (`verify` + `eval` + `check`) is
  adoptable on an existing repo via `check --changed origin/main`: new debt blocks, legacy debt is
  paid down as docs are touched. Git remains strictly on the opt-in path (resolved once, shared
  across all three commands); un-flagged commands stay pure-fs/no-key.

- **What is still NOT closed (named, not overclaimed — round four).** (1) **First-touch cost is
  unchanged by design**: the first time a PR edits a legacy doc, that doc must pass the *full* gate —
  `--changed` defers the backlog, it does not retrofit it. A `govkit init --adopt` that scaffolds
  front-matter/INDEX onto existing docs would attack that cost, and does not exist. (2) **Still not
  field-validated**: exercised against synthetic temp dirs and this repo's own git history, never a
  real messy legacy repo. The adoption claim is *mechanically* proven, not *empirically* proven.

**Adversarial review then caught a real defect under the headline — the masking class, a fourth
time.** A done-check review found that `checkIndex` emits ONE violation per type listing *every*
missing/stale row, and `scopeToChanged` kept it whole whenever any doc of that type changed. So in
the exact adoption scenario the feature targets — legacy docs with ids but an empty INDEX — touching
**one** doc surfaced the type's **entire** INDEX backlog: an avalanche straight through the path
built to prevent it, and INDEX backfill *is* the retrofit `--changed` promised to defer. Same family
as Round-3's duplicate-id masking (a per-type/aggregate violation leaking untouched docs), recurring
in a new check. Fixed: filter an index violation's `problems[]` to the changed docs' ids (keep the
file-level `missing INDEX.md` entry — the changed doc's own concern). **Caught it RED-first** with a
two-doc test before the fix. **Lesson: any check that aggregates across docs into one violation is a
masking risk under `--changed`; audit every such check, not just the one the last round happened to
surface.** Also fixed in the same pass: a **fail-open** — `origin/main → HEAD` fallback was silent,
so a shallow CI clone would pass green having scoped to nothing (worse than the avalanche); it now
warns loud. And the git path (`resolveChangedBase`/`gitChangedDocs`), previously covered only by
manual e2e, got real temp-repo unit tests.

**Audit conclusion, corrected (the audit itself was an overclaim — round five caught in round four).**
A follow-up review challenged "checkIndex was the only remaining aggregate instance." Not quite:
`checkIndex` was the only aggregate check scoped **wrongly**. `checkDuplicateIds` (aggregate-per-id)
and `checkReferences` are the **same class**, resolved deliberately the *other* way — **always-report**
— because for hard-corruption checks no-masking beats flood-resistance: scoping a duplicate by its
reported file would mask a *new* doc colliding with an untouched one (the reported file is the
untouched, first-sorted doc), and a changed doc renaming an id breaks an *untouched* referrer. So the
lumping is correct; the *characterization* "audit complete" was not. **The accepted, named cost:** a
repo carrying pre-existing duplicate-ids (or, once `refs` are configured, dangling refs) **cannot get
a green `check --changed` until it fixes that specific debt** — even on a PR that touched none of the
colliding docs. That is a narrow but real seam in "the whole gate is adoptable," and a flood-by-design
test now documents it. True closure exists (have `checkDuplicateIds` carry the colliding-file set so
`scopeToChanged` can keep-if-any-colliding-doc-changed, killing both mask and flood) but is a refactor
of the `Violation` shape for a narrow case — **deferred as speculative**, to be pulled only if a real
repo hits it. **Lesson: "I audited the class" is itself a claim to verify, not a conclusion to assert —
the same review reflex that catches feature overclaims has to be turned on the meta-claims too.**

**Round-4 verdict:** the loop did what it was asked — the gap Round 3 *named* is the gap Round 4
*closed* — but the round's real value was two review passes catching, in sequence, (1) a scale-only
defect invisible to the author's tests (the INDEX flood) and (2) an overclaim in the *fix's own
post-mortem* (the "audit complete" framing). Four rounds in, the discipline that compounds is not the
engine features; it is **closing named gaps in order, auditing the whole class when one instance is
found, refusing to round "mechanically correct" up to "done," and turning that same skepticism on
your own audit claims — especially when your own tests can't see the gap.**
