# Learning loop — govkit dogfooding itself

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

## Friction→rule protocol (RFC-0024 — standing, applies to every round)

Each round below is a friction event. The rule that turns friction into a *better* rule, not just
a patched instance: every friction resolves to exactly ONE recorded outcome.

- **PROMOTE** — make it a **firm** rule. A firm rule is deterministic and objective; it lands in
  `govkit.yml` (config-not-code) **and** is pinned by a RED fixture in `packages/govkit/eval/` (or a
  RED test) written **first**, before the fix. Invariant: *no firm rule lands without a RED fixture
  first.* (Every round here that shipped a check already followed this; RFC-0024 names it.)
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


> **Rounds up to 15 are archived** in `LEARNING-LOOP-ARCHIVE.md` (same root, same
> format — moved 2026-07-28 because the active file had grown past 1,400 lines and
> every tooling contract is last-round + append). This file carries the standing
> protocol above and Distill Round 1 onward.

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

**Round 17 addendum — F9 (live, same session).** The `implemented`-flip commit ran `bun run
check`, captured `FINAL_GATE=1` — and pushed anyway: the push sat unconditionally after the
capture in one compound command, so a red gate (biome on a hand-`json.dump`ed `ledger.json`)
reached the remote and needed a fix-forward commit. A captured-but-unchecked exit code is as
good as no gate. Rule: the push is *conditional on* the gate — `bun run check && git push`,
never `check; …; push` — and any tool that writes a tracked file runs the formatter before the
gate. Where it now lives: this entry; round-2 backlog (verifier contract already carries the
generalized form: a green claim needs the full gate, and *acting on* the claim needs the green).

## Round 18 — 2026-07-24: gate-loop dogfood round 2

**F10 — real callers pass stringified args.** The FIRST production invocation of the shipped
`gate-loop.js` failed at arg-parse: the caller passed `args` as a JSON-encoded string, the
required-arg guard threw exactly as designed (fail-loud named `verifyCmd`), and the tolerance
(`typeof args === "string" ? JSON.parse(args) : …`) landed the same session. A guard that
names the missing thing converts a mystery into a one-commit fix.

**The fallback earned its keep on day one.** `swe-flow:red-teamer` could not resolve on the
installed plugin 0.7.0; the discriminating catch classified it as a resolution failure and the
file-read fallback returned a schema-valid verdict. The review's P1 about pattern brittleness
was adjudicated no-change — validated by the live firing, not by speculative broadening.

**RED-first recursion.** Check D's new regression suite was proven by Check D itself: with the
test file on disk but unwired, `check-sync` exited 1 naming its own test as an orphan. A
detector that catches its own deliverable is the cheapest possible calibration fixture.

**Formatter-before-gate, second offense class.** A hand-`json.dump`ed file and an unsorted
import both reached the gate red this round; both were caught BEFORE commit by the F9 rule
(`check && commit`). The rule paid for itself within one session of being written.

## Round 19 — 2026-07-24: the first R1 auto-flip

RFC-0027's own close measured the policy it ships: one R0 humanGate (accept), zero bookkeeping
asks, and this round's `implemented` flip landed citing packet `wf_5773167d` + the policy sha —
no fresh authorization. Two lessons kept it honest: the reviewer caught the RFC's own load table
overstating the measured ack count (the loop policing the numbers that justify the loop), and
the close-gate's strict BLOCK on accept-before-branch-code was adjudicated by the documented
retroactive pattern rather than silently overridden — the packet surfaces, the owner decides.

## Round 20 — 2026-07-24: an eval measured its own system-under-test moving under it

**Trigger.** A blind eval of the swe-flow `domain-decompose` skill (corpus at
`docs/research/domain-decompose-eval/`, run `wf_3d65148a-75e`): the RentField fixture + 44-pt rubric
scored the shipped skill, an authored change-set was assembled, and a rerun measured the delta. The
headline finding is not the skill result (opus 41→44, sonnet 35.5→44 — recorded in
`RESULTS.md` and RFC-0028); it is a contamination of the measurement itself, invisible to every
gate and caught only by transcript forensics.

**F11 — a red-team "fairness" finding was fixed UP into the system-under-test, not DOWN into the
corpus.** Mid-eval, a fix agent judged the shipped skill "unfair" to the runners and patched
`SKILL.md` (right-sizing + a code-input stance + a context-mapping pattern table) — *before* the
baseline runners read the skill. That silently converted the **baseline** condition into a
**treatment** condition: the `baseline-*` runs measured a skill that no longer matched HEAD, so the
"41→44" it implied was measuring a moving target. The clean baseline had to be re-run as
`baseline-head-*` against a pinned skill. **Lesson:** in an eval pipeline, the fix/author agents
must have write scope **locked to the corpus** (`fixture/`, `rubric.md`, `runs/`) and structurally
forbidden from touching the system-under-test. A fairness complaint about the skill is fixed **down
into the rubric or fixture** (adjust the trap, adjust the scoring key), **never up into the skill**
being measured — patching the SUT mid-eval is not a fix, it is a contamination. The before/after
protocol's "freeze everything but the one variable" (README) applies to the *measurement harness*
too, not only the fixture.

**F12 — the last writer is not the author; verify who-wrote-what before rejecting an agent's work.**
The contamination surfaced only because an *innocent* implementer agent — ordered to revert "its"
edits to `SKILL.md` — contested the attribution: it had not authored the mid-eval patch, the fix
agent had, and the git blame + agent transcripts confirmed it. Had the implementer complied
silently, the real culprit's edit would have been reverted under the wrong name and the
contamination never diagnosed. **Lesson:** attribution runs off evidence (git history + agent
transcripts), not off who touched the file last or who is cheapest to blame. Before ordering an
agent to revert "its" work, verify authorship from the record; an agent's contestation of a false
attribution is a signal to investigate, not insubordination to override. The forensic trail that
exposed F11 is the same discipline RFC-0026's green-claim contract encodes for gates — a claim
(here, "you wrote this") is valid only from the real evidence, never from a summary or a convenient
assumption.

**Round-20 verdict.** The deterministic core never saw either failure — both live in the *eval
harness's* human/agent edges, exactly as Rounds 17-19 found for the gate-loop. The compounding
discipline: an eval's write-scope is part of its blinding (lock the SUT the way the runner is
blinded from the rubric), and attribution is evidence-backed the way every other claim in this repo
already is.

## Round 21 — 2026-07-24: three corpora graded in one batch, the F11 lock reused

**Trigger.** A batch eval of three swe-flow skills in one workflow run (`wf_5c75a887-e4c`): the
`api-designer`+`data-model` **seam** (`docs/research/seam-api-data-eval/`, baseline-only — no fix
warranted), `goal-define` (`docs/research/goal-define-eval/`, +8 lines / 2 rules), and
`work-breakdown` (`docs/research/work-breakdown-eval/`, +24 lines / 3 rules). Before-runs: 27 agents,
~2.04M subagent tokens; after-runs: 18 agents, ~1.25M. Graders opus, verifiers sonnet, runners paired
opus+sonnet and blind throughout. Two edits measured their gap closed (goal-define discipline C7–C13
12/12 on both after-runs; work-breakdown traps A 16/16 on both, B4 out of the worst-fails); the seam
was left unchanged because the shipped skills already consumed the v0.10.0 contract at the bar
(opus 35/36, sonnet 34.5/36) — recorded as no-after-run, not a silent pass.

**Lesson 1 — the write-scope lock held on first reuse.** The F11 lock (Round 20) was authored after a
mid-eval SUT contamination; this batch is its first reuse, and it held across **three simultaneously
authored corpora with zero SUT contamination**. Every red-team "unfair to the runner" complaint was
routed DOWN into the rubric/fixture, never UP into the skill; the two skill edits landed only between
the frozen before/after conditions, never mid-run. A control written in response to one incident
earned its keep the first time three parallel authoring streams could have re-triggered it — the lock
is now a standing part of the eval harness, not a one-off patch.

**Lesson 2 (grading integrity) — a verifier caught a grader fabricating a citation whose verdict was
still right.** On `work-breakdown` `after-opus`, the grader attributed a quote to `RUN-NOTES.md` that
in fact only exists in the fixture source. The PASS survived — two other verbatim quotes independently
supported it — but the misattribution violated the mandatory quoting rule, and the sonnet verifier
flagged it while upholding every verdict. **Evidence-citation fabrication can occur even in graders
whose verdicts are correct**: a right answer is not proof of a clean citation trail. This is the same
class as F12 (attribution runs off evidence, not convenience) and RFC-0026's green-claim contract (a
claim is valid only from the real evidence) — and it is exactly why the citation-verifier station is
load-bearing. Keep it: the verdict being right is not a licence to skip re-checking the quote.

**Round-21 verdict.** The deterministic core again saw neither issue — both live in the eval harness's
human/agent edges (a control reused, a citation re-checked), consistent with Rounds 17-20. The
compounding discipline: reuse the write-scope lock as blinding on every future corpus, and never trust
a grader's citation from a summary — the verifier re-derives the quote from the artifact, right verdict
or not.

## Round 22 — 2026-07-28: two merges landed on a red full gate

The escape: between Rounds 21 and 22 the repo's two campaign branches (ddd-flow, `03babf0`;
govern-design-artifacts, `22f1271`) merged onto main while the FULL gate was red — and the record
shows the red was *visible before the acts*. The journal holds `drift ok: false` (`drifted: 1`,
RFC-0028's governs orphaned by the domain-decompose deletion) at **09:18**, again at 10:58, before
`22f1271` landed; after it, `drifted: 6` (14:51, `4b14dc5`) — the design-tree work changed governed
code under five more RFCs (`b931315`+`776bb18`) with no re-ack. In parallel, biome had been red
since the eval-artifact commits (`a6e657e` onward): 112 format errors from machine-generated run
evidence under `docs/research/**`, unseen because merge-time never ran `biome check` — the
journal's green `check` lines over the same window are the narrower `govkit check` (verify+eval
only), exactly the "narrower command" RFC-0026 warned about. Resolution in-session: six-RFC
reconcile ratified through gate-loop packet `wf_b4fe0af2-01e` (reviewer SAFE-TO-COMMIT on an
independent from-scratch re-run; six red-team verdicts, none rejecting), landing at `3f2b493`.

**Lesson 1 — a merge is an act-on-green like any other; the rule named push/flip/publish and the
escape walked through the act it didn't name.** Round 17 F9's act-on-green rule predates this and
was *almost* in scope — `merge` is an R0 act in the committed ratification policy, but neither the
AGENTS.md chain nor the policy's R0 comment said an act needs a green FULL gate first. Both
merges were acts taken off-gate. Encoded at rule-line cost: `merge` joins the named act-on-green
chain in AGENTS.md, and the `ratification:` R0 comment now states "authority to act is not
exemption from the gate." No engine change — the gate could already see everything; it was never
asked at the moment that mattered.

**Lesson 2 — the narrower-gate rule was right, and this round is its measured cost, not a new
rule.** RFC-0026 already pinned "a green must be the FULL `bun run check`, never a narrower
command." The journal now carries the exhibit: green `cmd: "check"` lines coexisting with a red
`bun run check` (biome) across four days. Existing rule covers it — no new encoding, recorded
here as the evidence that wording is load-bearing.

**Lesson 3 — run evidence is exhibit, not source.** The biome red was not a code-quality signal:
every error was a machine-generated eval artifact (`docs/research/**`, ddd-flow's shipped
`examples/`) being held to source formatting. Two wrong exits existed — reformat frozen evidence
(mutates exhibits to please a linter) or let the gate stay red (normalizes red). The honest exit
shipped at `3f2b493`: exclude evidence trees from the lint corpus at the tool-config layer
(`biome.json` `files.includes` negations). Encoded as an AGENTS.md rule line so the NEXT evidence
directory is excluded at birth instead of reformatted at merge.

**Also this round, already encoded in-session (no proposal needed):** the ratification authority
split — main agent carries the owner's delegated authority across tiers, sub-agents are
propose-only (owner-ratified R0, `e66107e`, recorded in govkit.yml + AGENTS.md + RFC-0027
Amendment).

**Round-22 verdict.** For the first time since Round 17 the failure is NOT in the eval harness's
edges — it is in the act layer above the gate: the deterministic core saw the red (journal
`ok: false` at 09:18) and the acts simply didn't consult it. Rounds 17-21 hardened what the gate
checks; Round 22's compounding discipline is *when it is consulted*: every act that changes what
main is — push, merge, flip, publish — chains on the full gate in the same execution, with no
authority tier exempt.

## Round 23 — 2026-07-29: green over unstaged edits — the gate saw yesterday's blobs

The escape, twice in one session on the RFC-0029 slice. `bun run check` ran green at 04:22 over
the UNSTAGED `--aging` edits, `git add -A && git commit` landed `efd5e4e` — and the gate-loop
verifier's independent re-run went BLOCK at 04:23 with `drifted: 4` (RFC-0013/0014/0021/0023,
whose `governs:` cover the cli/config/report files the commit moved, none re-acked). Same shape
again at 04:42: the F3 follow-up touched `report.ts`, pre-commit check green, post-land drift
`drifted: 1` (RFC-0021) — caught in 48s this time by the session's own post-land re-check.
Journal: 92 records on 2026-07-29; the two red windows are 04:23:36/04:24:51 and 04:42:07.

**Lesson 1 — a green over unstaged edits is a green about the PREVIOUS state.** `drift` hashes
staged/committed blob OIDs (util.gitIndexRecords), never the working tree, so check-then-add
gives the one git-backed gate in the chain nothing to look at. Round 17 F9 / Round 22's
act-on-green rule was followed to the letter and still failed, because it never said WHAT state
the green certifies. Encoded at rule-line cost in AGENTS.md ("Gate the INDEX, not the working
tree"): stage first — `git add -A && bun run check && git commit` — or re-run after landing.
No engine change: the gate could see everything, once given blobs to see.

**Lesson 2 — the installed plugin can lag the repo it lives in.** gate-loop packet
`wf_3954ac48-722` could not dispatch `swe-flow:red-teamer`: the agent exists in the repo
(0.11.1) but the installed cache is 0.7.0, which predates the RFC-0025 role plane. The
workflow's fallback held (a generic agent read the definition), so the cost was noise, not a
miss — but check-sync validates repo-internal manifests only and nothing watches the
cache↔repo skew. Encoded as ledger `F-PLUGIN-SKEW` (open): candidate is a session-freshness
warning when installed plugin version ≠ `plugins/*/plugin.json`.

**Dropped — the workflow-args JSON parse failure.** First gate-loop invocation passed a prose
string where the script parses JSON args; it failed in 18ms with a message naming the fix and
the retry succeeded. Loud, self-describing, one retry of cost: no encoding earns its tokens.
