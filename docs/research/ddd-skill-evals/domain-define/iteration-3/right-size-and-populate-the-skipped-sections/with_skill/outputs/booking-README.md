<!-- id: DOMAIN-BC-0002 · status: draft · owner: TBD · 2026-07-28 -->

# Booking bounded context

Canvas tier: **light** — purpose, language, interface, decisions. Deep sections skipped except where
contested, and two things are: nothing upstream classifies this capability, and it shares a written
entity with Consolidation.

## Purpose

Take a customer's committed request to move a consignment on a given departure and hold it until it is
confirmed or refused. Actors: exporting customers who accept a quote, and the depot planners who
inherit whatever Booking commits.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` as declared | `context-map.md` ("where the money is committed"), `model.yaml` |
| Business-model role | **unknown** | **no capability row in `business-model.md` matches Booking** |
| Evolution | **unknown** | same absence |

The absence is the finding, not a blank to fill: every other context has a capability row, and Booking
is declared core on one sentence in a context map that has not been revisited since March. Carried as
unknown for `1-understand` / `5-strategize`, not re-classified here.

## Domain roles

**Draft context** — it holds a request as work-in-progress until capacity makes it real, which is why its invariant is a sequencing rule rather than a calculation.

## Inbound communication

> **Not traced** — no message flows on disk (`4-connect` not run). Rows derive from `model.yaml` and
> the discovery timeline; direction only, no stated context-mapping pattern except the Shared Kernel.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customer | direct user interaction | *unnamed* — request a booking | command (inferred from `BookingRequested`) | not stated |
| Consolidation | bounded context | `CapacityReserved` | event | Booking downstream of Consolidation |
| Consolidation | bounded context | `ConsignmentLine` | shared write | **Shared Kernel** (`context-map.md`) |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Quoting | bounded context | *unnamed* — retrieve/accept a quote | query | Booking downstream of Quoting |
| Consolidation | bounded context | remaining-capacity check, then reserve | query + command | Booking downstream (customer) of Consolidation |
| Routing | bounded context | `BookingConfirmed` (bookingId, containerId) | event | Booking upstream of Routing |
| — | — | `BookingRequested` (bookingId, departureId, volumeM3) | event | no consumer named on disk |

`BookingRequested` has no stated consumer: either it is internal and does not belong on the published interface, or a consumer exists that nobody named.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | no |
| Consignment | The goods a customer hands over as one unit | **yes** — Invoicing: "a billable line on an invoice"; Consolidation: a physical stack with `stackable`. Hotspot #2 (finance analyst) |
| `ConsignmentLine` | `lineId, volumeM3, weightKg, hazardClass` | **yes** — Consolidation's has `stackable` and no weight or hazard, despite being the same declared Shared Kernel |
| `ShipmentRef` | `prefix, sequence` | shared building block with Consolidation, Customs, Invoicing (`context-map.md`) |

## Business decisions

One rule applies, carried from `model.yaml` as this context's invariant: **a booking may only be
confirmed once its capacity has been reserved.** Nobody stated it in the 2026-05-25 session, so it is
a modelling claim, not an attributed rule. Nothing stated covers refusal, expiry, amendment, cancellation.

## Contested — assumptions and open questions

Assumptions:

- *(inferred)* A booking is confirmed at most once and never amended — no amend/cancel event exists.
- *(inferred)* `status` carries the draft→confirmed lifecycle; its values are nowhere enumerated.
- *(inferred)* Booking may block on Consolidation — the check is synchronous per `model.yaml`, and no degraded path is described.

Open questions:

1. Is Booking core? Nothing upstream classifies its capability at all.
2. Hotspot #1 — the March double-commit: should the slot check live here or in Consolidation? Each context's invariant implies its own side; both cannot own it.
3. Is `ConsignmentLine` one shared entity or two? The definitions have already diverged while
   `context-map.md` says both contexts write it.
4. What happens to a booking when reservation fails, or when Consolidation is unavailable?
5. Who consumes `BookingRequested`?
6. Does a booking carry weight and hazard class that Consolidation then ignores when it plans?

## Verification metric

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of PRs touching both `booking/` and `consolidation/` — prediction **< 25% by 2026-10-31** | Above that, the Shared Kernel is the real boundary and these are one context | VCS / CI |
