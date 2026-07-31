# FleetOps — ubiquitous language (mined; no human holder for any entry)

**Every entry is `candidate` and no entry has a human holder.** `Held by` names the artifact that
holds the definition, because the rule is that a definition without a holder cannot be challenged
later — and a *file* is the weakest possible holder. Attribution for all of it:
`fleetops-exporter 4.2`, packages installed 2017-01-30 … 2023-08-02, mined 2026-07-30.

In a structured corpus the collisions below were **measured, not elicited**
(`.ddd-flow/mine/stage6_polysemy.py`; report at `.ddd-flow/mine/reports/polysemy.md`):
55 distinct attribute names, 9 appear in more than one container, **3 of those carry more than one
sense**, and a further **10 names are an attribute on one entity *and* an entity in their own
right**. Two same-named fields with different types or different reference targets are two senses —
proven, not tallied.

## Collisions — kept side by side, deliberately unresolved

| Term | Definition | Held by | Status |
|---|---|---|---|
| Cost | an amount of money (`decimal`) | `core/entities/{Asset,Contract,FuelLog,Part,WorkOrder}.xml` | candidate |
| Cost | **the cost centre an employee is charged to** (`lookup→CostCentre`) | `core/entities/Employee.xml` Attribute[3] | candidate |
| Cost | free text (`string`) | `core/entities/PartsRequest.xml` Attribute[4] | candidate |
| Owner | the depot an asset belongs to (`lookup→Depot`) | `core/entities/Asset.xml` Attribute[1] | candidate |
| Owner | the employee responsible for a work order (`lookup→Employee`) | `core/entities/WorkOrder.xml` Attribute[1] | candidate |
| Owner | a role, from an unexported option set (`picklist→owner_role`) | `core/entities/PartsRequest.xml` Attribute[5] | candidate |
| Owner | free text (`string`) | `core/entities/Depot.xml` Attribute[1] | candidate |
| Status | an asset's condition (`picklist→asset_status`) | `core/entities/Asset.xml` Attribute[7] | candidate |
| Status | a work order's progress (`picklist→wo_status`) | `core/entities/WorkOrder.xml` Attribute[5] | candidate |
| Downtime | an occurrence: an asset was down for `Hours` for a `Reason` | `core/entities/Downtime.xml` (an entity) | candidate |
| Downtime | a quantity on one work order (`decimal`) | `core/entities/WorkOrder.xml` Attribute[9] | candidate |
| Inspector | free text (`string`) | `addon/entities/Inspection.xml` Attribute[2] | candidate |
| Inspector | an employee (`lookup→Employee`) | `core/entities/Inspection.xml` Attribute[4] | candidate |
| Result | free text (`string`) | `addon/entities/Inspection.xml` Attribute[1] | candidate |
| Result | a value from an unexported option set (`picklist→result`) | `core/entities/Inspection.xml` Attribute[2] | candidate |
| ModifiedOn | an author-defined timestamp on assets only | `core/entities/Asset.xml` `ModifiedOn:datetime` | candidate |
| fo_modifiedon | the platform's own row timestamp, on 34 of 39 entity files | `platform="true"` columns | candidate |

`Inspector` and `Result` are the same word meaning two things in **two packages of the same
system** — recorded as `conflict` facts with both locators
(`.ddd-flow/mine/out/conflicts.jsonl`), not reconciled. See **H4**.

## Names that are an entity *and* a field

`Asset` · `Category` · `CostCentre` · `Depot` · `Downtime` · `Part` · `Region` · `Shift` ·
`Supplier` · `WorkOrder`. Nine are `lookup` fields pointing at the entity of the same name — a
reference, not a second sense. **`Downtime` is the exception**: on `WorkOrder` it is a `decimal`,
so the word means an occurrence in one place and a duration in another (**H8**).

## Same word, one sense — recorded so the list above is not cherry-picked

| Term | Definition | Held by | Status |
|---|---|---|---|
| Name | a human label (`string`) | 15 entities | candidate |
| Code | a short identifier (`string`) | `CostCentre`, `Region` | candidate |
| Asset | the thing maintained (`lookup→Asset`) | 8 entities point at it | candidate |

## Glossary — subjects (definition derived from structure, never from a person)

| Term | Definition | Held by | Status |
|---|---|---|---|
| Work Order | display name of `WorkOrder`; carries `OpenedOn`, `ClosedOn`, `Priority`, `Status`, `Cost`, `Downtime`, `CostCentre`, `Asset`, `Owner`, `Notes` | `core/entities/WorkOrder.xml` `<Display>` | candidate |
| Parts Request | display name of `PartsRequest`; `WorkOrder`, `Part`, `Qty`, `Cost`, `Owner`, `ApprovedBy` | `core/entities/PartsRequest.xml` `<Display>` | candidate |
| Asset | `SerialNo`, `Category`, `Owner→Depot`, `Meter`, `Cost`, `AcquiredOn`, `Status`, `ModifiedOn` | `core/entities/Asset.xml` | candidate |
| Depot | `Address`, `Capacity:int`, `Region`, `Owner:string` | `core/entities/Depot.xml` | candidate |
| Employee | `FullName`, `Trade:picklist→trade`, `HiredOn`, `Depot`, `Cost→CostCentre` | `core/entities/Employee.xml` | candidate |
| Crew | `Name`, `Lead→Employee`, `Shift→Shift` | `core/entities/Crew.xml` | candidate |
| Shift | `Name`, `StartsAt:datetime`, `Depot` | `core/entities/Shift.xml` | candidate |
| Inspection | `Name`, `Result`, `Inspector`, `Asset`, `InspectedOn` | `core/entities/Inspection.xml` | candidate |
| Incident | `Name`, `Asset`, `Severity`, `OccurredOn`, `ReportedBy→Employee` | `core/entities/Incident.xml` | candidate |
| Downtime | `Asset`, `Hours:decimal`, `Reason:picklist→reason` | `core/entities/Downtime.xml` | candidate |
| MeterReading | `Asset`, `ReadOn`, `Value:decimal` | `core/entities/MeterReading.xml` | candidate |
| FuelLog | `Asset`, `Litres`, `Cost`, `LoggedOn` | `core/entities/FuelLog.xml` | candidate |
| PmSchedule | `Name`, `Asset`, `IntervalDays:int`, `LastRun` — "PM" is never expanded anywhere | `core/entities/PmSchedule.xml` | candidate |
| Warranty | `Asset`, `ExpiresOn` | `core/entities/Warranty.xml` | candidate |
| Contract | `Name`, `Supplier`, `Cost`, `StartsOn`, `EndsOn` | `core/entities/Contract.xml` | candidate |
| Supplier | `Name`, `Tin`, `Region` — "Tin" is never expanded | `core/entities/Supplier.xml` | candidate |
| Part | `Sku`, `Supplier`, `OnHand:int`, `Cost` | `core/entities/Part.xml` | candidate |
| Category | `Name`, `Parent→Category` — a self-referencing hierarchy | `core/entities/Category.xml` | candidate |
| Region | `Name`, `Code` | `core/entities/Region.xml` | candidate |
| CostCentre | `Name`, `Code`, `Budget:decimal` | `core/entities/CostCentre.xml` | candidate |

## Glossary — derived vocabulary (11 formula files, all outside the entity model)

| Term | Definition | Held by | Status |
|---|---|---|---|
| TotalCost | `Cost + Sum(PartsRequest.Cost) * 1.1` (rollup) | `core/formulas/WorkOrder_TotalCost.txt` | candidate |
| SlaBreached | `ClosedOn > OpenedOn + Hours(Priority.SlaHours)` | `core/formulas/WorkOrder_SlaBreached.txt` | candidate |
| NeedsApproval | `Cost > 5000` | `core/formulas/PartsRequest_NeedsApproval.txt` | candidate |
| ReorderFlag | `OnHand < 5` (rollup) | `core/formulas/Part_ReorderFlag.txt` | candidate |
| BookValue | `Cost - (Cost * 0.15 * YearsSince(AcquiredOn))` | `core/formulas/Asset_BookValue.txt` | candidate |
| Utilisation | `Sum(MeterReading.Value) / Max(Downtime.Hours, 1)` | `core/formulas/Asset_Utilisation.txt` | candidate |
| NextPmDue | `PmSchedule.LastRun + Days(PmSchedule.IntervalDays)` (rollup) | `core/formulas/Asset_NextPmDue.txt` | candidate |
| Occupancy | `Count(Asset) / Max(Capacity, 1)` (rollup) | `core/formulas/Depot_Occupancy.txt` | candidate |
| Expiring | `EndsOn < Today() + Days(30)` | `core/formulas/Contract_Expiring.txt` | candidate |
| CostPerLitre | `Cost / Max(Litres, 0.01)` | `core/formulas/FuelLog_CostPerLitre.txt` | candidate |
| OpenWorkOrders | `Count(WorkOrder where Owner = this and Status <> 'closed')` | `core/formulas/Employee_OpenWorkOrders.txt` | candidate |

## Vocabulary the export names but does not define

8 picklist option sets — `asset_status`, `wo_status`, `priority`, `severity`, `result`, `reason`,
`trade`, `owner_role` — are **named with zero option values** anywhere in 65 files (**H1**). The
only state literal in the whole corpus is `'closed'`, inside one formula. `Priority.SlaHours` is
referenced by a formula and defined nowhere (**H7**). `SystemUser` is a lookup target with no
entity behind it.

**Localisation is not a language finding.** 102 labels, in `lcid` 1033 / 1066 / 1036 only; every
non-1033 value is the 1033 value plus a language suffix, so no locale carries a different *meaning*
(measured by `stage3_extract.py --filters default`, filter `nondefault-locale-labels`, 68 dropped).
