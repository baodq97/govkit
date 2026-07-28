# Aggregate Design Canvas v1.1 — the full canvas

Adapted from ddd-crew/aggregate-design-canvas (CC BY 4.0). `3-decompose` uses a light version
of this to sketch first-pass aggregates; this is the design-level canvas for the CODE step, and it
adds the four sections that actually decide boundaries — state transitions, corrective policies,
throughput, and size.

An aggregate is a graph of objects forming a **consistency boundary for domain policies**. Depending
on where the boundary is drawn, a policy is either *enforced* (an invariant) or *repaired
afterwards* (a corrective policy). That choice is the design.

## Working order

The canvas has a suggested order because each section informs the next. Work top to bottom, then
loop back — the throughput section frequently sends you back to the invariants.

```markdown
### Aggregate: <Name>   (root: <RootEntity>)

**1. Description**
<Responsibilities and purpose. Why these boundaries. What was traded away versus the
 alternatives considered.>

**2. State transitions**
<States, or a small transition diagram.>

**3. Enforced invariants**        **4. Corrective policies**
- <rule held within one txn>      - <what repairs the state when a relaxed rule is violated>

**5. Handled commands → 6. created events**
| Command | Event(s) |
|---|---|

**7. Throughput**
| Metric | Band (avg) | Band (max) | Basis |
|---|---|---|---|
| Command handling rate | low \| medium \| high \| unknown | low \| medium \| high \| unknown | <the sentence, with its source> |
| Total number of clients | low \| medium \| high \| unknown | low \| medium \| high \| unknown | <the sentence, with its source> |
→ concurrency conflict chance: low / medium / high

**8. Size**
| Metric | Band | Basis |
|---|---|---|
| Event growth rate (per instance) | low \| medium \| high \| unknown | <the sentence, with its source> |
| Lifetime of an instance | short \| medium \| long \| unbounded \| unknown | <the sentence, with its source> |
→ size: small / medium / large; snapshotting needed? archival plan?
```

**Why the band columns exist.** ddd-crew ships two evaluation charts for these sections —
*aggregate concurrency conflict chance* and *aggregate size* — and says to plot **both average and
maximum** so the trade-off can be argued out loud. A cell that reads *"~3–4 commands over a stay of
hours"* is the right sentence and cannot be plotted; the band makes it plottable without losing it,
because the sentence stays in **Basis**. `unknown` is a legitimate band and plots as unplaced —
which is the honest reading when nobody has supplied a volume, and it is visible instead of buried
in prose.

## Section notes and the smells each one exposes

### 1. Description

Include **why** the boundaries were chosen and the trade-offs made against other designs. This is
the section that answers the next reviewer's "why isn't this one aggregate?" without needing the
person who drew it.

### 2. State transitions

An aggregate usually moves through explicit states that change how it can be interacted with.

| What you see | What it usually means |
|---|---|
| many transitions | process boundaries were not modelled properly; the aggregate can probably be split |
| very naive transitions (`created → updated`) | **anaemic** aggregate — the logic was pushed out into services, where the model cannot protect it |

### 3 & 4. Enforced invariants and corrective policies

The pair is the point; each alone is misleading.

**Enforced invariants** protect business logic inside one transaction. Listing the main ones fixes
what the aggregate is *responsible for*. A large number indicates high local complexity in the
implementation — which is a legitimate cost of a genuinely complex core, and a warning anywhere
else.

**Corrective policies** are the business logic that runs when a rule the system does *not* enforce
gets violated: *"if the business rule is violated then the system knows how to react to it"*
(Gunia). An invariant, by contrast, is *"a rule that will always hold, no matter what we try to do
in our system"*. A large number of corrective policies signals that business logic has drifted
outside the aggregate.

**A corrective policy is not eventual consistency with a new name.** The two differ on every axis
that matters:

| | Eventual consistency | Corrective policy |
|---|---|---|
| The violating state | temporary — it **converges** to correct | **legitimate** — it can persist forever |
| The reaction | technical: retry, compensate | a **business decision**: charge a fee, phone the customer, approve by hand |
| Who defines it | the architect | the **domain expert** |

The canonical example: a credit limit cannot be enforced 100% because offline transactions exist,
so the business accepts the overdraft and reacts with **penalty interest**. Nothing is "put back";
the violation became a priced business situation.

**The decision rule:**

```
cost of strict enforcement (contention, latency, complexity)
    vs
violation frequency × cost per violation
```

**The question to ask the domain expert is not "is this rule important?"** — the answer is always
yes. Ask: **"how often does it actually get violated, and what do you do when it does?"** If they
already have a handling process, you have found a corrective policy; forcing it into an invariant
buys contention for a problem the business already solved.

Vernon's fourth rule is usually quoted with its decisive clause cut off: *use eventual consistency
outside the boundary* — **after asking whose job it is to keep things consistent.** If consistency
is the job of the user performing the action, enforce it synchronously. If it is another user's job
or the system's, eventual consistency is legitimate. In Vernon's own worked example the
back-of-the-envelope arithmetic came out *inconclusive*; that question is what broke the tie.

Two failure modes to name explicitly:

- **A relaxed invariant with no corrective policy.** Not eventual consistency — an unhandled defect.
  The repair path is a domain decision the business has to make and state.
- **An invariant that cannot be enforced in one transaction anyway** (it spans contexts). That is a
  distributed invariant, and it belongs back in loop 2 — `4-connect` will have flagged it.

Worked example of deriving the boundary from this single question — appointment booking:

| Boundary | What it can enforce | What it costs |
|---|---|---|
| **one slot** | "a slot is booked once" | cannot enforce rules spanning several slots |
| **one day** | adds "no two adjacent slots" | higher contention: 60 command streams collapse onto one instance |
| **one month** | adds "at most 10 slots a month" | **rejected** — contention too high; keep the day boundary and make the monthly rule a **corrective policy** |

### 5 & 6. Handled commands and created events

List both and draw the connectors. The connectors are a completeness check:

- a **command with no event** — either a fact is missing, or it is a query wearing a command's name,
- an **event with no command** — either a command is missing, or the event is emitted by a policy
  and belongs to another aggregate,
- a command in the context's inbound communication that **no aggregate handles** — a gap,
- an aggregate handling a command **nobody sends** — speculative design; delete it or find its
  caller.

### 7. Throughput — will instances collide?

The goal is estimating how likely a **single instance** is to be involved in concurrency conflicts.
Two metrics, each with an average *and* a maximum:

- **Command handling rate** — how fast one instance processes new commands,
- **Total number of clients** — how many callers are likely to issue them.

The canonical contrast: a website basket has essentially one client, so almost no conflict; a
conference booking system has tens or hundreds of clients competing for the same instance. Same
entity-diagram shape, completely different aggregate decision.

Read the maxima, not the averages — outliers drive boundary re-evaluation, and load in this kind of
domain is almost always bursty (cut-off times, month-end, sale launches).

Then the trade-off: a bigger aggregate needs fewer corrective policies and collides more. But state
the causality precisely, because the loose version sends people counting fields:

> **A large aggregate contends not because it is large, but because it merges command streams that
> were independent into one instance.** Slot → day is sixty streams collapsed into one.

That is the number to estimate — how many independent streams land on one instance — not the
attribute count. An aggregate with forty attributes and one client is safe; one with four
attributes and two hundred clients is not.

A related trap Vernon names: the **false invariant** — a constraint *"artificial… imposed by
developers"* rather than by the business. The classic case is a giant `Product` aggregate where
adding a backlog item fails because someone else just scheduled a release: *"Nothing about planning
a new backlog item should logically interfere with scheduling a new release!"*

### 8. Size — how much history accumulates

Two metrics:

- **Event growth rate** — how many events are appended to one instance,
- **Lifetime of an instance** — how long it lives, and therefore how much accumulates before a
  command can be processed.

Event granularity matters here: `OrderCreated` carrying all line items and `LineItemAdded` per line
produce very different counts for the same order.

What to watch for:

- **Medium/large event counts** slow command handling — usually solvable with snapshots.
- **Long-lived or effectively infinite instances** are the harder problem: ever-growing streams,
  nothing to archive, and no natural point to close the books. The heuristic: **scope the aggregate
  to a time period** — a billing period, a season, a departure — whenever the domain permits.

**This section assumes event sourcing.** It measures in events and prescribes snapshots. On a
state-stored / ORM system it does not apply as written — use the Throughput cell and the four
structural signals instead, and measure size as **how many rows have to be loaded and locked for one
operation**. Say which you are on before filling the cell; a state-stored aggregate scored on event
counts produces a confident, meaningless number.

## Seven misconceptions worth checking against

1. **"An aggregate is an entity with children."** No — grouping by ownership is where false
   invariants come from. The only criterion is *which rules must hold simultaneously*.
2. **"An aggregate is always one DB transaction."** Overstated. Vernon calls one-instance-per-
   transaction a *rule of thumb* and names four exceptions (UI batch convenience; no async mechanism
   **and** the aggregate belongs to that same user; a mandated global 2PC; query performance).
3. **"One repository per entity."** No. Evans: *"Provide repositories only for aggregate roots that
   actually need direct access"* — even one-per-root is already an overstatement.
4. **"An aggregate maps 1:1 to a table."** No. The boundary is *the set of rows loaded and changed
   together*; Vernon even encourages serialising value-typed attributes with the root to avoid joins.
5. **"An aggregate maps 1:1 to a microservice."** No. Evans: *"Keep an aggregate together on one
   server. Allow **different aggregates** to be distributed among nodes."* The aggregate is the unit
   of **relocation/sharding**; the unit of deployment is the bounded context.
6. **"A good aggregate enforces every rule."** No — *"it might not be practical, or **even
   possible**"* (offline transactions, external systems, manual steps).
7. **"Smaller is always better."** No — over-shredding *"fails to protect true invariants"*. Vernon
   warns against **both** extremes.

And the inversion that saves the most argument: **domain experts are often more comfortable with
delayed consistency than developers are.** Business is already full of asynchronous process —
approvals, reconciliation, post-checks. Before designing a distributed transaction, ask the business
whether a few seconds or minutes is genuinely wrong. Often the technical limit produces a business
policy nobody had thought to state.

## Filling it honestly

- Invariants come from stated business rules, with attribution. Nothing else is an invariant.
- Throughput and size are estimates from people who know the volumes; `unknown` with a named owner
  beats a plausible number, because these numbers decide boundaries.
- Record the alternatives you rejected. The canvas is a record of a decision, and a decision without
  its alternatives is indistinguishable from a default.

## Sources — go and check

Every claim above is checkable at a primary source. When something here looks wrong for your domain,
read the source rather than trusting this file.

| Claim | Source |
|---|---|
| Canvas sections, working order, throughput & size charts | https://github.com/ddd-crew/aggregate-design-canvas |
| Invariant vs corrective policy; the credit-limit example | Kacper Gunia, *Modelling business rules: invariants vs corrective policies* — https://domaincentric.net/blog/modelling-business-rules-invariants-vs-corrective-policies |
| Canvas walkthrough on a worked aggregate | https://domaincentric.net/blog/modelling-aggregates-with-aggregate-design-canvas |
| Four rules; "whose job is it"; false invariant; the four exceptions to one-txn-per-aggregate; "domain experts are more comfortable with delayed consistency" | Vaughn Vernon, *Effective Aggregate Design* (3 parts, PDF) — https://www.dddcommunity.org/library/vernon_2011/ |
| "Provide repositories only for aggregate roots that actually need direct access"; keep an aggregate on one server | Eric Evans, *DDD Reference* — https://www.domainlanguage.com/ddd/reference/ |
| Domain events vs event sourcing (why the Size cell assumes ES) | https://www.innoq.com/en/blog/domain-events-versus-event-sourcing/ |
