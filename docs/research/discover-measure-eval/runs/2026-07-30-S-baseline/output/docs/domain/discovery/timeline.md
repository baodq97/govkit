# FleetOps — big-picture event storm (mined, unconfirmed)

Paths in `Source` are relative to `export/packages/`. Every row is `candidate`: no human was
present, so nothing here is confirmed. Rows are in rough business time order, work-order thread
first because that is where the commercial weight sits (15 attributes, 2 workflows, 2 formulas —
the densest subject in the corpus).

**No row carries `to-be` or `could-be`, and that is itself a finding.** A vendor export records
configuration, never a decision or an idea, so nothing in this corpus can evidence either state.
The one thing that looks like a decided change — the `addon` package, `state=patch`,
`installed=2023-08-02`, which holds *fewer* attributes than `core` on 13 entities and 5 entirely
empty stubs — is **unplaceable** on this axis, so it is hotspot **H3** rather than a guessed
`to-be` row.

| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | WorkOrderOpened | event | as-is | Employee (`WorkOrder.Owner`) | candidate | `core/entities/WorkOrder.xml` Attribute[6] `OpenedOn:datetime` |
| 2 | WorkOrderPrioritised | event | as-is | — | candidate | `core/entities/WorkOrder.xml` Attribute[8] `Priority:picklist→priority` — option values absent (**H1**) |
| 3 | PartsRequested | event | as-is | — | candidate | `core/workflows/PartsApproval.xml` `trigger=create` on `fo_partsrequest` |
| 4 | on a parts request being created, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/PartsApproval.xml` Step[0..2] = condition, setvalue, sendmail |
| 5 | NeedsApproval — `If(Cost > 5000, true, false)` | read-model | as-is | — | candidate | `core/formulas/PartsRequest_NeedsApproval.txt` |
| 6 | PartsRequestApproved | event | as-is | Employee (`PartsRequest.ApprovedBy`) | candidate | `core/entities/PartsRequest.xml` `ApprovedBy:lookup→Employee` |
| 7 | PartsRequestRejected | event | as-is | — | candidate | `core/workflows/PartsRejectNotify.xml` `trigger=update` — no rejection field exists (**H6**) |
| 8 | email / notification transport | external-system | as-is | — | candidate | 12 of 36 workflow steps are `sendmail`; the recipient is nowhere in the export (**H12**) |
| 9 | TotalCost — `Cost + Sum(PartsRequest.Cost) * 1.1` | read-model | as-is | — | candidate | `core/formulas/WorkOrder_TotalCost.txt` — sums a `string` field (**H5**) |
| 10 | on a work order being updated, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/WorkOrderEscalation.xml` `trigger=update` |
| 11 | WorkOrderEscalated | event | as-is | — | candidate | `core/workflows/WorkOrderEscalation.xml` |
| 12 | SlaBreached — `ClosedOn > OpenedOn + Hours(Priority.SlaHours)` | read-model | as-is | — | candidate | `core/formulas/WorkOrder_SlaBreached.txt` — `Priority.SlaHours` resolves to nothing (**H7**) |
| 13 | WorkOrderClosed | event | as-is | — | candidate | `core/entities/WorkOrder.xml` Attribute[7] `ClosedOn`; `core/workflows/WorkOrderClose.xml` |
| 14 | OpenWorkOrders — `Count(WorkOrder where Owner = this and Status <> 'closed')` | read-model | as-is | — | candidate | `core/formulas/Employee_OpenWorkOrders.txt` — `'closed'` is the only literal state value in the corpus (**H1**) |
| 15 | AssetAcquired | event | as-is | — | candidate | `core/entities/Asset.xml` `AcquiredOn:datetime` |
| 16 | BookValue — `Cost - (Cost * 0.15 * YearsSince(AcquiredOn))` | read-model | as-is | — | candidate | `core/formulas/Asset_BookValue.txt` — 0.15 is unexplained (**H13**) |
| 17 | on an asset being updated, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/AssetTransfer.xml` `trigger=update` |
| 18 | AssetTransferred | event | as-is | — | candidate | `core/workflows/AssetTransfer.xml` — no depot-change field is recorded (**H14**) |
| 19 | AssetRetired | event | as-is | — | candidate | `core/workflows/AssetRetire.xml` `trigger=update` |
| 20 | Utilisation — `Sum(MeterReading.Value) / Max(Downtime.Hours, 1)` | read-model | as-is | — | candidate | `core/formulas/Asset_Utilisation.txt` |
| 21 | NextPmDue — `PmSchedule.LastRun + Days(PmSchedule.IntervalDays)` | read-model | as-is | — | candidate | `core/formulas/Asset_NextPmDue.txt` |
| 22 | Occupancy — `Count(Asset) / Max(Capacity, 1)` | read-model | as-is | — | candidate | `core/formulas/Depot_Occupancy.txt` |
| 23 | on a schedule, generate | policy | as-is | — | candidate | `core/workflows/PmGenerate.xml` `trigger=scheduled` on `fo_pmschedule` |
| 24 | PmScheduleRun | event | as-is | — | candidate | `core/entities/PmSchedule.xml` `LastRun:datetime` |
| 25 | AssetInspected | event | as-is | Inspector | candidate | `core/entities/Inspection.xml` `InspectedOn:datetime` |
| 26 | on an inspection being updated, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/InspectionFail.xml` `trigger=update` |
| 27 | InspectionFailed | event | as-is | — | candidate | `core/workflows/InspectionFail.xml`; `Inspection.Result` (**H4**) |
| 28 | Inspector | actor | as-is | — | candidate | `core/entities/Inspection.xml` `Inspector` — two senses (**H4**) |
| 29 | IncidentOccurred | event | as-is | Employee (`Incident.ReportedBy`) | candidate | `core/entities/Incident.xml` `OccurredOn:datetime` |
| 30 | on an incident being created, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/IncidentEscalate.xml` `trigger=create` |
| 31 | IncidentEscalated | event | as-is | — | candidate | `core/workflows/IncidentEscalate.xml`; `Incident.Severity:picklist→severity` (**H1**) |
| 32 | FuelLogged | event | as-is | — | candidate | `core/entities/FuelLog.xml` `LoggedOn:datetime` |
| 33 | on a fuel log being created, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/FuelAnomaly.xml` `trigger=create` |
| 34 | FuelAnomalyDetected | event | as-is | — | candidate | `core/workflows/FuelAnomaly.xml` — the anomaly threshold is nowhere in the export (**H15**) |
| 35 | CostPerLitre — `Cost / Max(Litres, 0.01)` | read-model | as-is | — | candidate | `core/formulas/FuelLog_CostPerLitre.txt` |
| 36 | MeterRead | event | as-is | — | candidate | `core/entities/MeterReading.xml` `ReadOn:datetime`, `Value` |
| 37 | DowntimeRecorded | event | as-is | — | candidate | `core/entities/Downtime.xml` `Asset`, `Hours`, `Reason:picklist→reason` (**H8**) |
| 38 | on a crew being updated, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/CrewAssign.xml` `trigger=update` |
| 39 | CrewAssigned | event | as-is | Crew | candidate | `core/workflows/CrewAssign.xml`; `Crew.Lead:lookup→Employee` |
| 40 | ShiftStarted | event | as-is | — | candidate | `core/entities/Shift.xml` `StartsAt:datetime`, `Depot` |
| 41 | Employee | actor | as-is | — | candidate | `core/entities/Employee.xml` `FullName`, `Trade:picklist→trade`, `HiredOn`, `Depot`, `Cost` (**H21**) |
| 42 | Crew | actor | as-is | — | candidate | `core/entities/Crew.xml` `Name`, `Lead`, `Shift` |
| 43 | Supplier | actor | as-is | — | candidate | `core/entities/Supplier.xml`; referenced by `Contract` and `Part` |
| 44 | ContractStarted | event | as-is | — | candidate | `core/entities/Contract.xml` `StartsOn:datetime` |
| 45 | Expiring — `If(EndsOn < Today() + Days(30), true, false)` | read-model | as-is | — | candidate | `core/formulas/Contract_Expiring.txt` — the 30 days is unexplained (**H13**) |
| 46 | on a schedule, evaluate then set then notify | policy | as-is | — | candidate | `core/workflows/ContractRenewal.xml` `trigger=scheduled` |
| 47 | ContractRenewed | event | as-is | — | candidate | `core/workflows/ContractRenewal.xml` — no renewal date field exists (**H16**) |
| 48 | ContractEnded | event | as-is | — | candidate | `core/entities/Contract.xml` `EndsOn:datetime` |
| 49 | WarrantyExpired | event | as-is | — | candidate | `core/entities/Warranty.xml` `ExpiresOn:datetime`, `Asset` |
| 50 | ReorderFlag — `If(OnHand < 5, true, false)` | read-model | as-is | — | candidate | `core/formulas/Part_ReorderFlag.txt` — no policy reacts to it (**H9**) |
| 51 | SystemUser | external-system | as-is | — | candidate | `core/entities/WorkOrder.xml` `CreatedBy:lookup→SystemUser` — target is not an entity in this export |
| 52 | Asset | aggregate | as-is | — | candidate | degree 14, the graph's **only** articulation point; 8 entities point at it (**H10**) |
| 53 | WorkOrder | aggregate | as-is | — | candidate | 15 attributes, 4 relationships, 2 workflows, 2 formulas |
| 54 | PartsRequest | aggregate | as-is | — | candidate | 10 attributes, 2 workflows, 1 formula |
| 55 | CostCentre | aggregate | as-is | — | candidate | `core/entities/CostCentre.xml` `Code`, `Budget` — declares no relationships of its own (**H10**) |
| 56 | Region | aggregate | as-is | — | candidate | `core/entities/Region.xml` `Code` — declares no relationships of its own (**H10**) |
| 57 | Category | aggregate | as-is | — | candidate | `core/entities/Category.xml`; `Parent:lookup→Category` — self-referencing, no cycle guard (**H23**) |
| 58 | Depot | aggregate | as-is | — | candidate | `core/entities/Depot.xml` `Capacity`, `Region`; referenced by `Employee`, `Shift`, `Asset.Owner` |

**Grammar the corpus could not supply.** Not one **command** is named anywhere in 65 files: the
export records entities, form layouts, scheduled/triggered automations and calculated fields, but
never an imperative. Every `Actor / command` cell above is either an actor inferred from a lookup
target or a dash. Commands are **H17** and they need a person, not another script.

`3-decompose` note: rows are grouped by business thread for readability only. **No boundary is
asserted here** — see `../../../.ddd-flow/mine/reports/graph.md` for the cluster candidates and the
warning attached to them.
