# ddd-flow — SHARED RULES

One plugin-wide law: ONLY the corrective imperatives that fight the model's confident-wrong DDD
defaults, plus repo/doctrine conventions it would not reach for. What an aggregate/context/event/
sticky *is*, the notation, the canvases, and the step flow are assumed known. Tags = the step(s) a
rule governs (`1-understand … 8-code`); artifact shapes, budgets, and `ddd_check` markers are in
`artifact-shapes.md`.

## Grounding — model only what was said

- Never invent. An event, rule, actor, invariant, message, business model, or differentiation you
  cannot source stays empty and becomes an open question or a hotspot — a plausible fill is worse
  than a sparse one, because every later step builds on it as fact. [1,2,3,4,5,7,8]
- Naming what the prose *implies* (`AppointmentBooked` from "patients book") is the job; inventing a
  flow the input never describes (`AppointmentCancelled` when nothing cancels) is fabrication. [2,3,4,8]
- Model from the domain description/what people said, NOT code — sole exception: a *validated* mine
  (`.ddd-flow/mine/` `facts.jsonl` + `mine_coverage.py --strict` manifest), whose signals enter `candidate`. [3]
- Structured AND large corpus (≥20 files one shape, or ≥200 definitions) → script-inventory before
  reading; a read count is a guess with a number, and "not found" from a partial read is unmeasured. [2,3]
- Structured but small (a few tables/docs) — read it and say what you read; standing up the mining
  machinery over three `CREATE TABLE`s certifies something nobody doubted and skips the real job. [2]
- Measure polysemy, don't elicit it, in a structured corpus: two same-named fields with different
  types or reference targets are two senses — proven, not tallied. [2,3]
- Grounding-readiness gate BEFORE you cut: if the slice has 0 confirmed events, 0 confirmed rules, or
  a confirmed:candidate ratio below the floor, STOP with `under-grounded: N confirmed / M candidate on
  slice X` and go mine/confirm — never forward with a caveat (candidates reproduce the legacy schema). [3]
- Ground first, ask second: never ask a person what the docs already answer; one question at a time;
  concrete scenarios and "what goes wrong" over abstractions. [1,2]
- Derive, don't invent: interaction modes come from the message flows, complexity from what the
  domain *requires* (not effort spent or headcount), differentiation from business evidence. [5,6]
- At understand, GATHER differentiation evidence — do not CLASSIFY. A capability tagged core /
  table-stakes / commodity, or build / buy, without stated business evidence is an invented
  differentiation claim; that call is 5-strategize's. Leave it an open question. [1,5]
- When two sources disagree, never blend their fields into a hybrid that exists in neither; prefer
  shipped code over a draft doc, and record every divergence explicitly + flag it for a human. [3]

## Boundaries — one owner draws the line: 3-decompose

- Only `3-decompose` draws or moves a boundary; every other step *proposes* a delta with evidence and
  never edits `model.yaml` — redrawing where it was discovered skips the model's reconciliation. [2,4,5,6,7,8]
- A bounded context needs ≥1 confirmed event AND real business invariants; a noun cluster with none
  (ownership/permissions, audit/history) is a *capability* of another context — decline it and record
  the escalation condition that would promote it (e.g. legal-hold making retention a real invariant). [3]
- A confirmed rule whose cluster you declined does NOT vanish — land it as an invariant on the context
  it actually governs. A cross-cutting AuthZ/tenancy/record-scope predicate (e.g. owner = submitting
  principal) that ends up producing no artifact is a dropped grounded fact, not a deferral. [3,8]
- A boundary is where the ubiquitous language changes meaning — keep a polysemous word in BOTH
  contexts, qualified; resolving the collision (rename to `cost_estimate`/`cost_actual`) deletes the
  boundary evidence the next step needs. [2,3]
- Triangulate language-led: polysemy leads the boundary, behaviour events confirm the side, FK/structure
  clusters cross-check ONLY — structure never leads (it reproduces the legacy's table clusters). [3]
- Type every message event/command/query; an untyped arrow hides exactly the coupling the step exists
  to surface. Keep flows in domain messages, not transport — no HTTP verbs, queues, retries. [4]
- Two conditions refute a decomposition outright — `>9 messages in one scenario` OR `one context at
  every step` ⇒ re-cut; a permanent collaboration edge means the boundary is wrong, send it back. [4,6]
- Event-flow continuity: every emitted event has a consumer, every cross-context arrow is an emitted
  event — flag orphan emits and unconsumed events as real modelling bugs. [3]
- At most one or two core contexts — if everything is core, nothing is and the differentiation axis was
  never thought about. [5]
- Don't mint a Shared/Common/Core context for a shared concept — publish a Published Language from a
  thin reference, or a Shared Kernel only with its cost written down; label every shared artifact. [3]
- `model.yaml` is the single source of truth; L2 map and L3 canvases are *derived* — regenerate, never
  hand-patch, stamp `generated_from/at`, preserve human Conflicts+Changelog. Audit/tenancy is data-model's. [3]

## Right-size — match effort to what the subdomain needs

- A length budget caps prose, NOT findings: over it, cut inferable rationale and upstream restatement —
  never open questions, provenance, or a stated absence. (Per-artifact caps: `artifact-shapes.md`.) [1-8]
- Match tactical depth to subdomain type — uniform aggregate/entity/event machinery on every context is
  a cargo-cult smell: core gets the full model, supporting a deliberately lighter shape, generic a
  bought adapter, master-data plain CRUD. Say the light ones are lighter *on purpose*. [3,7,8]
- An empty aggregate list with a one-line rationale is a complete, correct, deliberate right-sizing
  result — not a gap. [3,8]
- Core-to-generic canvas depth should be nearer 10:1 than 2:1; nine identical canvases signal ceremony,
  two deep + five stubs signal judgement — say which you deepened and why the rest got less. [7,8]
- Keep the L2 map coarse and the first-pass README a sketch — `7-define` owns canvas depth; carry
  forward only the aggregates the slices actually touch, the rest are speculative — say so. [3,8]
- Propose no more teams than the org can staff; count engineers/teams/contexts first, else mark every
  ownership row `proposed — unstaffed`. [6]

## Aggregates — consistency, invariants, corrective policy

- One transaction per aggregate: if two aggregates must change atomically they are one aggregate, or
  the consistency is eventual — there is no third option, and choosing is the decision this step forces. [8]
- Never invent an invariant — a fabricated one is enforced by the code and discovered by a customer;
  take invariants only from stated business rules. [8]
- A relaxed invariant MUST carry a named corrective policy, written or confirmed by the business — a
  relaxed invariant with none is an unhandled defect with a schedule. [8]
- Harden every lifecycle gate: for each freeze-point/approval, state which writes are rejected once
  past it AND close every bypass path (import, seed, back-fill) — an unhardened gate is a variance/
  integrity hole a developer will faithfully rebuild from your model. [8]
- Name each gate's entry precondition, cardinality included (approve requires ≥1 confirmed
  ExpectedBenefit) — an ordering that merely implies a precondition is not a stated invariant. [8]
- A corrective policy is NOT eventual consistency renamed: the violating state is legitimate and may
  persist forever, and the reaction is a business decision the domain expert defines — not a retry. [8]
- Ask "how often is it violated, and what do you do when it does?" — not "is this rule important?"; an
  existing handling process already IS the corrective policy. A large count of them is its own smell. [8]
- Eventual consistency outside the boundary — but only after asking whose job consistency is: the user
  performing the action → enforce synchronously; another user or the system → eventual is legitimate. [8]
- Contention comes from merging independent command streams into one instance, not from attribute count
  — estimate streams, use an average AND a maximum, and let the maximum drive the boundary. [8]
- Aggregates reference each other by id only; the domain layer depends on no framework/ORM/transport;
  the ubiquitous language appears verbatim in class/method/event names. Design stops at the structural
  contract — no skeleton classes. [8]
- Unknown throughput/volume stays unknown — a guessed number becomes a guessed boundary that then
  looks measured. [8]

## Honesty — say what you don't know, keep the provenance

- Write into the INVOKING project's docs root, never into this plugin's repo: `docs/domain/` if it
  exists, else create it under an existing `docs/`, else STOP and ask — a guessed path produces
  artifacts the gate never sees. Artifacts already there mean UPDATE mode, not overwrite. [1-8]
- Fresh docs start `status: draft`, `owner: TBD`; setting or reverting status is a human act — in
  update mode never reset an escalated status, assigned owner, or hand-written rule, and never delete
  a dropped context (flag it). [1-8]
- Candidate vs confirmed is tracked per item (human-confirmed vs artifact-implied), and only a human
  flips candidate→confirmed — a run that re-read the schema must not look identical to one that talked
  to the business. Don't promote your own inference to a confirmed event; hand it to `2-discover`. [2,3,4]
- `unknown` and a stated absence are valid, informative answers — an unknown y-axis, an unmeasured
  volume, an unstaffed topology said honestly beats a confident guess that propagates downstream. [1,5,6,8]
- Record provenance and attribution — who said it, when, which file — and use stable, never-renumbered
  ids (`Q1..`, `H1..`, `DOMAIN-NNNN`) because every downstream artifact cites them. [1,2,3,7]
- Keep assumptions and open questions populated; both empty is an unexamined design, not a confident
  one — anything inferred is labelled *inferred* where it can be knocked down. [1,5,6,7,8]
- Findings carry evidence, not adjectives — message numbers not "feels coupled", an ISH score with its
  weakest answers, the measured signal AND its adjustment shown separately; verification metrics name a
  collectable source. [4,5,6,7]
- Don't resolve a hotspot or swallow a source conflict to keep things tidy — a quietly closed
  disagreement is a decision nobody made; and a flow that turns out clean, said to be clean, is itself
  a real result. [2,3,4]
- Produce a shape, not people: never assign named individuals; a collaboration mode without an end date
  silently becomes the permanent operating model. Record the date and the bet behind any strategic
  placement — it expresses a belief about the future. [5,6]
