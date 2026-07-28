# Customs bounded context (stub)

> *Canvas v5, `7-define`, 2026-07-28 — new file; `model.yaml` unchanged.*
> **Depth: stub — the finding, not laziness.** `business-model.md`: compliance-enforcer / product / differentiation **no** ("required, and two vendors already do it well"); `model.yaml`: "two commercial customs platforms cover all nine ports; we integrate with neither" — none priced or trialled. Non-differentiating with two proven vendors is a buy candidate, and a buy candidate gets an adapter interface, not a modelled domain.
> `context-map.md` says `core` because it is "regulated, and mistakes are expensive" — regulated is not differentiating; unresolved, Open question 1. **Provenance:** `4-connect` has not run, so no flow is traced.

## Purpose

Get each shipment legally cleared to cross a border, and keep the proof. Actors: the customs clerk; the exporter, who cannot ship without it.

## Adapter interface

| Direction | Collaborator | Message | Type | Source |
|---|---|---|---|---|
| in | Consolidation | `ContainerSealed` | event | `consolidation/model.yaml`; timeline #7 |
| out | Invoicing | `DeclarationSubmitted`, `DeclarationCleared` | events | `model.yaml`; timeline #8–9, customs clerk |

## Business decision (stated)
- A shipment cannot be handed to a carrier before its declaration is submitted. — customs clerk, 2026-05-25. The invariant spans Customs, Routing and Consolidation; buying a platform still leaves someone here holding it.

## Assumptions

- *(inferred)* Buying is viable — "two vendors do it well" came from the commercial director, not a trial.
- *(inferred)* Declarations are per shipment, not per container: `model.yaml` keys on `shipmentRef` while the trigger is a sealed container.

## Verification metric

- Share of changes to `customs/` driven by a regulator rather than by us, over 2 quarters (VCS + tracker labels, reviewed 2027-01-28). Above ~70% regulator-driven confirms commodity and the buy case; below it, someone is building product here and the `core` label deserves a hearing.

## Open questions

1. Core (`context-map.md`) or generic-and-bought (`business-model.md`)? Owner: `5-strategize`.
2. Buy or build — and if buy, who enforces submit-before-handover across the adapter?
3. Statutory retention for cleared declarations? The clerk can answer; it may make history domain state.
4. Hotspot #3: who is responsible when a partner carrier refuses a sealed container?
