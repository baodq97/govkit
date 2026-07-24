# RentField — Context Map

Strategic decomposition of the RentField platform (B2B heavy-equipment rental + field
service). Modelled from the domain narrative (`README.md`), the shipped code's domain
comments, the stale whiteboard draft (`docs/domain-notes-draft.md`), the ERP integration
notes, `config/teams.yaml`, and the audit-log migration.

> **Draft, not final truth.** Boundaries and aggregates will move as understanding deepens.
> Everything below starts `status: draft`, `owner: TBD` — setting status/owner is a human act.
> Where the stale draft and the shipped code disagree, the shipped code wins and the divergence
> is recorded (Conflicts, below), never silently blended.

## Context map

```mermaid
graph LR
  ERP[("Legacy ERP\n(external)")] -->|ACL — quarantine + translate| AssetSync[Asset Sync]
  CRM[("3rd-party CRM\n(external)")] -->|conformist — mirror verbatim| CustomerAccounts[Customer Accounts]

  AssetSync -->|clean asset master data| Allocation
  AssetSync -->|clean asset master data| Maintenance
  AssetSync -->|clean asset master data| Catalog

  Maintenance -->|out-of-service state (query)| Allocation
  CustomerAccounts -->|customer ref (query)| Rentals

  Pricing -->|Published Language: PriceQuoted v2 / OHS| Rentals
  Allocation -->|EquipmentAllocated + Shared Kernel / Partnership| Logistics
  Allocation -.->|DepotTransferRequested — UNCONSUMED| ManualTransfer[["depot transfer\n(planned by hand)"]]

  Rentals -->|Customer-Supplier: RentalOrderPlaced / RaiseInvoice| Billing
  Billing -.->|charge card (implied, not wired)| Payments
  Rentals -.->|receipt (implied, not wired)| Notifications
  Identity([Identity / Auth0 — cross-cutting login])

  classDef core fill:#ffd,stroke:#b90,stroke-width:2px;
  classDef ext fill:#eee,stroke:#999,stroke-dasharray:4;
  class Allocation,Pricing core;
  class ERP,CRM ext;
```

**Legend.** Solid arrow = grounded in code/prose. Dashed = implied-but-not-wired or an
orphan/unconsumed edge (see Event-flow continuity). Yellow = core domain. `Asset Sync` and
`Customer Accounts` are both nightly imports from external systems, but they use **different**
integration patterns on purpose — ACL vs Conformist (see Sharing levels + notes).

## Core Domain Chart

| Bounded Context | Sub-domain type | Why | Tactical depth |
|---|---|---|---|
| **Allocation** | **core** | "The heart of the business… where we win or lose against competitors, and the rules here change often." Owns the no-double-commit invariant. | Full domain model |
| **Pricing** | **core** | The utilization-derived floor "is the rule that makes this ours" — a protected invariant a rep cannot breach. | Full domain model |
| Rentals | supporting | Orchestrates: turns a quote + a reservation into a booked order, hands it to billing. No differentiating invariant of its own. | Transaction script (1 light aggregate to carry the `RentalOrderPlaced` event) |
| Logistics | supporting | Plans depot hand-offs / delivery runs. Record-keeping; shares Allocation's kernel (same squad). | Transaction script, no aggregate |
| Maintenance | supporting | "Routine record-keeping… Useful, not a differentiator." CRUD + one next-due calculation. | Transaction script (CRUD + a calc), no aggregate |
| Catalog | **master-data / reference** (generic) | Category tree, depots, tags. "Pure lookups… no rules to enforce." Resolves the draft's open reference-data question. | Plain lookup CRUD — aggregates **declined** |
| Billing | supporting | Internal invoicing service owned by another team; we hold only the `IInvoicingPort` contract. | No model here (owned by Billing team) |
| Customer Accounts | supporting | Customer master data conformed verbatim from the CRM. | Conformist CRUD, no aggregate |
| Asset Sync | supporting | Anti-corruption layer over the legacy ERP; produces our clean asset master records. | ACL adapter, no aggregate |
| Documents | supporting | Files attached to rentals/accounts; one stated rule (owner-only delete). | Transaction script, no aggregate |
| Payments | **generic** | Card payments via Stripe — commodity, bought behind a thin adapter. | Bought adapter, no model |
| Identity | **generic** | Login via Auth0 — commodity. | Bought adapter, no model |
| Notifications | **generic** | Transactional email via SendGrid — commodity. | Bought adapter, no model |

Only **two** contexts (Allocation, Pricing) carry a real domain model. The other eleven are
deliberately right-sized to nothing / a transaction script — an empty aggregate list on a
supporting, reference, or generic context is the correct output, not a gap. Imposing aggregate
machinery on all thirteen would be the cargo-cult failure this decomposition avoids.

## Load-bearing extraction seam

**The `PriceQuoted` Published-Language contract (Pricing → Rentals) is the load-bearing seam;
Pricing is the first service to extract on the monolith→microservices path.** It is already the
cleanest cut in the system: `Pricing.Contracts` is a versioned DTO (`v1 → v2`) that other
modules depend on *instead of* Pricing internals, and `Rentals.csproj` is wired to reference
`Pricing.Contracts.csproj` only — never Pricing itself. Splitting Pricing out therefore breaks
no internal coupling; the contract already absorbs the change. Keep the contract as its own
Published Language artifact rather than letting it dissolve back into Pricing.

Second candidate seam: the **Asset Sync ACL** — it already quarantines the legacy ERP behind a
translation boundary, so it can be lifted out with only the ERP SOAP client behind it.

## Conflicts & reconciliation

The stale whiteboard draft (`docs/domain-notes-draft.md`) disagrees with the shipped code in
several places. Per the reconcile discipline: **shipped/running code beats a draft doc**, each
divergence is recorded (never blended into a hybrid that exists in neither source), and each is
flagged for a human.

| Concept | Source A — draft doc | Source B — shipped code / README | Chosen (authoritative) | Flag for human |
|---|---|---|---|---|
| Discount floor | "Pricing is just list price minus discount. **No minimum.**" | `PricingEngine`: floor = `listRate × (0.60 + 0.40 × utilization)`; a rep cannot discount below it. README: "a floor below which a rep may not discount." | **code** | Confirm the draft "no minimum" note is obsolete. |
| Discount ceiling definition | `GlobalRules.MaxDiscountRate = 0.35` (flat, global) | `PricingEngine` enforces a **utilization-derived** floor, not a flat 0.35 ceiling. | **code (Pricing)** | `GlobalRules` ceiling is a contradictory duplicate of the real Pricing rule — dissolve it (see Sharing levels / anti-pattern). |
| Same unit, two depots | "A single unit **can be held at two depots at once**; first customer wins." | `AllocationService.Commit`: "the same physical unit can never be committed twice for overlapping windows — not even from a different depot." README: "without ever promising the same unit twice." | **code** | Confirm the draft note is obsolete; it inverts the core invariant. |
| Maintenance location | "Maintenance is tracked **inside Allocation** — just another unit status; no own module." | Separate `MaintenanceScheduleService`; Allocation only *reads* out-of-service state via `IMaintenanceState`. | **code** | Confirm Maintenance is its own context, not an Allocation status. |
| Availability module | "**Availability** — a standalone module… separate from anything else. Allocation picks a unit once Availability says it's free." | No Availability module exists. Availability is enforced *inside* Allocation — the reservation ledger's overlap check IS the availability rule. | **code** | Confirm there is no separate Availability context (see Declined candidates). |
| Reference-data area | Open question: "separate reference-data area, or per-module lists?" | `Catalog` holds categories, depots, tags. | **code (Catalog)** | Resolved — Catalog is the reference-data context. |

## Sharing levels (what crosses each boundary)

Every artifact shared between two contexts is labelled with its sharing level. Mislabelling one
couples contexts by stealth.

| Shared artifact | Between | Level | Coupling / cost |
|---|---|---|---|
| `Money`, `UnitOfMeasure` (`BuildingBlocks`) | all contexts | **Building Blocks** | ~0. Technical base types, "no business policy" (per their own code comments). Version like a library. **Not** a Shared Kernel despite being shared widely. |
| `PriceQuoted` (`Pricing.Contracts`, v2) | Pricing → Rentals | **Published Language** (+ OHS) | Medium. Versioned contract; each side translates at its own edge; the healthy default. |
| `Reservation`, `EquipmentAllocated` | Allocation ↔ Logistics | **Shared Kernel** (Partnership) | **Highest** among cooperating patterns. Mutual-consent change, drift risk. **Acceptable here** because one squad (Fulfilment) owns both and ships them together — but it is real coupling, not free. |
| `GlobalRules` — customer definition, discount ceiling, allocation priority, rounding policy | forced on **all** modules | **Anti-pattern** — a single universal model | Highest coupling *and* wrong shape. See below. |
| Catalog's `Equipment` entity (Rentals' `TODO`: "share Catalog's `Equipment` entity directly") | Rentals ↔ Catalog | would-be **Shared Kernel** | **Flag.** Sharing a domain *entity* between two contexts is Shared Kernel coupling (highest). Prefer, in order: duplicate (Rentals already has its own private `Equipment`) → extract + Published Language → Shared Kernel (last resort). Do **not** action the TODO as written. |

### Anti-pattern flag — `SharedDomainRules` / `GlobalRules`

`src/SharedDomainRules/README.md` states "Every module MUST inherit… so no module can define
'customer', 'active', or the discount ceiling differently from another." That is the **single
universal model** bounded contexts exist to eliminate (ddd-methodology §2.4, correction #3). The
terms it centralises are **polysemic** across contexts — a "customer" in Customer Accounts (a
CRM-conformed account) is not the "customer" a Rental order references; the real discount rule is
Pricing's utilization floor, not a flat `0.35`; allocation priority belongs to Allocation.

**Recommendation (flag for a human — not enacted here):** dissolve `GlobalRules`. Each context
owns its own definition of these terms. Keep only the genuinely technical, policy-free rounding
as a Building Block (like `Money`). Cross-cutting rules everyone must obey belong to
**governance / architecture tests**, not a shared domain model.

## Event-flow continuity check

Every emitted domain event should have at least one consumer; every cross-context arrow should
map to an event (or an explicit query dependency).

| Domain event | Emitted by | Consumed by | Status |
|---|---|---|---|
| `PriceQuoted` | Pricing | Rentals (`On(PriceQuoted)`) | OK — Published Language |
| `EquipmentAllocated` | Allocation | Logistics (`On(EquipmentAllocated)`) | OK |
| `RentalOrderPlaced` | Rentals | Billing / Invoicing (`On(RentalOrderPlaced)`) | OK |
| `DepotTransferRequested` | Allocation | **— nobody —** | **ORPHAN.** Code comment: "Nothing listens for this yet — the transfer still gets planned by hand in the depot office." |

Non-event cross-context arrows (all accounted for): `Maintenance → Allocation` is a synchronous
**query** (`IsOutOfService`), not an event; `Asset Sync → Allocation/Maintenance/Catalog` and
`CRM → Customer Accounts` are **data syncs**, not events. No arrow is left unexplained.

**Flag:** `DepotTransferRequested` is a real unconsumed edge — either wire a depot-transfer
handler or accept manual planning as the decision. A handler is **not** invented here (the input
never describes an automated transfer flow).

## Declined candidates (noun clusters that are NOT contexts)

Ran the capability-vs-context test (ddd-methodology §2.6): a context must own a domain model with
real business invariants. These clusters recur in the fixture but own none, so they are declined
and recorded here rather than carved into boundaries.

| Candidate | Why declined | Model it instead as | Escalation condition (what would flip it) |
|---|---|---|---|
| **Ownership / Permissions** | "owner" is **polysemic**, and each reading is correct locally: `SalesAccount.SalesRepId` = the rep who owns the commercial relationship; `Document.OwnerUserId` = the uploader who may delete; `Reservation.DepotId` = the depot custodian of a committed unit. A single "Ownership" context would force one global `owner` serving none of them. | A **per-context ownership projection** each context publishes toward an authorization capability. Namespaced relations keep meanings apart: `account:sales-rep-owner`, `document:uploader-owner`, `reservation:custodian-depot` — not one global `Owner`. | Never flips in an ordinary business; only if a dedicated policy/authorization product became core. |
| **Audit / Activity-history** | Sales' "activity history on orders" is explicitly "a convenience… there is no legal or retention angle." The `audit_log` migration is one append-only table. Its would-be invariants (retention, legal hold, integrity) are thin. | A **cross-cutting capability + an append-only store** (the `audit_log` table, one writer, a few queries) — not an aggregate or repository. | Regulated domain (finance/healthcare) or the audit trail *itself becomes the product* → retention, legal hold, chain-of-evidence become real invariants → promote to a bounded context. |
| **Availability** | Proposed as a standalone module by the stale draft. In the shipped code, availability is not separable — the overlap check on the reservation ledger inside Allocation *is* the availability invariant. | An **invariant owned by Allocation**, not a context. | Would flip only if availability needed a model independent of committing (e.g. speculative holds across many systems). |
| **SharedDomainRules** as a "shared-kernel context" | It is the single-universal-model anti-pattern, not a context (see anti-pattern flag above). | Per-context models + governance/architecture tests; technical rounding as a Building Block. | — |

## Teams → contexts (from `config/teams.yaml`)

Human/organizational boundaries are the dominant boundary factor, and they line up cleanly here:

- **Fulfilment squad** owns Allocation + Logistics, shares model types, ships together → their
  Shared Kernel / Partnership is a *team* fact, not just a code fact.
- **Pricing squad** owns Pricing (already contract-isolated → cleanest extraction).
- **Commerce** owns Rentals + Catalog.
- **Billing team** runs Invoicing internally; Rentals drives its API → Customer-Supplier.
- **Platform** owns Maintenance, Documents, ERP sync (Asset Sync), CRM import (Customer Accounts).
