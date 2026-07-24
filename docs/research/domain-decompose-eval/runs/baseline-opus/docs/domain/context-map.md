---
title: RentField — Context Map
status: draft
owner: TBD
date: 2026-07-24
---

# RentField — Context Map

RentField is a B2B heavy-equipment rental + field-service platform. This map decomposes it into
bounded contexts, classifies each (core / supporting / generic), names the relationships between
them, and reconciles the conflicts between the shipped code, the README, and an out-of-date draft
whiteboard note. **Running/shipped code wins every conflict; every divergence is recorded below.**

Presented as a **draft to iterate**, not final truth — boundaries and aggregates will move as
understanding deepens.

## Context map

```mermaid
graph LR
  %% External systems (not bounded contexts we own)
  ERP[(Legacy ERP — SOAP)]
  CRM[(Third-party CRM)]
  VendorSDKs[(Stripe / Auth0 / SendGrid)]
  Manual[[Depot office — manual]]

  %% Core (full domain model)
  Pricing -->|open-host / published-language: PriceQuoted v2| Rentals
  Rentals -->|customer-supplier: drives invoice API| Invoicing
  Rentals -->|downstream: reservation| Allocation
  Rentals -->|downstream: category / asset| Catalog
  Rentals -->|downstream: customer identity| Accounts

  %% Allocation + Logistics: one squad, shared types, ship together
  Allocation ---|shared-kernel + partnership| Logistics
  Allocation -->|event: EquipmentAllocated| Logistics
  Allocation -.->|orphan event: DepotTransferRequested — no consumer| Manual
  Maintenance -->|upstream: out-of-service state (query)| Allocation
  Allocation -->|downstream: depot / asset reference| Catalog

  %% Integrations
  ERP -->|ACL: quarantine + translate| ErpSync
  ErpSync -->|clean AssetRecord| Catalog
  CRM -->|conformist: mirror as-is| Accounts

  %% Generic vendor adapters
  Invoicing -->|generic: card charge| VendorIntegrations
  Rentals -->|generic: receipt email| VendorIntegrations
  VendorIntegrations --> VendorSDKs

  %% Documents
  Documents -->|links to| Rentals
  Documents -->|links to| Accounts
```

## Core Domain Chart

| Bounded Context | Sub-domain type | Why |
|---|---|---|
| **Allocation** (`DOMAIN-0001`) | **core** | "The heart of the business… where we win or lose against competitors, and the rules here change often." Commits a physical unit without ever double-promising it. |
| **Pricing** (`DOMAIN-0002`) | **core** | The utilization-derived price floor is "the rule that makes this ours" — a genuine differentiator. |
| **Rentals** (`DOMAIN-0003`) | **core** | Owns the central `RentalOrder` aggregate — the commercial transaction spine. Lighter than Allocation/Pricing; classification is a genuine question (Q1). |
| **Logistics** (`DOMAIN-0004`) | supporting | Plans depot hand-offs / delivery runs. Needed, not a differentiator. Shared kernel + partnership with Allocation. |
| **Maintenance** (`DOMAIN-0005`) | supporting | "Routine record-keeping… useful, not a differentiator." One calculation (next-due). |
| **Invoicing** (`DOMAIN-0006`) | supporting | Internal billing service, custom API driven by Rentals (Customer-Supplier). Not a bought commodity → supporting, not generic (Q2). |
| **Accounts** (`DOMAIN-0007`) | supporting | Customer master; conformist mirror of the external CRM. Carries the real account-owned-by-rep relationship. |
| **Documents** (`DOMAIN-0008`) | supporting | File storage attached to rentals/accounts, with an owner-based delete rule. |
| **Catalog** (`DOMAIN-0009`) | generic *(master-data / reference)* | Category tree, depots, tags — "pure lookups, no rules." Candidate system-of-record for the Equipment/Asset registry. |
| **ErpSync** (`DOMAIN-0010`) | generic *(integration)* | Anti-Corruption Layer over a legacy ERP we don't own. Value is isolation, not modelling. |
| **VendorIntegrations** (`DOMAIN-0011`) | generic | Stripe / Auth0 / SendGrid behind thin adapters — commodity, swappable, no model. |

**Not modelled as domain contexts** (see Cross-cutting concerns below): `SharedDomainRules /
GlobalRules` (a shared-kernel anti-pattern), `BuildingBlocks` (a legitimate technical shared kernel),
and the `audit_log` order activity-history (infrastructural audit metadata, deferred to the data
layer).

## Conflicts & reconciliation

Reconciling three sources that disagree: the **shipped code**, the **README**, and an out-of-date
**draft whiteboard note** (`docs/domain-notes-draft.md`, explicitly "not kept up to date"). Rule:
running/shipped code is authoritative; the divergence is never blended into a hybrid; each is flagged
for a human.

| Concept | Source A says | Source B says | Chosen (authoritative) | Flag for human |
|---|---|---|---|---|
| **Discount policy** | draft note: "**no minimum** — a rep may give it away" | code: `PricingEngine` enforces a utilization-derived **floor** (floor = listRate × (0.60 + 0.40 × utilization)); `GlobalRules.MaxDiscountRate = 0.35` is a **discount ceiling** | **code** — a floor *and* a 35% ceiling both apply | Confirm both mechanisms coexist; retire the draft "no minimum" (Q3) |
| **Double-booking a unit** | draft note: "a single unit **can be held at two depots at once**, first customer wins" | README + `AllocationService.Commit`: "the same physical unit can **never** be committed twice for overlapping windows — not even from a different depot" | **code** — no double-booking, one unit / one place / one renter | Confirm the draft revenue idea is abandoned |
| **Maintenance placement** | draft note: "maintenance tracked **inside Allocation**, just a unit status" | code (`Maintenance` module) + `teams.yaml` (platform owns `maintenance`) + README (separate module): **separate Maintenance context**; Allocation only *queries* out-of-service | **code** — separate Maintenance context; Allocation depends on `IMaintenanceState` | Confirm the split |
| **Availability module** | draft note: "a **standalone Availability module**" | code: no such module — availability (the reservation book + `Overlaps`) lives **inside Allocation** | **code** — availability folded into Allocation | Confirm the merge is intentional |
| **Reference-data ownership** | draft open question: "does each module keep its own lists?" | code: `Catalog` centralizes category / depot / tag lookups | **Catalog** — centralized | Low; confirm Catalog is the reference-data home |

## Cross-cutting concerns (not bounded contexts)

- **`SharedDomainRules` / `GlobalRules` — shared-kernel anti-pattern (flag).** The house rule
  "if a rule could ever matter in more than one module it belongs here, and every module MUST
  inherit `GlobalRules`" is a big-ball-of-mud coupling risk: one code dependency shared by *every*
  context defeats context autonomy. The **rules themselves are real domain knowledge** and are
  captured in each *owning* context below, not invented away:
  - `MaxDiscountRate = 0.35` (discount ceiling) + `Round` (money rounding) → **Pricing**
  - `AllocationPriority = [contract, walk-in, internal]` → **Allocation**
  - `IsCustomer` (customer = renter / prospect / partner-account) + "active rental" definition →
    **Accounts** / **Rentals**
  Recommend dissolving `GlobalRules` into these owners **before** splitting services — otherwise
  every extracted service still shares one library. Flagged for a human (Q4).
- **`BuildingBlocks` (Money, UnitOfMeasure) — legitimate shared kernel.** Neutral technical value
  objects with "no business policy… arithmetic only," shared across contexts on purpose. Keep as a
  shared kernel; distinct from the `GlobalRules` problem.
- **`audit_log` / order activity-history — infrastructural, deferred to the data layer.** Sales
  wants a "who touched this order and when" timeline, explicitly "**no legal or retention angle**…
  a convenience." Per the ownership-vs-audit-metadata rule, this is infrastructural audit metadata,
  **not** a domain aggregate or a domain-event stream — do not model it as a context. Decided and
  applied in the data-model skill. Flag: if the business later attaches legal/retention meaning it
  would promote to a domain concern (Q8).

## Load-bearing extraction seam

**Extract Pricing first, behind its versioned `PriceQuoted` published-language contract.** This is
the cleanest decoupling seam on the monolith → microservices path, and it is **already pre-cut**:
- `PriceQuoted` is a stable, versioned contract (v1 → v2) that "other modules depend on… not on
  anything inside Pricing."
- It lives in its own project (`Pricing.Contracts.csproj`) that `Rentals.csproj` references *while
  being forbidden to reference Pricing internals* — a textbook Open-Host Service / Published
  Language.
- Single known consumer (Rentals), so the blast radius of extraction is small.

**Caveat:** the dominant coupling *debt* is `SharedDomainRules`, not a context boundary. Dissolve
that shared kernel (above) before or alongside the split, or every "service" still shares one code
dependency and is not truly autonomous.

## Event-flow continuity check

Every emitted domain event should have at least one consumer; every cross-context arrow should
correspond to an emitted event (or an explicit synchronous query).

| Event | Emitted by | Consumed by | Status |
|---|---|---|---|
| `EquipmentAllocated` | Allocation | Logistics (`On`) | OK |
| `PriceQuoted` | Pricing | Rentals (`On`) | OK |
| `RentalOrderPlaced` | Rentals | Invoicing (`On`) | OK |
| `DepotTransferRequested` | Allocation | **nobody** — "the transfer still gets planned by hand in the depot office" | **ORPHAN EMIT — flag.** Candidate consumer: Logistics (it already plans hand-offs). Not wired; not inventing a handler (Q7). |
| out-of-service state | Maintenance | Allocation (`IMaintenanceState.IsOutOfService`) | OK — **synchronous query**, not an event (fine) |

No other cross-context map arrow lacks a mechanism.
