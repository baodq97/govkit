---
id: RFC-0028
title: Domain-decompose right-sizing — proportional tactical modelling and an additive model.yaml contract
status: accepted
owner: TBD
date: 2026-07-24
governs:
  - plugins/swe-flow/skills/domain-decompose/SKILL.md
  - plugins/swe-flow/skills/domain-decompose/references/ddd-methodology.md
  - plugins/swe-flow/skills/domain-decompose/references/output-template.md
  - plugins/swe-flow/skills/domain-decompose/references/aggregate-design-canvas.md
parent: PRD-0001
---

> Encodes a measured skill-quality result. A blind eval corpus (RentField — a 22-file fictional C#
> modular monolith, 19-check/44-pt ground-truth rubric) scored the *shipped* `domain-decompose`
> skill at **opus 41/44, sonnet 35.5/44**; a four-file change-set (+129/−15) to the skill's
> right-sizing, capability-vs-context, and sharing doctrine — plus an *additive* output-contract
> extension (`subdomain_type`/`tactical_pattern`/`notes` on `model.yaml`) — lifts **both** runners
> to **44/44** on the frozen fixture + rubric. The output-contract change is why this needs an RFC:
> `model.yaml` is a consumed artifact — data-model and api-designer read it downstream. The change
> is additive only, no existing field removed or renamed. Drafted at `status: draft`; the accept is
> the owner's.

## Summary

The `domain-decompose` skill is measurably good at *context mapping* and *procedural guarantees*
already — the eval scored those at ceiling on the pristine skill (D context-mapping 10/10, F
procedural 6/6, both models). What it under-teaches is *right-sizing*: it lets a runner apply
uniform aggregate ceremony to master-data and supporting subdomains (the kgrzybek cargo-cult), it
never forces the capability-vs-context test (ownership polysemy, audit-as-capability), and it does
not name a sharing-coupling discipline (a shared entity class waved through, an anti-DDD "every
module inherits these rules" plant mishandled). Those three gaps are exactly the points a rich
decomposition diverges from a mechanical one, and they are exactly where the two runners lost their
points.

The change-set closes them at the lowest-cost surface — three teaching edits to `SKILL.md` +
`ddd-methodology.md`, and one *output-contract* extension to `output-template.md` /
`aggregate-design-canvas.md` that lets "this subdomain deliberately has no aggregates" be a valid,
first-class output rather than an omission the schema punishes. The contract extension is additive:
downstream consumers see new optional fields, nothing they read today is removed or renamed.

## Motivation

### The measured numbers

The corpus ran the skill in three conditions, each with an opus and a sonnet runner, on a frozen
fixture and a frozen 44-pt rubric (blind runners, independent grader + citation verifier, zero
verifier disagreements):

| Condition | opus | sonnet |
|---|---:|---:|
| **HEAD** — the shipped skill (true baseline) | 41/44 | 35.5/44 |
| + unauthorized mid-eval skill patch † | 43/44 | 39/44 |
| **Final change-set** (this RFC) | 44/44 | 44/44 |

† The middle row is a **contaminated measurement**, not a clean condition: a fix agent patched the
skill (right-sizing + a code-input stance + a context-mapping pattern table) *before* the "baseline"
runners read it, silently converting the baseline into a treatment. It is recorded here only so the
number is not mistaken for a real intermediate result; the before/after claim is **HEAD → Final**
(41→44 opus, 35.5→44 sonnet). The full contamination account is LEARNING-LOOP Round 20 (F11) and
`docs/research/domain-decompose-eval/RESULTS.md`.

### Where HEAD lost points (per category, both runners)

- **B — right-sizing (opus 10.5/12, sonnet 9/12).** Both models minted aggregate roots for the
  master-data contexts (Catalog / Depot / Tag) that the fixture plants as lookup CRUD; sonnet went
  further and wrapped the *supporting* Maintenance context as an aggregate root. Uniform tactical
  weight applied to non-core subdomains is the cargo-cult failure the fixture is built to catch.
- **C — capability-vs-context (4.5/6 both).** The "owner" polysemy — depot holding a unit vs sales
  rep owning an account vs user who uploaded a document — was never registered (sonnet denied the
  polysemy outright), and the audit escalation condition (what would make an audit log a bounded
  context) was absent.
- **E — sharing (sonnet 3/6).** The `RentalOrderService` TODO to share Catalog's `Equipment` class
  directly was never flagged as shared-kernel coupling, and the anti-DDD `SharedDomainRules` plant
  ("core rules every module must inherit") was mishandled rather than reclassified as governance.

### Where HEAD was already at ceiling — and why that bounds the change

- **D — context-mapping was 10/10 on the pristine skill for both runners.** The parametric model
  already knows ACL / conformist / OHS / partnership / customer-supplier and applied them from the
  fixture prose. Teaching a context-mapping pattern table is measurably unnecessary — it is a
  rejected alternative below, not a change.
- **F — procedural was 6/6 everywhere.** Conflict table, orphan-event flag, and output-contract
  completeness are already reliable; the change-set touches the output contract only additively and
  must not regress F.

The change-set therefore targets **B, C, E only**, and leaves D and F alone.

## Decision

Four edits under `plugins/swe-flow/skills/domain-decompose/`, +129/−15 across four files.

1. **Right-sizing, sized to the subdomain type** — `SKILL.md` step 4 gains a first-pass tactical
   model table with four rows: **core → full domain model with aggregates**; **supporting →
   deliberately lighter transaction-script / CRUD-plus-calculation**; **generic → buy behind a thin
   adapter, no model**; **master-data → plain CRUD, explicitly decline aggregates**. `aggregates:
   []` with a stated rationale is named as a *valid, complete* output.

2. **The capability-vs-context test** — `SKILL.md` step 3 + `ddd-methodology.md` §2.6. A context
   must own a domain model with real business invariants to exist; ownership is *per-context and
   polysemic* (projected toward an authorization capability, Zanzibar-style namespacing rather than
   one global `owner`); audit is a *capability* unless regulation makes retention / legal-hold real
   invariants — and the escalation condition is recorded when declining to mint the context.

3. **Sharing discipline** — `SKILL.md` step 6 + `ddd-methodology.md` §2.4. Three levels with their
   coupling costs — Building Blocks (technical, ~0 coupling), Published Language, Shared Kernel
   (deliberate coupling) — and a rule that *every cross-context shared artifact is labelled with its
   level*. A shared entity / domain class is flagged as Shared Kernel coupling; "core rules every
   module must inherit" is identified as **governance, not shared model**.

4. **Output-contract change (the reason this needs an RFC)** — spelled out next.

### The output-contract delta

`references/output-template.md` — the `model.yaml` schema — changes so that right-sizing is
*expressible* and a no-aggregate context is a legal shape:

- **`subdomain_type` — existing field, enum extended** (not a new field): the key already exists on
  `model.yaml` (HEAD enumerates `core | supporting | generic`); this change-set adds **`master-data`
  as a fourth value**. The gap was not cosmetic — the eval's after-sonnet runner, lacking the value,
  recorded a lossy workaround, *"Mapped to subdomain_type=generic for model.yaml's 3-value enum"*
  (`runs/after-sonnet/catalog/model.yaml`), collapsing a master-data context into `generic`; the
  extra enum value removes that forced mismodelling.
- **`tactical_pattern` — new field** (optional): ∈ `{full-domain-model, transaction-script, crud,
  bought-adapter}`.
- **`notes` — new field** (optional): free-text right-sizing rationale.
- **Relations enum gains** `partnership` and `customer-supplier` (previously only the
  upstream/downstream family was enumerable).
- **Schema rule reworded**: the `entities` / `value_objects` / `domain_events` keys are required
  **only when aggregates exist** — a context may legitimately emit `aggregates: []` with a
  `notes` rationale and be complete. (Previously the schema demanded aggregate sub-keys
  unconditionally, which pressured runners to mint an aggregate just to satisfy the shape.)
- `references/aggregate-design-canvas.md` gains a **"decide whether this context should have
  aggregates at all"** gate as the canvas's first question.

**Compatibility.** Every change is additive. No existing field is removed or renamed. Downstream
consumers — the `data-model` and `api-designer` skills, which read `model.yaml` as the persistence
and API-surface step of the swe-flow chain — see new *optional* fields they may ignore; a
`model.yaml` written before this change still validates. That additive-but-consumed nature is the
whole reason a doctrine tweak to a skill rises to an RFC: the artifact is a contract others read.

## Alternatives considered (rejected with data)

- **(a) Add a context-mapping pattern table to `ddd-methodology.md` §2.3.** Rejected on the
  measurement: **D context-mapping was 10/10 on the pristine skill for both runners.** Parametric
  model knowledge already supplies ACL / conformist / OHS / partnership / customer-supplier from the
  fixture prose; a taught table adds tokens and maintenance for a category already at ceiling. It
  was present in the contaminated mid-eval patch and is reverted here.
- **(b) Change the input stance to "work from the code, not just the prose".** Rejected: the runners
  functioned correctly on the code fixture under the existing prose-first stance — they recorded
  open questions and proceeded rather than stalling. The change bought nothing measurable on this
  corpus. It may return as its own proposal *with its own measurement*; it is not bundled here on a
  hunch.
- **(c) Keep pressuring an aggregate everywhere (status quo schema).** Rejected: it is the direct
  cause of the B failures — a schema that requires aggregate sub-keys unconditionally rewards
  minting an aggregate for master-data just to pass the shape. The reworded rule removes that
  pressure at the contract level, not by asking runners to resist it.

## Impact / rollout

- **`SKILL.md`, `ddd-methodology.md`** — teaching edits (steps 3/4/6; §2.4/§2.6). No contract
  surface; pure guidance.
- **`output-template.md`, `aggregate-design-canvas.md`** — the additive contract extension above.
  Downstream `data-model` / `api-designer` gain optional fields; no field removed or renamed, so no
  consumer breaks.
- **No engine change, no `govkit.yml` change, no new CLI subcommand, no `verify`/`eval`/`drift`
  change, no key in CI.** This RFC governs skill content, not the deterministic core.
- **Rollback** is per-file: revert the four skill files. There is no migration and no state — a
  `model.yaml` written under the new schema is still valid under the old one for every non-new key.
- **Sequencing.** Implementation is assembled in the working tree but **not yet committed**; it
  lands only after this RFC is accepted. On `implemented`, this doc gains its `reconciled:` hash
  and the `As-built` / `Deviations from design` sections — not before.

## Verification

- **Regression harness.** The eval corpus at `docs/research/domain-decompose-eval/` is the
  regression gate for this change. A rerun on the **same** frozen `fixture/` and the **same** frozen
  `rubric.md` (per the README before/after protocol) must hold **44/44 for both the opus and sonnet
  runners**; any per-check regression (especially a D or F drop from the ceiling they held on HEAD)
  is a failed verification, not a net-total wash. Per-category baselines are recorded in
  `docs/research/domain-decompose-eval/RESULTS.md`.
- **Deterministic floor.** Full gate `bun run check` green — the change is skill content under a
  governed `governs:` pathspec, so the drift gate must be reconciled at `implemented`.

## Open questions

- **The 44/44 ceiling is one fixture.** RentField is deliberately non-regulated and single-author;
  a second, dissimilar corpus (regulated domain, different planted traps) would test whether the
  right-sizing doctrine generalises or overfits this fixture's trap set. Flagged for a follow-up
  corpus, not blocking here.
- **`subdomain_type` / `tactical_pattern` are optional.** Optional fields a downstream consumer may
  ignore do not *force* the right-sizing decision to be recorded — they only make it expressible. If
  a later run shows runners emit the fields inconsistently, the follow-up is to make them required
  in a fresh contract revision, which is itself an RFC.
- **The code-input stance (rejected alternative b) is deferred, not closed.** If a future corpus
  with a code-heavy fixture shows the prose-first stance costing points, that reopens as its own
  measured proposal.
