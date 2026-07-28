<!-- id: DOMAIN-BC-0007 · status: draft · owner: TBD · 2026-07-28 -->

# Notifications bounded context

Canvas tier: **stub**. Generic (`context-map.md`, `model.yaml`), engagement-creator at commodity
stage (`business-model.md`), bought. Purpose, what it is bought from, the adapter's interface —
complete at this size.

## Purpose

Tell customers what has happened to their shipment. Actors: the customers who receive the messages.

## Bought from

A third-party email/SMS provider — `model.yaml` records a "thin adapter over a bought email/SMS
provider" with no domain model. **The vendor is named nowhere on disk**, which is the one thing a
bought-context stub is supposed to state.

## Adapter interface (not traced — from `model.yaml` + discovery timeline)

| Direction | Collaborator | Message | Type |
|---|---|---|---|
| in | Invoicing | `InvoiceIssued` | event |
| out | Provider (external) | send template to recipient | command |
| out | — | `CustomerNotified` (customerId, templateId) | event |

## Open questions

1. `CustomerNotified` is discovery's only **candidate** element — "inferred from the notification
   templates, nobody confirmed when it fires". The trigger for this context's one event is unknown.
2. Which provider, under what contract?
3. Invoicing is the only stated inbound source, yet the customer-facing moments planners described
   (booking confirmed, container sealed, declaration cleared) all sit upstream of it.
