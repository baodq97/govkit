# ddd-flow

The **DDD modelling loop** as skills — the design-time companion to [`swe-flow`](../swe-flow).

```
/ddd-flow:design        the orchestrator — reads state, decides, routes, records
/ddd-flow:1-understand  ┐
/ddd-flow:2-discover    │
/ddd-flow:3-decompose   │
/ddd-flow:4-connect     ├ the eight steps — hidden from context, run when named
/ddd-flow:5-strategize  │
/ddd-flow:6-organise    │
/ddd-flow:7-define      │
/ddd-flow:8-code        ┘
/ddd-flow:view          cross-cutting — put the model on a screen
```

**Numbered = a step in the loop. Unnumbered = orchestrator or cross-cutting.**

## Why its own plugin, and why one description

This toolkit is **episodic**: greenfield projects, migrations and refactors toward DDD, or a new
business line arriving into a domain already modelled. Everyday delivery never touches it.

Skill descriptions sit in context permanently whether or not they fire. Two measurements drove the
shape:

| | Before | After |
|---|---|---|
| DDD descriptions inside `swe-flow` | ~14,000 chars — **64% of that plugin's budget** | moved out |
| Always-in-context cost of this plugin | 10 descriptions, ~5,400 chars | unchanged — all 10 still load |
| Per-run cost: the 8 step skill bodies | 90.3 KB | **23.5 KB (−74%)** |

The saving is in the **per-run** column, not the always-on one. All ten descriptions stay in
context, because a skill is only invocable if its description is there — "the agent can trigger it"
and "it costs nothing to carry" cannot both be true. What shrank is what gets *loaded when a step
actually runs*: the step bodies no longer re-teach EventStorming, context mapping or the canvases,
because a capable model already holds those.

`design` reads state, decides the next step, and **invokes it**. The eight steps and `view` are
model-invocable, so an agent can drive the loop end to end, and each carries a trigger-shaped
description; you can still run any of them directly by typing its command when you want to hold the
workshop yourself.

An earlier design marked the nine non-orchestrator skills `disable-model-invocation: true` so
`design` was the only router. That is reversed on this branch — the key blocks the orchestrator's
own `Skill` call too, so it bought "human-slash-command-only" rather than "orchestrator-only". A
44-utterance × 3-router eval put the description-only surface at 129/132 with **zero** false claims
on eight negative cases (`docs/research/ddd-flow-thin-eval/RESULTS.md` §6). The reconciliation of
that reversal against the governed record is open in `US-0015`.

What the reversal removes is the mechanical guarantee that `design` could not silently chain three
steps. The guarantee is now a rule rather than a lock: one step per turn, then re-read state. It
matters because half these steps are conversations with people a skill cannot summon — chaining
them unattended produces artifacts resting on assumptions nobody checked.

The two plugins meet at an artifact, not an import: **`docs/domain/`**. `ddd-flow` writes it;
`swe-flow`'s `api-designer`, `data-model` and `spec-author` read it. Install either without the other.

## The loop

```
loop 1  understand → discover                           what the business is, and what happens
loop 2  decompose → connect → strategize → organise     where the boundaries are, and who owns them
loop 3  define    → code                                what each context is, and how it is built
```

Three inner loops, one end-to-end pass, none of it a pipeline. DDD is continuous and iterative, so
`design` reads state and decides rather than executing a sequence.

### Numbering, against ddd-crew's

The eight steps are ddd-crew's. **Two are numbered differently**, so a reader following both should
map them:

| ddd-crew | | here |
|---|---|---|
| 1 Understand · 2 Discover · 3 Decompose | = | `1-understand` · `2-discover` · `3-decompose` |
| **4 Strategize** | → | **`5-strategize`** |
| **5 Connect** | → | **`4-connect`** |
| 6 Organise · 7 Define · 8 Code | = | `6-organise` · `7-define` · `8-code` |

Connect runs first here because it is the cheapest step that can still invalidate decomposition — a
flow that crosses four contexts to serve one use case moves a boundary, and moving it after the core
domain chart is drawn means drawing it twice. The chart also reads better afterwards: `5-strategize`
measures complexity from the model's own mass, and message flows are what expose mass that a static
map hides. The plugin's own readiness heuristic already says so — *"is differentiation sourced from
business evidence?"* — and the answer improves once the flows exist.

The order is a prior, not a constraint: `skills/design/references/steps.yml` declares staleness per step rather
than deriving it from position, so running strategize before connect costs nothing but the caveat.

## How the skills are shaped

Each step skill is deliberately small (~40 lines) and carries four things only: what it consumes
and produces, the **output contract a script parses**, one echoed rule, and a pointer to the
plugin-wide law. It does not re-teach EventStorming, context mapping, aggregate design or the
canvases — a capable model already knows those, and re-teaching them crowds out the part it gets
wrong.

Everything normative is single-sourced at the plugin root, so a rule is stated once and every step
that needs it reads the same sentence:

| `references/` | Holds |
|---|---|
| `RULES.md` | the plugin-wide law — only the corrective imperatives that fight a confident-wrong default, tagged by the step(s) they govern |
| `artifact-shapes.md` | every artifact's shape, line budget, and exactly what `ddd_check.py` parses out of it |
| `model.template.yaml` | the `model.yaml` schema, field-for-field with the checker's parser |

The two cross-cutting skills keep their own references because nothing else reads them:
`design/references/steps.yml` (step configuration) and `view/references/model-json.md` (the view
payload contract).

The per-step `skills/*/references/` directories are **background reading for people**, not part of
any skill's load path — no `SKILL.md` points at them, so they cost nothing at runtime. They hold the
sourced method material (ddd-crew canvases, EventStorming grammar, Team Topologies, the measure
playbook) behind the rules above. Treat them as provenance: a rule in `RULES.md` is the instruction,
and the reference is where it came from.

## Skills

**Orchestrator**

- **`design`** — reads repo state with `skills/design/scripts/ddd_state.py` (deterministic, no API key): per step
  `done` / `partial` / `missing` / `STALE`, the evidence behind each verdict, the journal's open
  items, and **candidate actions with reasons** — a list, not a next step, because which one is
  right depends on the goal. What counts as evidence is **configuration** (`skills/design/references/steps.yml`:
  artifact globs, markers, and which upstream step invalidates which), so a repo with different doc
  conventions overrides a file, not the code. Right-sizes the path and states what each skip costs,
  handles a change arriving mid-loop by scope rather than by restart, and records every step,
  deviation and open item to an append-only journal that regenerates `docs/domain/MODELLING-LOG.md`.
  It never models.

**Loop 1 — understand the problem**

- **`1-understand`** — Business Model Canvas + User Story Map + the `business_role` /
  `evolution_stage` / `differentiation` inputs later steps classify from. Provenance per block;
  `unknown` is a valid answer → `docs/domain/business-model.md`.
- **`2-discover`** — EventStorming (plus Domain Storytelling, Example Mapping): event timeline,
  ubiquitous language, hotspots, and who was actually in the room. Tracks **confirmed vs candidate**
  so a run that only re-read the schemas cannot pass as discovery. On a **structured** corpus it
  switches to measuring — the run writes and commits its own mining scripts, emits a coverage
  manifest (`total / parsed / skipped / failed`, validated by `mine_coverage.py`), and *proves*
  polysemy from the schema instead of tallying it, so "not found in the artifacts" stops passing for
  an absence → `docs/domain/discovery/`.

**Loop 2 — decide the boundaries**

- **`3-decompose`** — bounded contexts, aggregates, entities, value objects, events; tactical depth
  right-sized to sub-domain type; delta-merge on re-run (stable ids, preserves human edits, flags
  drops) → `docs/domain/`.
- **`4-connect`** — Domain Message Flow Modelling: one flow per use case, every message typed
  command/event/query and numbered, then read back for the coupling a static map hides —
  check-then-act races, distributed invariants, cycles, god contexts, chatty pairs. Findings feed
  **back** to `3-decompose` as proposed deltas → `docs/domain/message-flows/`.
- **`5-strategize`** — Core Domain Chart: complexity **measured** from the model's own
  aggregate/invariant/table mass, differentiation **sourced** from the business model (never
  inferred from code size) → build/buy/outsource, modelling rigour, team type, trajectory, and the
  **investment-mismatch report** — where the code mass sits versus where the differentiation sits →
  `docs/domain/core-domain-chart.md`.
- **`6-organise`** — Team Topologies over the context map: team type per context, cognitive-load
  budget using model mass as the proxy, interaction modes derived from the flows, the nine
  context-mapping patterns read as team power dynamics, and the Independent Service Heuristics per
  candidate boundary. Emits a team **shape**; never assigns named individuals →
  `docs/domain/team-topology.md`.

**Loop 3 — define and build**

- **`7-define`** — Bounded Context Canvas v5 per context: purpose, classification carried (not
  re-derived), domain roles, inbound/outbound messages with collaborators and relationship types,
  business decisions, and the three sections teams skip — **assumptions, verification metrics, open
  questions** — plus **Quality Storming** for the quality demands that change the *model* rather
  than the runtime, then a five-question interface critique. Deepens the per-context `README.md`.
- **`8-code`** — two phases. **(1) Event Modeling**: lay the scenario out as state-change /
  state-view / translation / automation patterns and cut it into **slices** — *the smallest work that
  can be handed to a developer* — each with its rejection path and a Given/When/Then. This is where
  something buildable first appears, and it decides which aggregates earn a canvas. **(2) Aggregate
  Design Canvas v1.1** for those aggregates: state transitions, enforced invariants
  weighed against **corrective policies**, commands wired to events, **throughput** (command rate ×
  client count → concurrency-conflict risk) and **size** (event growth × lifetime →
  snapshot/archival), plus the code-structure contract (hexagonal layering, reference-by-id, one
  transaction per aggregate, language fidelity) and an explicit handoff. Design-level; it does not
  write the application.

**Cross-cutting**

- **`view`** — the live visual surface: a zero-dependency local server pushing model updates to an
  already-open browser, four lenses (Map · Mass · Matrix · Business Model Canvas) over one
  `model.json`, and gaps rendered as gaps rather than whitespace.

## A full run to look at

The repo's `examples/euro-parking/` is one domain taken end to end by all eight steps, nothing hand-edited
afterwards — 10 bounded contexts, 4 aggregate canvases, 4 message flows, ~3,400 lines, from twelve
requirements and one domain-expert session. The requirements come from the **SAP DDD Kata**, which
the ddd-crew starter process names as the way to practise it and which publishes **no solution**, so
nothing in the output could have been recalled rather than modelled.

The parts worth studying are the refusals: nine relaxed rules with no corrective policy and a note
saying so, every throughput cell `unknown` with a named owner, two contexts left unplaced on
differentiation. See `examples/euro-parking/README.md` in the govkit repo — it now also carries the UI design the sibling design-flow plugin built from the same model.

## What it measurably does, and what it does not

This set is a **discipline harness**, not a finder. The distinction is measured rather than claimed,
and the measurement is unflattering enough to be worth publishing.

Four evals on a trap-laden fixture (`docs/research/ddd-skill-evals/`), each run twice — once with
the skill, once with **no skill at all**:

| | with the skill | with nothing |
|---|---|---|
| the traps the fixture was built to hide | 10 / 10 | **9 / 10** |
| the doctrine below, present in the output | 22 / 24 | 19 / 24 |
| deterministic quality checks | 15 / 20 | 15 / 20 |
| tokens | +16% | — |

**A capable model with no skill finds nine of the ten traps.** If the question is "will this surface
a boundary problem I would otherwise miss", the honest answer on this evidence is: usually you would
have found it anyway, and the skill costs 16% more to get there.

Where the gap is real is process, and one row carries most of it: **propose-don't-apply, 4/4 against
2/4.** Without the skill, an agent that finds a boundary problem edits the model. That is the
difference between a modelling session and an unreviewed change, and in a governed repo it is the
whole point. The rest of the gap is the same shape — open questions recorded, candidates not
promoted to confirmed.

Two things this measurement does not cover, stated so nobody reads more into it than is there. The
fixture is seven contexts and its traps are ones careful reading can catch; a real domain is larger
and its traps are quieter. And `3-decompose` and `view` have no eval corpus yet, so two of the ten
skills are unmeasured.

## Doctrine the whole set shares

- **Never invent.** No fabricated events, rules, invariants, business models, headcounts or volumes.
  Anything inferred is labelled inferred; anything unknown stays `unknown` with the person who could
  answer it named.
- **Provenance travels.** Who said it and when, or which file it came from — per block, per term,
  per placement.
- **Propose, don't apply.** A skill that finds a boundary problem writes it as a delta for the skill
  that owns the model. Only `3-decompose` edits `model.yaml`.
- **Right-size, then say what you skipped.** Full modelling machinery goes to core contexts; stubs
  are the correct output everywhere else, and a skipped step is recorded with its cost.
- **Drafts only.** Everything lands `status: draft`, `owner: TBD`. Advancing a governed doc is a
  human act.

## Handoff to swe-flow

| Consumer | Takes |
|---|---|
| `swe-flow:data-model` | aggregates, entities, value objects, identity, and which invariants a schema can enforce |
| `swe-flow:api-designer` | handled commands and queries, and which events are public contracts |
| `swe-flow:spec-author` | the governed PRD / RFC / ADR that records the decisions |

## Sources

Adapted from the [ddd-crew](https://github.com/ddd-crew) starter modelling process and its canvases
(CC BY / CC BY-SA), Team Topologies and the Independent Service Heuristics (CC BY-SA), Michael
Plöd's context-map and Quality Storming material, and Wardley Mapping.

Five techniques ddd-crew lists are **chosen against, not missed**: BPMN and sequence diagrams (the
message-flow notation carries no time axis on purpose — a flow is judged on who talks to whom and
how often, and a time axis invites transport detail the boundary question does not need), C4
component diagrams (the aggregate canvas and the layering contract carry the same information
closer to the decision), Dynamic Reteaming and Mob Programming (practices for a room, with no
artifact for a skill to write or check).
