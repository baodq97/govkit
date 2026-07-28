# Nordic Freight — bounded contexts defined (Bounded Context Canvas v5 + Quality Storming)

Seven contexts, seven canvases in `docs/domain/<context>/README.md`. None existed before —
`3-decompose` left only `model.yaml` per context, so these are new files and **no `model.yaml` was
modified**; every delta is proposed to its owning step instead.

## 1. Right-sizing — what got depth, and why

Depth was set by the capability classification in `business-model.md` (the `1-understand` input),
because `5-strategize` has not run and there is no `core-domain-chart.md`.

| Context | Depth | Lines | Why |
|---|---|---|---|
| **Consolidation** | full canvas + interface critique + perturbation experiments | 178 | the **only** capability rated `differentiation: yes` — the Guaranteed Consolidation premium is what customers pay for |
| Booking | supporting | 90 | commits the money, but has **no capability row at all** upstream; depth reflects the uncertainty |
| Quoting | supporting | 89 | engagement-creator, product, differentiation *partial* — "competitors quote in seconds too" |
| Customs | stub | 35 | compliance-enforcer, product, differentiation **no**; two commercial platforms already cover all nine ports |
| Invoicing | stub | 35 | compliance-enforcer, **commodity**, differentiation **no** — *"nobody has ever chosen us because of our invoices"* |
| Routing | stub | 35 | no aggregate, no rule of its own (`model.yaml`) — a pass-through |
| Notifications | stub | 35 | generic, bought adapter, no domain model |

Ratio core:stub ≈ **5:1**. The uncomfortable call is Invoicing: it is the largest thing in the
business (34 tables, 311 attributes, 51% of all modelled mass) and it got 35 lines. Size is not
differentiation. Modelling it deeply would spend the most effort on the capability the business says
nobody chooses it for; the mass is the argument for **replacing** it, not for deepening it.

## 2. The finding that outranks the canvases: the classification is contradictory

`context-map.md` labels 4 of 7 contexts `core`. `business-model.md` says only one capability
differentiates — and it is one of the three labelled `supporting`/not-core. Verbatim conflicts:

| Context | `context-map.md` / `model.yaml` | `business-model.md` |
|---|---|---|
| Consolidation | `supporting`, "back-office load planning" | revenue-generator, custom-built, **differentiates: yes** |
| Invoicing | `core`, "largest and most business-critical" | commodity, **differentiates: no** |
| Customs | `core`, "regulated, mistakes are expensive" | product, **differentiates: no** |
| Quoting | `core`, "first thing the customer sees" | product, **partial** |
| Booking | `core`, "where the money is committed" | **no capability row exists** |

Per doctrine I did **not** re-classify anything: each canvas carries both readings with sources and
raises it as an open question for `5-strategize`. `ddd_check` independently flags the same four as
HIGH (`classification-mismatch`, `too-many-core`, `investment-mismatch`, `under-invested-core`).
Note the pattern in the three `core` justifications above — largest, riskiest, most visible. None of
them is a differentiation argument. That is one classification error made four times, and it is
worth fixing *before* anyone writes code, because it decides build-vs-buy on Invoicing and Customs.

## 3. What the canvases surfaced on Consolidation (the core)

- **The premium is unmodelled.** Nothing in `Consolidation` records which reservations carry the
  Guaranteed Consolidation slot, so the context that exists to keep the promise cannot see it.
- **Interface critique Q2:** Booking does a synchronous capacity *query* and then a separate write.
  That read-then-write window across a boundary is exactly the shape that produced hotspot #1 (two
  shipments committed to the same slot in March). It should be one command, accepted or rejected.
- **Interface critique Q4:** `ConsignmentLine` is a Shared Kernel both contexts write, carrying
  Booking's `weightKg`/`hazardClass` and Consolidation's `stackable` — internals leaking both ways.
  Perturbation experiment: moving it wholly into Consolidation collapses the strongest coupling on
  the map to customer/supplier, at the cost of a round trip on line edits. Proposed to `3-decompose`.
- **No rejection path exists anywhere** — the capacity invariant is stated, but no message, event or
  rule represents a refusal.
- **Language:** the event says `CapacityReserved`, the invariant says *committed* volume. Two states
  or one is undecided, and an expiry rule may be missing.

## 4. The three sections that usually get skipped — populated

- **Assumptions:** 20 across the seven canvases, every one labelled `inferred` with domain/behaviour
  split. The load-bearing ones: volume (not weight) is the binding constraint; a sealed container is
  never reopened; the optimiser stays advisory; the premium lives *somewhere* in quote→invoice.
- **Verification metrics:** every canvas has at least one falsifiable prediction with a source and a
  review date (2026-10-28 / 2027-01-28) — change coupling from CI/VCS, planner override counts and
  fill rate from production, refused-capacity rate, regulator-driven-change share from tracker
  labels. No metric without a collection source.
- **Open questions: 37 in total, 9 on the core context.** That count is the headline finding — the
  Consolidation boundary is **not ready to build**. No customer has attended any session, and the
  rules of the premium itself are among the gaps.

## 5. Quality storming — what would change the model

Run on Consolidation only (quality demands are local). Two of five attributes change the domain
model rather than the runtime:

- **Concurrency** — "two bookings must never commit the same slot" is an invariant, therefore an
  aggregate boundary: the check belongs inside the `ContainerLoad` transaction. (planner, hotspot #1)
- **Availability** — Booking's synchronous dependency means a Consolidation outage stops all booking
  confirmation. Nobody has stated a tolerance; if one exists, provisional reservation enters the model.
- **Auditability** — retention for sealed-container evidence is unknown; the customs clerk can supply
  it, and above operational need history becomes domain state rather than a log.

Three of five attributes have **no number**. Recorded as unknown with the person who could supply
each, rather than invented.

## 6. Provenance limits you should know about

- **`4-connect` has not run.** No message flow is traced anywhere in the repo. Every inbound/outbound
  row is carried from the discovery timeline, `model.yaml` relationships or `context-map.md`, with a
  Source column; anything I derived is marked *inferred*. **No relationship type is recorded on disk
  except the one Shared Kernel** — every conformist/customer-supplier label is a proposal.
- **No commands exist on disk.** The timeline records eleven events; every command in these canvases
  is inferred from an event or a relationship note.
- Two events have **no recorded consumer** (`BookingRequested`, `ShipmentHandedToCarrier`), and
  `CustomerNotified` is a candidate nobody confirmed.
- No customer attended any session; the "what customers value" rows are the commercial director
  speaking as proxy.

## 7. Recommended next moves

1. **`5-strategize` first** — resolve core vs supporting for Consolidation, Invoicing, Customs,
   Quoting. It gates build-vs-buy on the two biggest contexts and it is a one-session decision.
2. **Then `4-connect`** — trace the real flows so the interface sections stop being inferred.
3. **Then re-open Consolidation** with a planner and, for the first time, a customer: the premium's
   rules, the rejection path, and reserve-vs-commit.
4. Do **not** start building Consolidation on nine open questions.
