# Bounded Context Canvas v5 — section by section

Adapted from ddd-crew/bounded-context-canvas (CC BY 4.0). `3-decompose` writes a first-pass
version of this file as each context's `README.md`; this reference is the full canvas that
`7-define` deepens it into.

## How to work through it

Start with **name** and **purpose** — they frame everything else. After that the order is free:
design **outside-in** starting from inbound communication (what the world asks of this context), or
**inside-out** starting from business rules and language (what this context knows). Outside-in tends
to expose interface problems faster; inside-out tends to expose language problems faster.

You will not have everything you need. Sections you cannot fill from evidence point at which other
technique to run — an empty inbound section means the message flows have not been traced, an empty
language section means discovery has not happened. Leave them empty and name the missing step
rather than filling them with plausible content.

## Template

```markdown
# <Context> bounded context

## Purpose
<A few sentences, business language, no technical detail. Name the key actors served.>

## Strategic classification
| Facet | Value | Source |
|---|---|---|
| Domain type | core \| supporting \| generic | core-domain-chart.md |
| Business-model role | revenue generator \| engagement creator \| compliance enforcer | business-model.md |
| Evolution | genesis \| custom built \| product \| commodity | business-model.md |

## Domain roles
<e.g. execution context, analysis context, gateway, draft context — and why>

## Inbound communication
| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | ReserveCapacity | command | customer/supplier |

## Outbound communication
| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customs | bounded context | ContainerSealed | event | published language |

## Ubiquitous language
| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|

## Business decisions
<!-- rules and policies this context enforces; ONLY what was stated, with attribution -->

## Quality attributes
| Attribute | Requirement | Number | Source |
|---|---|---|---|

## Assumptions
<!-- beliefs this design rests on; label inferred ones as inferred -->

## Verification metrics
| Metric | What it would tell us | Where it comes from |
|---|---|---|

## Open questions
<!-- one line each; the count is a signal about design confidence -->
```

## Section notes

**Name.** Agreeing the name as a team frames how the context gets designed. A name people quietly
disagree about produces a context people quietly disagree about.

**Purpose.** The why and the what, in business language, no technical detail. Naming key actors
keeps it concrete. This field is the fastest boundary test available: if it needs an "and also", the
context probably holds two responsibilities.

**Strategic classification.** Three independent facets — domain type, business-model role, evolution
stage. They are independent on purpose: a compliance enforcer can be core (a regulated capability
you genuinely compete on) or generic (payroll). Carry all three from upstream artifacts rather than
re-deriving them.

**Domain roles.** How the context behaves, which is distinct from what it owns. Analysis contexts
crunch data into insight; execution contexts enforce workflow; gateways translate for external
systems; draft contexts hold work-in-progress until it becomes real. The stated purpose of the
section is to **avoid coupling responsibilities**. A context playing two roles is not automatically
wrong — but it should be a decision, not an accident, because the two halves usually change at
different rates.

**The one named anti-pattern: Brain Context** — a context that knows everything and drives the rest.
Its signature is visible on the canvas itself, before any code exists:

> **many domain roles** + **outbound messages that are almost all commands** rather than events.

Commands mean this context is issuing orders; events mean it is announcing facts and letting others
decide. An outbound column of pure commands says the decisions of the whole system have quietly
migrated here.

**Inbound / outbound communication.** Split by **who initiates the collaboration, not by which way
the data flows.** This is the single most common error on the canvas, and it inverts the whole
dependency picture when you get it wrong.

> The canvas's own example puts the query *"Retrieve Account Balance"* in **outbound** — the data
> flows *in*, but this context is the caller.

Test to apply per message: *who picked up the phone?* If it was us, it is outbound, whatever comes
back.

Four things per message:

- **Message** — name and contents,
- **Type** — command (do something), query (tell me something), event (this happened),
- **Collaborator** — another bounded context, a frontend, an external system, or direct user
  interaction when the context owns its own UI,
- **Relationship type** — the context-mapping pattern with that collaborator, which says how the
  two models and teams influence each other.

"Message" is implementation-neutral. No message bus is implied; an HTML form POST is a command.

**Swimlane variant.** Arrange the communication sections as *message in → decision(s) made →
message(s) out*, one lane per collaborator. This makes the context's actual decisions visible, and a
lane with no decision between in and out is a pass-through worth questioning.

**Ubiquitous language.** The key terms and what they mean *here*. The column that earns its place is
"differs elsewhere?" — a term meaning something else in a neighbouring context is the justification
for the boundary.

**Business decisions.** The key rules and policies. Take them from discovery with attribution;
anything inferred belongs under assumptions instead.

**Assumptions.** Design happens without full knowledge, and making the beliefs explicit is the
point. Two kinds are worth separating: assumptions about the *domain* (a container is never
re-planned after sealing) and about *scale or behaviour* (planners will keep overriding by hand).
Both fail; they fail differently.

**Verification metrics — the only falsifiable section on the canvas.** Everything else is a claim
about the present; this is a prediction you can be wrong about. Write it as one, with a number and a
date:

> *"75% of changes to the application form will have no impact on Scoring."*

That is checkable in three months from commit history. It turns "I believe this boundary is right"
into a hypothesis. Without this section the canvas is an opinion presented tidily.

Collectable sources: CI/VCS (change coupling — how often two contexts change in the same commit or
PR), the issue tracker (how many teams touch work here, lead time), production (volumes, manual
override rates, error classes). Prefer metrics that would *change your mind*: if this number moves,
we re-cut.

**Open questions — an indicator, not a to-do list.** *"Many questions are a good indicator towards a
high degree of uncertainty."* Counting them measures how uncertain the boundary is. Many open
questions on a core context is a signal to keep modelling rather than start building.

## Interface critique

The public interface is the context's contract with the rest of the system: it has a large blast
radius and it is expensive to change. Once the canvas is filled, challenge it:

1. Are the names of messages coherent with each other and with the description of the context?
2. Is each message type optimal — should a command be an event?
3. Is the interface too big (too many unique message types)?
4. Is the context exposing too much of its internals?
5. Do any messages seem like they should belong elsewhere?

And the general tip that finds the most: **move something on the canvas to another context and see
how the design is affected.** Record the experiment and its outcome, including the ones you rejected
— a design that has never been perturbed has never been tested.

## Sources — go and check

| Claim | Source |
|---|---|
| The nine sections, collaborator and relationship types, the "Retrieve Account Balance" outbound example, design tips, the falsifiable verification-metric example, "many questions… high degree of uncertainty" | https://github.com/ddd-crew/bounded-context-canvas |
| Swimlane variant (*message in → decision(s) → message(s) out*) | Nick Tune — https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-recipe-use-case-swimlanes-11ca647175d3 |
| Domain roles / archetypes, incl. Brain Context | Alberto Brandolini, *Bounded Context Archetypes* — https://medium.com/@cyrillemartraire/collaborative-construction-by-alberto-brandolini-an-archetype-of-bounded-contexts-bea640bbb5b |
| Object role stereotypes | Rebecca Wirfs-Brock — http://www.wirfs-brock.com/PDFs/A_Brief-Tour-of-RDD.pdf |
| Evolution stages (genesis / custom built / product / commodity) | Simon Wardley — https://learnwardleymapping.com/ |
| Extending the canvas with BDD examples | https://xebia.com/blog/extending-the-bounded-context-canvas-with-bdd-examples/ |
