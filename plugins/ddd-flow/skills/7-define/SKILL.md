---
name: 7-define
description: >
  DDD loop 3 — define: Bounded Context Canvas v5 + Quality Storming — assumptions, verification metrics, open questions, interface critique. Deepens docs/domain/<context>/README.md.
disable-model-invocation: true
---

# Domain Define

> *"Before committing to a design, make explicit decisions about the choices which can have a
> significant impact on the overall design. Have these conversations early while it is still easy
> to change your mind and explore alternative models."* — ddd-crew, Define

Loop 2 decided where the boundaries are. Loop 3 decides what lives inside one, and the first half
of that is a contract: what this context is responsible for, what it accepts, what it publishes,
and what it is assuming while it does so.

The Bounded Context Canvas is not documentation. It is a **forcing function** — it makes a team say
out loud the things that otherwise get decided implicitly by whoever writes the first endpoint. The
sections people skip are the ones that pay: *assumptions* (design always happens on incomplete
knowledge, and unwritten assumptions become invisible constraints), *verification metrics* (how you
would find out the boundary was wrong), and *open questions* (whose count is a direct read on how
confident the team actually is).

## Inputs — get them in one call

```bash
python3 ${CLAUDE_SKILL_DIR}/../design/scripts/ddd_context.py --root . --step 7-define --context <Context>
```

This returns the upstream facts already joined: the capability row this context's classification is
carried from, its aggregate/event/invariant counts, which of the three falsifiable sections its
current canvas has, the open hotspots that name it, and — the expensive one — **every inbound and
outbound message traced in any flow, with its type, its collaborator and the scenario it came from.**

Do that join by hand and you are reading a model file, a canvas, a business model and every flow in
the repo, then transposing four tables into one. It is clerical, it is where this step spends most
of its time, and getting it slightly wrong is invisible: a missed outbound message just means the
canvas quietly understates what the context publishes.

The pack is **upstream fact, not a draft**. It tells you what is on disk; the canvas is still yours
to argue. Where it prints an absence — no capability row, no traced message, a canvas at 1/3 — that
absence is a finding to carry into Open Questions, not a blank to fill.

Read the raw artifacts when the pack raises something you need the wording of: the exact phrasing of
a business rule, an assumption's provenance, a hotspot's full text. The pack replaces the joining,
not the reading.

| Still missing after the pack | Then |
|---|---|
| no context directory | run `3-decompose` — there is no context to define |
| no capability row for it | classify from `1-understand`'s inputs, or mark it unknown; do not invent a new classification here |
| no traced messages | the interface sections would be a guess from the model rather than from observed use — say so, or run `4-connect` first |
| no discovery | do not fill business decisions from inference |

## Reference files (read as needed)

- `references/bounded-context-canvas.md` — every section of canvas v5, what it asks, how to fill it
  from evidence, the collaborator and relationship types, the swimlane format, and the five
  interface-critique questions. Read before filling the first canvas.
- `references/quality-storming.md` — eliciting quality attributes per context, turning them into
  numbers, and the ones that change a domain model rather than just an infrastructure choice.

## Who to involve

- people who design, build and test software
- people who have domain knowledge
- **people who are responsible for the product**

That third group is specific to this step. Responsibilities and public interfaces are product
decisions as much as technical ones — which messages a context accepts determines what other teams
can ask of it, and that is a commitment somebody has to own.

## Process

### 1. Right-size — do not canvas everything

A full canvas per context is exactly the cargo-cult failure `3-decompose` right-sizes against.
Use the classification:

| Context type | What it gets |
|---|---|
| **Core** | full canvas, all sections, plus the interface critique |
| **Supporting** | purpose, language, inbound/outbound, business decisions; skip the deep sections unless something is contested |
| **Generic / bought** | a stub: purpose, what it is bought from, the adapter's interface. That is complete, not lazy |

Say which contexts you are defining and why the others got less. Nine identical canvases signal
ceremony; two deep ones and five stubs signal judgement.

### 2. Name and purpose

A few sentences, in **business language, with no technical detail**, naming the key actors this
context serves. If the purpose cannot be stated in a couple of sentences without an "and also", the
boundary is probably carrying two responsibilities — that is a finding for `3-decompose`, not
something to write around.

### 3. Strategic classification — carry it, don't re-derive it

Three facets: **domain type** (core / supporting / generic), **business-model role** (revenue
generator / engagement creator / compliance enforcer), and **evolution** (genesis / custom-built /
product / commodity). All three already exist upstream — the chart from `5-strategize` and the
capability table from `1-understand`. Cite them.

Re-deriving a classification here silently forks it, and two documents that disagree about whether
a context is core is worse than one that admits it does not know.

### 4. Domain roles

How does this context *behave*? An analysis context that crunches data into insight behaves nothing
like an execution context that enforces a workflow, or a gateway that translates for an external
system. Naming the role is how you notice a context that has quietly taken on two — the most common
source of tangled responsibilities inside a boundary that looked fine from outside.

### 5. Inbound and outbound communication

For each message: its **name**, its **type** (command / query / event), the **collaborator** on the
other end, and the **relationship type** with that collaborator (the context-mapping patterns —
conformist, ACL, open-host, published language, shared kernel, customer/supplier, partnership).

Inbound = collaborations others start. Outbound = collaborations this context starts. Note that
"message" here is implementation-neutral: an HTML form POST is a command.

Where message flows exist, the **swimlane format** is the more useful arrangement: *message in →
decision(s) made → message(s) out*. It shows what the context actually decides, which is the
question the canvas is really asking.

### 6. Ubiquitous language and business decisions

The key terms **as they mean in this context** — a word that means something different next door is
the justification for the boundary, and it belongs here explicitly.

Business decisions are the rules and policies the context enforces. Take them from discovery, with
attribution. A rule nobody stated is not a business decision; it is an assumption, and it goes in
the next section where it can be challenged.

### 7. Quality Storming

Walk the quality attributes with the room (see the reference): what must be fast, what must be
correct-under-concurrency, what must be auditable, what must survive a partition, what is
regulated. Attach numbers where anyone can supply them.

Do this **now**, not at implementation, because a subset of these change the domain model itself:
an availability requirement that forbids a synchronous dependency, an auditability requirement that
makes history a first-class domain concept rather than a log, a regulatory retention rule that
turns a capability into a context of its own.

### 8. Assumptions, verification metrics, open questions

The three sections that get left blank, and the reason to run the canvas at all:

- **Assumptions** — every design rests on beliefs about volumes, behaviours, and what the business
  will want next. Write them down where they can be attacked. An assumption on a canvas is
  reviewable; the same assumption in someone's head is a constraint nobody knows about.
- **Verification metrics** — how would you learn this boundary is wrong? Pick things you can
  actually observe: change coupling (how often this context changes together with another),
  cross-team pull requests, lead time for a change contained here, the ratio of inbound queries to
  events. These are available from CI, the issue tracker, and production. A metric nobody can
  collect is a wish.
- **Open questions** — everything the room could not answer. The count is a signal: many open
  questions on a core context means the design is not ready to build, and that is worth knowing
  before someone starts.

### 9. Critique the interface

The canvas exists to be challenged. Run the five questions over the finished interface:

1. Are the message names coherent with each other and with the context's description?
2. Is each message the right **type** — should this command actually be an event?
3. Is the interface **too big** — too many unique message types for one responsibility?
4. Is the context **exposing its internals** through its messages?
5. Do any messages look like they **belong elsewhere**?

Then try the general tip: move something on the canvas to another context and see what improves.
Record what you moved and what it cost — a design that has never been perturbed has never been
tested.

### 10. Emit

**Update the existing** `docs/domain/<context>/README.md` — the first-pass canvas
`3-decompose` wrote — rather than creating a parallel document. Delta-merge: preserve human
edits, keep the id, add the sections that were missing, and record what changed. Where the canvas
contradicts `model.yaml`, propose the delta; `3-decompose` owns that file.

Optionally add a **C4 System Context** diagram when a context talks to external systems or several
user types — it answers "what sits around this thing", which the canvas does not.

## Hard rules

- **Length budget, by sub-domain type: core ≤ 180 lines, supporting ≤ 90, generic and master-data
  ≤ 35.** Right-sizing is the doctrine that stops happening silently — a 160-line canvas for a
  context you have just declared bought is the failure, and the ratio between a core canvas and a
  generic one should be nearer ten to one than two to one. A budget caps prose, not findings:
  over it, cut rationale a reader can infer and anything restated from an upstream artifact —
  never open questions, provenance, or a stated absence.
- **Never invent a business decision, a rule, or a message.** Take them from discovery, the flows,
  or the people in the room. Anything you inferred goes under *assumptions*, labelled as inferred,
  where somebody can knock it down. That relabelling is the whole safety mechanism of this step.
- **Assumptions and open questions stay populated.** A canvas with both empty is not a confident
  design; it is an unexamined one. If the room genuinely had no open questions on a core context,
  say who was in it — that is usually the real finding.
- **No technical detail in the purpose.** Frameworks, databases and endpoints in the purpose field
  mean the context is being described as a component instead of a capability, and the canvas stops
  being reviewable by the people who know the business.
- **Don't re-classify.** Strategic classification comes from `5-strategize` / `1-understand`
  by citation. Disagreement is a finding, not a local edit.
- **Don't redraw boundaries.** A context whose purpose needs an "and also" is evidence for
  `3-decompose`; write the finding, keep the canvas honest, and let the owning skill move the
  line.
- **Verification metrics must be collectable.** Name the source — CI, tracker, production telemetry.
  A metric with no source is decoration.

## Worked example

**Input:** the Nordic Freight model — `Consolidation` placed as the core context by
`5-strategize` (the Guaranteed Consolidation premium), with message flows already traced.

**Right-sizing:** full canvas for `Consolidation`, lighter ones for `Booking` and `Customs`, stubs
for `Notifications` (bought) and `Routing`.

**Purpose:** *"Decide which consignments travel in which container on which departure, so that
customers who paid for Guaranteed Consolidation get their slot and containers leave as full as
possible."* Actors: depot planners, and indirectly the exporters who bought the premium.

**Domain role:** execution (it enforces a workflow) **and** analysis (it optimises fill). Naming
both surfaced the finding: the optimiser and the commitment ledger have different change rhythms,
and the optimiser could move behind a port without splitting the context.

**Interface critique found:** `ReserveCapacity` was modelled as an inbound query followed by a
command — question 2 says it should be one command the context accepts or rejects. Question 4 caught
`ContainerLoad` being exposed wholesale to Booking, which is the context's internal state.

**Assumptions written down (previously implicit):**

- a container is committed to exactly one departure and never re-planned after sealing,
- planners will keep resolving infeasible stacks by hand — the optimiser is advisory,
- volume, not weight, is the binding constraint on Nordic's lanes.

The third turned out to be contested in the room, which made it an open question rather than an
assumption — and it is the kind of thing that would have been discovered by a production incident
instead.

**Verification metrics chosen:** how often `Consolidation` and `Booking` change in the same pull
request (change coupling, from CI); planner manual overrides per week (from the live system). If
the first climbs, the boundary is wrong; if the second climbs, the model does not match the work.

Note what the example does **not** do: it does not invent a business rule about re-planning, it does
not reclassify `Consolidation` on its own authority, and it does not fill the open-questions section
with rhetorical questions to look thorough — the one question there is a real disagreement with two
names on it.
