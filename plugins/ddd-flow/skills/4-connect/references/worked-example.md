# Worked example — 4-connect

**Input:** the equipment-rental model — contexts `Allocation`, `Logistics`, `Billing`,
`Notifications` — plus a discovery hotspot about units being double-booked across depots.

**Use case chosen:** *"Priority depot transfer, booked and billed"* — the paid add-on, and the
scenario touching the most contexts.

| # | From | Message | Type | To |
|---|---|---|---|---|
| 1 | Depot Planner | `ScheduleTransfer` | command | Logistics |
| 2 | Logistics | `IsUnitAvailable?` | query | Allocation |
| 3 | Allocation | *(response)* | query | Logistics |
| 4 | Logistics | `ReserveUnit` | command | Allocation |
| 5 | Allocation | `EquipmentAllocated` | event | — |
| 6 | Billing | `TransferFeeCharged` | event | — |

**Findings the flow forced out:**

| Smell | Evidence | What it suggests |
|---|---|---|
| Synchronous query chain | 2–4: Logistics asks, then commands, on the same data | check-then-act across a boundary — between 2 and 4 another planner can reserve the same unit |
| Distributed invariant | the no-double-booking rule is enforced by Logistics' check but owned by Allocation's data | the rule belongs to **one** aggregate; Allocation should own `ReserveUnit` end-to-end and answer with success or rejection |

**Proposed change handed back to `3-decompose`:** collapse the check-then-act pair into a
single `ReserveUnit` command that Allocation either accepts or rejects, and record the invariant as
Allocation's. This is the same double-booking hotspot discovery surfaced — the flow is what turned
it from a worry into a located defect with two message numbers on it.

Note what the example does **not** do: it does not move `Billing` into `Logistics` because the two
appear adjacent, and it does not silently edit `docs/domain/allocation/model.yaml`. It writes the
finding, names the change, and leaves the model to the skill that owns it.
