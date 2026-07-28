# Booking bounded context

> Tier **light** (purpose, language, inbound/outbound, business decisions), assigned by the model header: no capability row in `business-model.md` names Booking. Quality storming and the full interface critique are deliberately not run. No first-pass canvas existed (`no README`).

## Purpose

Hold a customer's commitment to move a consignment on a named departure, from the moment the customer accepts a quote until the booking is confirmed against reserved space. It serves the exporter placing the booking and the depot planner who has to make the departure work.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` **as declared** | `booking/model.yaml: subdomain_type` — `core-domain-chart.md` does not exist in this repo |
| Business-model role | **absent** | `business-model.md` has no capability row for Booking |
| Evolution | **absent** | same — no row to carry |

Not re-derived. The header calls the `core` labels inflated (4 labelled core, 1 capability differentiates); resolving that belongs to `5-strategize`.

## Domain roles

**Execution** — enforces a workflow (requested → capacity reserved → confirmed) and holds the commitment. No second role is visible in the declared model.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| — | — | **nothing traced** | — | — |

`docs/domain/message-flows/` does not exist. The collaborators below come from `model.yaml: relationships`, not from an observed flow.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Quoting | bounded context | not stated | — | `downstream` (model.yaml) |
| Consolidation | bounded context | remaining-capacity check, **unnamed** | query (synchronous) | `downstream` — model.yaml note: "synchronous remaining-capacity check before reserving" |
| Routing | bounded context | not stated | — | `upstream` (model.yaml) |
| unknown | — | `BookingRequested` (bookingId, departureId, volumeM3) | event | consumer not on disk |
| unknown | — | `BookingConfirmed` (bookingId, containerId) | event | consumer not on disk |

No message name invented: the events are declared in `model.yaml: domain_events`; the capacity check is described in prose there but never named.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | not recorded |
| Consignment | The goods a customer hands over as one unit | **yes, contested** — header hotspot: finance reads it as a billable line, operations as a physical stack of pallets (finance analyst) |
| ConsignmentLine | Entity carrying volumeM3, weightKg, hazardClass | undefined in `ubiquitous_language` — appears only as a structure |
| ShipmentRef | Value object (prefix + sequence) | undefined in `ubiquitous_language` |

## Business decisions

- **A booking may only be confirmed once its capacity has been reserved** — `booking/model.yaml: invariants`. The only rule this context is stated to enforce.
- The header's three stated rules (container capacity; declaration before carrier; premium charged regardless of fill) are attributed to planner / customs clerk / finance analyst and none names Booking, so none is written here as Booking's decision.

## Assumptions

- *(inferred)* `downstream` in `model.yaml` reads "Booking is downstream of X", `upstream` the reverse — taken from the Consolidation note where Booking is the caller. If the convention is inverted, every outbound row flips direction.
- *(inferred, domain)* A booking is confirmed against exactly one departure and one container — `BookingConfirmed` carries a single `containerId`. Splitting a consignment across containers is not modelled.
- *(inferred, scale)* The capacity check can stay synchronous, i.e. Consolidation is available whenever a customer confirms. No availability requirement has been stated by anyone.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Booking and Consolidation in the same PR — predict < 25% of Booking PRs next quarter | Higher means the capacity commitment is one responsibility split across two contexts | CI / VCS history |
| Double-booked slots per month (the March incident class) — predict 0 once one owner is named | Recurrence means the confirm-time check sits in the wrong context | production / incident tracker |
| Share of `BookingConfirmed` events with no consumer on the flow map | Staying at 100% means the events are speculative rather than used | `message-flows/` once traced |

## Open questions

1. Where does the capacity check belong? Booking's invariant and Consolidation's committed-volume rule (planner, 2026-05-25) both claim it, and the March double-booking hotspot is exactly "nobody agrees where the check should have happened". Unresolved.
2. Which context owns the word *consignment* — Booking uses it for physical goods, finance for a billable line. A term this contested inside a context's own language table suggests the boundary runs through the word.
3. Who consumes `BookingRequested` and `BookingConfirmed`? Without flows the interface is unverified.
4. Is the `core` label right? The header calls it inflated and gives Booking `light`, yet the customer commitment lives here. Recorded, not acted on.

## Proposals for other steps (not applied here)

- Message-flow tracing is the missing prerequisite — the inbound section is empty for lack of evidence, not effort.
- `3-decompose`: name the capacity-check message and its owner; define `ConsignmentLine` and `ShipmentRef` in `ubiquitous_language`; state the direction convention for `relationships`.
- `5-strategize`: Booking has no row in `business-model.md`, so two of three classification facets cannot be carried.
