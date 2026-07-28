# Coupling heuristics — reading a message flow back

A drawn flow is only half the work. This is the catalogue for step 3: what to look for, what it
usually means, and the boundary move that resolves it.

**Use it as a checklist, not a verdict machine.** Every one of these smells is legitimate in some
domain. The output of the check is a *finding with evidence* — the message numbers that show it —
which a human then accepts or declines. A smell reported without message numbers is an opinion
wearing a table.

## The catalogue

### 1. Synchronous query chain across boundaries

**Looks like:** messages 2, 3, 4 are queries hopping A → B → C before the actor gets an answer.

**Costs:** availability multiplies (three contexts at 99.9% give the scenario 99.7%), latency
accumulates, and every downstream deploy becomes an upstream risk.

**Usually means:** the data needed to decide is on the wrong side of the boundary.

**Moves, cheapest first:** have the upstream context publish the fact as an event and let the
downstream keep its own read model · move the decision to where the data already is · if neither
works, the two contexts may be one.

### 2. Check-then-act across a boundary

**Looks like:** a query asking "is X allowed / available?" followed later by a command doing X, with
the boundary crossed in between.

**Costs:** the gap between the two messages is a race. Whatever the query established can be untrue
by the time the command lands.

**Usually means:** the invariant belongs to the context being asked, not the one asking.

**Move:** collapse the pair into one command the owning context accepts or rejects. The rejection is
part of the domain — name it (`ReservationRejected`), do not treat it as an error code.

This is the single most common finding in practice, and the one static context maps never show.

### 3. Distributed invariant

**Looks like:** one business rule whose enforcement is split — one context holds the data, another
performs the check, or two contexts each hold part of the state the rule constrains.

**Costs:** the rule is unenforceable under concurrency, and the failure is silent and rare enough to
reach production.

**Usually means:** either the rule belongs to a single aggregate in a single context, or the
business genuinely accepts eventual consistency.

**Move:** ask the business which. If they accept eventual consistency, the compensating action is
part of the model and must be named (*"we double-book roughly once a month and dispatch a
replacement unit"*). An unnamed compensation is not eventual consistency; it is an unhandled bug.

### 4. Cycle within one use case

**Looks like:** A → B → A inside a single scenario.

**Costs:** temporal coupling — neither context can complete alone, so they deploy, fail and get
reasoned about together.

**Usually means:** the responsibility is in the wrong place, or the two are one context.

**Move:** find the decision at the centre of the cycle and give it to one side. Cycles *between*
use cases are fine and normal; a cycle *within* one scenario is the signal.

### 5. God context

**Looks like:** one context participates in every flow, usually receiving and forwarding.

**Costs:** it becomes the bottleneck for change; every team waits on the team that owns it.

**Nuance — this one is over-diagnosed.** Orchestration is a legitimate domain responsibility: an
`Ordering` context that decides *what happens next* is doing real work. The test is whether it
**decides** anything. A context whose messages are all "received X, sent X onward" is a hop.

**Move:** push the decision into the contexts that own the data, or, if the coordination genuinely
is the business capability, keep it and say so explicitly on the map.

### 6. Pass-through

**Looks like:** message in, structurally similar message out, no decision, no state change.

**Usually means:** a boundary drawn around a technical layer rather than a business capability.

**Move:** delete the hop; let the sender talk to the real recipient.

### 7. Chatty pair

**Looks like:** two contexts exchange five or more messages inside one scenario, more than either
exchanges with anyone else.

**Usually means:** high cohesion the boundary is cutting through.

**Move:** consider merging them, or move the chatty part of one into the other. Check the other
flows first — a pair that is chatty in one scenario and silent in four is fine.

### 8. Message carrying another context's model

**Looks like:** a message whose contents are eleven fields that mirror the sender's internal
entity.

**Costs:** the receiver now depends on the sender's model shape, not on a contract. This is Shared
Kernel coupling arriving by stealth through a payload.

**Move:** reduce the contents to what the receiver's decision actually needs, and label the message
as Published Language on the context map. If the receiver needs the whole entity, ask why the
decision is not on the sender's side.

### 9. Event used as a disguised command

**Looks like:** an "event" named for what the receiver should do next (`InvoiceShouldBeIssued`), or
an event with exactly one consumer that must handle it or the scenario fails.

**Costs:** the coupling of a command with the traceability of an event — the worst of both. The
sender depends on the receiver but nothing in the design says so.

**Move:** if the sender requires the action, make it a command and accept the visible dependency. If
it genuinely does not care, rename the event for the fact that happened (`TransferCompleted`).

### 10. The clean flow

**Looks like:** four to seven messages, mostly events, no queries crossing boundaries, each context
making one decision it owns.

Record it. Evidence that a boundary works is as valuable as evidence that it does not, and it
prevents the next reviewer from re-litigating the same split. A findings table with the honest
entry *"no coupling smells — three contexts, all event-driven"* is a complete result.

## Counting checks worth running

Cheap, mechanical, and they catch what the eye misses on a busy diagram:

| Count | Threshold worth a look | Why |
|---|---|---|
| messages per flow | > 9 | see the 5-to-9 rule |
| distinct contexts per flow | > 4 | one capability fragmented across too many owners |
| queries crossing a boundary | > 0 | every one is a runtime dependency; justify each |
| messages between the busiest pair | ≥ 5 in one flow | chatty pair |
| flows a single context appears in | all of them | god-context candidate |
| longest synchronous chain | > 2 hops | availability and latency multiply |

Thresholds are prompts to look, not rules to enforce. Report the number alongside the finding so
the reader can judge for themselves.

## Sources

- ddd-crew, *Domain Message Flow Modelling* — the practice of challenging a decomposition with
  concrete use cases.
- Eric Evans, *Domain-Driven Design* — aggregates as consistency boundaries (the distributed
  invariant move); Shared Kernel and Published Language.
- Vaughn Vernon, *Implementing DDD* — one aggregate per transaction; eventual consistency between
  aggregates requires a named business compensation.
