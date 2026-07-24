# Logistics API (DOMAIN-0004, supporting)

Plan depot hand-offs and delivery runs for committed units. No aggregate of its own — a transaction
script over `DeliveryRun` records built from Allocation's `EquipmentAllocated` event.

## Resource / event mapping

| Domain element | Kind | API surface |
|---|---|---|
| `DeliveryRun` | record (no aggregate) | `/delivery-runs` collection + `/delivery-runs/{runId}` item |
| `Hand-off` | state transition | `PUT /delivery-runs/{runId}/hand-off` (singleton sub-resource, idempotent) |
| `EquipmentAllocated` (Allocation) | inbound event | **subscribes** to Allocation's `equipmentAllocated` webhook to seed a run |

## Shared Kernel note (from domain)

Logistics and Allocation are one Fulfilment squad and share the `Reservation` / `EquipmentAllocated`
shapes **directly** (Shared Kernel / Partnership — highest coupling among cooperating patterns). The
`EquipmentAllocatedEvent` schema in this spec is the same shape Allocation publishes, changed only by
mutual consent. Recorded as real coupling, acceptable because one team owns both.

## Business rules

None captured in the domain. `status` value set (`planned`/`handed_off`/`delivered`) is a **flagged
assumption** (QUESTIONS Q-A7) — the domain names `DeliveryRun` and `Hand-off` but not a full
lifecycle.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body |
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `delivery-run-not-found` | unknown `runId` |
| 409 | `invalid-transition` | hand-off from an incompatible state |

Versioning: URI-versioned `/v1`.
