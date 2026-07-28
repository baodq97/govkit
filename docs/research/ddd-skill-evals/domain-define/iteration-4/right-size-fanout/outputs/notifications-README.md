# Notifications bounded context
*Stub tier — `generic` earns purpose, what it is bought from, and the adapter interface.*

## Purpose
Tell an exporter what happened to their shipment so they do not have to ask. Actors: the customer receiving the message, and the contexts that have something to tell them.

## Strategic classification
| Facet | Value | Source |
|---|---|---|
| Domain type | generic (`tactical_pattern: bought-adapter`) | `model.yaml`, model header |
| Business-model role | engagement creator | `business-model.md` — "Shipment notifications" |
| Evolution | commodity, differentiating: no | `business-model.md` |

## Bought from
Unnamed on disk — `model.yaml` says only "a bought email/SMS provider". No vendor, no delivery guarantee, no retry behaviour: a bought context with an anonymous supplier has no contract to conform to, and that is the one thing this stub exists to record.

## Adapter interface
| Dir | Message | Type | Collaborator | Relationship |
|---|---|---|---|---|
| Out | `CustomerNotified {customerId, templateId}` | event | Invoicing | `downstream` — a direction, not a pattern |
| In | none traced | — | — | `message-flows/` empty — run `4-connect` |

## Assumptions (inferred, not stated by anyone)
- Something upstream asks this context to send; nothing traced says what, or whether a send is retried or deduplicated.
- Delivery is fire-and-forget — no acknowledgement, bounce or opt-out message appears anywhere in the model.

## Open questions
- Which provider, and who owns its SLA? Nobody is named.
- `templateId` on a published event leaks the provider's template catalogue to consumers — should the event carry the business fact instead? (interface critique Q4)
- `CustomerNotified` carries no shipment or invoice reference; how would a consumer correlate it?
- Which "consignment" do templates render — finance's billable line or operations' pallet stack? (header hotspot, finance analyst)

## Proposals for the owning steps
- `3-decompose` (owns `model.yaml`): give the Invoicing relationship a pattern — conformist or ACL. Direction alone does not say who conforms to whom.
- `4-connect`: a context whose whole job is reacting has zero inbound messages traced. That gap, not this canvas, is what blocks Notifications.
