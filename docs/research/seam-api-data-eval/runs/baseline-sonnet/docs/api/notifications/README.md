# Notifications API

Source: `docs/domain/notifications/` (DOMAIN-0013). Sub-domain type: **generic** (bought
adapter, SendGrid). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| "Send transactional email (e.g. receipts)" | `POST /notifications`, `GET /notifications/{id}` |

No aggregate, no domain event, no business rule. The thinnest possible proxy over
`SendGridNotificationClient`: submit a send request, check delivery status.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/notifications/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid recipient or template |
| 404 | `NOTIFICATION_NOT_FOUND` | Unknown id |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 502 | `NOTIFICATION_PROVIDER_UNAVAILABLE` | SendGrid unavailable |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

## Flags (carried from the domain model, not resolved here)

- **Receipt-after-order trigger (from Rentals) is "implied by the narrative but not wired in the
  reviewed code."** Not modelled as an inbound call from `docs/api/rentals/openapi.yaml` — this
  API exposes only the stated capability ("send transactional email"), invoked by whichever
  authorized caller; no assumption about the caller is asserted.
