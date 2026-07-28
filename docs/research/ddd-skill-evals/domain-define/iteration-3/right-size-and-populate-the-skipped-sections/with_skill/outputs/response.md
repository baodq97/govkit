# Nordic Freight — bounded contexts defined

Seven canvases written to `docs/domain/<context>/README.md`. None existed before — `3-decompose`
left `model.yaml` in every context directory and no README anywhere, so these are new files, not
delta-merges.

**Headline: do not start building yet.** The two upstream artifacts disagree about which contexts
are core, and the disagreement is an inversion, not a rounding error.

## Right-sizing — three tiers, not seven canvases

| Context | Tier | Lines | Why |
|---|---|---|---|
| Consolidation | **full canvas** + interface critique | 174 / 180 | the only capability `business-model.md` marks as differentiating (revenue generator, custom-built) |
| Booking | light | 90 / 90 | contested: no capability row exists for it at all, and it shares a written entity with Consolidation |
| Customs | light | 90 / 90 | compliance enforcer, product stage, does not differentiate — but holds a stated rule and a real invariant |
| Quoting | light | 86 / 90 | engagement creator, product stage, *partial* differentiation |
| Invoicing | **stub** | 35 / 35 | commodity, does not differentiate — despite being the largest model in the repo |
| Notifications | stub | 33 / 35 | generic, bought adapter |
| Routing | stub | 32 / 35 | supporting, no aggregates, "owns no rule of its own" |

Invoicing is the deliberate call. It carries 34 tables, 311 attributes and a 128-attribute entity,
and `context-map.md` calls it core because it is "the largest and most business-critical system we
run". That is an argument from mass, not from strategy; `business-model.md` stages the same
capability as a non-differentiating commodity. It gets a stub, and the buy-vs-build question gets
written down instead.

## The finding that outranks the canvases

`business-model.md` and `context-map.md` + `model.yaml` classify four contexts differently, and the
fork points the same way each time:

- **Consolidation** — the one differentiating, custom-built, revenue-generating capability — is
  declared `supporting`, "back-office load planning".
- **Invoicing** (commodity), **Customs** (product, compliance) and **Quoting** (product, partial)
  are all declared `core`.
- **Booking** is declared `core` with **no capability row upstream at all**.

`context-map.md` says outright that the classification "has not been revisited since the first
modelling session in March". I did not re-classify anything — every canvas carries both values with
their sources and marks the facet contested. Resolving it belongs to `5-strategize` / `3-decompose`.
Right-sizing above follows the business-model reading, because differentiation is the test for core.

## What the canvases surfaced

**The March double-commit has a structural explanation.** Booking performs a "synchronous
remaining-capacity check before reserving" — a query and then a command over the same state, leaving
a read-then-write window between them. Interface critique question 2 says that should be one command
Consolidation accepts or rejects. The incident is reachable with no concurrency bug in the code.

**The declared Shared Kernel has already diverged.** `context-map.md` says Booking and Consolidation
both write `ConsignmentLine`. Booking's carries `weightKg` and `hazardClass`; Consolidation's carries
`stackable` and neither of those. So Consolidation plans on volume alone — which is now written down
as an inferred assumption where somebody can knock it down, rather than discovered by a lane where
weight binds first.

**Two contexts claim the same invariant.** Booking's "may only be confirmed once capacity has been
reserved" and Consolidation's "committed volume must never exceed capacity" both imply ownership of
the slot check. Both cannot own it; that is hotspot #1, still unresolved.

**Nobody owns two whole questions.** A carrier refusing a sealed container (hotspot #3) is claimed by
no context — Routing "owns no rule of its own" and Consolidation's boundary ends at `ContainerSealed`.
And nothing enforces the customs clerk's rule (no handoff before a declaration is submitted) at the
point where the handoff actually happens, which is Routing.

**Perturbation, run and recorded.** Moving `ConsignmentLine` out of the Shared Kernel — Booking keeps
its own, passes volume + stackable in the reserve command — costs a duplicated line concept and buys
an invariant enforceable inside one aggregate. The alternative (moving the capacity invariant into
Booking) was tried and rejected: every future context that commits volume would re-implement it.

## What I did not fill in

- **No message flows exist on disk.** Every inbound/outbound table is marked *not traced* and derived
  from `model.yaml` relationships plus the discovery timeline. Relationship columns carry direction
  only — the one context-mapping pattern stated anywhere is the Shared Kernel. Run `4-connect` before
  treating any of these as contracts.
- **Only three business rules were ever stated**, all on 2026-05-25, and they are the only rules on
  the canvases with attribution. Invariants carried from `model.yaml` are labelled as modelling
  claims, not elicited rules. Everything else I could infer sits under *assumptions*, labelled.
- **Two of four quality attributes on Consolidation are `unknown`** with a named person who could
  supply the number, rather than an invented SLA.
- **Thirty-five open questions across seven contexts, nine of them on Consolidation.** That count is
  the read on confidence: the context the business model calls the differentiator is not ready to
  build against.

## Verification metrics (collectable, with sources)

- PRs touching both `consolidation/` and `booking/` — prediction **< 25% by 2026-10-31**, from VCS.
  Above that, the Shared Kernel is the real boundary and these are one context.
- Double-commit incidents after the invariant moves inside `ContainerLoad` — **0 in 6 months**, from
  the incident tracker.
- Capacity queries : `CapacityReserved` events ratio, from production telemetry — a high ratio means
  Booking is doing planning it should delegate.
- Planner manual overrides per week vs the pre-build whiteboard baseline, from the depot's own log.
  **That baseline has not been measured** — it needs taking before build, not after.

## Before code

1. Resolve the core/supporting fork (needs whoever owns the product, not just engineering).
2. Decide where the slot check lives, and collapse the check-then-reserve pair into one command.
3. Decide whether `ConsignmentLine` is one concept or two.
4. Run `4-connect` to trace the flows, then re-open the interface sections.
5. Get a customer into the next session — none attended on 2026-05-25, and Guaranteed Consolidation
   is a customer promise currently described entirely second-hand.
