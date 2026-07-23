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

## Friction→rule protocol (RFC-0012 — standing, applies to every round)

Each round below is a friction event. The rule that turns friction into a *better* rule, not just
a patched instance: every friction resolves to exactly ONE recorded outcome.

- **PROMOTE** — make it a **firm** rule. A firm rule is deterministic and objective; it lands in
  `govkit.yml` (config-not-code) **and** is pinned by a RED fixture in `packages/govkit/eval/` (or a
  RED test) written **first**, before the fix. Invariant: *no firm rule lands without a RED fixture
  first.* (Every round here that shipped a check already followed this; RFC-0012 names it.)
- **KEEP-THIN** — leave it **advisory or honor-system**, with a one-line *why it cannot be firm*.
  Provenance and substance live here by design — a stateless, no-git gate cannot judge a transition
  or whether prose is sound, so forcing them firm is over-engineering that makes the frame brittle.
- **DROP** — a false alarm or a rule not worth its weight; record that it was considered and why it
  was dropped, so it is not silently re-litigated.

The tiers a promotion moves between: **firm** (the `verify` gate) / **advisory** (`eval` score,
`stale`, `report`, the per-write `remind`) / **honor-system** (status provenance, substance — owned
by commit discipline + the human accept + the keyed reviewer). The compounding asset is the
adversarial corpus, not the rule count. At n=2 (one author) most friction is self-generated; the
loop only compounds once external (n≥3) friction feeds it — so the mechanism is defined now and runs
mostly idle until R0 (publish + a real external consumer).

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

---

## Round 5 — Field test on a real existing repo: close "mechanically proven, not empirically proven"

Round 4 named the last residue plainly: the adoption claim was *mechanically* proven (synthetic temp
dirs + this repo's own git history), never *empirically* proven against a real messy legacy repo. The
user closed it: *"field-test it against a real existing repo"* → *"a real private repo"* →
*"just clone new and don't commit anything."* I cloned a disposable copy of a real existing
repo (86 governed docs, a feature branch with 2 changed specs) and pointed a throwaway `govkit.yml` at
its existing non-standard docs tree. **The real repo is never touched or committed to — the
test runs only on the disposable clone.** (First I had to fix my own breach: I'd written `govkit.yml`
into the real repo and removed it immediately when the user said "don't commit anything." The
discipline is the user's, enforced by the user — recorded, not smoothed over.)

**The avalanche is real, and Round-3's survivorship diagnosis was exactly right.** Full `verify`:
`86 checked | 117 problems | by kind {frontmatter:114, status:2, index:1}`. The day-one death the
whole `--changed` line was built to prevent, measured on a real repo for the first time.
`verify --changed --base origin/main` tamed it to the **2** specs the PR actually changed — the
mechanism works on real data, on real Windows paths (which also retroactively validates the
path-normalization I'd worried about two rounds ago, never having run it on Windows against a real
checkout).

**The headline finding reframes the adoption cost — for at least some docs it is not "write missing
metadata" but "convert metadata you already have."** The 2 flagged specs report `missing YAML
front-matter` — yet their first lines carry `**Status**: Proposed · **Date**: 2026-05-29 · **Owner**:
Platform`: title, status, date, *and* owner, all present, in **prose**. govkit demands one specific
syntax (a leading `---` YAML block) and is blind to metadata in any other form. A team pointed at this
gate hears "you have no metadata" while staring at docs full of it — precisely what gets a tool
dismissed as obtuse. **The honest scope of the claim:** this is an *existence proof* from n=2 (the only
two docs the PR touched, hence the only two I inspected) — it proves *some* legacy docs carry complete
metadata in prose, so the adoption cost **includes migration, not only authoring**. The proportion
across all 114 front-matter failures is **unquantified** — categorizing them is `init --adopt`'s own
design work, not this record's, and I deliberately did not re-clone to count (the existence proof
already carries the actionable conclusion). That conclusion: it moves `govkit init --adopt` (named as
speculative in Round 4) from "nice to have" to **data-motivated**. A synthetic test could never have
surfaced even the existence proof — every fixture I wrote *starts* from front-matter.

**A second facet of the same root finding:** the run also showed `status:2` — two docs
(`us-4870`/`us-4871`) that *did* adopt front-matter but declare `status: shipped`, a value the
throwaway config's enum omits. So the gate's expectations are **vocabulary**, not only syntax: both the
*form* (YAML block) and the *terms* (the status enum) must be fitted to the repo being adopted. Same
root, two faces — another input to `init --adopt`'s design.

**The field test caught a bug invisible to the entire synthetic suite — and it had two faces.** The
`--changed` output read `changed-set: 0 doc(s)` while reporting 2 violations. Diagnosis: a changed doc
with **no parseable front-matter** hits `if (!fm) continue` in `runVerify` and never lands in
`allDocs` — and `changedDocs` (the scope counter) *and* `changedTypes` (in `scopeToChanged`) were both
derived from `allDocs`. So an unparseable changed doc was structurally invisible to the scope logic.
**Face one (a reporting lie):** the counter said 0 while the per-doc file filter — which works on the
path regardless of `allDocs` membership — correctly reported the 2. **Face two (a real masking,
discovered only after the fix):** because the unparseable changed docs never marked their *type* as
changed, `scopeToChanged` was **suppressing the type's missing-INDEX check entirely** — a genuine
structural gap (`docs/specs` has no INDEX file at all) went unreported. The fix: push every scanned
file (parseable or not) into a `scannedFiles` superset and derive `changedDocs` + `changedTypes` from
it; leave `changedIds` on parsed docs (an unparseable doc has no id to contribute). **Caught RED-first**
— every synthetic fixture used the `doc()` helper, which always emits front-matter, so the suite was
*structurally blind*; the regression test writes raw front-matter-less markdown, the one shape the
whole suite couldn't express. **Lesson: a test suite is blind to the exact malformations its fixtures
can't represent — and a real repo's docs are malformed in ways no fixture author thinks to write.**

**The un-masked INDEX line is correct surfacing, not a re-introduced flood — verified empirically, not
just argued.** Fixing face two made `missing INDEX.md for 19 spec doc(s)` appear, which *looked* like
the Round-4 flood class returning (a PR touching 2 docs demanding a 19-doc backfill). It is not, and
the discriminator is concrete: the changed specs are unparseable → no id → `changedIds` is **empty** →
once an INDEX file *exists*, every untouched doc's `has no row` line is filtered out. I confirmed it on
the live clone: `touch docs/specs/INDEX.md` → re-run → the INDEX violation **vanishes**, leaving
exactly the 2 front-matter violations. The adoption cost is **one empty file**, not 19 rows.
Suppressing the line instead (the tempting "fix") would have masked a real structural gap — the same
`looks-enforced-but-isn't` leak the always-report rule guards. So the line stays; a unit test now locks
"unparseable changed doc + missing INDEX → surfaces the line; empty INDEX clears it; untouched rows
never demanded." **Known polish item (not a bug):** the `19` in the message counts parsed specs and
cosmetically overstates the one-file fix — noted, not fixed.

**Round-5 verdict:** the field test did exactly its job — it *empirically* validated the `--changed`
mechanism on a real repo (117→2) and, in the same run, surfaced two things no synthetic test could:
(1) the adoption cost **includes metadata migration, not only authoring** (existence-proven on the 2
touched specs; proportion unquantified) plus a **vocabulary** mismatch beside the syntax one — together
enough to turn `init --adopt` from speculation into the obvious next move; and (2) a counter that lied
*and* a check
that was being silently suppressed, both rooted in the same `allDocs`-excludes-unparseable-docs blind
spot, both invisible to a fixture suite that can only write well-formed docs. Five rounds in, the
compounding lesson sharpens once more: **the survivorship that makes this repo green is the same
survivorship that makes its tests blind — only contact with a real, messy repo shows you the
malformations you never thought to fixture, and the product cost you mis-stated from the inside.**
And the sixth instance of the overclaim reflex was caught in this very record, pre-commit: the first
draft generalized "migration not authoring" from an n=2 sample to all 114 failures — softened to the
existence proof it actually is. `init --adopt` (prose → front-matter migration, plus repo-fitted status
vocabulary) is the data-motivated next move — named, not built; to be pulled by the user, not assumed.

---

## Round 6 — RFC-0006 (`init --adopt`): build the move Round 5 motivated

The loop closed on itself in one arc: Round 5's field test surfaced a finding (metadata exists, wrong
syntax) → it motivated `init --adopt` → the user accepted RFC-0006 and asked to implement in the same
session. The whole provenance chain ran clean: draft committed, owner-authorized accept committed
separately (the flip is a human act), then implementation RED-first. `--changed` *defers* the legacy
backlog; `--adopt` *cheapens paying down one doc* — it attacks the first-touch cost Round 4 named and
Round 5 measured. The two compose; neither replaces the other.

**The design's whole point is a single asymmetry, and naming it correctly was the round.** The obvious
framing — "extract metadata, fill in the front-matter" — is the trap: it makes `--adopt` an *autofiller*,
and an auto-filled doc that passes the gate is the exact `looks-governed-but-isn't` leak govkit exists
to kill. So the rule is **extract and surface, never assert.** But the load-bearing risk inside that
rule is subtler than it first looks, and an adversarial review caught me underweighting it *before* any
code existed: a **missing** field failing loud is the *easy, safe* half (the sentinel handles it); a
**wrong** extraction silently passing is the *real* leak, and the sentinel does nothing for it. The
governing asymmetry: **a missed extraction costs a human one diff line; a wrong extraction costs the
leak — so when uncertain, emit the sentinel, never guess.** That turned into this round's load-bearing
test (the analogue of every prior round's no-mask floor): a status word sitting in body prose
("we chose the *proposed* approach") with no `Status:` line must come out as the **sentinel**, not
extracted as `proposed`. Extraction is therefore restricted to *declared, anchored shapes* (bold
`**Key**:`, line-start `Key:`, `# Heading`, idPrefix filename) — never a word lifted from a sentence,
and (after a done-check review caught the gap, below) never one lifted from a **code fence** either.
**Lesson: when a feature's reason to exist is "don't do the unsafe-but-obvious thing," the load-bearing
test is the one that proves the unsafe thing *doesn't happen* — not the one that proves the happy path
works.**

**Two real-data hazards, both pinned RED-first — one of them the exact Round-5 lesson applied
*proactively* for once.** (1) The sentinel had to fail `verify` for **every** required key. The RFC's
illustrative token (`__GOVKIT_ADOPT_MISSING__`) only fails keys with an enum/convention — but
`owner`/`title`/`date` have neither, so a token there would *pass*. An **angle-bracket** sentinel
(`<MISSING — fill in>`) reuses the existing `checkPlaceholder` (`/<[^>]*>/`), which runs on every
required key, so absence stays loud universally. Divergence from the RFC's illustrative code recorded
in the commit — *the RFC's example is a hypothesis; the no-assert floor is the spec*, the same
RFC↔code discipline as Rounds 3–4. (2) A real heading is `# Connector: Secrets — …` — an unquoted
`title:` would be malformed YAML the tool itself corrupted. So every extracted value is double-quoted,
and the linchpin test is **end-to-end**: `--apply` → re-parse → re-verify, proving both that the colon
round-trips *and* that the missing-field sentinel survives serialization to trip the gate. The
colon-in-title fixture is precisely the "real malformation your fixtures don't think to write" that bit
me in Round 5 — written deliberately this time, before the real data could.

**Dogfooded on real data, not just fixtures.** Ran the built CLI against a throwaway copy of an actual
real-world spec (`# A feature spec: encryption — and key rotation`, `**Status**: Proposed ·
**Date**: 2026-05-29 · **Owner**: Platform`). It extracted title (em-dash + colon, quoted), status
(lowercased), owner, date — and **sentinelled `id`** (the filename carries no id convention), exiting
non-zero because the doc would still fail the gate. `--apply` then `verify` → fails loud on
`unresolved placeholder in 'id'`, exactly as designed; a re-run is a no-op. The never-assert floor
holds on real prose, not just synthetic.

**A seventh masking-class instance, caught at the done-check.** A review just before "done" found that
extraction ran on **raw file content** — `eval` strips code fences before matching (its own anti-gaming
floor), but `adopt` didn't, so a doc showing a front-matter *example* in a fenced block
(```` ```\n**Status**: accepted\n``` ````) would have that example **lifted as its real status** — a
wrong extraction, the exact class the CONSERVATISM FLOOR test guards, in a shape that test didn't probe
(it covered a sentence, not a fence — again the Round-5 "fixtures miss the real malformation" pattern,
this time in *my own new test*). It was a false-positive-caught-by-review (provenance tag + dry-run, so
the floor held — not a silent assert), but the Round-6 claim "restricted to declared shapes, never
lifted from a sentence" read as implied-covered when a fence is neither a sentence nor covered. Closed,
not just named: `stripNonProse` moved to `util.ts` as the one shared source of truth (eval refactored to
import it — no behavior change, still 100/100), `adopt` strips before extracting, and a RED-first fenced
test pins it. **Lesson: "I restricted extraction to safe shapes" is a claim to test against the unsafe
shapes you didn't enumerate — a fence is the sentence you forgot, and the same review that catches
feature overclaims has to catch the *test suite's* coverage gaps too.**

**What is NOT closed (named, round six).** (1) **Coverage is bounded by design** — extraction reads
only declared shapes; HTML-table and YAML-in-comment metadata, multi-line owners, and config
auto-patching are explicit v1 non-goals. A repo whose metadata lives only in tables gets sentinels, not
extraction — correct (no guessing), but it means `--adopt` lightens the cost, never zeroes it. (2)
**Self-attestation residue recurs, third time** (Round 2, Round 5, now): the migration's git commit is
the human governing act, *auditable* but not *independently verifiable* — nothing proves the committer
actually reviewed each `# extracted from prose` value versus rubber-stamping the diff. `--adopt` narrows
honest review to a readable diff; it cannot enforce that the review happened. (3) **Dogfood was n=1** —
one real spec, not a run across the whole 86-doc corpus; the extraction heuristics are proven to read
*that* shape honestly, not measured for coverage across the repo's full variety. (4) **Lane 2 has a
blind spot symmetric to Round 5's:** it scans vocabulary drift only in docs that *already had* a
front-matter block, so a doc migrated *this run* whose prose status is out-of-enum (`**Status**:
shipped`) gets `status: "shipped"` written and fails verify on the enum — with **no** Lane-2 suggestion
to widen it, because at scan time the doc had no block. The user sees the failure without the vocabulary
hint. The same `scanned-set excludes the just-changed thing` shape as the Round-5 counter bug, in a new
place — named here, to fix when a real repo hits it. Named, not rounded up.

**Round-6 verdict:** the loop did the thing it was built to do — a friction signal from the field
(Round 5) became an accepted RFC and a shipped, tested feature (Round 6) in one governed arc, provenance
intact. The round's real value was the review catching, *before code*, that the safe half (missing →
loud) was masking the dangerous half (wrong → silent), so the load-bearing test guards the leak rather
than the happy path — and that the Round-5 lesson (fixtures are blind to real malformations) got applied
*proactively*, with the colon-in-title hazard written into the suite before real data could surface it.
Six rounds in, the discipline that compounds is unchanged and sharper: **name the asymmetry the feature
exists to protect, test that the unsafe thing cannot happen, and turn the previous round's
hard-won blindness into this round's fixture.**


---

## Round 7 — the docs-rot question splits into two trust layers (RFC-0008 drafted, RFC-0009 named)

**Trigger.** The user asked the hardest docs-as-code question directly: how to track which docs are
done / outdated / need cleanup, get a feedback loop *after* code ships, and ensure docs+code are one
source of truth "not two diffs maintained in parallel" — i.e. docs must not become trash.

**The overclaim I was about to make, and the advisor catching it (fourth time, same reflex).** My instinct
was to frame govkit as delivering "single source of truth." It cannot, and saying so would be the exact
overclaim Rounds 5-6 trained me off. The honest ceiling: **you always have two artifacts; the only true
single-source is *generating* one from the other, which govkit does not do.** So the calibrated promise is
not "unify docs and code" but **"make drift between them loud and acknowledged instead of silent."** Lead
with the ceiling, not the dream. Lesson: the overclaim reflex does not retire — it just moves to the next
big feature; the discipline is to name the unreachable thing explicitly *in the RFC summary* so a reader
cannot mistake the scope.

**The real design insight (advisor re-ranked my three mechanisms).** I had three ideas in one bucket
(chain-coherence, staleness, cleanup report). The advisor split them along the **exact RFC-0001 line** that
the whole repo already trusts:
- **GATE class (zero-false-positive, safe to block):** chain-status coherence — a `done` issue under a
  `draft`/`rejected` parent is a real structural inconsistency (you shipped a design that was never
  decided). Plus a cleanup report (surface superseded/rejected). These are honest to *enforce*.
- **ADVISORY class (proxy, false-positive-prone, must NOT block):** git-recency staleness via a `governs:`
  link. Because *any* trivial commit to governed code (typo, rename, lint-fix) trips it — block on it and you
  rebuild the RFC-0004/0005 avalanche **and worse**, you train people to touch docs meaninglessly to turn
  red green, i.e. lie to the gate. So staleness is the **eval-class sibling** of the gate-class coherence
  check. The symmetry *chain-coherence : verify-gate :: staleness : eval-advisory* is the organizing idea.

**The question I almost asked the user but should not have.** I was going to ask which staleness *mechanism*
(git-recency vs content-hash vs version-pin). The advisor: that fork is already resolved by my own principles
— "advisory, keep it cheap" → git-recency. The real crux (what counts as a *significant* change) is semantic,
which is precisely *why* staleness stays advisory and defers significance to the human/reviewer-agent.
**Lesson: do not punt to the user a decision your own stated invariants already make — that is false humility
that offloads thinking you should have done.**

**The precision that keeps the gate zero-FP.** Chain-coherence is "parent is in **a terminal** state
(accepted **or** superseded)," NOT "parent == accepted" — a done issue under a *superseded* RFC is legitimate
(design decided, then replaced). Strict-equality would mis-fire on that and get the whole gate distrusted.
The terminal-not-equal distinction is the load-bearing test (case c).

**Scope discipline held (the session-long "name, do not build, one slice").** This is two RFCs, not one.
Drafted **RFC-0008 = the gate-half** (chain-coherence + cleanup report — the part honest to enforce, serving
"docs are not trash" directly). **Named RFC-0009 = staleness-advisory** in 0008's open-questions, explicitly
tagged the eval-class sibling, deliberately NOT folded in — folding the false-positive-prone proxy into the
zero-FP gate would re-import the exact false positives the gate must never have. Feedback-after-implement is
framed as **event-driven at the lifecycle transition** (the moment an issue flips to `done`), not a continuous
background scan — cheaper and better-targeted.

**What is NOT closed (named, round seven).** (1) **Still all design, no code** — RFC-0008 is drafted at
`status: draft`, unaccepted; RFC-0007 also still awaits the owner's accept. Two drafts now queued. (2)
**`terminalStatuses` is new config surface** — the non-breaking floor (a type without it is exempt) is
asserted in the RFC but unproven until the RED-first test (case d) exists. (3) **The cleanup report has no
home yet** — `govkit report` vs folded into `check` is an open question; leaning separate-read-only so nobody
gates on advisory output. (4) **Transitive coherence is out** — v1 checks one `parent` edge, one level; a done
issue two levels under a draft ancestor is not caught, same bounded-scope choice refs already made.

**Round-7 verdict:** the loop turned a sprawling, easy-to-overclaim question into a *trust-layered* answer
that reuses the repo's own central distinction (gate vs eval) rather than inventing a new axis — and the
advisor's three corrections were all the same shape: **respect the line RFC-0001 drew.** The overclaim
reflex, the punt-the-mechanism reflex, and the fold-everything-into-one-RFC reflex were each a failure to keep
the gate/advisory boundary clean. Seven rounds in, the compounding discipline sharpened once more: **before
adding a check, ask which trust class it belongs to — and if it is a proxy, it advises; it never blocks.**


---

## Round 8 — both RFCs shipped in one arc; the advisor catches a hidden consumer and a near-dropped requirement

**What shipped.** RFC-0008 gate (chain-status coherence) + advisory half (`govkit report` + the
reconciliation nudge in `audit-write`), and RFC-0007 (configurable `docs.root` via one `typeDir`
helper across every reader). 79 tests (was 60), self-gate 100/100 throughout, both non-breaking.

**The hidden fifth consumer (advisor, RFC-0007).** The RFC said "three readers + audit-write."
Before writing the shared helper the advisor said: do not trust the count — grep every consumer of
`def.dir`. There were FIVE (verify×2, eval, adopt, report) plus the `audit-write` hook computing
`resolve(root, def.dir)` on its own. Had the helper covered only the "three", `docs.root` would be
honored everywhere EXCEPT the per-write gate — the feature would silently leak at exactly the
boundary it most needs to hold (a write under the configured root would be ungoverned). **Lesson:
an RFC's impact list is a design-time estimate, not a consumer census; before a "one source of
truth" refactor, enumerate the call-sites empirically — the one you forget is the one that leaks.**
The `report` reader didn't even exist when RFC-0007 was written (it came from RFC-0008 the same
session), which is the point: the count was stale the moment it was written down.

**The near-dropped requirement (advisor, RFC-0008 item 3).** The coherence GATE was green and
calling RFC-0008 "done" was tempting. But the user's literal words were "cơ chế sau khi implement
cần feedback ngược" — feedback AT the moment of shipping, not a CI failure after the fact. The gate
delivers the latter; item 3 (the reconciliation nudge at the `done`-flip) delivers the former, and
it was about to drop silently because the gateable half tested green. The advisor: decide item 3
consciously, don't let it vanish because the easy half is done. Built it — but the hook is
single-file by construction (it has only the content being written, not the parent doc), so it
CANNOT judge coherence there; it only nudges ("you marked this done; re-read its parent"). **Lesson:
"the part that tests green" and "the part the user asked for" are not the same set; a green gate can
mask an unmet requirement as surely as a passing test masks a coverage gap.**

**CORRECTION (same-round done-check, advisor) — the nudge MISSES its primary trigger, and the claim
above over-reached.** `auditWrite` defers EVERY Edit by design (`tool_name !== "Write"` → no-op;
the suite even asserts "defers an Edit — CI's full verify covers it"). But flipping an existing
doc'"'"'s `status: open → done` is almost always an **Edit of the status line**, not a full-file
rewrite. So the nudge — built to fire "at the moment of the done-flip" — stays SILENT for the most
common way that flip happens; only the CI coherence gate catches it, the very "after the fact" the
nudge was meant to improve on. The nudge reliably fires only when a doc is *authored* complete, with
a terminal status, in a single Write. So the honest statement of item 3: **the reliable feedback-
ngược is the CI coherence GATE; the proactive write-time nudge is best-effort, covering the Write-
authoring path, NOT the Edit-based status flip.** This is the overclaim reflex landing a third time
this session — the green nudge test (Write-only) masked that the requirement'"'"'s main case is
uncovered. It is architectural, not a bug (an Edit carries partial content the hook genuinely cannot
parse for full front-matter), so it is named as a residue, not "fixed" — but the round-8 record must
not claim the nudge delivers moment-of-shipping feedback unqualified, because for the dominant
trigger it does not.

**The asymmetric-adoption masking residue (named + pinned).** Opting ONE type into
`terminalStatuses` does nothing until its PARENT type is opted in too — a done US under a draft RFC
is silent if `rfc` has no `terminalStatuses`. This is the session-recurring "looks-enforced-but-
isn't" shape (Round 5's counter bug, Round 6's Lane-2 blind spot), now living in the incremental-
adoption window. It fails SAFE (no false positive), but a user opting in one type would reasonably
expect it to bite. Named in the RFC follow-ups and pinned by a test (`CONFIG_PARENT_NO_TERMINAL`)
so the no-op is a documented choice, not an accident.

**Empirical dogfood beyond fixtures (Round-5 lesson applied, twice).** (1) A throwaway `US-9999`
marked `done` under the real repo's `draft` RFC-0001 made the coherence gate BITE on the actual
config ("is done but its parent RFC-0001 is draft"), then `rm` returned it to green — proof on
live config, not just a tmp fixture. (2) `init --docs-root .govkit` scaffolded a real temp repo,
wrote `root: ".govkit"` into govkit.yml, and `verify` resolved under `.govkit/docs/*` and passed.
The repo also ATE its own dogfood: govkit.yml now declares `terminalStatuses`, so this repo governs
its own chain coherence going forward.

**Kept my own docs honest (the RFC-0008 theme, turned on itself).** RFC-0008 exists so docs do not
rot into trash while code moves. Shipping two new commands (`report`, `init --docs-root`) would have
left the README describing an older CLI — the exact doc/code drift the feature fights. Updated the
README in the same arc. The discipline cuts both ways or it is theatre.

**What is NOT closed (named, round eight).** (1) **RFC-0009 (staleness advisory) still only named** —
the `governs:` + git-recency eval-class sibling is unbuilt. (2) **`init --docs-root` template surgery**
is a regex on the `^docs:$` anchor — robust today, but coupled to the default template's shape; if
that block is restructured the injection must follow. Pinned by a test, but it's structural coupling,
not logical. (3) **`docs.root` v1 prefixes ALL types uniformly** — no per-type escape for a hybrid
repo (kit docs under `.govkit` AND a governed existing `docs/specs`); deferred in RFC-0007, still
open. (4) **The asymmetric-adoption blind spot** above. (5) **n=1 per RFC on real config** — proven
to work on this repo's shape, not measured across a large foreign corpus. (6) **The nudge'"'"'s Edit-path
gap** (see CORRECTION above) — the write-time reconciliation reminder does not fire on the Edit-based
`open → done` flip, only on a complete-with-terminal-status Write; the CI coherence gate is the
reliable mechanism. Lifting it would mean teaching `auditWrite` to parse Edit `new_string` for a
status transition, a deliberate v1 non-goal.

**Round-8 verdict:** the loop shipped two accepted RFCs end-to-end with provenance intact, and its
real value was again at the seams the happy path hides: a consumer the RFC under-counted, a
requirement the green gate would have buried, and an adoption window where the gate quietly no-ops.
Eight rounds in, the compounding discipline is the same and sharper: **the gate, the test, and the
RFC each have a blind spot shaped like "the thing just outside what I enumerated" — so before
calling it done, enumerate the consumers, the requirements, and the adoption states empirically, and
name the one you cannot yet cover.**

---

## Round 9 — the RFC about controlling divergence diverged from its own design (caught by its own thesis)

The user asked the deepest version of the docs-rot question yet: *how do you control the local
decisions that, during implementation, diverge from the design?* Answered along the RFC-0001 line as
RFC-0010 — a status-conditional required `## As-built` section (GATE forcing-function) + ADR-as-
divergence-log + reviewer hook — with the honest framing that **the reliable control is adversarial
review; every deterministic layer is a forcing function that ensures the review happens, not a
substitute for it.** Drafted, dogfooded 100/100, committed.

**Then the advisor refuted the gate at done-check — and the refutation IS the RFC's thesis.** The
first draft keyed the required section to RFC-0008's `terminalStatuses`. But `rfc.terminalStatuses =
[accepted, superseded]`, and **an RFC reaches `accepted` BEFORE it is implemented** — that is the
entire premise of RFC-0008's coherence gate. So the as-built gate would have:

1. demanded `## As-built` at accept-time, when no divergence can exist yet → forced a dishonest
   "None", then
2. **never re-fired** — the RFC stays `accepted` through implementation, no further transition on it
   → the "None" stands, the gate is satisfied, the real divergence goes unrecorded.

→ **RFC-0010's own gate would have PASSED on the exact RFC-0007 three-readers→five-readers divergence
that motivates RFC-0010.** A gate-class check that cannot be zero-false-positive *at its own trigger
time* breaks the property the whole gate class rests on. And note what caught it: not a gate, not the
green dogfood (verify/eval check that the *document* is well-formed, never that the *mechanism it
proposes* is sound) — an adversarial review. The RFC about controlling design↔implementation
divergence **itself diverged from a sound design, and was controlled by exactly the mechanism it
names as the reliable one.** That is the third load-bearing divergence of the session (after RFC-0007
three→five and RFC-0008 moment-of-flip→Write-only), now cited in the RFC as evidence.

**The fix (owner-chosen): a trigger that coincides with when the knowledge exists.** Add a post-
acceptance `implemented` status (`accepted → implemented → superseded`); the required section is
keyed to a per-type `requiredSectionsByStatus: { implemented: [...] }` map, **decoupled from
`terminalStatuses`**. The flip `accepted → implemented` is a deliberate authored act on the RFC's own
lifecycle, at the precise moment the author confronts what diverged — so the gate is zero-FP by
construction (silent until the author declares the work implemented). `implemented` still joins
`terminalStatuses` for coherence, but coherence and the required-section check now read **different
keys** — the decoupling is the fix.

**The transferable lesson (round nine).** Reusing an existing config key because it is *there* is a
trap when the key encodes a *different lifecycle moment* than the new check needs. `terminalStatuses`
answers "is this decided/shipped" (which `accepted` satisfies); the as-built gate needs "has this met
reality yet" (which only a post-implementation status satisfies). They looked like the same set; they
are not. **Before keying a new gate to an existing status set, ask: does this set's defining moment
coincide with the moment my check's knowledge exists? If not, the reuse is a masking-class bug — the
gate fires confidently at the wrong time.** The green dogfood will never tell you this; only walking
the gate through the lifecycle by hand (or an adversarial reviewer who does) will.

**What is NOT closed (round nine).** (1) **RFC-0010 is draft, not built** — the `implemented` status,
`requiredSectionsByStatus` verify check, and retargeted nudge are designed, not implemented; accept/
build awaits the owner. (2) **The never-flipped escape** — an author who ships but leaves the RFC at
`accepted` forever evades the gate entirely; only the reviewer + coherence cover that residue, named
in the RFC's open questions. (3) **Self-attestation persists** — `## As-built: None` can still be a
lie; the gate forces the question, not the honesty (the recurring residue, now two RFCs deep).

**Round-9 verdict:** the loop's sharpest catch yet was self-referential — the deterministic gate I
proposed *to control divergence* would have silently permitted the divergence, and the thing that
caught it was the RFC's own named reliable mechanism (adversarial review), proving the RFC's central
claim by nearly falsifying its central artifact. Nine rounds in: **a green gate proves the document
well-formed, never the mechanism sound; reuse of a status key is safe only when the key's lifecycle
moment coincides with when the new check's knowledge exists — verify that by hand, because no
dogfood will.**

---

## Round 10 — shipped two features in one arc, and the sharpest catch was a silent CI bug the green tests could not see

The owner said *"làm song song cả 2 dựa vào setup của repos này để làm tiếp các feature mới"* — build
RFC-0009 (staleness advisory) and RFC-0010 (design↔impl reconciliation) together, dogfooding the
repo's own machinery. Both shipped: RFC-0010's status-conditional required-section gate (new
`implemented` status, `requiredSectionsByStatus` keyed off it, retargeted nudge) and RFC-0009's
git-gated `govkit stale` (a `governs:` glob + commit-recency proxy). 96 tests green, biome + tsc
clean, the live repo verify/eval/check still 100/100, and `stale`/`report` dogfooded on real history.

**The catch that mattered was pre-code, from the advisor, and structurally invisible to tests.**
Before writing a line of RFC-0009 I had the big constraint right (staleness needs git → it cannot
live in the no-key pure-fs floor → a separate opt-in command, never called by `check`). The trap I
had *not* named: the recency comparison must use **git commit time on both sides**
(`git log -1 --format=%ct`), never filesystem mtime. After a fresh CI clone every file's mtime is
the checkout instant — so an mtime-based staleness check is pure noise in the exact environment the
feature exists for. A test on a temp repo would have *passed* either way (mtime and commit-time agree
on a freshly-written local file); the bug only manifests on a clone, which the unit test never
exercises. This is the round-10 shape: **a green test proves the code does what the test sets up, not
that the setup matches production; the one environment that distinguishes mtime from commit-time
(a clone) is the one the test never builds.** I pinned committer dates explicitly in the fixture so
the test asserts commit-time ordering on purpose, not by local coincidence.

**Provenance held at the live-dogfood seam.** The natural way to "prove" RFC-0010 bites is to flip
RFC-0007/0008 to `implemented` and watch verify demand `## As-built`. Those are genuinely shipped, so
it would be a real dogfood — but flipping a doc's status is the owner's act, not mine, and I'd be
manufacturing the demo by mutating docs. So the gate is proven on **fixtures**, the live `govkit.yml`
*declares* the policy (so the repo governs itself with it), and it stays inert and green because no
doc is at `implemented` yet. The live flip is offered to the owner, not taken. (For RFC-0009 the
parallel discipline was lighter: wiring one *honest* `governs:` on ADR-0001 → the toolchain files it
actually decided is a legitimate adoption, not a fabricated signal — so I did wire it, and `stale`
reports it fresh, truthfully.)

**The decoupled-key fix carried through to code.** RFC-0010's round-9 lesson — don't reuse a status
set whose lifecycle moment differs from your check's — became a concrete API choice: the
required-section trigger reads `requiredSectionsByStatus` (keyed to `implemented`), NOT
`terminalStatuses` (which includes `accepted`, pre-implementation). The regression test that the
flaw is dead is explicit: *an `accepted` doc missing the section ⇒ OK*. The two checks (coherence and
required-sections) now read different keys on purpose; the decoupling is the fix, encoded.

**What is NOT closed (round ten).** (1) **Weak-by-default dogfood, named.** RFC-0009 ships with
exactly ONE `governs:` wired (ADR-0001) — the capability is proven, but the repo barely *uses* it;
broad adoption (which RFCs govern which source files) is deferred to the owner, not assumed. (2)
**The never-flipped escape (RFC-0010)** — an author who ships but never flips the RFC to `implemented`
evades the as-built gate entirely; only the reviewer + coherence cover it, as the RFC's open
questions state. (3) **The 0009∩0010 intersection is noted, not wired** — an `implemented` RFC with
`## As-built: None` whose `governs:` code later changed is the strongest reconcile signal in the
system, deliberately left as a one-line cross-reference in each RFC rather than coupling two newborn
features at birth. (4) **`stale` is a proxy** — "code moved" ≠ "doc wrong"; a green `stale` does not
certify currency. Stated in the output itself, not just the RFC.

**Round-10 verdict:** two features, one arc, full machinery dogfooded — and the highest-value moment
was again *before* the code, where the advisor named the one bug (mtime vs commit-time) that every
green test would have waved through because no unit test builds the environment that exposes it. Ten
rounds in: **the gate, the test, and the dogfood each certify only what they exercise; the failure
always hides in the environment, consumer, or lifecycle moment just outside the setup — so name the
one you did not build, in the output or the open questions, every time.**

---

## Round 11 — the bun request, decomposed along the layer the invariant lives on

**The friction:** a one-line owner request — *"đưa repos này từ pnpm sang bun thay vì nodejs"* —
that, read literally ("thay vì nodejs" = replace Node), would gut the product. govkit's entire pitch
is *"runs in any CI with just Node, no key, nothing to install"*; making the **published** CLI require
bun forces every downstream consumer to install bun, breaking the one invariant the README says
"shapes everything."

**The move that dissolved it: split the request by blast-radius, not by tool.** "Bun instead of node"
is not one decision — it is four separable swaps (package-manager, test-runner, bundler, **runtime**)
with wildly different reversibility, and only the *runtime* swap touches the published contract. Once
that line is drawn, the answer is obvious and non-destructive: **bun is a DEV accelerant (install +
test); the published artifact stays Node-portable** (engines.node>=20, portable ESM both runtimes
execute, npx-distributed). The owner ruled exactly this. The lesson: *when a request names a tool,
find the layer the invariant lives on and decompose there — the scary version and the safe version
are usually the same word applied to different layers.*

**The advisor again earned its keep before any code.** It caught a claim I was about to *state*:
"bun is not installed" — I had checked the Bash tool's POSIX PATH, not the user's actual PowerShell
environment. Re-checked in PowerShell (also absent) before asserting it. Same shape as every prior
round: the green check certifies only the environment it ran in; the user's environment is the one
just outside it. It also named the honest full-fork I'd have buried (`bun build --compile` → standalone
binaries makes zero-install *stronger* but trades away npm distribution) — recorded as a rejected
alternative so the owner sees the whole space, not a pre-narrowed one.

**This change is the first live test of RFC-0008/0009/0010 on the repo's OWN toolchain.** A bun
migration edits `pnpm-workspace.yaml`, which ADR-0001 *governs* (the one honest `governs:` wired in
round 10). So `govkit stale` will flag ADR-0001 the instant the toolchain moves, and *deleting*
`pnpm-workspace.yaml` sends that governs entry **dangling** — the surfaced-not-silent case RFC-0009 §3
exists for. The reconciliation forces a real modeling choice the gate can see: **amend vs supersede.**
TS + monorepo are unchanged, so ADR-0002 *amends one sub-decision* of ADR-0001 (`parent: ADR-0001`)
rather than superseding it — keeping the chain-coherence story truthful instead of re-stating two
pillars that aren't moving. Recorded at `proposed`, owner TBD: not self-flipped, not self-assigned.

**What is NOT closed (round eleven).** (1) **Nothing is migrated yet** — this round produced the
*decision record*, not the toolchain change; bun is not installed on the dev machine, so
implementation is gated on the owner installing it and accepting ADR-0002. (2) **ADR-0001's governs
will need reconciliation at implementation time** — when `pnpm-workspace.yaml` is removed/replaced,
ADR-0001's `governs:` must be repointed to the new toolchain files (e.g. `bunfig.toml`), not left
dangling; ADR-0002 Consequences commits to this in writing but the code change is future work.
(3) **The portability claim is only as good as the CI that tests it** — ADR-0002 §4 says CI must run
the shipped bundle under stock `node`, but that CI step does not exist yet; until it does, "both
runtimes execute the artifact" is a design intent, not a tested assertion. (4) **bun-on-Windows** is
the youngest surface in the whole plan and this repo's primary dev platform — the temp-git/execFileSync
fixtures and `--filter` build scripts are the concrete things that must be re-proven on win32 before
pnpm is retired, and they are exactly the kind of environment-specific failure every prior round
warns hides just outside the green test.

**Round-11 verdict:** the highest-leverage act was again *before* the work — not writing a migration,
but **decomposing the request until the destructive reading and the safe reading separated into
different layers**, then recording the safe one as an *amendment* the repo's own staleness + coherence
gates will hold accountable at implementation time. Eleven rounds in: **a one-word request can hide a
fork between gutting the invariant and accelerating the dev loop; find the layer the invariant lives
on, decompose there, and let the repo's own gates be the thing that forces the follow-through you
promised in the decision record.**

---

## Round 12 — the masking bug bit ME, live, through a shell pipe

**The friction that proved the thesis on its author.** Implementing ADR-0002, I accepted ADR-0002
(child) while its parent ADR-0001 was still `proposed`, and ran the accept commit as
`node …/cli.js verify | head -3 && git commit …`. The gate *correctly* FAILED (RFC-0008: a decided
child over an undecided parent) — but the `| head -3` made the pipeline's exit code that of `head`
(0), so the `&&` proceeded and the commit landed on a **red gate**. This is the exact **masking
class** this whole repo exists to kill — a check that looks enforced but no-ops — and I inflicted it
on myself with a shell pipe, not a code bug. **Lesson, now a rule: never pipe a gate through
`head`/`tail`/`grep` inside a `&&` chain; the pipe swallows the failing exit code and turns a blocking
gate into a no-op. Capture to a file or check `${PIPESTATUS[0]}`/`$?` explicitly before chaining.**
The fix was to re-run verify with NO pipe (`verify; echo exit=$?`) — the honest red — then resolve it.

**The coherence gate forced an overdue provenance act into the open.** The red was not noise: you
cannot accept an *amendment* (ADR-0002 `parent: ADR-0001`) over a parent still `proposed`. ADR-0001 —
the foundational monorepo+TS decision the repo literally runs on — had sat at `proposed`/owner `TBD`
since the seed. The gate refused to let the child be "more decided" than its parent, which surfaced
that ADR-0001's acceptance was overdue. Owner authorized both flips (separate commits, citing the
in-session word); the gate did the work of catching a latent inconsistency no human had noticed.

**"Sao không sử dụng bun?" sharpened the design instead of bending it.** The owner's nudge mid-migration
forced the question: is `node` a lazy fallback or a deliberate contract? Answer, made concrete: dev is
now bun *everywhere* (install, test, every script via `bun run --filter '*'`), and `node` survives at
exactly two points that are not fallbacks but PROOFS — the `audit-write` hook and a CI step that runs
the shipped `dist` under stock node. `bun run check` ends by running the bundle under BOTH bun and
node, so **Node-portability is now a tested assertion** (identical `verify OK / eval 100/100` from
both), not a claim in an ADR. The challenge improved the artifact: it turned a design intent into a
gate.

**The governs reconciliation worked as designed — the strongest dogfood moment.** ADR-0002's
Consequences promised: when the toolchain moves, ADR-0001's `governs: pnpm-workspace.yaml` must be
reconciled, not left dangling. So in the *same* commit that removed `pnpm-workspace.yaml`, ADR-0001's
governs dropped that entry (→ `biome.json` + `tsconfig.json`, both still real) and ADR-0002 gained
`bunfig.toml`. Post-commit `govkit stale`: **2 declare governs, 0 dangling, 2 fresh.** The feature
shipped three rounds ago predicted its own maintenance burden on this exact change and the burden was
discharged on schedule.

**bun:test migration friction, all caught by the gate, none by me first.** Three mechanical things the
gate (not my reading) surfaced: (1) `sed`-swapping `from "vitest"` → `from "bun:test"` left imports
mis-sorted — biome auto-fixed 12 files; (2) `tsc` could not resolve `bun:test` types — needed
`@types/bun` + a `types: ["node","bun"]` override (the base's `["node"]` *replaces*, not merges); (3)
the published `src/` deliberately uses only `node:` APIs, so bun types are a *test-time* convenience,
never a runtime dep of the shipped artifact — the portability invariant survives the type addition.

**What is NOT closed (round twelve).** (1) **CI is edited but unproven** — `oven-sh/setup-bun` +
the dual-runtime steps are written; they have not run on GitHub Actions yet (no push), so "green on
ubuntu CI" is still asserted from local win32, not observed. (2) **tsup was kept, not replaced** —
ADR-0002 deliberately scoped `bun build` out; the bundler is still a node tool, so "fully bun" is
false by design and that is the honest state. (3) **bun-on-Windows passed the suite but only the
suite** — the temp-git/execFileSync fixtures are green, but the broader claim "bun is a drop-in dev
runtime on win32" is only as wide as 97 tests reach. (4) **The npm-published tarball is unverified
under a real `npx govkit`** — local `node dist/cli.js` proves portability, but an actual
`npm pack` → `npx` on a clean machine has not been run.

**Round-12 verdict:** the highest-signal event was a *live failure* — I reproduced the masking bug
the repo was built to kill, by piping a gate through `head` in a chain, and the only thing that caught
it was re-running the gate honestly. Twelve rounds in: **the gate only protects you if you let it
report; the most dangerous tool in the loop is the shell pipe that swallows an exit code, because it
turns every downstream `&&` into a lie. Run the gate naked, read its real exit, THEN act.**

---

## Round 13 — the offline proof caught a claim that was only *ambiently* true

**The friction.** Closing the bun work locally, I ran the one proof ADR-0002's as-built had marked
"still outstanding": `npm pack` → extract the tarball → run it under stock node with **zero
node_modules**. It failed — `ERR_MODULE_NOT_FOUND: yaml`. The shipped artifact was **not
self-contained**: tsup leaves `dependencies` external by default, so `dist/cli.js` carried a live
`import … from "yaml"`. Every prior "proof" of Node-portability (`node dist/cli.js …`, run dozens of
times this session) had passed **only because the repo's `node_modules` happened to contain yaml**.
The claim "the bundle runs Node-only" was *ambiently* true — true in the one environment I kept
testing in — and false for the thing that actually ships.

**This is the Round-12 lesson again, one layer out.** Round 12: a shell pipe swallowed an exit code.
Round 13: an ambient `node_modules` swallowed a missing dependency. Both are the same failure —
**the green result certified the environment it ran in, not the artifact it claimed to be about.**
The only thing that caught it was deliberately running in the consumer's environment (extracted
tarball, no node_modules), not the developer's. The as-built discipline is what forced the proof:
the note itself said "the strongest portability proof is still outstanding" — writing that down is
what made me go run it.

**The fix made the claim literally true, not just patched the test.** `noExternal: ["yaml"]` bundles
the dep into the single file; `yaml` moved `dependencies → devDependencies` (consumers now install
*nothing*); and a `createRequire` banner resolves yaml's CJS `require("process")` under the ESM
output (esbuild's `__require` shim throws "Dynamic require not supported" otherwise). The packed
tarball — one 307KB file, zero runtime deps — now runs standalone under stock node (`check` →
verify OK / eval 100/100). The zero-install invariant the README pins is now *literally* true.

**The reconciliation reconciled itself.** ADR-0002's as-built had asserted the overstated claim; the
proof corrected it; so the as-built bullet was rewritten to record the gap *and* its closure. The
as-built section is not a one-shot snapshot — it is the place a later proof writes back what it
learned. That is the RFC-0010 ritual working on its own author's first real use of it.

**What is NOT closed (round thirteen).** (1) **The full `npx`-on-a-remote-clean-machine run** is
still deferred — local-only by request; the offline-tarball proof closes the substantive gap (no
node_modules, stock node) but not the literal "download from a registry on a fresh box" path. (2)
**The bundle now embeds yaml's CJS via a createRequire shim** — it works, but any future runtime dep
with a *dynamic* `require(variable)` (not a static builtin) would still break the ESM bundle; the
banner only covers builtins resolvable at call time. Named so the next dep is vetted, not assumed.
(3) **Round 13 spent its budget on a dep that was already functionally fine via `npx`** (npm would
have installed yaml) — the fix improved honesty + standalone-ness, but a reader should know `npx
govkit` was never actually broken; the gap was between the *claim* and the *artifact*, not in what
users experienced.

**Round-13 verdict:** the highest-value act was running the proof in the *consumer's* environment
instead of the developer's — and it falsified a claim that had passed every developer-environment
check this session. Thirteen rounds in: **"it works" is a sentence with a hidden subject — works
*where*, with *what* ambiently present? Strip the ambient context (no node_modules, no pipe, no
pre-set env) and re-run, because that stripped environment is the one the artifact actually ships
into.**

---

## Round 14 — parallel agents, and the reviewer caught a claim the gate couldn't

**The work.** Two file-disjoint packages built **in parallel by swe-flow:implementer agents**
(dogfooding the repo's own machinery, as the standing directive demands): governs adoption across
RFC-0003..0010 (docs) and CLI entrypoint integration tests (test). Then the lead integrated, ran the
gate green (103 pass, verify 0 violations under bun + node), and ran swe-flow:reviewer over the diff.

**The finding that matters: the gate passed, but a `governs:` was lying.** RFC-0005 declared
`governs: verify.ts`. The gate is green on that — because **`governs` is not gate-enforced** (RFC-0009
§: "v1 does not gate governs at all"). But RFC-0005 adds *no code* to verify.ts; that code is
RFC-0004's. The mapping was plausible, structurally valid, and wrong — it would make `govkit stale`
report RFC-0005 stale every time RFC-0004's verify.ts changed. The deterministic floor cannot catch
this: a wrong-but-well-formed `governs` has the same shape as a right one, exactly the lexical-twin
problem the whole gate/eval/reviewer split (RFC-0001) exists to handle. **Only the adversarial
reviewer, told to be adversarial on the mappings specifically, caught it** — by reading the RFC's
Decision against the code's comment-attribution and seeing RFC-0005 owned eval.ts + the cli.ts
`case "check"` block, not verify.ts. Fixed before commit.

**This is the trust line working as designed, one notch up from Round 13.** Round 13: a claim true
only in the dev environment. Round 14: a claim the *gate* can't evaluate at all, because it's
semantic ("does this file implement this RFC?") not structural. The lesson is not "the gate failed" —
the gate correctly stayed out of a judgment it can't make. The lesson is **a new advisory link
(`governs`) is a new surface for silent wrongness, and its correctness lives in the reviewer layer,
not the gate** — so adding it without a reviewer pass would have shipped a lying advisory. Dogfooding
the reviewer is not ceremony; it is the only layer that protects the layer the gate can't.

**Parallelism note.** Two implementer agents on disjoint paths (docs/ front-matter vs a new test
file) ran with zero integration conflict — the file-disjoint contract held. The lead's job was
exactly what the agent contracts reserve for it: run the shared-state gate, run the reviewer, fix the
cross-cutting finding, commit. The agents never touched git/bun/govkit; the lead did.

**What is NOT closed (round fourteen).** (1) **9 of 10 governs are now "fresh" only because adding
governs is itself a doc commit** — the staleness clock reset to now for all of them; the advisory
says nothing yet, and won't until the governed code next moves. Adoption breadth ≠ signal yet. (2)
**`governs` honesty is verified once, by one reviewer, at adoption time** — nothing re-checks that a
mapping stays correct as code is refactored; a file split could silently make a governs stale-in-the-
other-sense (points at a file that no longer holds the logic). No mechanism guards that drift. (3)
**The CLI tests spawn under bun** (`process.execPath`), so they assert the dispatch behavior of the
*bun*-run dist; the node/npx entrypoint is covered only transitively by the bundle being
runtime-identical (proven Round 13), not by a node-spawned CLI test. Named, not closed.

**Round-14 verdict:** the highest-value act was pointing the reviewer adversarially at the
*lowest-ceremony* part of the change — eight one-line front-matter additions that the gate waved
through green — because that is precisely where a silent semantic error hides. Fourteen rounds in:
**a green gate certifies only what is structural; every new advisory you add is a new place to be
confidently wrong, and the reviewer is the only thing standing between "well-formed" and "true."**

---

## Round 15 — the engine had not governed itself; an adversarial dogfood audit found it

**The friction:** asked to "audit everything, make it the best, lay a foundation for the next
features." The lazy move was to trust the green gate (`bun run check`: verify 0, eval 100/100, under
bun AND node) and call it healthy. Instead a look-back audit ran *in place of* trusting green — a
dynamic workflow fanning four `swe-flow:reviewer` dimensions, each finding adversarially refuted to
kill false positives. It surfaced 18 confirmed defects. **Not one was an engine bug.** Every one was
doc-drift or skill-staleness the green gate is structurally blind to.

**The headline: govkit had not self-applied its own RFC-0010 discipline.** Six shipped RFCs sat
mis-statused — RFC-0001 at `draft`/`owner: TBD`, RFC-0002/0003/0004/0005/0006 at `accepted` — while
their features (verify+eval, workflow-author, refs, `--changed`, eval/check `--changed`, init
`--adopt`) were all in production. `requiredSectionsByStatus` fires ONLY at `implemented`, so the
as-built gate never saw them; `stale` called them fresh; `report` bucketed them accepted/draft. Green
gate, quiet advisories — and the one drift the entire RFC-0010 mechanism exists to surface was visible
only to a human reading INDEX. That is the "never-flipped escape" RFC-0010 *named as designed-open*,
then fell into itself. Closed by hand: owner-authorized flips + As-built/Deviations written against
the actual shipped code, in the same commit as each flip. Explicitly NOT a new `accepted→implemented`
verify rule — that ceremony was already rejected and would itself fail the audit's anti-over-engineer
test. You close discipline drift with discipline, not a gate that forces a flip a person must choose.

**The masking class, again (Round 12/13's family).** `tsup.config.ts` claimed an "npm-pack offline
proof" caught an unbundled-dep regression. No such proof existed — the in-repo gate would stay green
on a broken bundle, because `node dist/cli.js` resolves `yaml` from the dev `node_modules` beside it.
Built the real, repeatable control (`pack:proof`): assemble the published file set in a temp dir with
NO node_modules, run under stock node. Making a claimed-but-absent control real is the opposite of
over-engineering.

**The audit audited itself wrong, too.** One confirmed finding asserted the workflow-author files were
"untracked" — true at the session-start snapshot the reviewer agents read, false against the live tree
(already committed). Every finding was re-checked against the live file before any edit; the stale
sub-claim was dropped. Even an adversarial auditor inherits a stale context — verify against ground
truth, not against the report.

**Round-15 verdict:** a governance engine that is green on its own gate can still be failing to govern
itself, because the gate certifies *structure* and self-application is *lifecycle discipline* the gate
cannot force. The deterministic core genuinely self-corrects; the discipline around it does not — the
only things that caught its lapse were an adversarial dogfood pass and a human owner. **And then
stop:** the loop's own foundation assessment flagged diminishing returns (RFC velocity outrunning
need), so the honest next move is the deferred high-leverage levers — publish to npm, prove the
dual-runtime CI green on a real runner — both gated on going beyond local-only, not another round of
self-inspection. This round earned its keep by closing real drift; it must not become the pretext for
the next.


---

## Distill Round 1 — 2026-07-08 (the R7 DISTILL step's reference run, RFC-0017)

**Inputs:** `.govkit/journal.jsonl` (check/drift/ledger records through sha c74750b),
this file, and the session escape set from PRs #1–#9 + the 0.6.0 release.

**Lessons → encodings (lowest-cost wins):**

1. *Silent push failure → empty-diff PR merged clean* (PR #6, repaired in #7). Encoded as an
   AGENTS.md rule: never pipe `git push` output; verify the remote ref moved when it matters.
2. *Branch reset from a stale `origin/main` without fetching* (caught mid-sprint-4 by a hook
   freshness warning). Encoded as an AGENTS.md rule: fetch before `checkout -B ... origin/<ref>`.
3. *Fence-smuggled prose is pinned only in bun tests, not in the portable corpus* — the
   adversarial corpus (the trust anchor consumers can calibrate against) did not carry the
   vector `eval-hardening.test.ts` proves. Encoded as a new weak fixture
   (`weak/docs/rfc/RFC-0002-fence-smuggle.md`); validated caught (floor matrix tp 4→5, fp 0,
   recall 1) and the coverage growth pinned via the deliberate `--update-baseline` path.
4. *`governs:` may reference a path that never existed* (RFC-0013 pointed at a ghost
   `settings.example.json` for two sprints; drift's own output exposed it). Cheapest sound
   encoding is a deterministic engine check (governs-paths-must-resolve), which is RFC-scoped
   work — encoded as ledger entry `F-GOVERNS-EXIST` instead of a prose rule nobody executes.

**Dropped as already-covered:** shallow-clone-breaks-git-backed-gates — already encoded as the
`fetch-depth: 0` comment in both workflows the day the gates shipped (pre-mortem, not escape).

**Validation:** full `bun run check` green end to end after all encodings; calibrate FP=0 held.

**Round-1 addendum (same day):** lesson 1's failure class claimed a second, bigger victim
*before* the rule existed — the entire sprint-3 review-hardening commit (`a29564d`: 16 fixes
incl. the `HEAD:./` append-only repair) was silently dropped when a stop-hook `--reset-author`
amend diverged local from remote and the follow-up `git push` failed non-fast-forward behind a
`| tail -1`. PR #5 merged without it while the gitignored `dist/` (built from the fixed source)
kept every gate green locally — the gap only surfaced when a rebuild regressed `drift`'s raw
`reconciled:` read and RFC-0017's seed parsed as YAML int `0`. Recovered by cherry-pick in the
RFC-0017 PR; detection credit: the drift gate's own dogfooding. The rule needs no strengthening
— this instance predates it — but the recovery adds the verification half in practice:
`git ls-remote` after every push that matters, which this PR's integration performed.

**Round-1 second addendum — a fresh escape, caught by CI (run 28918975371):** drift acks
record a `git log -1` commit sha, but the repo merges by SQUASH — the merge rewrites history,
so every ack recorded on a branch is orphaned the moment its PR lands, and main goes red on
the very next CI run. Local gates could not catch this (the branch's shas are self-consistent);
only the post-merge layer could — which is why CI exists as a layer with uncorrelated failure
modes. Interim: ack-only follow-up PRs (they touch no governed code, so their own squash is
stable). Systemic fix queued as ledger `F-DRIFT-CONTENT-HASH`: `reconciled:` should pin a
content-derived hash of the governed paths (stable across squash/rebase), not a commit sha —
an RFC-0015 amendment, since the recorded design chose the sha explicitly.

## Round 16 — 2026-07-08: two ledger debts closed by their own medicine, and an honest n=3

Three moves in one arc, each one a queued ledger debt paying out:

**`F-DRIFT-CONTENT-HASH` closed (RFC-0015 amendment).** `reconciled:` now pins
`sha256:<hex>` over the governed files' *index manifest* — git's own blob OIDs, so the
engine reads no file contents and the claim survives every history rewrite that preserves
content. The Round-1 escape class (squash orphans commit-sha acks) is now structurally
impossible, and the regression test performs a literal squash and asserts green. The
sharp lesson recorded in the RFC: the original Alternatives table had *rejected*
content-hashing as a "false-positive factory" — the churn argument compared against the
wrong baseline (a commit sha churns on strictly more events than a content hash). A
design rationale can be confidently wrong in a way only production falsifies; the
reversal is written into the same table it came from, struck through, not erased.

**`F-GOVERNS-EXIST` closed (RFC-0018).** Per-pathspec governs-existence, decided into the
`drift` layer (honest glob resolution needs git's matcher; the verify floor stays
pure-fs). Dogfood theatre on its very first run: it flagged RFC-0013's
`template/.claude/hooks/stop-gate.mjs` — a file that *never shipped* (the template Stop
gate is wired directly in settings.json). The check found a live instance of the exact
class it was built from before its commit was even made.

**`F-R1-N3` split, not gamed.** The third dissimilar consumer now exists as
`fixtures/ml-research` — an ML lab taxonomy (exp/mc/ds, lab lifecycle vocabulary, extra
required keys, `.govkit` isolation, demoted index tier, custom journal/ledger paths) run
end-to-end through the shipped CLI with zero engine changes, 10 e2e cases. That proves
R1's *config-surface* claim and is ledgered as `F-R1-CONFIG: true`. It does NOT prove
generality outside the author's DNA — the fixture shares an author with the engine, which
is precisely PRD-0001's monoculture risk. `F-R1-N3` stays red with the boundary written
into its check field. The flywheel's whole value is that the ledger cannot be talked into
optimism, including by the person holding the pen.

---

## Round 17 — 2026-07-23: gate-loop dogfood round 1

**Trigger.** RFC-0025 (the gate-loop workflow + swe-flow role plane,
`docs/rfc/RFC-0025-gate-loop-role-plane.md`) was built end-to-end from its own plan,
`docs/superpowers/plans/2026-07-23-swe-flow-gate-loop.md`. Reconciling that build against the
plan, and running the gate-loop's own Verify/RedTeam phases over the resulting diff, surfaced
nine findings — stale plan-authoring assumptions, wiring gaps the reviewer chain caught, one
real false-green only an independent post-integration re-run exposed, and two environment/
runtime gaps. None were defects in the deterministic core.

**F1 — a line-numbered plan edit had already drifted.** The plan pinned a `package.json` edit
to "line 29"; by build time the check script sat at line 28. The builder landed it only via a
unique-string fallback, not the cited line. **Lesson (plan-authoring):** a positional line
anchor in a plan is a stale-state assumption the moment the file changes again — plans cite a
unique surrounding string, never a line number.

**F2 — two "measured" numbers about the same string disagreed.** Plan item M5 gave the
`workflow-author` skill description as 1082 chars; the audit doc it was copied from had
measured 1029 for the same string (the two measurement paths fold whitespace differently), and
neither was re-run at plan time. **Lesson:** every quantitative claim carries the command that
produced it, and that command is re-run — never just copied — wherever the number is reused.

**F3 — the plan drifted from itself mid-flight.** The intro still read "5 → 9 agents" after
later edits grew the surface to 11, and a newly added item (M9) was missing from the summary —
a patch agent updated the task list but not its prose mirrors. Caught by reviewer pass R3.
**Lesson:** repeated facts are single-sourced; restated counts must derive from the task list,
not be hand-maintained beside it.

**F4 — a test wired into no gate.** `skill-lint.test.mjs` ran under no gate at all — not
`bun run check`, not anything else; the plan never said to wire it in and the builder followed
it literally. Caught by reviewer pass R1. **Lesson:** a test no gate executes is a dead test —
wiring it in is part of the deliverable, not a follow-up.

**F5 — a convention landed on one file, not its class.** The skill-hint block went into
`reviewer.md` alone; the convention predated the decision to extend it to every agent. Caught
by reviewer pass R2. **Lesson:** when a convention lands, enumerate and sweep the entire class
in the same change.

**The headline catch: a real false-green, found only by the independent post-integration
re-run.** Simulating the gate-loop's own Verify phase found the branch had edited governed
files — `distiller.md`/`judge.md` under RFC-0017/RFC-0019, `spec-red-team`'s `SKILL.md` under
RFC-0022 — without updating each RFC's `reconciled:` hash. `bun run check` was green
**pre-commit** (drift hashes committed content, so an uncommitted edit is invisible to it) and
**red post-commit** — caught only by re-running the full gate after integration. **Lesson:** a
gate-green claim must re-run the FULL gate after integration, never before it, and never a
narrower command — `node cli.js check` alone is verify+eval only, it does not run drift.

**F6 — the new check paid for itself on its first real run.** The first execution of
`skill-lint.mjs` surfaced an unpredicted 64% description-cosine collision between `distiller`
and `distill-learnings` — an expected pairing in hindsight (the agent is the skill's own
summary), not anticipated when the threshold was set. **Lesson:** a new deterministic check
earns its keep on its first real run; same-family pairs may warrant a declared exemption rather
than a threshold change.

**F7 — the runtime could not dispatch agents that had not shipped yet.** `agentType`
resolution reads the INSTALLED plugin (still 0.7.0), so the freshly-built role agents could not
be dispatched by name until the plugin version ships; the e2e simulation fell back to generic
agents reading the role files at runtime. **Lesson:** a workflow that dispatches
plugin-namespaced agents needs a dispatch preflight check or a documented fallback for the
pre-release window.

**F8 — a cross-account auth mismatch blocked the first remote op.** `git fetch` failed at
branch-creation time because `gh` was authenticated on the work account; unblocked with
`gh auth switch baodq97`. **Lesson:** run an environment preflight (account/auth) before the
first remote operation in a PM-orchestrated run.

**Round-17 verdict:** the deterministic core (verify/eval/drift) was not the thing that broke —
every one of the nine findings sits in the layer around it: a plan whose line anchors and copied
numbers went stale before the builder read them (F1–F2), a plan that drifted from its own prose
mirrors mid-build (F3), a test and a convention that shipped without being wired/swept until the
reviewer chain caught them (F4–F5), one real false-green that only the *independent, post-
integration* full-gate re-run exposed (the headline — pre-commit green, post-commit red, on
`reconciled:` hashes a narrower command would have missed entirely), a new linter earning its
keep on day one (F6), and two run-time/environment gaps in the pre-release and cross-account
edges of a PM-orchestrated build (F7–F8). The compounding discipline is unchanged: re-run the
FULL gate after integration, never before it and never narrower; single-source every repeated
fact and command; and wire and sweep, don't just write.
