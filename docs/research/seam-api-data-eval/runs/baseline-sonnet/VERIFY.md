# VERIFY — independent re-check of GRADE.md (baseline-sonnet)

Re-read the rubric, re-read the actual runner output under `docs/api/` and `docs/data/`
(not the grader's summary), and re-verified every quote used to support a verdict. Sampled
12 of 16 checks: the only FAIL-adjacent/PARTIAL check in the grade (R1 — no other PARTIALs or
FAILs exist to sample), and 11 PASSes, weighted toward the grader's own "closest call" list
(C2, R5, P2, R3) and the highest-point items (C1=3, C3=3, M2=3).

**Note on sampling requirement:** the task asks for ≥2 PARTIALs and every FAIL. GRADE.md's
results table contains **zero FAILs and exactly one PARTIAL (R1)** — confirmed by reading the
full table. There is nothing else to sample in those buckets; this is a property of the grade
under review, not a shortfall in this verification.

## Checks re-verified

| Check | Grade verdict | Re-verified? | Notes |
|---|---|---|---|
| R1 Bought-adapter no tables/CRUD | PARTIAL 1.5/3 | Verdict holds | data side clean (`docs/data/payments/schema.postgres.sql` "INTENTIONALLY EMPTY..." confirmed verbatim); `docs/api/payments/openapi.yaml` and `docs/api/notifications/openapi.yaml` both confirmed to carry POST+GET-by-id with a persisted-looking `Payment`/`Notification` resource (id, status, createdAt) exactly as quoted; Identity confirmed clean (`/me` only). **Citation defect found** (see Findings). |
| R2 Catalog lookup+CRUD | PASS 2/2 | Confirmed | `CREATE TABLE category/depot/tag` at lines 5/17/27 verified verbatim incl. closing comment; API confirmed list/create/get/replace/delete for categories+depots (tags has list/create/get/delete, no replace — GRADE's "replace" claim slightly overstated for tags but immaterial to the verdict). |
| R3 Maintenance light shape | PASS 2/2 | Confirmed | `CREATE TABLE maintenance_record`, `next_due ... GENERATED ALWAYS AS (...) STORED`, `out_of_service` column, and `/maintenance-records` + `outOfService` filter all verified verbatim at the cited lines. |
| R4 Events not tables | PASS 2/2 | Confirmed | `grep -riE "CREATE TABLE.*(event|outbox|allocated|quoted|placed|transfer)"` over all schemas returns no match (independently re-run); INDEX.md line 69 quote verified near-verbatim. |
| R5 Cross-context id-only | PASS 2/2 | Confirmed | `grep -rn REFERENCES` over all schemas returns exactly one hit, `category.parent_code REFERENCES category` (self-ref) — matches the claim that no cross-context FK exists; rentals' "no FK" comment verified verbatim. |
| C1 Allocation overlap mechanism | PASS 3/3 | Confirmed | `CONSTRAINT reservation_no_double_commit EXCLUDE USING gist (asset_tag WITH =, daterange(window_start, window_end, '[)') WITH &&) WHERE (status = 'committed')` verified verbatim (grader's cited line number is off by ~4 lines — content starts at line 40, not 44 — cosmetic only). |
| C2 Pricing floor mechanism | PASS 2/2 | Confirmed | Formula string verified verbatim including the literal `x` (not `×`) multiplication sign the grader also used; the "computed, read-only" floor characterization traces to `docs/api/pricing/README.md:12` ("computed, read-only"), not just the OpenAPI schema — sourced correctly; the "silent clamping / no 409/422" tension the grader flagged against itself is verified verbatim in the README. |
| C3 PriceQuoted versioned contract | PASS 3/3 | Confirmed | `webhooks: priceQuoted`, `PriceQuotedEventV2`, `contractVersion: { type: string, example: v2 }`, and the "Published Language / Open-Host Service — Rentals depends on Pricing.Contracts... never Pricing internals" sentence all verified verbatim. |
| M2 No global owner table | PASS 3/3 | Confirmed | `grep` for owner/ownership/users tables across all schemas returns nothing; all three per-context projection comments (`sales_rep_id`, `owner_user_id`, `depot_id`) verified verbatim including "not audit metadata" wording. |
| P1 api-designer output contract | PASS 2/2 | Confirmed | `ls docs/api/*/openapi.yaml \| wc -l` = 13, `ls docs/api/*/README.md \| wc -l` = 13, `docs/api/INDEX.md` exists — independently reproduced. |
| P2 data-model output contract | PASS 2/2 | Confirmed | 8 READMEs with a ` ```mermaid ` fence, matching exactly the 8 contexts that have `CREATE TABLE` (allocation, customer-accounts, documents, rentals, asset-sync, logistics, maintenance, catalog); all 13 schemas carry `-- Dialect: PostgreSQL 15+`; `docs/data/INDEX.md` exists. |
| P3 Relationships mapped to deps | PASS 2/2 | Confirmed | ACL quarantine language, Shared-Kernel `EquipmentAllocated` consumption note, and Rentals' `PriceQuoted` subscriber note all verified verbatim in the respective READMEs. |

## Findings

1. **Non-verbatim (composited) quote in R1 — minor, doesn't change verdict.**
   `GRADE.md`'s R1 evidence cites: `docs/data/INDEX.md`: "Payments/Identity/Notifications |
   **none** — bought commodity, no domain model (see README)". The actual file has three
   *separate* table rows, not one combined row:
   ```
   21:| DATA-0011 | Payments      | **none** — bought commodity, no domain model (see README) | draft |
   22:| DATA-0012 | Identity      | **none** — bought commodity, no domain model (see README) | draft |
   23:| DATA-0013 | Notifications | **none** — bought commodity, no domain model (see README) | draft |
   ```
   The grader's citation string never appears verbatim anywhere in the run output — it's a
   synthesized composite of three rows' common text with the three context names joined
   together. This is a technical violation of the rubric's hard citation rule ("the exact
   quoted line(s)"). The underlying claim is factually correct (all three rows really do say
   "none — bought commodity, no domain model"), and it does not affect the PARTIAL verdict or
   the 1.5/3 score, which are independently supported by the (correctly verbatim) API-side
   quotes in the same check. Flagging for citation hygiene, not for a scoring error.

2. **No fabricated quotes found elsewhere.** Every other sampled quote — across R2–R5, C1–C3,
   M2, P1–P3 — was re-verified as appearing verbatim (or, where the grader used "..." to elide
   text, as a faithful verbatim splice) in the actual runner output files.

3. **No FAIL-worthy PASS/PARTIAL found.** None of the sampled PASSes rest on "vague gestures" —
   every one cites a concrete DDL statement, OpenAPI path/schema block, or README sentence that
   is present and says what the grader claims it says. R1's PARTIAL is a defensible read of the
   rubric: the run materializes a create+read-by-id surface with persisted-looking identity
   (`id`, `status`, `createdAt`) for two of the three bought-adapter contexts (Payments,
   Notifications), which is real over-reach beyond a bare adapter callback, but stops short of
   full CRUD (no list/PUT/DELETE) and invents no backing table — consistent with PARTIAL rather
   than FAIL under the rubric's stated FAIL bar ("a `/payments`... CRUD resource surface").

## Verdict

GRADE.md's scoring (34.5/36) and per-check verdicts are **substantively correct** on every
sampled check. One minor citation-hygiene defect (composited, non-verbatim INDEX.md quote in
R1) does not change any verdict or the total. No adjustment recommended.
