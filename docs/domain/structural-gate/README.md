---
id: DOMAIN-0001
title: StructuralGate bounded context
risk: Critical
status: draft
owner: TBD
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0001, RFC-0003, RFC-0004, RFC-0008, RFC-0010, RFC-0011, RFC-0014]
related_adrs: []
---

# StructuralGate bounded context

## Purpose

Decides, for a whole corpus of governed documents at once, whether the paperwork behind a change
is well-formed enough to merge: every document declares who owns it and where it sits in its
lifecycle, every document is findable by a unique handle, every index tells the truth, and no
document claims to be finished under a decision nobody made. It serves the **contributor** waiting
on CI and the **owner** who would otherwise have to read every line to know the same thing.

One clause, no "and also" — but see the interface critique: it is a corpus judge that also
publishes a machine channel.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` — **by necessity, not by demonstrated advantage** | `model.yaml`; `core-domain-chart.md` placement row |
| Business-model role | compliance enforcer; the binary "may this merge" contract | `README.md:24-27` |
| Evolution | custom-built. No off-the-shelf linter is config-driven over a doc CHAIN | `RFC-0001:97` (markdownlint/Vale "blind to govkit.yml's doc model") |

Carried, not re-derived. Nothing buyable holds its four corpus-level invariants — but
`PRD-0001` never names it as what govkit competes on. That gap is the chart's finding, not a
correction to this label.

## Domain roles

**Execution context** — it enforces a rule set and returns a verdict. Secondary: **published
contract**, because `VerifyResult` is a committed machine channel read by `--json` consumers and
by the journal. The pairing is accepted rather than flagged: both halves change together, and the
tiering decision (`verify.ts:625-633`) is deliberately made once, centrally, so no individual
check can forget it.

## Inbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Contributor / CI | actor | `Verify`, `Check` | command | — |
| GovernanceSchema | bounded context | `GovkitConfig` | query (`loadConfig`) | conformist — the gate validates none of it itself |
| WaiverPolicy | bounded context | `WaiverState[]` for this instant | query | shared kernel |
| Adoption | bounded context | governed docs carrying the `<MISSING — fill in>` sentinel | — (file state) | conformist by construction (`adopt.ts:8-12`) |

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| GateJournal | bounded context | `docs` + `violations{path,kind,tier}` counts | — (call, then a written line) | supplier; the sensor owns the line shape |
| FeatureLedger | bounded context | the governed-id universe, via `collectGovernedIds` | query | **shared kernel** — `util.ts:156` |
| Ratification | bounded context | the verdict R1's `full_gate_green` condition names | — | honor-system; nothing reads back |
| *(caller)* | — | `VerifyResult` | synchronous return | published contract |

**No domain event leaves this context.** The verdict returns up the call stack; the only durable
past-tense fact anywhere in the system is the journal line.

## Swimlanes — what this context actually decides

| Message in | Decision made here | Message(s) out |
|---|---|---|
| `Verify` over the whole corpus | is each doc complete, in-enum, correctly named, placeholder-free? | per-doc `Violation`s |
| the same scan, corpus-wide | are ids unique · do refs resolve · is each INDEX row true · did a terminal doc jump ahead of an undecided parent? | four corpus-level `Violation` kinds |
| `WaiverState[]` | which findings were individually signed for, and which waivers are themselves broken | `waivedBy` markings + `waiver`-kind violations |
| `--changed <ref>` | which findings this change is responsible for — **and which may never be masked** | a scoped report, with `duplicate`/`reference`/`coherence`/`waiver` always kept |

The fourth lane is the load-bearing one: the scan stays full and only the report narrows
(`verify.ts:472`). Scoping the scan instead would let a new doc collide with an untouched doc's id
and pass.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Gate | the binary merge-blocking verdict | **yes** — `README.md:64-66` names three tiers; only this one blocks |
| Violation | one finding on one file, with a kind and a tier | **yes** — FeatureLedger has its own disjoint six-kind enum (`ledger.ts:28`) |
| Required | a front-matter key that must be present | **yes** — QualityEval: a rubric rule that blocks CI (`config.ts:130-135`) |
| Stale | an INDEX row whose cell no longer matches front-matter | **yes** — Reconciliation: the governed code has newer commits (`stale.ts:7`) |
| Terminal | the coherence parent test | **yes** — LifecycleReport's ✔ marker; WriteTimeAudit's reminder trigger |
| `ok` | zero blocking, unwaived violations | **yes** — eval: every artifact cleared its floor |

## Business decisions

Every rule is config-grounded or code-stated; see `model.yaml` for the fourteen with citations.
The three that are *judgement*, not mechanism:

| Rule | Source |
|---|---|
| `owner: TBD` is legal and never a placeholder — ownership is a human act, so the sentinel must survive the gate | `verify.ts:87-100` |
| An advisory-tier violation is reported, counted and journalled but never flips the verdict | `verify.ts:625-633`; RFC-0014 |
| Global-integrity findings are never masked by `--changed`, even at the cost of noise during adoption | `verify.ts:472-521` |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| No-key portability | must run on stock Node with no API key, so a non-Claude contributor is gated identically | — | `README.md:68-77`; `PRD-0001:32-33` ("outranks any feature") | **yes** — it is why every git-touching sibling is a separate context outside this one |
| Statelessness | reads the working tree only; cannot see history or a transition | — | `RFC-0027:169-176`; `AGENTS.md:106-110` | **yes** — it is why Ratification exists as an honor-system context with no code |
| False-positive cost | a blocked legitimate doc drives `--no-verify` and erodes the product | target 0 | `PRD-0001:37-39` | yes — every new check ships opt-in and dark until configured |
| Fail-soft on bad input | one unparseable doc is one violation; the scan continues | — | `verify.ts:557-577` | yes |
| Latency | unmeasured | **unknown** | never stated anywhere in the repo | no, until known |

## Assumptions

*Stated.* A repo has exactly one `govkit.yml` at its root (`config.ts:417`). An id is a single
scalar, never a list (`config.ts:91-99`). "Terminal" is a set, so done-under-superseded is
legitimate (`config.ts:66-75`).

*Inferred, and therefore attackable.* That a corpus fits in memory — `runVerify` holds every
parsed doc at once to decide the four cross-doc rules, and nothing bounds the count. That INDEX
files are small enough to line-scan per doc (`checkIndex` re-reads and re-scans lines for every
doc of a type). That one heuristic row-match is enough and a real table parser is not needed —
stated as a v1 choice at `verify.ts:182-185`, never revisited since RFC-0011 hardened it.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| False positives per 100 gate runs, classified FP / FN / scope-escape | the north-star number; if it leaves 0, this context is over-reaching | `.govkit/journal.jsonl` + the friction log (`PRD-0001:66-68`) — **collectable today** |
| Share of runs where the only blocking kind is `index` | whether INDEX sync is carrying its weight or just taxing adoption | the journal's per-violation `kind` field (`journal.ts:26`) |
| Waived findings that expire un-fixed vs re-signed | whether the escape hatch is draining debt or storing it | `govkit.yml` `waivers:` history under git |
| Consumers who set `tiers:` to demote a kind | which check is wrong often enough to be demoted rather than fixed | consumer `govkit.yml` diffs (`PRD-0001:100`) — **not in this repo** |

## Open questions

- **Is `docs/domain/**` — this tree — governed?** `govkit.yml` declares only `prd, rfc, adr, us,
  rel` (`govkit.yml:14-75`), so these files pass no gate. The engine already carries both flags a
  named design tree needs (`recursive`, `idFilenameConvention` — `config.ts:52`, `:61`), so it is
  one config block away. *Owner decides; an agent may not edit that file.*
- **`report` and `adopt` do not pass the per-type `recursive` flag** that `verify` and `eval` both
  pass (`report.ts:85`, `adopt.ts:140` vs `verify.ts:554`, `eval.ts:225`). On a nested tree the
  corpus is gated and graded but under-counted in its lifecycle view and skipped by the migrator.
  Deliberate, or the "looks-governed-but-isn't" leak `util.ts:17-19` warns about? *Owner.*
- **`audit-write` computes `required` without `excludeBase`** (`audit-write.ts:58`) while `verify`
  subtracts it (`verify.ts:541-547`) and `config.ts:100-106` documents the subtraction as the rule.
  A type that excludes a base key would be blocked at write time for a key CI does not require.
  *Owner — see the Conflicts table in `context-map.md`.*
- **Is `checkIndex`'s per-doc line scan a problem at scale?** No corpus size is stated anywhere.

Four open questions on the context holding fourteen of the model's 153 invariants, the most of any. Three are
cross-context consistency questions, which is what a context map is for.

## Interface critique

1. **Names.** `frontmatter` names both "no block at all" and "block present but unparseable"
   (`verify.ts:557-577`) — two different author actions under one kind, so a consumer's `tiers:`
   cannot demote one without the other.
2. **Types.** Every outbound is a synchronous return. `--json` and the journal are two shapes of
   one verdict; nothing is a fact anyone can subscribe to.
3. **Size.** Nine violation kinds and fourteen invariants under one aggregate is at the top of the
   range for one boundary. The mass is real rules, not ceremony — but the corpus-level four could
   argue for their own boundary. Not proposed: they need the same single scan.
4. **Internals.** `Violation.problems` is free prose with fix advice embedded, and `--json`
   publishes it. A consumer parsing that prose is coupled to wording nobody versioned.
5. **Belongs elsewhere.** `waiver`-kind reporting sits here but is reported on `govkit.yml`, not on
   a governed doc — it is WaiverPolicy's finding, surfaced through this gate's channel because that
   is the channel `check` prints.

## Perturbation experiments

- **Move the corpus-level four (`duplicate`, `reference`, `coherence`, INDEX sync) to their own
  context.** Improves: the per-doc half becomes streamable and `--changed` stops needing its
  never-mask carve-out. Costs: two scans, or a shared scan that recreates the coupling. *Not
  moved — `verify.ts:472-521` shows the carve-out is cheaper than the split.*
- **Fold LifecycleReport in.** Improves: one reader, one `recursive` decision, and the
  `report.ts:85` divergence disappears by construction. Costs: a read-only advisory acquires a
  blocking neighbour's release cadence. *Proposed to `3-decompose` as a candidate merge, gated on
  the open question above.*

## Changed in 7-define

Canvas added over `3-decompose`'s first-pass model; swimlanes, quality attributes, assumptions,
verification metrics and the interface critique are new. No `model.yaml` delta applied. Two
findings were raised to open questions rather than invariants, because neither can be sourced as
intended behaviour.
