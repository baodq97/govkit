Team topology written to `docs/domain/team-topology.md` (id `DOMAIN-ORG-0001`, alongside the existing context map).

**Caveat up front:** the repo has no headcount, team list, seniority mix, or ownership record anywhere. The topology below is derived from the domain model alone, so it commits to the *shape* — which contexts group together and where the seams fall — and treats team *sizes* as a decision table over headcount. Four missing inputs are listed in the doc.

## The finding that drives everything

Staffing in proportion to code mass would put half of engineering on the capability the business says nobody buys.

| Context | Tables | Attrs | Share | Business model says |
|---|---:|---:|---:|---|
| Invoicing | 34 | 311 | **51%** | *"nobody has ever chosen us because of our invoices"* |
| Customs | 12 | 96 | 16% | no differentiation, *"two vendors already do it well"* |
| Quoting | 11 | 78 | 13% | partial — *"we are no faster"* |
| Booking | 9 | 54 | 9% | where the money is committed |
| Consolidation | 5 | 41 | **7%** | **the +18% premium**, the depot network, the planning know-how |
| Routing | 3 | 17 | 3% | *"the partner network is the asset, not the routing step"* |
| Notifications | 2 | 11 | 2% | bought adapter |

Consolidation is 7% of the system, one aggregate, and holds the only invariant the company sells against (committed volume ≤ capacity). The short-horizon goal — fill 71% → 80% — lives entirely inside it, and it is still run partly on a whiteboard by four senior planners. So capacity gets allocated deliberately **against** mass.

Also: don't size teams from `context-map.md`'s `subdomain_type` column. It marks 4 of 7 contexts `core`, Invoicing `core` and Consolidation `supporting` — contradicting the business model on every row that matters, and untouched since March.

## Five teams (four stream-aligned, one thin platform)

1. **Flow & Capacity** — Consolidation + Routing. 8 tables / 58 attrs. The differentiator team: formed first, staffed best, measured on fill rate. Owns the no-overbooking invariant exclusively. Routing joins here rather than Booking because hotspot 3 records that *nobody knows who is responsible when a carrier refuses a sealed container* — putting sealing and hand-off in one team closes that gap by construction.
2. **Sell & Commit** — Quoting + Booking. 20 / 132. One customer conversation, one team.
3. **Compliance** — Customs. 12 / 96. Separate because its change trigger is a regulator's calendar across nine jurisdictions — a real fracture plane. Standing mandate: evaluate the two commercial platforms and shrink.
4. **Billing** — Invoicing (+ Notifications until a platform exists). 34 / 311. Deliberately capped, mandate is *reduce*: rating engine + ledger, VAT variation as config instead of three aggregates. Capping this is what frees the people for Flow & Capacity. Risk: capping a large legacy codebase raises defect risk first — cap feature work and fund the reduction, don't just remove people.
5. **Platform** — Notifications, `ShipmentRef`, event transport, partner-network surface. Don't create below ~25 engineers.

No complicated-subsystem team. The four senior planners embed with Flow & Capacity in **facilitating** mode with an end date, so the know-how lands in the model instead of the whiteboard.

## The one interaction that must change

Sell & Commit ↔ Flow & Capacity is currently unbounded **collaboration**: `ConsignmentLine` is a shared kernel both teams write, and Booking reads remaining capacity then commands a reserve. Target **X-as-a-Service** — Consolidation exposes one `ReserveCapacity` that decides and answers; Booking stops reading capacity. Time-box the collaboration to one quarter; it's the only collaboration permitted in this topology. That is also the answer to hotspot 1 (two shipments, same slot, *"nobody agrees where the check should have happened"*) — a shared kernel has no single owner for an invariant.

Everything else is X-as-a-Service over the existing events. Hotspot 2 (*consignment* means different things in finance vs ops) is not a defect: it's evidence Billing and Flow & Capacity are correctly separate. Translate at the seam, keep both meanings.

## Sizing without headcount

| Engineers | Teams | Grouping |
|---|---|---|
| under ~10 | 2 | Flow (Consolidation, Routing, Booking) · Commerce & Money (rest) |
| ~10–18 | 3 | Sell & Commit · Flow & Capacity · Money & Compliance |
| ~18–25 | 4 | split Compliance out |
| ~25+ | 5 | full topology + Platform |

Flow & Capacity is formed first at every size. If there aren't enough people for it to be a real team, that's the finding to escalate — the company isn't staffed to defend what it charges a premium for.

**Rejected:** a team per bounded context (Routing and Notifications can't carry a team, and it freezes boundaries the model says are wrong); staffing proportional to mass; a Consolidation complicated-subsystem team (separates the optimiser from the planners who correct it); a shared "core domain" team over Booking + Consolidation (preserves the shared kernel).

**Falsifiers** are listed in the doc — chiefly: if Consolidation is already automated, or if Invoicing has a contractual floor, the capacity split changes.
