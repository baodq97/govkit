# Worked example — 6-organise

**Input:** the equipment-rental model — nine contexts, of which `Allocation` is core (0.7 / 0.9 on
the chart) and `Invoicing` is a cost sink. Message flows show `Allocation` and `Logistics`
exchanging six messages in the transfer scenario, including an invariant spanning both. Org reality:
**11 engineers, 3 existing teams**.

**Reality check first:** 9 contexts, 11 engineers. Three teams, each owning several contexts. The
arithmetic rules out a team per context before anyone gets attached to the idea.

| Team | Contexts | Type | Why |
|---|---|---|---|
| Rental Flow | Allocation, Logistics | stream-aligned | they share the no-double-booking invariant; splitting them would create a permanent collaboration edge |
| Commercial | Invoicing, Pricing, Contracts | stream-aligned | one flow, one customer-facing outcome; Invoicing is contained, not extended |
| Foundations | (no domain contexts) Notifications adapter, CI, environments | platform | all three teams were solving deployment separately |

**Interaction modes read off the flows:** Rental Flow → Commercial is **X-as-a-Service** (one event,
`EquipmentAllocated`, stable contract). Rental Flow ↔ Foundations is **Facilitation**, ending when
the deployment pipeline is self-service — with a date on it.

**ISH on the Rental Flow boundary:** eight *yes*. Weakest answers: cost tracking (depot costs are
booked centrally) and data (utilisation data comes from Commercial's warehouse). Both are real
objections and both are fixable; recorded rather than averaged away.

**Findings:**

| Finding | Evidence | Suggested move |
|---|---|---|
| `Invoicing` is owned by two teams today | both teams have merged to it in the last quarter | single owner — Commercial; Rental Flow consumes via contract |
| Bus factor 1 on the allocation scheduler | one engineer holds the depot-constraint logic | pair rotation before any transfer work starts |
| Foundations would own `Notifications` domain logic | its adapter has grown business rules | the rules belong to Commercial; platform owns the delivery mechanism only |

Note what the example does **not** do: it does not propose nine teams for nine contexts, it does not
put names in the ownership table, and it does not merge `Allocation` and `Logistics` into one
context to make the topology tidy — the two stay separate contexts owned by one team, which is a
different and reversible decision.
