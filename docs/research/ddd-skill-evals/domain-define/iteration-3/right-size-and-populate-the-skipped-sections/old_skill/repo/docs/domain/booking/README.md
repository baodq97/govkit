---
id: DOMAIN-BCC-0002
title: Booking — bounded context canvas
status: draft
owner: TBD
date: 2026-07-28
---

# Booking bounded context

> Canvas v5, supporting depth + the deep sections (the shared kernel and the capacity check are
> contested). New file; no `message-flows/`, so the interface comes from timeline + `model.yaml`.

## Purpose

Take an exporter's committed request to move a consignment on a given departure, hold it while the
slot is secured, and confirm it once the capacity exists. Actors: exporters, depot planners.

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | core *(unverified)* | `context-map.md`, March, not revisited |
| Business-model role | **not classified** | `business-model.md` has no Booking capability row |
| Evolution | **not classified** | as above |

## Domain roles

**Draft context** (work-in-progress until capacity is reserved) plus **execution**. The draft half
is why hotspot 1 is possible: something holds the slot, and no artifact says whether that is here.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Exporter / front-end | direct user interaction | booking request — no agreed name (`BookingRequested` is what we emit, not what we receive) | command *(unconfirmed)* | — |
| Quoting | bounded context | `QuoteIssued` | event | pattern **unstated**; Booking downstream (`context-map.md`) |
| Consolidation | bounded context | `CapacityReserved` | event | **Shared Kernel** on `ConsignmentLine` (`context-map.md`) |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Consolidation | bounded context | remaining-capacity read, then reserve (`model.yaml`) | query + command | shared kernel; outbound because we call, though the data flows in |
| Routing | bounded context | `BookingConfirmed` (bookingId, containerId) | event | pattern **unstated** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Consignment | The goods a customer hands over as one unit | **Yes** — physical stack in Consolidation, billable line in Invoicing (hotspot 2) |

## Business decisions

- A booking may only be confirmed once its capacity has been reserved — planner, 2026-05-25 (timeline #4 before #5).

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never end up on the same slot | — | hotspot 1 | **yes** — the invariant belongs to whoever owns the hold |
| Availability | can we confirm while Consolidation is unreachable? | unknown — commercial director | inferred from the synchronous call | **yes if it must degrade** — needs a provisional hold |

## Assumptions

- *(inferred)* A booking maps to one departure and is never re-planned onto another.
- *(inferred)* A valid quote is not required to book, though `QuoteIssued` precedes it in the timeline.
- *(inferred)* Cancellation exists but is unmodelled — no event, no rule for releasing capacity.
- *(inferred)* The premium is chosen at booking time; nothing says where it is captured.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| PRs touching Booking that also touch Consolidation. Prediction: **< 30% by 2026-10-31** | above that, the shared kernel is the real boundary and one side should absorb `ConsignmentLine` | VCS / CI |
| Confirmations per failed reserve attempt | how often the synchronous call stands between a customer and a slot | production telemetry |
| Bookings changed or cancelled after confirmation, monthly | whether the unmodelled cancellation path is rare or routine | production / issue tracker |

## Open questions

- Where does the capacity check belong — here or Consolidation? "Nobody agrees" (hotspot 1).
- Is Booking core? It has no capability row at all in `business-model.md`.
- What happens to reserved capacity when a booking is cancelled or amended?
- Must a booking cite a valid quote, and what if the quote expired?
- Who is accountable when a carrier refuses a sealed container holding a confirmed booking (hotspot 3)?

## Interface critique (short form)

Query-then-command to Consolidation is the defect: one command, accepted or rejected, kills our need
to read container state. `ConsignmentLine` writable both sides is us consuming another's internals.
