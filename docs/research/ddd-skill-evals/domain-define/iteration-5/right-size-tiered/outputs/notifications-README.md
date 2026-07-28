# Notifications bounded context

## Purpose
Tell Nordic Freight's customers what has happened to their shipment and their invoice, so they do not
have to call the depot. Actors: exporters, and the staff who would otherwise field the chase-up calls.

## Strategic classification
generic (`model.yaml`) · engagement creator · commodity (business-model.md, "Shipment notifications").

## What it is bought from
`model.yaml`: *"Thin adapter over a bought email/SMS provider; no domain model."* **No vendor is named
anywhere on disk** — no contract, no fallback. For a bought context that is the design.

## The adapter's interface
| Direction | Collaborator | Message | Type | Relationship |
|---|---|---|---|---|
| Outbound | unnamed email/SMS provider | *no send message declared* | — | conformist (inferred) |
| Outbound | Invoicing | `CustomerNotified {customerId, templateId}` | event | downstream (`model.yaml`) |

Inbound is empty: nothing on disk says what triggers a notification. message-flows has not been traced.

Critique (Q4): `templateId` is the provider's identifier, not Nordic's language — the single published
event leaks the bought system's internals. `CustomerNotified` also names no subject.

## Assumptions — all inferred, none stated
- Sending is fire-and-forget: no context waits on it, a failed send does not block a shipment.
- Template content is owned outside this boundary.

## Open questions
- Which provider, on what contract, with what fallback when it is down?
- `model.yaml` lists Invoicing as its only collaborator, yet the capability is *shipment* notifications
  — who tells it about a booking, a sealed container, a customs clearance? Either the relationship list
  is incomplete or the context is misnamed. Proposal for `3-decompose`, which owns that file.
- Does anything consume `CustomerNotified`, or is it emitted into nothing?
- "No domain model" yet 2 tables / 11 attributes declared. What state does an adapter keep?
