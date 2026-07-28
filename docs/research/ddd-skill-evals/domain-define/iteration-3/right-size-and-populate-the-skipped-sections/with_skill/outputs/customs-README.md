<!-- id: DOMAIN-BC-0003 · status: draft · owner: TBD · 2026-07-28 -->

# Customs bounded context

Canvas tier: **light** — purpose, language, interface, decisions. Deep sections skipped; the one
contested item (build vs buy) sits under open questions.

## Purpose

Declare shipments to the authorities at each port and hold them until cleared, so nothing is handed to
a carrier that the authorities have not seen. Actors: the customs clerks who prepare declarations, and
the port authorities across the nine ports.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested** — `core` as declared, but the capability does not differentiate | `context-map.md` + `model.yaml` (`core`, "regulated, and mistakes are expensive") vs `business-model.md` (differentiates: no) |
| Business-model role | compliance enforcer | `business-model.md` — "Customs declaration" |
| Evolution | product | `business-model.md` |

Carried, not re-derived. "Regulated and expensive when wrong" is a risk argument, not a differentiation
argument, and the two upstream artifacts disagree about what follows. `5-strategize` owns it.

## Domain roles

**Gateway** — it translates between Nordic's shipments and each port authority's declaration regime. A
gateway declared core is worth a second look: a gateway is where you conform to somebody else's model,
not usually where you build an advantage.

## Inbound communication

> **Not traced** — no message flows on disk (`4-connect` not run). Rows derive from `model.yaml`
> relationships and the discovery timeline; direction only, no stated context-mapping pattern.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Consolidation | bounded context | `ContainerSealed` (containerId, fillRate) | event | Customs downstream of Consolidation |
| Customs clerk | direct user interaction | *unnamed* — prepare/submit a declaration | command | not stated |

`fillRate` arrives on `ContainerSealed` and nothing here consumes it — an upstream KPI on a
published event.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Port authority | external system | *unnamed* — lodge the declaration | command | **no integration exists** (`model.yaml` notes) |
| Invoicing | bounded context | `DeclarationCleared` (declarationId, clearedAt) | event | Customs upstream of Invoicing |
| — | — | `DeclarationSubmitted` (declarationId, portCode) | event | no consumer named on disk |

The interface has no modelled contact with the authorities — the one collaboration this context exists for.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Declaration | The filing that makes a shipment lawful to move, per port | not used elsewhere |
| `shipmentRef` | Reference to the shipment being declared | shared building block with Booking, Consolidation, Invoicing (`context-map.md`) |
| Cleared | The authority has released the shipment | Invoicing depends on this state ("a line must reference a cleared declaration") but does not define it |

## Business decisions

- **A shipment cannot be handed to a carrier before its declaration is submitted.** *Customs clerk,
  2026-05-25.* Carried as this context's invariant.

Note the gap between the stated rule (*submitted*) and Invoicing's invariant (*cleared*). Two
different states gate two different downstream actions; nobody stated whether that is intended.

## Assumptions and open questions

Assumptions:

- *(inferred)* One declaration per shipment per port, never amended after submission — no amendment event exists on disk.
- *(inferred)* A rejection path exists (an authority can refuse). Nothing models it; only
  `DeclarationSubmitted` and `DeclarationCleared` exist.
- *(inferred)* All nine ports share one declaration model. `portCode` is an attribute rather than a
  variation point, which only holds if the regimes are uniform.

Open questions:

1. Build or buy? `model.yaml` records that "two commercial customs platforms cover all nine ports;
   we integrate with neither", and `business-model.md` stages the capability as *product*. A
   product-stage, non-differentiating, compliance capability being custom-built is a decision
   somebody should be making explicitly.
2. Who enforces "submitted before carrier handoff"? Routing performs the handoff and, per its own
   model, "owns no rule of its own".
3. Is *submitted* or *cleared* the correct gate, and for which downstream action?
4. What happens when a declaration is rejected?
5. Is `core` right for a gateway that does not differentiate?
