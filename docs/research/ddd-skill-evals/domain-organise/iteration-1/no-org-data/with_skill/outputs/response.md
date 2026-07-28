Wrote `docs/domain/team-topology.md` (`status: draft`, `owner: TBD`). It is a proposal to argue with, not an allocation — and it is blocked on three questions.

## Blocking first: the repo has no org data

Nothing in `docs/` states headcount, existing teams, or who knows what. So **every ownership row is marked `proposed — unstaffed`**, and I need:

1. How many engineers work on this system?
2. How many teams exist today, and which contexts does each touch?
3. What does each team already know — which of the seven contexts has someone who could take it on Monday?

A topology without those is a template. Also missing: `core-domain-chart.md` (placement unknown) and `message-flows/` (so interaction modes are inferred from the context map and the discovery timeline, not measured).

## The number that decides the topology

| Context | Tables | Attributes | Aggregates | Differentiation |
|---|---:|---:|---:|---|
| Invoicing | 34 | 311 | 5 | **no** — *"nobody has ever chosen us because of our invoices"* |
| Customs | 12 | 96 | 1 | no — two vendors already do it well |
| Quoting | 11 | 78 | 1 | partial |
| Booking | 9 | 54 | 1 | — |
| Consolidation | 5 | 41 | 1 | **yes** — the +18% premium |
| Routing | 3 | 17 | 0 | no |
| Notifications | 2 | 11 | 0 | no |

**Invoicing is 45% of the tables and 51% of the attributes for the capability with zero differentiation. Consolidation, the one you charge a premium for, is 7% of the tables.** Staff this model as written and roughly half your engineers work on invoices — Conway will deliver that faithfully. Fixing the model is cheaper than fixing the org afterwards.

## Proposed shape — three stream-aligned teams

Split on fracture planes that already exist in the material: the shipment stream, regulatory cadence, and cash.

| Team | Contexts | Intrinsic load | Verdict |
|---|---|---|---|
| **Flow** | Quoting, Booking, Consolidation, Routing | 28 tbl / 190 attr / 3 agg | Fits on paper — but its differentiating asset is a whiteboard in Gothenburg and four senior planners, not code. It would own the context without owning the capability |
| **Clear** | Customs | 12 tbl / 96 attr / 1 agg | Fits; the real question is whether it should exist at all |
| **Cash** | Invoicing, Notifications | 36 tbl / 322 attr / 5 agg, densest entity **128 attributes** | **Over budget.** 53% of the system's attributes, zero differentiation. Expect bus factor 1 here first |

No platform team (no deploy/on-call evidence in the repo — absent, not negative). No complicated-subsystem team: fill optimisation is a knowledge problem today, not a specialist-maths one; I recorded the condition that would flip it.

**Headcount sensitivity:** ≥15 engineers → three teams. 10–14 → two teams (Flow + Settle), and Settle carries 418 attributes of non-differentiating model, so it only works if Invoicing shrinks or Customs is bought. Under 10 → one team on Flow, and Customs plus Invoicing must be bought rather than staffed. That last one is a strategy consequence to say out loud, not a topology choice.

## Interaction modes (inferred — no message flows in the repo)

- **Flow ↔ Clear — Collaboration, ends Q4.** The invariant *"no carrier handoff before the declaration is submitted"* is declared in Customs but enforced at Routing's handoff — it spans two teams. Ends when Routing consumes `DeclarationSubmitted` as a precondition. If it cannot be closed, the boundary is wrong.
- **Consolidation → Customs, Customs → Invoicing — X-as-a-Service.** One event, one direction each.
- **All three teams — an unscheduled collaboration on `ShipmentRef`**, a shared building block across four contexts with no owner. Give it a Published Language owner before the second team is staffed.
- **Flow → Partner Network and Tariff Data — X-as-a-Service over Conformist.** Comfortable interaction, no leverage underneath; hotspot #3 is what that looks like in practice.

## Findings worth acting on

1. **Booking and Consolidation must stay in one team.** They share `ConsignmentLine` as a Shared Kernel (both write it) and Booking does a synchronous capacity check against an invariant Consolidation owns. Split them and you institutionalise a permanent collaboration edge. One team hides the race, though — the check-then-act still goes to `domain-connect`.
2. **The differentiator is labelled `supporting`.** Consolidation earns the premium and is classified back-office; Invoicing is `core`. That is a `domain-strategize` fix, but it matters here because a supporting label buys a back-office team and Conway makes it stick. I placed Consolidation with the strongest expected staffing regardless.
3. **Routing is not a team boundary** — transaction script, no aggregates, no rules. A separate owner buys a handoff for zero decision.
4. **Both commodity contexts are already commoditised in the market.** Two customs platforms cover all nine ports and you integrate with neither; invoicing is a mature SaaS category. A buy on either removes a whole team from this proposal — cheaper than hiring, and it directly answers the headcount question.
5. **ISH inverts on two of three boundaries.** Cash and Clear score well as services *to buy*, not as boundaries to staff. Flow's weakest answers are concrete: nobody owns the P&L so the team could not tell whether the premium is profitable, and Booking/Consolidation need coordinated releases today.

## Decisions that need people, not a document

Headcount and team inventory (engineering lead — blocks everything); is Consolidation core (commercial director + product); buy or build Customs; shrink Invoicing's three VAT aggregates onto a tax engine — noting there is no P&L owner, so the cost case currently has nobody to make it; who owns `ShipmentRef`; who owns the carrier-refusal path.

**Not consulted:** no customer at any point, no engineer outside the three from the May sessions, and no team — because no team is known to exist in the repo. No named individuals appear anywhere in the proposal; it describes a shape, and who joins which team needs consent this document does not have.
