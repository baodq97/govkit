---
name: 8-code
description: >
  DDD step 8 — event-modelled slices and aggregate design canvases. Writes docs/domain/<context>/aggregates/.
---

# Domain Code

## Hard rules

- **Length budget: `event-model/README.md` ≤ 200 lines, each aggregate canvas ≤ 150,
  `code-structure.md` ≤ 120.** A budget caps prose, not findings: over it, cut rationale a reader
  can infer and anything restated from an upstream artifact — never open questions, provenance,
  or a stated absence.
- **Never invent an invariant.** An invariant is a business rule someone stated. Inferring "an
  invoice must have at least one line" because it sounds right creates a constraint the business
  never asked for — and unlike a missing rule, a fabricated one is enforced by the code and
  discovered by a customer.
- **A relaxed invariant needs a named corrective policy.** Written by, or confirmed with, the
  business. What happens when the bad state occurs is a domain decision, not an error handler.
- **Unknown volumes stay unknown.** Throughput and size drive boundaries; a guessed number is a
  guessed boundary that then looks measured.
- **One transaction per aggregate.** If two aggregates must change atomically, they are one
  aggregate or the consistency is eventual — there is no third option, and picking one is the
  design decision this step exists to force.
- **Don't rewrite the model.** Contradictions with `model.yaml` are proposed deltas for
  `3-decompose`; boundary moves go back through loop 2 with the canvas as evidence.
- **Design, not implementation.** This step stops at the structural contract. Producing skeleton
  classes here bypasses the repo's implementation path and the review that goes with it.

> *"Aligning the code to the domain makes it easier to change the code when the domain changes."*
> — ddd-crew, Code

This is the last step before the model becomes something people type. It answers one question per
aggregate: **what stays consistent inside one transaction, and what is allowed to be repaired
afterwards.** Everything else in aggregate design follows from that answer — the boundary, the
concurrency behaviour, the size, and how much corrective business logic has to exist.

**Scope, honestly:** this produces the design and the structural contract — canvases, invariants,
command/event wiring, layering rules, and the handoff into `api-designer`, `data-model` and the
implementer. It does not write the application. That separation is deliberate: the decisions here
are cheap to change in a canvas and expensive to change once they exist as classes with tests
around them.

## Inputs

| Input | Supplies | If missing |
|---|---|---|
| `docs/domain/<context>/README.md` | the Bounded Context Canvas — purpose, business decisions, quality attributes | run `7-define`; without stated business decisions the invariants would have to be invented |
| `docs/domain/<context>/model.yaml` | first-pass aggregates, entities, value objects, events | run `3-decompose` |
| `docs/domain/message-flows/` | which commands cross into this context, and from whom | throughput and client-count estimates become guesses |
| Quality attributes (from Define) | the concurrency and auditability demands that decide boundaries | ask; these are the inputs the canvas cannot infer |

## Reference files (read as needed)

- `references/aggregate-design-canvas.md` — the full canvas in its working order, the
  invariants-versus-corrective-policies trade-off, how to read the throughput and size estimates,
  and the design smells each section exposes. Read before filling the first canvas.
- `references/event-modeling.md` — **phase 1**: the four patterns (state change · state view ·
  translation · automation), how to cut a scenario into slices, and the Given/When/Then that makes a
  slice handover-ready. Read this first — the slices decide which aggregates earn a canvas.
- `references/code-structure.md` — how the model sits in code: layering (hexagonal / onion), the
  rules that keep a domain model from dissolving into services, language fidelity, and what each
  downstream skill needs from this output.

## Who to involve

- people who design, build and test software
- people who have domain knowledge, for the invariants and the volumes

The volumes matter more than teams expect. *"How many clients issue commands to one instance of
this?"* is a business question with a design consequence, and engineers routinely guess it wrong in
both directions.

## Process

Two phases. **Phase 1 specifies what gets built; phase 2 designs the aggregates the specification
actually touches.** Running them in this order is what stops the last step of the loop from being the
first place anyone sees something buildable — and it prevents canvassing aggregates nothing points
at.

### 0. Phase 1 — event-model the slices

Take the scenario, lay the timeline, and fill the four patterns underneath it (see
`references/event-modeling.md`): **state change** (command → aggregate → event), **state view**
(events → read model → UI), **translation** (external system → our event), **automation** (read model
→ processor issues a command).

Cut it into **slices** — *the smallest possible work that can be handed to a developer* — each with
its command, its events including the **rejection** path, the read models it touches, and a
Given/When/Then. A slice you cannot write a `Then` for is not specified; it carries an open question.

Two things this phase catches that no canvas does: a read model nobody owns, and a missing failure
path. Both are cheaper here than in a code review.

Then carry forward only the aggregates the slices touch. The rest are speculative — say so rather
than filling canvases for them.

### 1. Right-size — aggregates are for core contexts

Reaching for aggregates in every context is the cargo-cult failure `3-decompose` already
right-sizes against, and it is worth restating here because this is where the ceremony actually gets
built:

| Context type | What it gets |
|---|---|
| **Core** | full canvas per aggregate |
| **Supporting** | transaction script or active record; record the pattern and the reason, no canvas |
| **Generic** | a bought adapter; no domain model |
| **Master-data / reference** | plain lookup CRUD; explicitly decline aggregates, repositories and domain events |

An empty aggregate list with a one-line rationale is a complete, correct result for three of those
four rows.

### 2. Name and describe the aggregate

Name it for what it is. Where the lifespan is meaningful, put it in the name — a `BillingPeriod`
aggregate says more than a `Billing` one, and it pre-empts the unbounded-lifetime problem in step 7.

The description carries something teams usually leave in a meeting: **why these boundaries, and what
was traded away** compared to the alternatives considered. A canvas with the rejected alternatives
recorded is the one that survives the next person asking "why isn't this one aggregate?".

### 3. State transitions

List the states, or draw the small transition diagram. Both extremes are informative:

- **Too many transitions** — the process boundary is probably wrong and can be split. A single
  aggregate walking through eleven states is usually two processes sharing a table.
- **Naive transitions** (`created → updated → deleted`) — a strong sign the aggregate is **anaemic**
  and the logic has been pushed out into services. The domain still has rules; they are just
  somewhere the model cannot enforce them.

### 4. Enforced invariants — and 5. corrective policies

The heart of the canvas, and the reason to fill it in a room rather than alone.

**Enforced invariants** are what the aggregate guarantees within one transaction. List the main
ones. A large number signals high local complexity in the implementation, which is a real cost.

**Corrective policies** are the business logic that runs when a rule the system does *not* enforce
gets violated. They are **not** eventual consistency renamed: the violating state is legitimate and
may persist forever, the reaction is a business decision rather than a retry, and the **domain expert
defines it, not the architect**. The canonical case: a credit limit cannot be enforced because
offline transactions exist, so the business accepts the overdraft and charges penalty interest.

**Ask the right question.** Not *"is this rule important?"* — the answer is always yes. Ask:

> **"How often does it actually get violated, and what do you do when it does?"**

If they already have a handling process, you have found a corrective policy. Forcing it into an
invariant buys contention for a problem the business already solved. And Vernon's fourth rule carries
a clause that usually gets cut: use eventual consistency outside the boundary — *after asking whose
job consistency is*. The user performing the action → enforce synchronously. Another user or the
system → eventual is legitimate.

The decision rule: **cost of strict enforcement** (contention, latency, complexity) versus
**violation frequency × cost per violation**.

| Design | Concurrency conflicts | Corrective logic | Customer experience |
|---|---|---|---|
| Bigger aggregate, more invariants enforced | more | less | fewer surprises, more retries |
| Smaller aggregate, invariants relaxed | fewer | more | more repair paths the business must define |

Neither column is right on its own. What is *not* acceptable is a relaxed invariant with no
corrective policy written down — that is an unhandled defect with a schedule. A large number of
corrective policies is itself a smell: business logic has been pushed outside the aggregate.

### 6. Handled commands → created events

List every command the aggregate handles and every event it creates, then **connect them**. The
connectors are the check: a command producing no event usually means a missing fact or a query in
disguise; an event nothing produces means a missing command or an event modelled at the wrong level.

Cross-check against the context canvas's inbound communication. A command in the flows that no
aggregate handles is a gap; an aggregate handling a command nobody sends is speculative design.

### 7. Throughput — the concurrency estimate

Estimate, with an **average and a maximum** for each:

- **Command handling rate** — how fast one instance receives commands,
- **Total number of clients** — how many distinct callers issue them.

The pair gives a rough concurrency-conflict chance, and the maximum matters more than the average:
outliers are what drive a boundary re-evaluation. A shopping basket has one client; a conference
booking has hundreds competing for the same instance, and that difference — not the entity diagram —
is what decides the aggregate boundary.

State the causality precisely, because the loose version sends people counting fields: **a large
aggregate contends not because it is large, but because it merges command streams that were
independent into one instance.** Slot → day is sixty streams collapsed into one. Estimate streams,
not attributes.

Where the estimates are unknown, say unknown and name who could supply them. An invented number here
propagates into a boundary decision and then into a schema.

### 8. Size — event growth and lifetime

**Check your persistence style first.** This cell measures in events and prescribes snapshots, so it
assumes **event sourcing**. On a state-stored / ORM system it does not apply as written: use the
throughput estimate and the four structural signals instead, and measure size as **how many rows must
be loaded and locked for one operation**. Scoring a state-stored aggregate on event counts produces a
confident, meaningless number.

Under event sourcing, estimate the **event growth rate** per instance and the **lifetime** of an
instance: many events per instance slows command handling (usually fixable with snapshots), and
**long-lived or unbounded instances** cause the harder problem — ever-growing streams, nothing to
archive.

Either way, the heuristic worth applying early: **scope the aggregate to a time period** (a billing
period, a season, a departure) when the domain allows it. Much cheaper to decide now than to split a
three-year-old instance later.

### 9. Lay out the code structure

From the canvases, state the structural contract (details in `references/code-structure.md`):

- the **domain layer holds the model** and depends on no framework, ORM or transport,
- aggregates reference each other **by id only** — never by object reference,
- **one transaction per aggregate**; between aggregates, an event and eventual consistency,
- **repositories per aggregate root**, returning the root, not internal entities,
- the **ubiquitous language appears in the code** — class, method and event names match the canvas,
  because a model whose names diverge from the conversation stops being the shared model.

### 10. Emit and hand off

Write one canvas per aggregate to `docs/domain/<context>/aggregates/<Aggregate>.md`, `status:
draft`, `owner: TBD`, plus a short summary in the context's README. Where a canvas contradicts
`model.yaml`, **propose** the delta — `3-decompose` owns that file.

Then hand off explicitly, saying what each consumer takes:

| Next | Takes | Does not take |
|---|---|---|
| `data-model` | aggregates, entities, value objects, identity | invariants it cannot enforce in schema — say which stay in code |
| `api-designer` | handled commands and queries, and which events are public | internal events |
| implementer | the canvases plus the structure rules | anything not written down |

## Worked example

A full worked run is in `references/worked-example.md` — read it when the shape of the output is unclear.
