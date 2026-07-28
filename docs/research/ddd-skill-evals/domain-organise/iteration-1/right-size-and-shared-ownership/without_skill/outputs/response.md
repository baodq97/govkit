Wrote the proposal to `docs/domain/team-topology.md` (id `DOMAIN-ORG-0001`, `status: draft`, `owner: TBD`, matching the front-matter convention of the neighbouring domain docs). Summary below.

## Start from the arithmetic

9 engineers, 2 existing teams, 7 contexts. Seven contexts do not buy seven teams — a stream-aligned team needs roughly 5 people to hold both a backlog and an on-call rotation, so 9 engineers fund exactly two. You already have the right *number* of teams. The question is where the line between them falls.

Also worth noting before staffing anything: only **5 of the 7 contexts have a domain model**. Routing (3 tables, `aggregates: []`, "owns no rule of its own") and Notifications (2 tables, bought adapter) are adapters, not streams. Counting them inflates the problem by 29%.

## Cognitive load, measured from the models' own mass figures

| Context | Tables | Attributes | Aggregates |
|---|---:|---:|---:|
| Invoicing | 34 (45%) | 311 (51%) | 5 (56%) |
| Customs | 12 | 96 | 1 |
| Quoting | 11 | 78 | 1 |
| Booking | 9 | 54 | 1 |
| Consolidation | 5 | 41 | 1 |
| Routing | 3 | 17 | 0 |
| Notifications | 2 | 11 | 0 |
| **Total** | **76** | **608** | **9** |

Invoicing is 45% of the tables and 56% of the aggregates in the whole system. It is a team's worth of work by itself, which is most of the answer to your invoicing question.

One caveat on method: mass is a floor on cognitive load, not the whole of it. Consolidation looks small at 5 tables, but its model records that load planning still runs on a whiteboard in Gothenburg with four senior planners overriding the optimiser by hand. Reading it as "the small one" reads the wrong number.

## Proposal: keep two teams, cut once — between Customs and Invoicing

| Team | Eng | Contexts | Tables | Attrs | Aggregates |
|---|---:|---|---:|---:|---:|
| **Flow** (today's "Core Systems") | 5 | Quoting, Booking, Consolidation, Routing, Customs | 40 (53%) | 286 (47%) | 4 |
| **Billing** (today's "Customer") | 4 | Invoicing, Notifications | 36 (47%) | 322 (53%) | 5 |

Five contexts against two looks lopsided until you read the mass — it is 40/36 tables, and Billing carries the heavier per-engineer share (80 attributes/eng vs 57).

Why this seam:

1. **One cross-team edge only** — `DeclarationCleared`, already a one-way event with no shared write. Every other relationship on the context map becomes internal to a team.
2. **It follows the language fault line.** Hotspot #2 in your discovery timeline is finance and operations meaning different things by "consignment"; the models confirm it (`invoicing`: "a billable line on an invoice"; `booking`: "the goods a customer hands over as one unit"). Two genuinely different vocabularies belong to two teams, with the boundary between them.
3. **It puts the ConsignmentLine Shared Kernel inside one team** (below).
4. **It keeps the Routing/Customs ordering rule internal** — "a shipment cannot be handed to a carrier before its declaration is submitted" spans both. Split them and a safety rule becomes a cross-team release-ordering dependency.

### Booking and Consolidation stay together

`ConsignmentLine` is a Shared Kernel that both contexts write. Across a team boundary that is the most expensive relationship available: mutual consent on every change, coupled test suites, coupled release cadence. Two ways out — break the kernel into two models with a translation (real work), or put both contexts under one team (free). This takes the free one.

The invariant says the same. The no-overbooking rule is owned by Consolidation, but Booking does a *"synchronous remaining-capacity check before reserving"* — read, then commit, with a race in between. That is hotspot #1: two shipments in the same slot in March, nobody agreeing where the check belonged. The fix is to move the decision fully inside Consolidation so reserving succeeds or fails atomically. One-team refactor if they share a team; cross-team API negotiation if they do not. Splitting them would need to be justified against both the kernel and the invariant, and nothing in the repo justifies it.

### Rejected

- **Three teams (3/3/3)** — cuts the chain twice, doubling cross-team contracts, while dropping every team below on-call viability. Revisit around 12 engineers.
- **Turning "Core Systems" into a platform team** — the name invites it, the repo does not support it. Nothing here is a shared internal service; Notifications is a 2-table vendor adapter. A platform team would take 5 of 9 engineers off product flow to serve exactly one consumer.
- **Moving Quoting to the "Customer" team to preserve the names** — adds a second cross-team edge and loads the smaller team to 100 attributes/engineer against 42. Rename the teams instead; cheaper than moving the work.

### Rename both teams

"Core Systems" reads as a platform team to anyone who has not read the context map, and a platform team is the one thing 9 engineers cannot afford. "Customer" would own invoicing and notifications while the most customer-facing context, Quoting, sits elsewhere. Name each team after the slice of the value stream it owns.

## The invoicing mess is a boundary problem, not a code-review problem

**Finding: Invoicing has two owners, which means it has none.** It is the largest model in the system, the only one whose ubiquitous language contradicts another context's, eleven years old, with three of five aggregates existing only to model VAT across nine ports — and no owner recorded anywhere in the repo (`owner: TBD` on every document).

More code review will not fix this. Review adds latency to every change and still lets two vocabularies, two mental models and two competing designs land in one codebase. Shared ownership is what happens when a context has no owner and two teams each have a legitimate reason to change it. Only one of those reasons should survive.

- **Single owner: Team Billing.** It owns the finance vocabulary, and Invoicing is the bulk of its load by design.
- **Give Flow a contract instead of commit access.** Flow edits Invoicing today because there is no other route to a billing change. Replace that with a published input contract — `DeclarationCleared` plus a projection of the booking data Invoicing needs — so Flow's needs arrive as versioned requests, not commits into someone else's aggregate.
- **Enforce with CODEOWNERS, not a norm.** One entry per invoicing path resolving to the Billing team.

## Interaction modes

| Pair | Mode | Duration | End condition |
|---|---|---|---|
| Flow → Billing | **Collaboration** | Transition window, target 6 weeks | All three: (a) CODEOWNERS on invoicing paths resolves to Billing only; (b) zero Flow commits to invoicing paths for 3 consecutive weeks; (c) the Invoicing input contract is written down and versioned |
| Flow → Billing | **X-as-a-Service** | Ongoing after the window | — |
| Billing → Flow | **X-as-a-Service** | From day one | Billing consumes `DeclarationCleared`; no reason to change Flow's code |
| Flow → Partner Network (external) | **X-as-a-Service** (consumed) | Ongoing | Routing holds the anti-corruption boundary |

The Collaboration edge is time-boxed on purpose. Collaboration without an end date is how shared ownership gets re-established under a better name. If the window closes with the conditions unmet, re-scope the contract rather than extend the window.

Booking ↔ Consolidation appears in no row. That is the point — inside one team it is not an interaction mode, it is a refactor.

## Two things the topology cannot fix

**Invoicing is a commodity carrying 45% of the system.** `business-model.md` classifies it `commodity` / no differentiation, quoting the commercial director: *"nobody has ever chosen us because of our invoices."* The context map still labels it `core`. Three of its five aggregates model VAT across nine ports, which is what a bought tax engine does. Shrinking Invoicing is the highest-leverage move available for the 4-person team's load — a build-versus-buy decision deserving its own RFC. Same logic for Customs (12 tables, no differentiation, and its own model notes that two commercial platforms cover all nine ports and you integrate with neither). Together those two are 60% of the system's tables.

**Consolidation is labelled `supporting` and is your only differentiator.** It is the one capability marked `differentiation: yes`, backed by an 18% premium and the only numeric goal in the repo (fill 71% → 80%) — and it has the smallest model of any context that has one. Four of seven contexts are labelled `core` while the thing customers pay extra for is not among them, on a classification the context map admits has not been revisited since March. This proposal puts Consolidation on the larger team deliberately, but team assignment does not protect it inside a shared backlog. Give the fill-rate work a standing allocation and re-run the subdomain classification before the next planning cycle.

## Assumptions worth checking

- **"Both teams commit to invoicing"** comes from you, not from the repo — there is no code or history here to verify it. Cheapest check: `git log --format='%an' -- <invoicing paths> | sort | uniq -c`. If the split is 90/10 rather than 50/50, this is a cleanup rather than a re-org.
- **Team sizes 5 and 4** are given, with no seniority or on-call data. Confirm both teams can still staff a rotation after the cut.
- **Routing and Notifications may not be contexts at all** — 0 aggregates each. Likely an anti-corruption adapter belonging to Booking and an adapter attached to Invoicing. That would take the count to 5, and it is the Flow team's modelling call. No effect on this topology.

The proposal assigns contexts to teams and names no individuals — the repo has no roster, and mapping people to teams is your leads' call.
