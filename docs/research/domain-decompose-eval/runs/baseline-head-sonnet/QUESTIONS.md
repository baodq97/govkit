# Targeted questions (domain-decompose, step 5)

Per the skill: ask only where boundaries/ownership are genuinely ambiguous, batch them, and
proceed on a stated assumption rather than blocking. Each question below is also reflected as a
flag inside the model (`confidence: inferred` / `confidence: gap` in the relevant `model.yaml`, or
a row in `context-map.md`'s Conflicts table).

## Q1 — Is Pricing core or supporting?
README calls Allocation out explicitly ("This is where we win or lose against competitors"), but
never says that about Pricing, even though Pricing has a nontrivial utilization-based discount
floor. Is Pricing a second core differentiator alongside Allocation, or supporting (necessary,
serves the core capability but isn't itself the differentiator)?

**Assumption proceeded on:** `supporting`. The narrative reserves "differentiator" language for
Allocation only; Pricing's own description frames it as a service role ("publishes each quote for
the rentals team to consume"), not a stated competitive edge.

## Q2 — Is DeliveryRun an entity or a value object?
Logistics' only aggregate root, `DeliveryRun`, has no explicit identity field in code (no `Id`),
yet it is the aggregate root for its context. Is it meant to stay a lightweight VO snapshot, or
does it need its own id/lifecycle (e.g. planned → in-transit → delivered) as the business grows?

**Assumption proceeded on:** modeled as an **entity** (an aggregate root needs identity by
definition), with the missing `Id` field flagged as a likely implementation gap rather than a
deliberate value-object design.

## Q3 — Does Rentals actually depend on Allocation?
README's Rentals description ("turning a quote and a reservation into a booked order") implies a
dependency on Allocation, but `RentalOrderService.Place()` takes a bare `assetTag` string, never
calls Allocation, and never handles `EquipmentAllocated`. Is this integration simply not yet
wired in code, or does Rentals intentionally trust that the caller already confirmed the
reservation before invoking `Place()`?

**Assumption proceeded on:** recorded as a flagged gap (candidate `Rentals -> Allocation`
relationship, `confidence: gap`) rather than inventing the wiring — the model documents it as
unresolved, not as an asserted relationship.

## Q4 — Where does ErpSync's clean AssetRecord land?
`NightlyErpSyncJob` produces a clean `AssetRecord { Tag, Category }` via `IAssetWriter.Upsert`, but
no concrete writer/consumer is shown. Catalog's `Equipment { Tag, Category }` has a matching shape.
Does ErpSync feed Catalog's equipment list, Allocation's fleet directly, or a separate asset store
not modeled here?

**Assumption proceeded on:** an inferred, low-confidence `ErpSync -> Catalog` edge
(`confidence: inferred`), flagged for confirmation rather than asserted as fact.

## Q5 — Is CrmImport its own context, or just a label on Accounts?
`config/teams.yaml` lists `crm-import` as its own module under the platform team, distinct from
`accounts` — but the code puts both the CRM-import job and the `SalesAccount` aggregate/rule in one
`RentField.Accounts` namespace. Is CrmImport meant to become its own bounded context (splitting
ingestion from the SalesAccount aggregate), or is "crm-import" simply teams.yaml's ownership label
for the same Accounts context?

**Assumption proceeded on:** modeled as **one** context, `Accounts`, matching the actual code
module boundary — not splitting on an unconfirmed teams.yaml label alone.

## Q6 — Is the platform-wide discount ceiling actually enforced by Pricing?
`SharedDomainRules.GlobalRules.MaxDiscountRate` (0.35) is documented as the ceiling "every module"
must use, but `PricingEngine`'s actual floor logic never references it — it computes an independent
utilization-based floor instead (`0.60 + 0.40 × utilization`). Is `MaxDiscountRate` dead/vestigial
for Pricing, or is this a real drift where Pricing should also enforce the 0.35 ceiling?

**Assumption proceeded on:** recorded as-is in `context-map.md`'s Conflicts table without picking a
winner — this is a code-vs-code inconsistency (not a draft-vs-shipped case), so no source is
obviously authoritative; left for a human decision.

## Q7 — Should Documents be its own bounded context?
Documents (file storage with an owner-only-delete rule) is never mentioned in README's "What the
platform does" list — it surfaces only from code and `teams.yaml`. Should it stay its own bounded
context (as modeled here), or fold into whichever context owns each linked entity (rental documents
live in Rentals, account documents live in Accounts)?

**Assumption proceeded on:** modeled as its own generic context — it matches an actual code module
boundary and its own row in `teams.yaml` (`platform: owns: [... documents ...]`).
