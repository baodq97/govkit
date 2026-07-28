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

---

## Addendum — 2026-07-28, cold chain contract

**No session was held.** Nothing below was confirmed by a domain expert; it is derived from the
contract terms and modelled in `cold-chain/model.yaml`. The table above is the record of the
2026-05-25 session and has not been altered. Every row here is `unconfirmed` until someone signs it.

### Candidate events

| # | Event | Emitted by | Needs confirmation from |
|---|---|---|---|
| C1 | `ColdChainJourneyStarted` | Cold Chain | depot planner — is the seal the real start of custody, or is it the pre-cool? |
| C2 | `CustodyTransferred` | Cold Chain | depot planner + carrier manager — who counts as an accountable party |
| C3 | `TemperatureExcursionDetected` | Cold Chain | telemetry provider — sampling cadence and what the device already filters out |
| C4 | `MonitoringGapDetected` | Cold Chain | telemetry provider — expected gap length at sea, in tunnels, on ferries |
| C5 | `TemperatureBreachRecorded` | Cold Chain | whoever owns the contract terms — tolerance thresholds |
| C6 | `BreachNotificationAcknowledged` | Cold Chain | commercial director — what counts as having told the customer |
| C7 | `ReeferPrecoolConfirmed` | Consolidation | depot planner — do we pre-cool, and do we record it |

### Business rules assumed, not stated

| Assumed rule | Why we assumed it | Who can confirm |
|---|---|---|
| An unmonitored interval is treated as non-compliant, not compliant | We cannot evidence a regime we did not observe; the customer's claim will say the same | contract owner |
| An excursion within tolerance is recorded but is not a breach | Door-open at transshipment produces excursions on every reefer job; without this rule every job breaches | depot planner |
| The agreed regime is frozen at booking and cannot be edited mid-transit | Otherwise a breach can be made to disappear by widening the range afterwards | contract owner |
| The customer must be told within a contractual window | Stated in the brief as "the customer told"; the window length is unknown | commercial director |

### Hotspots this contract touches

| # | Hotspot | Status |
|---|---|---|
| 3 | Nobody knows who is responsible when a partner carrier refuses a sealed container | Partly addressed — the custody-leg model forces exactly one accountable party at every instant, so the *temperature* liability is now attributable. Refusal of a sealed container is a separate question and is still open. |
| — | New: who pays for a breach — us, the carrier, or insurance | Open. `invoicing/model.yaml` records it. No P&L owner has been in any session, which is the same gap `business-model.md` flags for cost structure. |
