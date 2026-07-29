# Domain docs index

## Bounded contexts (`3-decompose` 2026-07-27, deepened by `7-define` 2026-07-27)

| Id | Title | Risk | Status | Owner | Date |
|---|---|---|---|---|---|
| [DOMAIN-0001](site-configuration/README.md) | SiteConfiguration bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0002](tariff/README.md) | Tariff bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0003](parking-visit/README.md) | ParkingVisit bounded context | High | draft | TBD | 2026-07-27 |
| [DOMAIN-0004](terminal-operations/README.md) | TerminalOperations bounded context | High | draft | TBD | 2026-07-27 |
| [DOMAIN-0005](vehicle-identification/README.md) | VehicleIdentification bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0006](guidance-integration/README.md) | GuidanceIntegration bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0007](payment-capture/README.md) | PaymentCapture bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0008](revenue-reconciliation/README.md) | RevenueReconciliation bounded context | High | draft | TBD | 2026-07-27 |
| [DOMAIN-0009](occupancy-insight/README.md) | OccupancyInsight bounded context | — | draft | TBD | 2026-07-27 |
| [DOMAIN-0010](fiscal-record/README.md) | FiscalRecord bounded context | — | draft | TBD | 2026-07-27 |

Risk is set only where an invariant is present. Three contexts carry aggregates; seven are
deliberately light — see `context-map.md` for the right-sizing rationale.

### Definition depth (`7-define`) — what each context got, and why

Each `README.md` above is now a Bounded Context Canvas v5. Depth follows the classification in
`core-domain-chart.md`, **not** one template applied ten times. Ratio between the deepest and the
shallowest: **5.3 : 1**.

| Depth | Contexts | What they got | Why |
|---|---|---|---|
| **Full canvas** (~180 lines) | ParkingVisit, TerminalOperations, RevenueReconciliation | all sections + swimlanes, quality attributes, verification metrics, the five-question interface critique and recorded perturbation experiments | the three contexts that carry aggregates and, between them, every invariant in the model. RevenueReconciliation is the only one the chart and `model.yaml` agree is core |
| **Partial** (~145) | OccupancyInsight | everything except swimlanes and a full critique | core by business value, `aggregates: []` by construction. It decides nothing, so there is nothing to swimlane; its risk is entirely in quality attributes (H3, H4, H14) and open questions |
| **Supporting** (~90) | Tariff, SiteConfiguration, VehicleIdentification, FiscalRecord | purpose, language, communication, business decisions + the deep sections each one's contested issue earns | each has exactly one contested thing: H15 (Tariff), the `VehicleClass` shared kernel (SiteConfiguration), the 7-day deletion vs claims (VehicleIdentification), per-country retention (FiscalRecord) |
| **Stub** (~35) | GuidanceIntegration, PaymentCapture | purpose, what it is bought from, the adapter's interface, the questions blocking the contract | both are bought. "Nobody has ever chosen us because of the signage"; the payment mechanics are excluded by `INPUT.md` §7.3 and unknown to the expert |

**What `7-define` changed across all ten.** Communication tables were re-split by *who initiates*
rather than which way data flows — that moved Tariff, SiteConfiguration and the free-bay read out of
ParkingVisit's inbound column and inverted SiteConfiguration's topology reads. Relationship types were
added per collaborator. Nothing was re-classified, no boundary was redrawn and no `model.yaml` was
touched; the canvases carry classifications from `core-domain-chart.md` and `business-model.md` by
citation, and every disagreement stays a finding.

**What it produced.** 12 new open questions on top of the 19 hotspots, each attributed to who could
answer it; 10 verification metrics marked **collectable today, before any code exists** — the
4 h/week/site reconciliation baseline, the H4 sensor-vs-hand-count field test, complaint, mismatch and
exception counts from the operator's current records; and one Brain-Context check per core context (all pass —
outbound traffic is events, not commands). Two boundary findings went back to `3-decompose`:
TerminalOperations' purpose needs an "and also" (edge decisions *and* a card fleet with no stated
rule), and RevenueReconciliation carries two domain roles whose split is the promotion trigger the
context map already wrote for the declined Exceptions context.

## Domain message flows (`4-connect`, 2026-07-27)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-FLOW-0000](message-flows/README.md) | Euro Parking — domain message flows | draft | TBD | 2026-07-27 |
| [DOMAIN-FLOW-0001](message-flows/DOMAIN-FLOW-0001-garage-entry.md) | Garage entry — admitted and sent to a bay | draft | TBD | 2026-07-27 |
| [DOMAIN-FLOW-0002](message-flows/DOMAIN-FLOW-0002-pay-then-exit.md) | Pay at the machine, then exit within the window | draft | TBD | 2026-07-27 |
| [DOMAIN-FLOW-0003](message-flows/DOMAIN-FLOW-0003-exit-refused.md) | Exit refused — the window expired | draft | TBD | 2026-07-27 |
| [DOMAIN-FLOW-0004](message-flows/DOMAIN-FLOW-0004-offline-exit-settled.md) | Offline exit at 2am, settled the next morning | draft | TBD | 2026-07-27 |

`DOMAIN-FLOW-0002` fires the >9-message refutation trigger: the bounded contexts above are **stale**
pending a `3-decompose` update-mode run over PC-1 in `message-flows/README.md`.

## Strategy (`5-strategize`, 2026-07-27)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-CDC-0001](core-domain-chart.md) | Euro Parking — core domain chart | draft | TBD | 2026-07-27 |

The chart places 8 of 10 contexts and leaves **ParkingVisit** and **TerminalOperations** unplaced on
the differentiation axis — no source states it. It proposes deltas against three `subdomain_type`
values; `3-decompose` owns whether they are merged.

## Organisation (`6-organise`, 2026-07-27)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-ORG-0001](team-topology.md) | Euro Parking — team topology proposal | draft | TBD | 2026-07-27 |

There is **no organisation yet** — 0 engineers, 0 teams, 10 contexts — so every ownership row is
`proposed — unstaffed`. The proposal is written as two shapes (1 team on day one, 3 at the split)
with the trigger between them, not as a staffing plan.

## Code — event model and aggregate design (`8-code`, 2026-07-27)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-EM-0001](event-model/README.md) | Euro Parking — event model, one garage end to end | draft | TBD | 2026-07-27 |
| [DOMAIN-AGG-0001](parking-visit/aggregates/ParkingVisit.md) | ParkingVisit — aggregate design canvas | draft | TBD | 2026-07-27 |
| [DOMAIN-AGG-0002](terminal-operations/aggregates/Terminal.md) | Terminal — aggregate design canvas | draft | TBD | 2026-07-27 |
| [DOMAIN-AGG-0003](terminal-operations/aggregates/OfflineExitLog.md) | OfflineExitLog — aggregate design canvas | draft | TBD | 2026-07-27 |
| [DOMAIN-AGG-0004](revenue-reconciliation/aggregates/DailyReconciliation.md) | DailyReconciliation — aggregate design canvas | draft | TBD | 2026-07-27 |
| [DOMAIN-CS-0001](code-structure.md) | Euro Parking — code structure contract | draft | TBD | 2026-07-27 |

Phase 1 cut the business-model's own thinnest end-to-end scenario into **30 slices: 18
handover-ready, 11 with no writable `Then`, 1 declined by the business.** Phase 2 canvassed only the
**4 aggregates those slices touch**, in 3 of 10 contexts; the other six get an explicit "no
aggregate" with a reason (`event-model/README.md`, right-sizing table).

**What the two phases found.** A read model nobody owns (`FreeBaysByClass`, which admission is
enforced against); an event whose consumer does nothing (`OfflineExitLogUploaded` → ParkingVisit, so
an offline exit produces no ten-year fiscal record); five missing rejection paths; and the blocker
under everything — **`PayTicket`, `PayDifference` and `PresentCardAtExit` carry nothing that
identifies a visit, so a repository cannot load the root.** Twelve enforced invariants across four
canvases, **six named corrective policies and nine relaxed rules with no repair path at all** — each
one a business decision nobody has been asked for. Five deltas are proposed to `3-decompose` and
none applied. Both capabilities the operator said they would pay for are among the 11 unspecifiable
slices.

## Upstream artifacts

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-CM-0001](context-map.md) | Euro Parking — context map | draft | TBD | 2026-07-27 |
| [DOMAIN-BM-0001](business-model.md) | Euro Parking — business model & user needs | draft | TBD | 2026-07-27 |
| [DOMAIN-DISC-0001](discovery/README.md) | Euro Parking — discovery session | draft | TBD | 2026-07-27 |
