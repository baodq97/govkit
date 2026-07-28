# Notifications bounded context (stub)

> *Canvas v5, `7-define`, 2026-07-28 — new file; `model.yaml` unchanged.*
> **Depth: stub. Complete, not lazy.** Generic in `context-map.md`; engagement-creator / commodity /
> no differentiation in `business-model.md`; `model.yaml` calls it a thin adapter over a bought
> email/SMS provider with no domain model. Purpose, what it is bought from, and the adapter interface
> is the whole canvas.

## Purpose

Tell the customer what happened to their shipment. Actors: the exporter receiving the message.

## Bought from / adapter interface

A commercial email/SMS provider (`tactical_pattern: bought-adapter`), not named on disk — no contract, delivery guarantee or cost is recorded, so the adapter cannot yet be designed.

| Direction | Collaborator | Message | Type | Source |
|---|---|---|---|---|
| in | Invoicing | `InvoiceIssued` | event | `invoicing/model.yaml`; timeline #10 |
| out | Provider (external) | send templated message | command (*inferred*) | implied by `CustomerNotified`; no message on disk |
| out | — | `CustomerNotified` | event | timeline #11 — **candidate only: inferred from templates, nobody confirmed when it fires** |

## Assumptions

- *(inferred)* Invoicing is the only trigger — #11 is the only notification event on disk, yet a customer plausibly wants booking confirmation and clearance too. Untested.
- *(inferred)* Delivery is fire-and-forget; no rule on disk covers a bounce or a retry.

## Verification metric
- Notification changes that need this adapter's code rather than provider configuration, per quarter (tracker, reviewed 2027-01-28). More than one means it is not a thin adapter and the generic label is wrong.

## Open questions

1. What actually triggers a notification, and for which events? Timeline #11 is unconfirmed.
2. Which provider, on what terms?
3. Does anyone need proof a customer was told — is this ever evidence, or only convenience?
