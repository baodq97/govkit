---
name: 3-decompose
description: >
  DDD step 3 — bounded contexts, aggregates, entities, events. Writes docs/domain/.
---

# Domain Decompose

## Hard rules

- **Grounding-readiness gate — check it before you cut.** Run `ddd_check.py` (check 16,
  `grounding-under-ratified`) or read `docs/domain/discovery/model.json`: if the slice you are about
  to decompose has **0 confirmed events, 0 confirmed rules, or a confirmed:candidate ratio below the
  floor**, stop and print `under-grounded: N confirmed / M candidate on slice X — ratify or mine
  before deepening`. A boundary drawn over candidates a mining run proposed reproduces the legacy
  schema it was mined from — the exact failure this step exists to avoid. Back to `2-discover` to
  mine or confirm; never forward with a caveat. Only a person flips candidate→confirmed. (btm-systems
  shipped a context map on 0 confirmed events with every govkit gate green, stalled two days, rolled
  back.)
- **Length budget: `context-map.md` ≤ 180 lines**, and the first-pass context `README.md` stays a
  sketch — `7-define` owns the canvas depth. A budget caps prose, not findings: over it, cut
  rationale a reader can infer and anything restated from an upstream artifact — never open
  questions, provenance, or a stated absence.
- **Never invent business rules, invariants, or domain events.** Capture only what the user
  stated; flag gaps rather than filling them. Naming an event the prose *implies*
  (`AppointmentBooked` from "patients book appointments") is the job; inventing one for a flow the
  input never describes (an `AppointmentCancelled` when nothing is ever cancelled) is fabrication —
  don't. Fresh docs start `status: draft`, `owner: TBD`. In update mode,
  **preserve** whatever a human set — never reset an escalated status, assigned owner, or
  hand-written rule back to draft/TBD. Setting status (or reverting it) is a human act, not yours.
- Model from the **domain description, not code** — with one brownfield exception. When
  `2-discover` has **mined a structured corpus** (a committed `.ddd-flow/mine/` holding a
  `facts.jsonl` and a coverage manifest that passed `mine_coverage.py --strict`), route those
  **mined signals** in as *candidate* evidence — polysemy senses, behaviour events, FK clusters.
  That is not reverse-engineering code by reading it ad hoc; it is consuming **measured facts with
  a locator and a coverage number behind them**. Ad-hoc code-reading stays out of scope; a
  validated mine does not. Everything mined enters as `candidate`, carries its `facts.jsonl`
  locator, and only a human flips it to `confirmed` (steps 2b and 6).
- **Ownership vs. audit metadata.** Model the *owning party* (user / team / org) as a real domain
  relationship when the business actually has one — that ownership belongs in the model. But
  technical audit metadata (`created_at/by`, `updated_at/by`) and tenancy isolation columns are
  infrastructural cross-cutting concerns — do **not** add them to aggregates/entities here; they are
  decided and applied in the data layer (the `data-model` skill).
- Boundaries and aggregates **will change** as understanding deepens — present the model as a
  draft to iterate, not a final truth.

Turn a prose domain/requirements description into a Domain-Driven Design decomposition — bounded
contexts → aggregates → entities, value objects, and domain events — named in the business's
ubiquitous language; each context doubles as a candidate service boundary on the monolith →
microservices path.

**Strategic-then-tactical** and **hybrid**: produce a first-pass model from what you're given,
then ask targeted questions only where boundaries or ownership are genuinely ambiguous — don't
re-ask what the description already settles, and never invent business rules.

## Inputs

A domain description: feature list, PRD, process narrative, key capabilities, actors, notable
events. If the user points at code instead, say this skill models from domain knowledge, not
code, and ask for a description (or the key capabilities and rules) — reverse-engineering a
codebase is out of scope.

**Brownfield** (the model lives only in code, nothing written down): don't reverse it from the
code. Ask for a one-page sketch — main capabilities, key events (past-tense things that happen),
any hard rules — enough for a first-pass model; step 5 refines the rest. If domain docs/PRDs *do*
exist, step 1 already picks them up.

**Brownfield with a mined corpus** (the legacy model lives in code *and* `2-discover` already
measured it): this is the case the "not code" rule was **not** written to block. If the repo holds
a committed `.ddd-flow/mine/` — `facts.jsonl` (L0), one or more `model/<subject>.yaml` (L1), and a
coverage manifest that passed `mine_coverage.py --strict` — consume those mined signals as the
step-2 raw material, and triangulate them in **step 2b**. No manifest, or one that did not pass
`--strict`? Fall back to the plain brownfield case above and ask for the one-page sketch — an
unvalidated mine is a guess with a number attached, not evidence.

## Reference files (read as needed)

- `references/ddd-methodology.md` — theory and heuristics behind every step (sub-domain types,
  boundary heuristics, aggregate/entity/VO/event criteria, naming). Read when a judgement call
  needs grounding.
- `references/bounded-context-canvas.md` — template + guidance for each context's `README.md`.
- `references/aggregate-design-canvas.md` — template + rules for modelling each aggregate.
- `references/output-template.md` — **the exact output contract** (where to write, file layout,
  schemas, frontmatter, hard rules). Read before emitting anything.
- `${CLAUDE_PLUGIN_ROOT}/skills/2-discover/references/measure-playbook.md` — the mining method
  whose outputs you consume in the brownfield-with-corpus case: the seven stages, the polysemy
  report (stage 6) and FK-graph clusters (stage 7), and the `facts.jsonl`/manifest contract. Read
  it before step 2b so you use each output as intended — **polysemy as the seam, FK clusters as a
  cross-check only.**
- `references/brownfield-triangulation.md` — the detail behind step 2b and step 6's single-source-of-
  truth / shared-concept rules: the three triangulation axes, the legacy-cluster trap, generated-view
  freshness, and the thin-reference-vs-Shared-Kernel answer. Read when decomposing from a mined corpus.

## Process

### 1. Find & reconcile existing domain artifacts
Before modelling, look for existing domain knowledge — re-deriving it wastes effort and risks
contradicting what the team already agreed. Look for PRDs, specs, design docs (`docs/specs/`,
`docs/**/prd/`, anything titled "… domain model"), code carrying a domain layer (`*/domain/`,
`*/ports/`), and **this skill's own prior output** in `docs/domain/`. Treat any you find as
**authoritative input**: build on them, preserve their names and stated rules verbatim, reconcile
rather than re-invent. Prior `docs/domain/` output puts you in **update mode** — you're merging a
delta, not writing from scratch; step 6 handles it.

**When two sources disagree** — e.g. a *draft* PRD models a `Fact` as `key`/`value` but shipped
code uses `content`/`source` — this is the highest-risk moment of the skill. Do **not** blend
their fields into one hybrid that exists in neither source: that is invention disguised as
reconciliation, the failure to avoid. Prefer the **running/shipped code** over a draft doc as
authoritative, but **always record each divergence explicitly** (source A says X, source B says Y,
chosen Z, why) in the Conflicts section of `context-map.md` and flag it for a human. Surfacing a
conflict is mandatory — a silently swallowed conflict is worse than an openly unresolved one.

### 2. Frame the input (event-storming style)
Skim the description and extract, in business language: **domain events** (past-tense things that
happen), the **commands/actors** that cause them, and the recurring **nouns**. Raw material — see
ddd-methodology.md §3. Don't formalize yet.

### 2b. Triangulate the mined corpus (brownfield-with-corpus only)
When step 2's raw material is a mined corpus, don't read boundaries off any single axis. Triangulate
three, **language-led**: polysemy (measure-playbook stage 6) *leads* the boundary; mined behaviour
events *confirm* which side of a seam a concept sits on; FK-graph clusters (stage 7) **cross-check
only** — community detection reproduces the legacy's table clusters, so structure never leads a
boundary. Everything is **candidate**, tagged with its `facts.jsonl` locator, landed in
`docs/domain/discovery/` — never a `model.yaml` from a mine, never `confirmed`; a human confirms the
subset. Full method (the three axes, the legacy-cluster trap, freshness, the shared-concept answer):
`references/brownfield-triangulation.md`.

### 3. First-pass strategic decomposition
- Group events/nouns into **bounded contexts** by the boundary heuristics — a boundary is where
  the *language changes meaning*, cohesion high and coupling low (ddd-methodology.md §2.2, §2.5).
- Classify each **core / supporting / generic** — core = competitive differentiator; generic =
  commodity you could buy (§2.1).
- Sketch **relationships** between contexts, on **two axes, never one**: `direction` (who depends
  on whom — upstream / downstream / peer) and a **role per side** (how each end governs it — Open
  Host, Published Language, Conformist, ACL, Customer, Supplier, Partnership, Shared Kernel). They
  are independent: the same downstream may conform *or* build an ACL, and a side can hold several
  roles at once. Roles are an **open** list — when the relationship is real but DDD has no name for
  it, write `other` and put what is known in `note:` rather than forcing a pattern that misfits.
  Schema and the sources behind it: output-template.md §4.
- Name the **load-bearing extraction seam** — the boundary that decouples the system most if
  split first, often a *Published Language* artifact (an exported pack, a contract, a shared
  document) crossing contexts. State it explicitly and consider elevating it to its own context;
  it's usually the first service to extract on the monolith→microservices path — don't leave it
  buried inside a large context.
- Before finalizing the context list, run the **capability-vs-context test** on every candidate
  (ddd-methodology.md §2.6): a context must own a domain model with real business invariants. A
  noun cluster with none — ownership/permissions, audit/activity-history — is a **capability of
  existing contexts, not a context**; drop it and record it as a declined candidate with the
  reason, including the **escalation condition** that would promote it (e.g., a regulated domain
  making audit retention/legal-hold real invariants).

### 4. First-pass tactical model (per context) — sized to the subdomain type
**Match tactical depth to each context's subdomain type from step 3 — do not model every context
the same way.** Uniform aggregate/entity/event machinery on every context is a cargo-cult smell,
not thoroughness: it buries the one or two areas that deserve a rich model under ceremony the
supporting, generic, and reference areas never needed.

| Subdomain type | Tactical pattern | Aggregates? |
|---|---|---|
| **Core** | Full domain model — aggregates as real consistency boundaries, entities/VOs/events, invariants named from the stated rules. | **Yes** — this is where the modelling effort goes. |
| **Supporting** | A deliberately lighter shape — transaction script / active record / CRUD-plus-a-calculation. Say it is lighter *on purpose*. | **Usually not** — don't impose aggregate ceremony on record-keeping. |
| **Generic** | Buy or integrate behind a thin adapter. No domain model. | **No.** |
| **Master-data / reference** | Plain CRUD over lookup records (e.g. countries, currencies, status codes). | **No** — explicitly decline aggregates, repositories, and domain events; note why. |

For **core** contexts, identify **aggregates** (consistency boundaries) — each with its root
entity, member **entities** (identity), **value objects** (no identity, equal by value), and the
**domain events** it emits. Apply the aggregate rules in aggregate-design-canvas.md; name from the
ubiquitous language (see Naming below). A concept with an id, its own lifecycle/status, or
(brownfield) its own table/repository is an **entity** even if it looks data-like — don't demote
an identified concept to a value object.

For **supporting / generic / master-data** contexts, record the lighter pattern and the reason
*instead of* forcing aggregates. A `model.yaml` with `aggregates: []` plus a one-line rationale
(a transaction script, a bought adapter, or plain lookup CRUD) is the correct, complete output for
them — an empty aggregate list here is a deliberate right-sizing decision, not a gap.

Then run an **event-flow continuity check**: every emitted domain event should have at least one
consumer (a handler/policy in some context), and every cross-context arrow on the map should
correspond to an emitted event. Flag orphan emits and unconsumed events before finalizing — a
dropped or unconsumed edge is a real modeling bug, not a stylistic gap.

### 5. Ask targeted questions (only where ambiguous)
Surface the model, then ask **only** about genuine ambiguities — batch them:
- a term appears to mean different things in two candidate contexts (confirm the split),
- a context's core/supporting/generic classification isn't clear,
- two pieces of state may need atomic consistency across candidate aggregates,
- a concept's entity-vs-value-object nature is unstated,
- an invariant is implied but never stated (ask — do **not** fabricate it).

If the description already answers something, don't ask. If nothing is ambiguous, skip to step 6.

### 6. Emit the docs (create or delta-merge)
Follow `references/output-template.md` exactly. Detect the project's `docs/domain` convention (or
ask if none), then check whether it **already holds generated artifacts** (`DOMAIN-NNNN`
frontmatter, `INDEX.md` rows, per-context `model.yaml`):

- **Create mode** (empty/new): write `context-map.md` (Mermaid map + sub-domain classification) and, per
  context, a folder with `README.md` (Bounded Context Canvas) + `model.yaml`. Fresh docs start
  `status: draft`, `owner: TBD`, with `DOMAIN-NNNN` ids; create `INDEX.md`.
- **Update mode** (prior output exists): **read it first**, then merge the new model in as a
  *delta* — same reconcile discipline as step 1, now pointed at your own past output. Reuse each
  existing context's `DOMAIN-NNNN` id, add/update only what changed, **preserve human edits**
  (escalated status, assigned owner, hand-written rules), **never delete** a context that's no
  longer in the model — flag it instead, and record real disagreements in the Conflicts table.
  Close with a short **changelog** (added / updated / preserved / flagged). The exact merge rules
  are in output-template.md §"Delta merge".

**One model, generated views (single source of truth).** The per-context `model.yaml` files are the
single source of truth; `context-map.md` (a **C4 L2** view) and each aggregate canvas (**C4 L3**) are
**derived** from them — regenerate a view, never hand-patch it to say what no `model.yaml` says, and
preserve the map's human-authored **Conflicts table + Changelog** verbatim on any regeneration. Stamp
`generated_from:`/`generated_at:` so a stale view says so. Keep the L2 map coarse — don't deepen it
into L3 detail. Detail: `references/brownfield-triangulation.md`.

In `context-map.md` (either mode), **label every cross-context shared artifact with its sharing
level** — Building Blocks / Published Language / Shared Kernel (ddd-methodology.md §2.4).

**The shared-concept answer — a thin reference, not a fat shared blob.** When several contexts lean
on one concept, do **not** mint a single "Shared" / "Common" / "Core" context (the universal model
bounded contexts exist to remove, §2.6; a mined corpus tempts it via the FK graph). Publish a
**Published Language** from a thin reference / Foundation context, or use a **Shared Kernel only with
its cost written down** (last resort, smallest possible). A shared entity left on the map is
Shared-Kernel coupling — flag it with that cost or split it. Detail:
`references/brownfield-triangulation.md`.

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Bounded Context | capability noun | `Booking`, `Inventory` |
| Aggregate | = its root entity | `Order` |
| Entity | singular domain noun | `Customer` |
| Value Object | descriptive noun, no id | `Money`, `DateRange` |
| Command | imperative | `PlaceOrder` |
| Domain Event | past tense | `OrderPlaced` |

The same word in two contexts is kept in both, qualified by context — that polysemy is the
*point* of bounded contexts, not a naming clash.

## Worked example

A full worked run is in `references/worked-example.md` — read it when the shape of the output is unclear.
