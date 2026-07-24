# Notifications — Logical Data Model

Source: `docs/domain/notifications/` (DOMAIN-0013). Sub-domain type: **generic** (bought
adapter, SendGrid). Status: draft, owner: TBD.

## No schema — by domain-model statement, not an oversight

`model.yaml` has an **empty `ubiquitous_language`** and an **empty `aggregates`** list:
"Transactional email (receipts) via SendGrid — commodity… No domain model." SendGrid is the
system of record for delivery status; no local table is fabricated.

## What would change this

If RentField later needs its own send-log independent of SendGrid's dashboard (e.g. for
in-app notification history), that would be a new, explicitly-scoped `notification_log` table —
not fabricated here from a domain model that states none of it.
