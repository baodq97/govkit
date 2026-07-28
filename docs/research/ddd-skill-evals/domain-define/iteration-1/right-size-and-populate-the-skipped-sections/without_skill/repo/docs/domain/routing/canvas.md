---
id: DOMAIN-BCC-0006
title: Bounded context canvas (stub) — Routing
status: draft
owner: TBD
date: 2026-07-27
---

# Routing — stub

**Treatment: stub, not a full canvas.** `routing/model.yaml` records `aggregates: []`,
`tactical_pattern: transaction-script`, and a rationale that ends *"It owns no rule of its own."*
The repo's own README describes it as *"a pass-through with no decision of its own."*

A bounded context canvas exists to capture the decisions a context makes and the language it makes
them in. Routing has neither, so five of the standard sections would be filled with nothing or
with invention. What is genuinely worth recording is its boundary and the questions that decide
whether it should exist at all — both below.

Promote this to a full canvas if OQ-2 (carrier refusal) or OQ-5 (carrier contracts) is assigned
here. Either would give Routing its first real decision.

## Purpose

Receives `BookingConfirmed` and hands the shipment to the partner carrier fixed by the standing
contract for that lane.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `supporting` — "hands shipments to carriers" | `context-map.md` |
| business_role | cost-reduction | `business-model.md`, depot planners |
| evolution_stage | product | same |
| differentiation | no — "the partner network is the asset, not the routing step" | same |

**No conflict.** This is the one context where all three artifacts agree, and the depot planners'
phrasing is the most useful line in the classification table: the asset is the network, not the
step. It argues for keeping this thin.

## Communication

Inbound:

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| `BookingConfirmed` | event | Booking | **Conformist** — forwarded unchanged, no translation | `routing/model.yaml` → `{to: Booking, downstream}`; README trap 2 |

Outbound:

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| *carrier booking / handover instruction* | **command** (external) | Partner Network | **Conformist** — the carriers' formats are theirs; an ACL per carrier is the usual answer | `routing/model.yaml` → `{to: PartnerNetwork, downstream, note: external}` |
| `ShipmentHandedToCarrier` | event | published — **no recorded consumer** | — | `routing/model.yaml`; timeline #6 |

Two things stand out from the edges alone. Routing has no edge to Customs, so the rule that
nothing may be handed over before its declaration is submitted cannot reach the context performing
the handover (OQ-7). And `ShipmentHandedToCarrier` has no consumer, so no other context learns
that a shipment has left.

## Business decisions

None recorded. `routing/model.yaml`: *"the partner carrier selected by the standing contract for
that lane. It owns no rule of its own."* Carrier selection is a lookup against a contract Routing
does not own (OQ-5).

Nothing is invented here. If carrier selection ever involves a choice — price, capacity, service
level, a fallback when the standing carrier declines — Routing acquires a rule and stops being a
pass-through.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| R-1 | Exactly one standing carrier per lane, with no fallback | "the standing contract for that lane", singular | The first refusal has no path — which is OQ-2 |
| R-2 | Handover is fire-and-forget; a carrier does not reject | No rejection event or rule exists, yet hotspot 3 describes exactly that happening | The known failure mode is unmodelled in the context that meets it first |
| R-3 | `BookingConfirmed` carries enough to instruct a carrier | Payload is `bookingId, containerId` — no lane, no port, no goods detail | Routing needs a back channel, and stops being a pass-through |
| R-4 | The standing contract lives outside Routing | Nothing in `model.yaml` owns it | OQ-5 |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Rules added to Routing per quarter (target: 0) | The "no decision of its own" claim. If this stops being zero, re-open OQ-10 and give Routing a full canvas | Code review / issue tracker, quarterly |
| Carrier refusals and handover failures per 1,000 shipments | Assumption R-2 and the urgency of OQ-2. Hotspot 3 says this already happens; nobody counts it | Ops incident log, label `carrier-refusal` — start counting before any code exists |
| Handovers preceding `DeclarationSubmitted` | OQ-7, from the acting side | Event stream timestamp comparison (mirrors the Customs metric) |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-2 | **Who is responsible when a partner carrier refuses a sealed container?** Hotspot 3, raised by a planner, unresolved. Routing is where the refusal arrives, but the container is sealed (Consolidation's last act), the declaration may already be submitted (Customs), and the customer promise sits with Booking. No context claims it; no `model.yaml` has a rule or an event for it | Routing's existence as a context, and the whole recovery path |
| OQ-5 | Who owns Lane and the standing carrier contract? Quoting prices by `laneId`, Routing selects by contract, neither owns either. This may be the missing context | Carrier selection |
| OQ-7 | What enforces the pre-handover declaration rule? Routing acts; Customs owns the rule; no edge joins them | Handover implementation |
| OQ-10 | Is Routing a bounded context, or an outbound adapter of Booking? On present evidence it is an adapter. Answering OQ-2 or OQ-5 in its favour would change that | Service boundaries and team ownership |
