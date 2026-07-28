---
id: DOMAIN-BCC-0007
title: Notifications — bounded context canvas (stub)
status: draft
owner: TBD
date: 2026-07-28
---

# Notifications bounded context

> **Stub by design.** Generic / engagement creator / commodity — both upstream artifacts agree, no
> conflict to record. Bought, no domain model, so: purpose, vendor, interface, open questions.

## Purpose

Tell the customer what has happened to their shipment. Actors: exporters.

## Bought from

An email/SMS provider (`model.yaml`). **The vendor is not named in any artifact** — absent, not guessed.

## Adapter interface

| Direction | Collaborator | Message | Type | Relationship |
|---|---|---|---|---|
| Inbound | Invoicing (bounded context) | `InvoiceIssued` | event | pattern **unstated** |
| Outbound | Provider (external system) | send from template | command | conformist expected for a bought commodity, **not stated** |
| Outbound | — | `CustomerNotified` (customerId, templateId) | event *(candidate)* | — |

## Open questions

- When does `CustomerNotified` fire? Marked *candidate* in the timeline — nobody confirmed it.
- Which vendor, on what contract, with what deliverability commitment?
- Invoicing is the only traced trigger: customers hear from us when billed, not when booked or cleared. Intended, or untraced?
