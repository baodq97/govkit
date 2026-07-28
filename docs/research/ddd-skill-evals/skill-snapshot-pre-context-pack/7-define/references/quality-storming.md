# Quality Storming — eliciting the qualities that shape a domain model

Adapted from Michael Plöd's *Quality Storming*. The idea: run the same collaborative, sticky-note
format as EventStorming, but for **quality attributes** — and run it while the design is still soft.

## Why this belongs in Define, not later

Most quality requirements are infrastructure decisions and can wait: instance sizes, caching,
connection pools. A minority of them **change the domain model itself**, and those are the reason
this step sits here rather than in a later performance review:

| Quality demand | What it does to the model |
|---|---|
| "This must keep working when the other system is down" | forbids a synchronous dependency — the read model or the data moves inside the boundary |
| "We must be able to prove what the state was on any past date" | history becomes a first-class domain concept (events, versions, effective dates), not a log table |
| "Two people must never be able to commit the same slot" | an invariant, and therefore an aggregate boundary — not a database constraint bolted on later |
| "Regulators require seven-year retention with legal hold" | may promote a cross-cutting capability into a bounded context of its own |
| "A quote must be produced in under 300ms" | may force pre-computation, which introduces a staleness rule the business has to state |

Each of these is discovered in production if it is not discovered here, and by then the model has
hardened around the wrong assumption.

## How to run it

1. **One context at a time.** Quality demands are local; a system-wide "must be fast" is not
   actionable.
2. **Ask about failures, not attributes.** "What must never happen here?", "What have we been
   paged for?", "What would a customer complain about first?" — the same reason discovery asks what
   goes wrong: qualities hide inside incident stories, not inside the word *availability*.
3. **Attach a number, or mark it unknown.** "Fast" is not a requirement. *"A planner will not wait
   more than two seconds for a fill proposal"* is. `unknown` is a legitimate value and better than
   an invented SLA — but record who could supply it.
4. **Name the source.** A quality attribute someone asserted in the room and one that comes from a
   contract or a regulation are different kinds of fact, and they survive scrutiny differently.
5. **Separate what changes the model from what does not.** Two lists. The first goes on the canvas
   and into the aggregate design; the second goes to whoever owns the runtime, and stops cluttering
   the domain conversation.

## Prompts worth asking per context

- **Correctness under concurrency** — what must never happen when two people act at once? (This is
  the question that produces invariants, and therefore aggregate boundaries.)
- **Availability** — what must keep working when a neighbour is down? What may degrade, and how?
- **Latency** — who is waiting, and for how long before they give up or call someone?
- **Consistency** — where is stale data acceptable, and for how long? Who decides that — the
  business, or an engineer guessing?
- **Auditability** — what must be reconstructible later, and for whom?
- **Security and privacy** — what data here is regulated, and does that constrain where it can live?
- **Volume and growth** — how many of these exist today, and in two years? (Feeds the aggregate
  throughput and size sections in `8-code`.)
- **Change cadence** — how often do the rules here change? A context whose rules change weekly needs
  a different design than one that has been stable for a decade.

## Recording them

On the canvas:

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | — | planner, 2026-05-25 | **yes** — invariant, aggregate boundary |
| Latency | fill proposal shown while the planner is on the call | < 2s p95 | planner | no — caching/pre-compute |
| Auditability | prove which consignments were committed to a sealed container | 7 years | customs clerk | **yes** — history is domain state |

The last column is the one that earns the exercise. It routes each finding to the right place, and
it keeps the domain conversation from being flooded with runtime concerns that belong elsewhere.

## Sources

- Michael Plöd, *Quality Storming*.
- ddd-crew, *DDD Starter Modelling Process* — Define step, "start to consider the technical
  limitations so that you can uncover constraints or opportunities".
