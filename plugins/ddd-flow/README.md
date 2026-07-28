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
| Always-in-context cost of this plugin | 10 descriptions | **1** (`design`, 1,417 chars) |

The eight steps and `view` carry `disable-model-invocation: true`: their descriptions are **not**
loaded into context, and the full skill loads only when you type its command. `design` names the
command; you run it. That also means `design` cannot silently chain three steps — which matches its
own rule that a step per turn keeps the human in the loop, since half these steps are conversations
with people a skill cannot summon.

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

The order is a prior, not a constraint: `references/steps.yml` declares staleness per step rather
than deriving it from position, so running strategize before connect costs nothing but the caveat.

## Skills

**Orchestrator**

- **`design`** — reads repo state with `scripts/ddd_state.py` (deterministic, no API key): per step
  `done` / `partial` / `missing` / `STALE`, the evidence behind each verdict, the journal's open
  items, and **candidate actions with reasons** — a list, not a next step, because which one is
  right depends on the goal. What counts as evidence is **configuration** (`references/steps.yml`:
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
  so a run that only re-read the schemas cannot pass as discovery → `docs/domain/discovery/`.

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

`examples/euro-parking/` is one domain taken end to end by all eight steps, nothing hand-edited
afterwards — 10 bounded contexts, 4 aggregate canvases, 4 message flows, ~3,400 lines, from twelve
requirements and one domain-expert session. The requirements come from the **SAP DDD Kata**, which
the ddd-crew starter process names as the way to practise it and which publishes **no solution**, so
nothing in the output could have been recalled rather than modelled.

The parts worth studying are the refusals: nine relaxed rules with no corrective policy and a note
saying so, every throughput cell `unknown` with a named owner, two contexts left unplaced on
differentiation. See `examples/euro-parking/README.md`.

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
Plöd's context-map and Quality Storming material, and Wardley Mapping. Each skill's `references/`
cites its own sources.

Five techniques ddd-crew lists are **chosen against, not missed**: BPMN and sequence diagrams (the
message-flow notation has no time axis on purpose — `4-connect/references/message-flow-notation.md`
argues it), C4 component diagrams (the aggregate canvas and the layering contract carry the same
information closer to the decision), Dynamic Reteaming and Mob Programming (practices for a room,
with no artifact for a skill to write or check).
