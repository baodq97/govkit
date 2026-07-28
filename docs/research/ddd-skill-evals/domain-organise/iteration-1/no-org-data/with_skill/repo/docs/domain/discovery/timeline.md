---
id: DOMAIN-DISC-0001
title: Nordic Freight — discovery timeline
status: draft
owner: TBD
date: 2026-05-25
mode: interview
---

## Attendance

Two depot planners, one customs clerk, one finance analyst, three engineers. No customer present.

## Event timeline (confirmed unless marked)

| # | Event | Emitted by | Confirmed by |
|---|---|---|---|
| 1 | `QuoteRequested` | Quoting | planner, 2026-05-25 |
| 2 | `QuoteIssued` | Quoting | planner |
| 3 | `BookingRequested` | Booking | planner |
| 4 | `CapacityReserved` | Consolidation | planner |
| 5 | `BookingConfirmed` | Booking | planner |
| 6 | `ShipmentHandedToCarrier` | Routing | planner |
| 7 | `ContainerSealed` | Consolidation | planner |
| 8 | `DeclarationSubmitted` | Customs | customs clerk |
| 9 | `DeclarationCleared` | Customs | customs clerk |
| 10 | `InvoiceIssued` | Invoicing | finance analyst |
| 11 | `CustomerNotified` | Notifications | *candidate* — inferred from the notification templates, nobody confirmed when it fires |

## Business rules stated

| Rule | Stated by |
|---|---|
| A container's committed volume must never exceed its capacity — an overbooked container means a shipment is bumped and the Guaranteed Consolidation promise is broken | planner, 2026-05-25 |
| A shipment cannot be handed to a carrier before its declaration is submitted | customs clerk |
| The premium is charged whether or not the container ends up full | finance analyst |

## Hotspots

| # | Hotspot | Who raised it |
|---|---|---|
| 1 | Two shipments were committed to the same container slot in March; nobody agrees where the check should have happened | planner |
| 2 | Finance and operations use "consignment" differently — a billable line vs a physical stack of pallets | finance analyst |
| 3 | Nobody knows who is responsible when a partner carrier refuses a sealed container | planner |
