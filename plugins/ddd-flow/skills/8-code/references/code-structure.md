# Code structure — how the model survives contact with a codebase

The canvases say what the model *is*. This says what has to be true of the code for the model to
still be the model in a year. Language-agnostic: these are structural rules, not a framework choice.

## 1. Layering — hexagonal / onion, stated as dependencies

Both architectures encode the same rule, which is the only one that matters here: **dependencies
point inward, toward the domain.**

| Layer | Contains | May depend on | Must never depend on |
|---|---|---|---|
| **Domain** | aggregates, entities, value objects, domain events, domain services, ports (interfaces) | nothing outside itself | ORM, HTTP, framework, message bus, clock, database |
| **Application** | use-case handlers, transaction boundaries, orchestration | domain | transport specifics |
| **Adapters** | repositories, API controllers, message consumers, external gateways | domain + application | — |

The practical test: **can the domain layer be unit-tested with no database, no HTTP and no
framework?** If not, infrastructure has leaked inward, and every future domain change now costs an
infrastructure change too.

Two leaks worth naming because they are so common they look normal:

- **ORM annotations on aggregates.** The persistence model now dictates the domain model. Where the
  language forces a compromise, keep it one-directional and document it as a known concession.
- **Time.** `now()` inside an aggregate makes rules untestable and hides a real domain concept.
  Effective dates and clock injection are domain decisions, not utilities.

## 2. Aggregate rules that must show up in the code

- **Reference other aggregates by id only** — never by object reference. An object reference invites
  a traversal that quietly loads and mutates two aggregates in one transaction.
- **One transaction per aggregate.** Between aggregates: an event, and eventual consistency with a
  named corrective policy.
- **The root guards the boundary.** External code talks only to the root; internal entities are never
  handed out or referenced from outside.
- **Repository per aggregate root**, returning the root. A repository for an internal entity is a
  boundary violation with a helpful-looking API.
- **Invariants live inside the aggregate**, not in the application service and not only in the
  database. A check constraint the domain layer does not know about will be violated by the domain
  layer.
- **Commands return the outcome, including rejection.** A rejection that the domain models (`slot
  unavailable`) is a domain result, not an exception for the transport layer to translate.

## 3. Language fidelity

The ubiquitous language has to be visible in the code: class names, method names, event names, and
the names in tests. This is not aesthetics — a model whose names have drifted from the conversation
cannot be discussed with the people who own the rules, which is the entire mechanism by which a
domain model stays correct.

Two checks that catch drift early:

- Read a method name aloud to a domain expert. If it needs translating, the name is wrong.
- Grep the codebase for terms the canvas does not contain. New vocabulary appearing in code without
  appearing in the language table is either a missing term or an invented concept.

Where a term is polysemic across contexts, keep both — qualified by context. That is what bounded
contexts are for, and collapsing them into one shared class is how a shared kernel appears by
accident.

## 4. Event modelling as a cross-check

Before implementing a slice, lay it out as: **command → aggregate → event → read model → the next
command**. Walking one use case that way exposes three things the canvases can miss:

- a read model nobody owns (someone must decide before acting, and no context publishes what they
  need),
- an event with no consumer (either a missing policy or an event that should not exist),
- a command issued from a screen that has no data to justify it.

This is the design-level counterpart to the message flows from loop 2 — same discipline, one level
down, inside a single context.

## 5. What each downstream consumer needs

| Consumer | Takes from here | Explicitly does not take |
|---|---|---|
| `data-model` | aggregates, entities, value objects, identity scheme, which invariants can be enforced in schema and which cannot | corrective policies (they are code), audit columns are its own concern |
| `api-designer` | handled commands and queries as the public surface; which events are published contracts | internal events, aggregate internals |
| implementer | the canvases, the layering rules, the naming table | any decision not written down — an unwritten decision gets re-made, differently |

State per invariant whether it is **enforceable in the schema** (a unique index, a foreign key) or
**only in the aggregate** (anything spanning rows or requiring a read-then-decide). `data-model`
cannot infer this, and an invariant assumed to be handled by the other layer is handled by neither.

## 6. Tests as the model's evidence

Right-sized like everything else: a core aggregate's invariants deserve tests that state the rule in
the domain's words, including the concurrency case the throughput section flagged. A supporting
context's transaction script does not need the same ceremony.

The test names are the last place the ubiquitous language shows up, and the first place a reviewer
reads it. *"rejects a reservation that would exceed container capacity"* is documentation that
cannot rot silently.

## Sources

- Alistair Cockburn, *Hexagonal Architecture*; Jeffrey Palermo, *Onion Architecture*.
- Eric Evans, *Domain-Driven Design*; Vaughn Vernon, *Implementing DDD* — aggregate rules.
- Adam Dymitruk, *Event Modeling* — command → event → read model slices.
