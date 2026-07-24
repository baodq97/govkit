# Questions the skills would normally ask — and the assumption taken instead

Per instructions, this run did not stop to ask a human. Each place either skill's own text says
"ask", "confirm", or flags a genuine ambiguity, the question is recorded here with the assumption
made so the run could continue, and where in the output it's also flagged inline.

## api-designer

1. **Customer Accounts: does the public API need a write path at all?**
   The domain model says `tactical_pattern: crud` ("CRUD over conformed records"), but its only
   *stated* consumer is Rentals' read-only "customer lookup (query)"; the write path (nightly CRM
   import) isn't said to run through a public API.
   **Assumption:** expose **GET only** in `docs/api/customer-accounts/openapi.yaml`; treat the
   nightly import as an internal batch job outside the public contract. Flagged in
   `docs/api/customer-accounts/README.md`.

2. **Documents: is `linkedEntityId` a single polymorphic reference, or should it be two typed
   columns (`rentalId`, `accountId`)?**
   The domain model names only `LinkedEntityId` (singular, untyped).
   **Assumption:** kept as one `linkedEntityId` + an added `linkedEntityType` enum
   (`rental`/`account`) disambiguator, at both the API and data layers. Flagged in
   `docs/api/documents/README.md` and `docs/data/documents/README.md`.

3. **Pricing: should `POST /quotes` return 200 or 201, and should `GET /quotes/{id}` exist?**
   The domain model has an open, unresolved question: whether `Quote` should become a persisted
   entity.
   **Assumption:** treated `Quote` as still stateless today — `POST /quotes` returns **200**
   (computed representation, no resource identity), no `GET /quotes/{id}`. Flagged in
   `docs/api/pricing/README.md`.

4. **Identity: does this context own any endpoint at all, or is it purely a security scheme?**
   The domain model calls Identity "cross-cutting… no domain model" but its purpose statement
   also says "resolve their identity."
   **Assumption:** added exactly one endpoint, `GET /me` (identity resolution only — no
   login/token issuance, which stays at Auth0). Flagged in `docs/api/identity/README.md`.

5. **Payments / Notifications: should the implied-but-not-wired links to Billing/Rentals be
   modelled as inter-service calls?**
   The domain model explicitly says both links are "implied by the narrative but not wired in the
   reviewed code."
   **Assumption:** not modelled as a dependency in either spec; each exposes only the capability
   its own purpose statement states, invoked by any authorized caller. Flagged in both READMEs.

6. **Rentals: should `POST /rental-orders` validate a prior committed reservation / valid quote?**
   The domain model explicitly says no business rules are captured for Rentals and flags this
   exact gate as an open question in its own `QUESTIONS.md` (not present in this fixture, but
   referenced from `docs/domain/rentals/README.md`).
   **Assumption:** no such validation is added — request-shape checks only. Flagged in
   `docs/api/rentals/README.md`.

## data-model

7. **Tenancy model.** The domain model never states whether RentField is single-tenant or
   multi-tenant SaaS.
   **Assumption:** single-tenant (RentField runs its own business; `SalesAccount`s are customers,
   not co-tenants). No `tenant_id`/`org_id` anywhere. Recorded as the cross-cutting policy in
   `docs/data/INDEX.md`, explicitly flagged for confirmation.

8. **Soft delete vs. hard delete, system-wide.** `references/domain-to-schema.md` says this is
   "propose, confirm," not default-on.
   **Assumption:** hard delete everywhere, no `deleted_at`. Grounded in the domain model's own
   declined "Audit / Activity-history" candidate ("no legal or retention angle"). Recorded in
   `docs/data/INDEX.md`, flagged as revisitable if a retention requirement appears.

9. **Optimistic locking (`version` column) — which tables, if any?** Also "propose, confirm" per
   the reference.
   **Assumption:** `version` added only to `reservation` (the domain's one High-risk/core
   aggregate). Not added to `rental_order` or any other table. Flagged in
   `docs/data/allocation/README.md` and `docs/data/INDEX.md`.

10. **Maintenance record's primary key.** The domain model never explicitly labels an attribute
    as `MaintenanceRecord`'s identifier; it only implies one record per unit ("Allocation queries
    `IsOutOfService(assetTag)`").
    **Assumption:** used `asset_tag` directly as the table's PK (natural key), rather than adding
    a redundant surrogate `id`. Flagged as an inference in `docs/data/maintenance/README.md`.

11. **`Depot.id` and `Category.code` typing.** The domain names these as the identifying
    attributes but gives no format (uuid vs. human-assigned code).
    **Assumption:** typed both as `text` (business-meaningful codes, consistent with reference/
    master-data conventions), used directly as PK with no added surrogate. Flagged in
    `docs/data/catalog/README.md`.

12. **`category.parent_code` delete behavior.** Not stated by the domain.
    **Assumption:** `ON DELETE RESTRICT` (block deleting a category that still has children).
    Flagged in `docs/data/catalog/README.md`.

13. **`tag.label` uniqueness.** Not stated by the domain.
    **Assumption:** `UNIQUE` (a canonical tag vocabulary, not free per-use text). Flagged in
    `docs/data/catalog/README.md`.

14. **Document storage fields (`filename`, `content_type`, `storage_uri`).** Not named verbatim
    by the domain model, but required for "an uploaded file" to exist as a row at all.
    **Assumption:** added as mechanical, non-business fields. Flagged in
    `docs/data/documents/README.md`.

## Explicitly NOT treated as an open question (already resolved by the domain model itself)

The context-map's own "Conflicts & reconciliation" table (discount floor, discount ceiling,
two-depots, Maintenance location, Availability module, reference-data area) is already resolved
in favor of the shipped code by `domain-decompose`; neither skill re-opens those here — they were
read as settled input, not re-litigated.
