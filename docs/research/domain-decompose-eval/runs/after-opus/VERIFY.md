# VERIFY — after-opus GRADE.md

Independent re-check of `GRADE.md` (44/44) against the runner's actual output files
(`docs/domain/context-map.md`, per-context `model.yaml`/`README.md`, `INDEX.md`, `QUESTIONS.md`)
and, where the rubric's own citations point there, the `fixture/` source. GRADE.md contains no
FAIL or PARTIAL verdicts (a "clean sweep"), so the mandatory "every FAIL in B/C" sampling
requirement is vacuous; sampled broadly across all six groups instead, weighted toward the checks
most likely to hide an over-charitable read (B group right-sizing, C group capability-vs-context,
D group relationship naming) plus at least one D/E and 2+ extra PASSes as required.

## Sampled checks (10 of 19)

| Check | Grader verdict | Verified? | Notes |
|---|---|---|---|
| A2 | PASS | Agree | "Availability … No Availability module exists" is an exact quote from `context-map.md` Conflicts table (line 96) and Declined-candidates table (line 156). |
| B1 | PASS | Agree | Allocation invariant quote is verbatim in `allocation/model.yaml` (`invariants:` list); Pricing invariant quote verbatim in `pricing/model.yaml`. Cross-checked against `fixture/src/Allocation/AllocationService.cs:44` ("never be committed twice for overlapping windows — not even from a") — invariant is fixture-grounded, not invented. |
| B2 | PASS | Agree | `maintenance/model.yaml`: `tactical_pattern: transaction-script`, `aggregates: []`, notes contain "no aggregate - the correct right-sizing for a supporting record-keeping context" verbatim. |
| B3 | PASS | Agree | Checked all three (not just Payments, which the grader cited): `payments/model.yaml`, `identity/model.yaml`, `notifications/model.yaml` all have `tactical_pattern: bought-adapter`, `aggregates: []`, `ubiquitous_language: []` — none has a sketched domain model. Grader's quote is exact. |
| B4 | PASS | Agree | `catalog/model.yaml` notes: "Aggregates, repositories, and domain events are explicitly DECLINED - an empty model is the correct, complete output for a reference context" — exact match. Note: `subdomain_type: generic` is used for Catalog (the template's literal enum comment only lists `core \| supporting \| generic`, no fourth `master-data` value) — a pre-existing schema ambiguity in the skill's own template, not a runner defect; the prose still correctly treats it as master-data/reference. |
| C1 | PASS | Agree | Declined-candidates table quote on ownership polysemy is verbatim in `context-map.md`. Fixture identifiers cited (`Reservation.DepotId`, `SalesAccount.SalesRepId`, `Document.OwnerUserId`) all appear in the run's per-context docs (`allocation/README.md`, `customer-accounts/README.md`, `documents/model.yaml`), each treated as a per-context ownership projection, not a global concept. |
| C2 — audit | PASS | Agree | Quote on audit-as-capability + escalation condition is verbatim in the Declined-candidates table. |
| D1 — ERP/ACL | PASS | Agree | The precise sentence "translates it into our clean AssetRecord shapes; nothing past this context sees a raw ERP field" is verbatim in `asset-sync/model.yaml` notes (not just paraphrased in the README, as first appeared — the exact wording is in the YAML). |
| D5 — Invoicing/customer-supplier | PASS | Agree | Grader's quote "Rentals is the customer and drives the API (billing adds the fields Rentals asks for)" is verbatim in `billing/model.yaml` notes. Cross-checked against fixture `Invoicing/InvoicingClient.cs:7-9` ("Rentals is its main customer… they add it to their API… we agree the contract together and they plan their work around our requests") — substance matches. |
| F2 — orphan event | PASS | Agree | `DepotTransferRequested` flagged as orphan in the event-flow table; the other three events (`PriceQuoted`, `EquipmentAllocated`, `RentalOrderPlaced`) all marked OK with a named consumer — no false positive. Confirmed against fixture `AllocationService.cs:67-70` ("Nothing listens for this yet"). |

Also spot-checked without a table row (supporting evidence, not separately scored): D3's
`Pricing.Contracts` quote is verbatim in `context-map.md` ("Load-bearing extraction seam"
section); E1's `SharedDomainRules`/`GlobalRules` quotes are verbatim in `context-map.md` and match
`fixture/src/SharedDomainRules/README.md` + `GlobalRules.cs`; F1's conflict table and F3's
`INDEX.md` contents match the grader's description exactly (13 rows, `DOMAIN-0001..0013`,
`status: draft`/`owner: TBD`).

## Verdict

No disagreements. Every sampled quote traces to an exact (or line-for-line equivalent, allowing
for the grader collapsing a Markdown table row into `"cell | cell"` shorthand) string in the
runner's own output files, and every FAIL/PARTIAL rubric condition (uniform tactical modelling,
minted Ownership/Audit contexts, unnamed relationship patterns, missing conflict table, missed
orphan event, incomplete output contract) was checked for and not found. The one soft observation
(Catalog's `subdomain_type: generic` field value, versus "master-data" only appearing in prose) is
a pre-existing ambiguity in the skill's own `output-template.md` enum comment, not a runner
fabrication or a rubric miss — it does not change B4's PASS.

**Corrected total: unchanged, 44/44.**
