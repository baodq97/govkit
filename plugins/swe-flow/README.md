# swe-flow

The LLM **authoring** companion to the [`govkit`](../../packages/govkit) governance engine.
Skills author governed SDLC artifacts; agents fan out, review, and keep docs in sync.
Everything **calls** `npx govkit verify` to validate — nothing embeds the deterministic gate
(that stays in govkit, runnable in CI with no API key).

## Components

**Skills — the SDLC chain** (`slice → goal → domain → API → data → governed artifact`):

- **`skills/govkit-adopt`** — get govkit governing a repo in the first place: `init` for a
  greenfield tree, `init --adopt` (dry-run first) to migrate docs that already carry prose
  metadata. Sets the expectation that a freshly adopted repo is **red on purpose** — adopt
  sentinels anything it could not source rather than asserting metadata it never verified.
- **`skills/work-breakdown`** — split a large piece of work into small, independently shippable
  vertical slices before writing any doc or code: an XS-to-XL sizing ladder, four break triggers,
  and how to record ordering when one slice depends on another. Tier-1 and dependency-free —
  calls no other skill.
- **`skills/goal-define`** — structure a clear, verifiable goal from rough input.
- **`skills/api-designer`** — domain → OpenAPI 3.1 contract → `docs/api`.
- **`skills/data-model`** — domain → relational schema (+ PostgreSQL projection) → `docs/data`;
  forward or audit mode.
- **`skills/spec-author`** — turn design output into a governed **PRD / RFC / ADR / US** with
  correct front-matter + INDEX row, then self-validate via `npx govkit verify`. Discovers doc
  dirs + required keys from the consumer's `govkit.yml`.

> **Domain modelling lives in [`ddd-flow`](../ddd-flow).** The DDD loop — understand · discover ·
> decompose · connect · strategize · organise · define · code, plus the `/ddd-flow:design` orchestrator
> and the live `domain-visualize` surface — moved to its own plugin in v0.11.0. It is episodic
> work (greenfield projects, migrations and refactors toward DDD), and its ten skill descriptions
> were 64% of this plugin's always-in-context budget for a phase most sessions never enter.
> The two plugins meet at an artifact, not an import: `ddd-flow` writes `docs/domain/`,
> and `api-designer` / `data-model` / `spec-author` read it. Install either without the other.

**Skill — the orchestration layer:**

- **`skills/workflow-author`** — scaffold a reusable, deterministic **dynamic workflow**
  (`.claude/workflows/<name>.js`) from a description of a repeatable process. Composes the
  **existing** swe-flow agents + `npx govkit verify` into one of three proven shapes (pipeline
  review→verify · fan-out in dependency waves · loop-until-done), embeds a mandatory manual
  fallback, and validates the result with `node --check`. *Authors orchestration that composes
  what exists — it never generates new agents or teams.* Lets any team build their own governed
  flow instead of copy-editing `sdlc.js`.

**Skill — the working-mode layer:**

- **`skills/working-discipline`** — 21 trigger-gated **thinking checkpoints**
  (trigger → mandatory question → evidence to produce) that cut agent error and reduce
  human escalation: competing hypotheses, sufficient-condition "done", one-way/two-way
  door classification, pre-mortem, loop detection, Chesterton's fence, negative space,
  provenance labeling, independent ensemble, and more — plus the packaged-escalation
  protocol and an escape-log ritual. Built to *scale down*: only two items are always-on,
  every fired item accepts `N/A — <reason>` (only *silent* skips violate), and dosage
  follows the repo's change-class table — so a strong model pays near-zero overhead while
  a weaker model is forced to externalize its reasoning as auditable artifacts. Governed
  by RFC-0011.

**Skill — the adversarial layer:**

- **`skills/spec-red-team`** — attack ONE governed PRD/RFC/ADR **before its status advances**:
  steelman the doc first, then attack; phrase every weakness as a falsifiable "Fails if ___"
  condition (never a vibe); self-refute each candidate against what the doc already answers;
  rank survivors by impact × likelihood × cheapness-to-test; return ranked findings + evidence
  to gather + one explicit **kill criterion**. Advisory and read-only *by construction* — its
  `allowed-tools` grant no Write/Edit, it never flips a status, and it is never wired into
  no-key CI, hooks, or exit codes (the gate stays `govkit verify`/`eval`). Governed by RFC-0022.

**Agents** (plugin-namespaced — usable from the `sdlc` and `gate-loop` workflows), grouped by
role class — **Author** writes, **Score** independently judges without authoring, **Upkeep**
keeps metadata honest:

| Class | Agent | Role |
|---|---|---|
| Author | `agents/analyst` | approved PRD / accepted RFC → testable acceptance criteria + user stories |
| Author | `agents/architect` | approved PRD / design brief → governed ADR or RFC with contracts and rejected alternatives |
| Author | `agents/drafter` | brief + already-binding decisions → ONE governed doc; mechanical write-up only |
| Author | `agents/implementer` | one file-disjoint work package → files written; never runs build/git/govkit |
| Author | `agents/test-author` | the RED half of TDD — writes a failing test and proves it fails before any implementation |
| Score | `agents/reviewer` | re-runs the gate, proves it CAN fail, judges the rest → `APPROVE` / `SHIP-WITH-CAVEATS` / `BLOCK` |
| Score | `agents/red-teamer` | attacks ONE doc before its status advances → `flip-as-is` / `flip-after-reconcile` / `blocked` |
| Score | `agents/verifier` | builds or packs the real artifact and runs it in a clean scratch dir; reports real exit codes |
| Score | `agents/judge` | scores ONE governed doc's **substance** (0–100) against pinned anchors; strict JSON out |
| Upkeep | `agents/doc-keeper` | keeps front-matter + INDEX in sync; proposes flips and owners, never applies them |
| Upkeep | `agents/distiller` | DISTILL step of the R7 learning loop — journal + escape log → proposals only |

Every agent stops at "ready for review" (or the Score/Upkeep equivalent): none flips a status,
none self-assigns an owner — those stay human doc-owner acts.

> Agents ship as **plugin** agents (dispatchable as `swe-flow:implementer`, `swe-flow:reviewer`,
> `swe-flow:doc-keeper`). Project `.claude/agents/` are **not** dispatchable from a workflow —
> verified empirically — so the plugin form is required for the `sdlc` and `gate-loop` workflows
> to use them.

## The gate loop — PROPOSE → VERIFY → RECONCILE → RED-TEAM → RATIFY (RFC-0025)

- **`skills/gate-close`** + **`.claude/workflows/gate-loop.js`** — one reusable engineering loop
  that runs at every gate in the govkit chain, so a status flip is always backed by evidence
  produced by agents that did not author the thing being flipped: PROPOSE (an Author role agent
  writes) → VERIFY (`agents/reviewer` re-runs the gate from scratch and must prove it CAN fail)
  → RECONCILE (proposes exact replacement text, never applies) → RED-TEAM (`agents/red-teamer`,
  one dispatch per flip candidate, returns `flip-as-is` / `flip-after-reconcile` / `blocked`) →
  RATIFY (one packet; the owner decides; a separate accept commit lands the flip). At a slice- or
  release-close gate the loop inserts a **Live** verify-for-real station between VERIFY and
  RED-TEAM: `agents/verifier` builds or packs the shipped artifact and runs it the way a consumer
  does, in a clean scratch dir — a release gate cannot ratify on a re-run of this repo's own gate
  alone. The loop is **not** a skill: Tier-1 skills stay atomic and dependency-free, so the chain
  lives entirely in Tier 2 as one parameterized workflow dispatching plugin-namespaced role
  agents. `skills/gate-close` is the Tier-2 orchestrator — when to run the loop, how to read the
  packet, how to land the accept commit.

## The substance layer — R2 Layer 3 (RFC-0019)

- **`skills/substance-judge`** + **`agents/judge`** — the keyed, opt-in verdict the
  deterministic floor deliberately defers (RFC-0001's honest boundary): is the prose
  **sound**? The skill discovers the corpus from `govkit.yml`, gates on `npx govkit check`
  first, fans one judge per doc against **rubric substance-v1** (four dimensions × five
  anchored bands; uncertainty scores down), appends **deepeval-compatible** verdicts to
  `.govkit/evals/`, and in cross-model mode reports per-doc agreement spread (>20 points
  flags the doc for a human, not the judge). Never wired into CI, hooks, or exit codes —
  the no-key invariant outranks the feature.
- **Selftest-gated (RFC-0020):** before any verdict, the judge must prove itself — the
  deterministic `govkit calibrate` must be green AND the judge must rank a pinned known-good
  fixture strictly above a known-weak one — or it **refuses to judge** and appends the refusal
  to the same `.govkit/evals/` record stream. Every verdict (and refusal) pins the exact model
  id, temperature 0, and an `anchorsHash` of the scoring-anchors file actually read, so any
  score is reproducible and auditable after the fact.

## The learning loop — R7 DISTILL (RFC-0017)

- **`skills/distill-learnings`** + **`agents/distiller`** — the keyed DISTILL step of the R7
  flywheel (SENSE = govkit's `--journal`, RATIFY = a human merge). The distiller reads
  `.govkit/journal.jsonl`, the escape log (`LEARNING-LOOP.md`), and the git delta since the
  last round, then emits **proposals only** — corpus fixtures, `AGENTS.md` rule lines,
  `govkit.yml` tweaks, ledger entries — each with cited evidence, handed off as a PR. Three
  hard laws: proposal-only (never merges, never flips a status, never edits the baseline
  except proposing the `--update-baseline` human path); every gate-touching proposal must
  pass `govkit calibrate` with FP=0 and non-regressing recall before entering the PR; the
  corpus is append-only (fixtures may be added, never removed or weakened). On a thin
  journal it says "insufficient data" and stops. Run on demand or from a scheduled session —
  deliberately **not** a hook: a keyed step never sits in the no-key path.

## PR-body injection — the splice recipe (RFC-0021)

`npx govkit report --pr-body` renders the lifecycle report as GitHub-flavoured markdown fenced
by stable `<!-- govkit:report:begin -->` / `<!-- govkit:report:end -->` markers — deterministic
bytes (sorted ids/statuses, no timestamps), exit 0 always, no network. govkit **emits**; writing
the block into a PR body is the caller's job. The recipe — skills and CI call the flag and
splice, never reimplement the report:

```sh
export REPORT="$(npx govkit report --pr-body)"
gh pr view "$PR" --json body -q .body | node -e '
  const body = require("node:fs").readFileSync(0, "utf8");
  const span = /<!-- govkit:report:begin -->[\s\S]*?<!-- govkit:report:end -->/;
  const next = span.test(body)
    ? body.replace(span, process.env.REPORT)
    : `${body}\n\n${process.env.REPORT}`;
  process.stdout.write(next);
' > /tmp/pr-body.md
gh pr edit "$PR" --body-file /tmp/pr-body.md
```

Idempotent by construction: the markers make the splice **replace-not-append** (the block is
added only when no span exists yet), and determinism means re-running on unchanged governance
state is a byte-identical no-op — the block changes only when the state does.

## Install

This repo is its own marketplace (`.claude-plugin/marketplace.json`).

- **Local dev:** `claude plugin marketplace add <path-to-this-repo>` → `claude plugin install swe-flow`.
- **From git:** add the marketplace by repo URL; `swe-flow` is sourced via `git-subdir` at
  `plugins/swe-flow`.
