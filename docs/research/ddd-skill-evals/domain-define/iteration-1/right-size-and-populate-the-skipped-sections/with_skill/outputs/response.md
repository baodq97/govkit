Bounded contexts defined for Nordic Freight before code. Seven canvases written as
`docs/domain/<context>/README.md` — one full, two medium, two light, two stubs.

## Right-sizing (and why the others got less)

| Context | Canvas | Why |
|---|---|---|
| **Consolidation** | **full** + interface critique + quality storming | The capability behind the +18% Guaranteed Consolidation premium (`business-model.md`: revenue-generator, custom-built, differentiation **yes**). `context-map.md` labels it `supporting` — that disagreement is a finding, not a reason to stub it |
| Booking | medium | Labelled core, and *contested*: it owns half of hotspot #1 (the March double-commit) and half of the `ConsignmentLine` shared kernel |
| Customs | medium | Compliance enforcer with one stated, attributed rule and an unexamined buy-vs-build question (two vendors cover all nine ports; we integrate with neither) |
| Quoting | light | Labelled core, but the commercial director's own rating is partial differentiation — *"competitors quote in seconds too; we are no faster"*. Nothing contested |
| Invoicing | light, **deliberately** | Biggest model in the repo (34 tables, 5 aggregates) and labelled core, on the capability rated commodity / no differentiation — *"nobody has ever chosen us because of our invoices."* Sizing a canvas by table count is how a commodity eats the differentiator's modelling budget |
| Routing | stub | `model.yaml`: *"owns no rule of its own."* Swimlane shows in → no decision → out |
| Notifications | stub | Bought adapter, no aggregates, commodity |

Four of the seven contexts are labelled `core` in the context map. I carried those labels by citation
and did not re-derive a single one — but I right-sized against the `business-model.md` evidence, and
recorded every disagreement as a finding for `domain-strategize`.

## What the skipped sections turned up

**Assumptions** (all labelled inferred, none previously written down): volume, not weight, is the
binding constraint — Booking captures `weightKg` and `hazardClass` per line and neither reaches
Consolidation's model; a container is never re-planned after sealing; a reserved slot is never
released for a fuller stack; the optimiser stays advisory while planners keep resolving stacks on the
Gothenburg whiteboard. Three `model.yaml` invariants (Booking's "confirm only after reserve",
Quoting's validity window, Invoicing's "line must reference a cleared declaration") have **no source
in discovery**, so they are recorded as assumptions, not business decisions.

**Verification metrics** — each with a named source: change coupling between `consolidation/` and
`booking/` (CI/VCS), the `GetRemainingCapacity`:`ReserveCapacity` ratio (telemetry, needs
instrumenting), double-commit incidents (tracker, baseline 1 from March), fill rate at seal
(production, `ContainerSealed.fillRate`, against the 71% → 80% goal), tables added per new port for
Invoicing's VAT model and Customs' port model (VCS against the port rollout). Planner manual
overrides is the honest failure: **not collectable today** — the overrides happen on a whiteboard.

**Open questions** — seven on Consolidation, four of which would change the aggregate. Stated
plainly on the canvas: this design is not ready to build, it is ready for one more session with a
planner and the customs clerk.

## Interface critique — what it caught

- `GetRemainingCapacity` (query) then `ReserveCapacity` (command) is check-then-act across a
  boundary. It should be **one command Consolidation accepts or rejects**; the window between the two
  is exactly the March double-commit, and hotspot #1 says nobody agrees where the check belongs.
- `ContainerSealed` ships `fillRate` — Consolidation's own KPI — to Customs, which needs the sealed
  consignment set instead. Internals as contract.
- `ConsignmentLine` is a shared kernel that Booking and Consolidation both write, while the word
  underneath it means three different things (goods handed over / physical stack / billable line).
- **No context can enforce the one stated compliance rule**: "a shipment cannot be handed to a
  carrier before its declaration is submitted" lives in Customs, the handover lives in Routing, and
  the two have no relationship in the context map.

Perturbations run and recorded, including the rejected one: moving capacity into Booking removes a
round trip but hands the Guaranteed Consolidation invariant to a context that does not own
containers. Recommended instead — take `ConsignmentLine` out of the shared kernel, put the optimiser
behind an internal port, drop `fillRate` from `ContainerSealed`.

## Findings routed elsewhere (19, none acted on here)

Classification conflicts (F1, F8, F11, F15) → `domain-strategize`. Interface and flow defects (F2,
F5, F6, F17, F19) → `domain-connect`. Model deltas (F3, F4, F9, F12, F14, F16) → `domain-decompose`,
which owns `model.yaml`. Missing evidence (F7, F10, F13, F18) → `domain-discover` — the largest of
these being **F13: no context owns the +18% premium**, the repo's only differentiating revenue
stream.

Not done on purpose: no boundary redrawn, no label re-classified, no business rule invented, and
`docs/domain/message-flows/` does not exist — so the inbound message *names* on Consolidation and
Booking are reconstructed from model notes, and the canvases say so. Tracing that flow is the
cheapest next step before anyone writes an endpoint.
