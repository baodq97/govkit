# DDD Methodology Reference

Theory and heuristics behind every step of `domain-decompose`: strategic + tactical DDD for
defining domain entities and dividing bounded contexts, focused on the monolith → microservices
journey. Input is a domain narrative (capabilities and events), NOT source code. Short citations
key to the Sources section.

---

## 1. Ubiquitous Language (the foundation)

The model IS the language: domain terminology baked into the software, evolved over the product's
life, not fixed upfront (Fowler, DDD). Language shifts across organizational boundaries, so
**different models naturally emerge** — the motivation for bounded contexts (Fowler, Bounded
Context). **Practical rule:** capture terms verbatim from experts; one word meaning two different
things to two groups signals a boundary, not a naming bug.

---

## 2. Strategic Design

### 2.1 Sub-domains: Core / Supporting / Generic

Three sub-domain types (ddd-crew):

| Type | Definition | Classification cue |
|------|-----------|--------------------|
| **Core** | Strategic significance; highest business differentiation | "Would we lose competitive advantage if a competitor copied it?" → yes = core |
| **Supporting** | Necessary but non-differentiating | Needed to run, but not where you win |
| **Generic** | Commoditized, standard functionality | Could be bought/outsourced (auth, billing, notifications) |

Invest modelling effort where it pays — the core areas with most customer value, not everything
equally (Bogard). The `Strategize` step produces a **Core Domain Chart** (ddd-crew).

### 2.2 Bounded Contexts

Total unification of a large model isn't feasible or cost-effective; instead divide into **Bounded
Contexts**, each with its own internally-consistent model — "multiple canonical models" where the
same concept (product, customer) is modelled differently per context (Fowler, Bounded Context).
E.g. at GetYourGuide an "Activity" is rich (`title, description, highlights, meeting point, …`) to
a supplier but thin (`title, from-price, image, reviews rate`) in search — divergent semantics
that justify separate contexts (GetYourGuide).

### 2.3 Context Mapping

Contexts share concepts but model them differently; depict relationships with a **Context Map** and
map between polysemic concepts for integration. Ownership and change demands set upstream/downstream;
duplicated anti-corruption logic can justify a shared kernel or open-host service (Fowler, Bounded
Context; GetYourGuide).

### 2.4 What may be shared between contexts

Contexts share concepts (§2.3), but *what* actually crosses the boundary decides how tightly they
couple. Three distinct things get shared — mislabel one and the coupling goes in by stealth.

| Level | What it is | Coupling | When acceptable |
|-------|-----------|----------|-----------------|
| **Building Blocks** | Technical base types (`Entity`, `ValueObject`, `AggregateRoot`, `Enumeration`) — **no business logic** | ~0 (generic, stable) | Always — version it like any library |
| **Published Language** (+ OHS) | A versioned **contract** (schema / DTO / integration event); each side translates at its own edge | Medium — depends on the contract, not on internals | Common and healthy; the default way to share |
| **Shared Kernel** | A small **domain model** with real ubiquitous-language meaning, touched live by both sides | **Highest** among cooperating patterns — a change needs mutual consent | Rare and expensive; use least, keep the Core Domain out |

**Three corrections — the mislabels that couple contexts silently:**

1. **Technical building blocks are NOT Evans' Shared Kernel.** A package that holds only base
   classes is Building Blocks even if it is named `SharedKernel`. Judge by *content*: carries
   business meaning → Shared Kernel; purely technical → Building Blocks.
2. **A Shared Kernel deliberately *increases* coupling — it is not a de-duplication tool.** It
   trades duplication for coordination, and you keep the **Core Domain out of it**. If the goal is
   removing duplication *while staying loosely coupled*, the right move is **extract a context and
   integrate via Published Language**, not a Shared Kernel.
3. **"Core logic every module must follow" is an anti-DDD smell.** That is the single universal
   model bounded contexts exist to eliminate. Cross-cutting rules everyone must obey belong to
   **governance / architecture tests** (structure and process), not a shared domain model.

**Rule:** label every artifact shared between two contexts with its level **on the context map**.
Sharing an **entity / domain class** between contexts is **Shared Kernel coupling** — flag it with
its cost (mutual-consent change, drift risk, Core-Domain leakage), never accept it silently.
Prefer, in order of coupling: duplicate (lowest) → extract-a-context + Published Language (medium)
→ Shared Kernel (highest, last resort).

### 2.5 Finding boundaries (heuristics)

Boundaries are **discovered empirically, not decreed upfront** — large boundaries chosen early
"risk getting it wrong, and being stuck to them for a long time" (Verraes). Heuristics (ddd-crew):

- **Language change** — when the model's language begins changing meaning, a new bounded context
  can be created (GetYourGuide).
- **Cohesion / coupling** — maximize cohesion within, minimize coupling across, to reduce cognitive
  load so each part can be reasoned about independently.
- **Business Capability Modelling** + **Design Heuristics** to find natural seams.
- **Domain Message Flow Modelling** with end-to-end use cases to validate the split stays loosely
  coupled.
- **Human/organizational culture** is usually the dominant boundary factor, not just domain
  concepts (Fowler, Bounded Context).

### 2.6 The capability-vs-context test

Not every recurring noun cluster deserves a bounded context. **The test:** a bounded context must
own a domain model with **real business invariants**. Before minting a context, ask *what
invariants its model would own*. If the honest answer is "none — it only decorates or serves other
contexts," it is a **capability of existing contexts, not a context of its own**. Minting one
anyway forces a single universal model (§2.2) — the exact thing bounded contexts exist to remove.

Two clusters that repeatedly fail the test:

- **Ownership / permissions.** `owner` is **polysemic** across contexts and both readings are
  correct: in a business context it is a domain term with its own rules (a record's responsible
  party, a salesperson on a deal); to an authorization capability it is just a relation edge
  `(user, owner, resource)` — meaningless alone, only an input to policy. An "Ownership" context
  would force one global `owner`, a compromise model serving no context well. Model ownership as a
  **per-context projection** each context publishes toward an authorization capability. Namespaced
  relations keep the meanings apart — `document:owner` and `folder:owner` are two separate
  relations, not one global `Owner` (Zanzibar) — and that namespacing is exactly what avoids a
  Shared Kernel on the word "owner."
- **Audit / activity-history.** Its would-be invariants — retention, legal hold, integrity, who
  may read — are thin. In an ordinary domain, audit is a **cross-cutting capability plus a store**
  (an append-only table, one writer, a few queries), not a context: decline the aggregate and
  repository. **Escalation condition (record it when declining):** in a regulated domain (finance,
  healthcare) — or when the audit trail *itself is the product* — retention, legal hold, and
  chain-of-evidence become genuine business invariants, and audit **does** become a bounded
  context. State that trigger so a later reviewer knows what would flip the decision.

**General rule:** before minting a context, name the business invariants its model would own. None
→ it is a capability of existing contexts; record it as a **declined candidate** with the reason
(and the escalation condition, if one exists), rather than carving a boundary around it.

### 2.7 Monolith → Microservices mapping

A bounded context is a candidate **service boundary**; the progression is `sub-domains → bounded
contexts → autonomous teams → services` (ddd-crew). Validate a split with Domain Message Flow
diagrams; let boundaries emerge from real message flows rather than fixing them prematurely
(Verraes). Domain Storytelling helps find (micro)service boundaries (Open Practice Library, Domain
Storytelling).

---

## 3. Collaborative Discovery (inputs to decomposition)

Raw material a decomposition works from:

- **Event Storming** (Brandolini): rapid business-process discovery. Flow: domain events (past
  tense) → commands → aggregates → bounded contexts; group common objects into service candidates.
  Outputs shared scope, actors, aggregate definitions, common Business/IT language (Open Practice
  Library, Event Storming).
- **Domain Storytelling**: capture stories as *who – does what – with what – why*, building
  ubiquitous language and surfacing natural boundaries (Open Practice Library, Domain Storytelling).

---

## 4. Tactical Design (building blocks)

The "Evans Classification" (Entities, Value Objects, Services) plus Aggregates, Repositories, and
Domain Events — conceptual and language-agnostic (Fowler, DDD).

### 4.1 Entity vs Value Object

| | Entity | Value Object |
|--|--------|--------------|
| Identity | Has identity + lifecycle; equal by ID | No identity; equal by attribute values |
| Mutability | Tracked over time | Immutable, replaceable |
| Example | Purchase Order, Customer | Money, Address, Line Item |

A Line Item is a value object because its properties matter more than preserving identity. Push
behaviour into value objects, keep entities lean (identity is already a big burden), and avoid
**anemic models** — encapsulate logic in the objects that own the data; Primitive Obsession, Data
Class, and Feature Envy smells signal misplaced logic (Rayner; Bogard). Full entity-vs-VO decision
rule: `aggregate-design-canvas.md`.

### 4.2 Aggregates & Aggregate Roots

An aggregate is a cluster of objects treated as one unit, fronted by a single **aggregate root**
that guards the boundary (Rayner). Evans' rules (Bogard; Rayner):

- Aggregate root = **consistency boundary**; all invariants hold at commit.
- Only the root is queried/loaded directly; nothing external references internal entities except
  transiently. Deletes remove the whole aggregate atomically.
- **One transaction per aggregate**; between aggregates use **eventual consistency**.
- Keep aggregates small; boundaries will change as the model matures — expect iteration.

(Actionable aggregate-design rules: `aggregate-design-canvas.md`.)

### 4.3 Domain Events

A domain event is "the memory of something interesting which affects the domain" — an immutable,
timestamped fact about something that already happened, dispatched by type (Fowler, Domain Event).
Events are the spine of Event Storming and the integration mechanism between aggregates and
contexts (Open Practice Library, Event Storming).

---

## 5. Naming Conventions (ubiquitous-language driven)

Names come from the discovered business language, not technical layers (ddd-crew). Canonical forms
(Bounded Context / Aggregate / Entity / Value Object / Command / Domain Event) live in the naming
table in `SKILL.md`. Same word, different context = keep both, qualify by context (polysemy)
(Fowler, Bounded Context).

---

## 6. A Decomposition Process (ordered)

The ddd-crew DDD Starter Modelling Process — 8 steps, each with a deliverable; iterative, not
waterfall:

| # | Step | Output |
|---|------|--------|
| 1 | Understand | Business Model Canvas, User Story Maps |
| 2 | Discover | EventStorm (domain events) |
| 3 | Decompose | Sub-domains carved on the event storm |
| 4 | Strategize | Core Domain Chart (core/supporting/generic) |
| 5 | Connect | Domain Message Flow diagram |
| 6 | Organize | Context Map aligned to teams |
| 7 | Define | Bounded Context Canvas per context |
| 8 | Code | Aggregate Design Canvas, implemented model |

---

## Sources

- Fowler, *Domain-Driven Design* — https://martinfowler.com/bliki/DomainDrivenDesign.html
- Fowler, *Bounded Context* — https://martinfowler.com/bliki/BoundedContext.html
- Fowler, *Domain Event* — https://martinfowler.com/eaaDev/DomainEvent.html
- ddd-crew, *DDD Starter Modelling Process* — https://github.com/ddd-crew/ddd-starter-modelling-process
- GetYourGuide, *Tackling business complexity with strategic DDD* — https://www.getyourguide.careers/posts/tackling-business-complexity-with-strategic-domain-driven-design
- Verraes, *Emergent Boundaries* — https://verraes.net/2017/04/emergent-boundaries/
- Rayner, *Aggregates & Entities in DDD* — http://thepaulrayner.com/blog/aggregates-and-entities-in-domain-driven-design/
- Bogard, *Strengthening your domain: a primer* — https://lostechies.com/jimmybogard/2010/02/04/strengthening-your-domain-a-primer/
- Open Practice Library, *Event Storming* — https://openpracticelibrary.com/practice/event-storming/
- Open Practice Library, *Domain Storytelling* — https://openpracticelibrary.com/practice/domain-storytelling/
- Evans, *Domain-Driven Design* (Blue Book) — origin of Bounded Context, Shared Kernel, Published Language, Conformist.
- Vernon, *Implementing Domain-Driven Design* — Open Host Service / Published Language / ACL in practice; Shared Kernel as highest-coupling, last-resort integration.
- Google, *Zanzibar* — namespaced relations (`document:owner` vs `folder:owner`) as the alternative to a shared global `Owner` model — https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/
- `[unavailable]` cosmicpython / *Architecture Patterns with Python* — TLS cert expired at fetch; substituted Fowler's Domain Event article for the domain-event section.
