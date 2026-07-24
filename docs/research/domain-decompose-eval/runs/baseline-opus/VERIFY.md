# VERIFY — baseline-opus GRADE.md audit

Independent re-check of `GRADE.md` against the runner's actual output
(`docs/domain/**`, `RUN-NOTES.md`, `QUESTIONS.md`) and, where the check hinges on a fixture fact,
against `fixture/**`. Every sampled check below was re-read from the primary source, not taken on
the grader's word.

## Sampling rationale

The grade under review has **no FAIL verdicts anywhere** (all PASS except E3 = PARTIAL), so the
mandatory "every FAIL in B and C" requirement is vacuously satisfied — there is nothing to sample
there. Sampled instead: enough PASSes across every group to stress-test quote fidelity, the one
PARTIAL (which is the only place the grader marked a real deficiency), at least one D check and one
E check as required, and 2+ PASSes.

| # | Check | Group | Grader verdict | Sampled? |
|---|---|---|---|---|
| 1 | A1 | A | PASS | yes |
| 2 | B1 | B | PASS | yes |
| 3 | B3 | B | PASS | yes |
| 4 | B4 | B | PASS | yes |
| 5 | C1 | C | PASS | yes |
| 6 | C2 | C | PASS | yes |
| 7 | D1 | D | PASS | yes |
| 8 | D4 | D | PASS | yes |
| 9 | E1 | E | PASS | yes |
| 10 | E3 | E | PARTIAL | yes |
| — | F2 | F | PASS | yes (bonus, orphan-event check) |
| — | F3 | F | PASS | yes (bonus, output-contract check) |

## Per-check verification

### A1 — Subdomain labels in problem space only (PASS, 2/2)
Read `docs/domain/context-map.md` Core Domain Chart directly. Confirmed verbatim: "Allocation …
**core**", "Maintenance … supporting", "Catalog … generic *(master-data / reference)*", and the
context-map edges use relationship language, not strategic labels: `open-host / published-language`,
`customer-supplier`, `shared-kernel + partnership`, `ACL: quarantine + translate`,
`conformist: mirror as-is`. All hard anchors (Allocation/Pricing core, Maintenance supporting,
payments/identity/notifications generic) present and coherent. **Agree: PASS.**

### B1 — Core → full model, named invariants (PASS, 3/3)
Read `docs/domain/allocation/model.yaml` and `docs/domain/pricing/model.yaml`. Both carry
`tactical_pattern: full-domain-model`. Invariant text matches the grader's quotes verbatim:
Allocation — "The same physical unit is never committed twice for overlapping windows — not even
from a different depot"; Pricing — "A quote can never fall below the utilization-derived floor
(floor = listRate * (0.60 + 0.40 * utilization))". Both are the two fixture-planted invariants, not
invented ones. **Agree: PASS.**

### B3 — Generic → buy + thin adapter (PASS, 3/3)
Read `docs/domain/vendor-integrations/{README,model}.md/yaml`. `tactical_pattern: bought-adapter`,
`aggregates: []`. Quote confirmed near-verbatim: "off-the-shelf commodity services behind thin
adapters (Stripe, Auth0, SendGrid) … No model to build." All three vendors (Stripe/Auth0/SendGrid)
handled as one set, none given a domain model. **Agree: PASS.**

### B4 — Master-data → CRUD, no aggregates (PASS, 3/3)
Read `docs/domain/catalog/{README,model}.md/yaml`. `tactical_pattern: crud`, `aggregates: []`.
Quote confirmed verbatim: "Master-data / reference: pure lookups … Explicitly no aggregates,
repositories, or domain events — an empty model is the correct, complete output here." **Agree:
PASS.**

### C1 — Ownership not a context (PASS, 3/3)
Read `RUN-NOTES.md` ("**Did** model genuine ownership as domain relationships:
depot-owns-committed-unit, account-owned-by-sales-rep, document-owned-by-uploader" — verbatim match)
and `docs/domain/{accounts,documents,allocation}`. No "Ownership" bounded context exists anywhere in
`docs/domain/` (11 contexts total, none named Ownership/Owner). Each context keeps its own
owner-relationship: Accounts ("modelled ownership, not audit metadata" — verbatim in
`accounts/model.yaml`), Documents ("the uploader is not audit metadata" — same idea, close
paraphrase not verbatim), Allocation ("a real domain ownership relationship, not audit metadata").
The grader's blanket attribution of the exact phrase "modelled ownership, not audit metadata" to all
three is a minor imprecision (it's a verbatim quote only for Accounts; Documents/Allocation use
close paraphrases of the same idea) but doesn't change the verdict — the substantive claim (three
distinct owner meanings, no minted context, authorization framing) is fully supported. **Agree:
PASS**, with a note that the quote attribution across all three sources is slightly loose.

### C2 — Audit not a context + escalation (PASS, 3/3)
Read `docs/domain/context-map.md` Cross-cutting section. Both quotes verbatim: "`audit_log` / order
activity-history — infrastructural, deferred to the data layer... not a domain aggregate or a
domain-event stream — do not model it as a context" and the escalation "if the business later
attaches legal/retention meaning it would promote to a domain concern (Q8)". Cross-checked
`QUESTIONS.md` Q8, same escalation condition. Fixture note "no legal or retention angle" also quoted
correctly. **Agree: PASS.**

### D1 — ERP → ACL (PASS, 2/2)
Read `docs/domain/erp-sync/model.yaml`. `relationships: [{ to: ExternalERP, type: acl }, ...]`.
Quote confirmed near-verbatim: "Classic Anti-Corruption Layer: defensively maps the ERP's
inconsistent/renamed fields … if the ERP breaks its format the damage stops here." Substance
(protective translation of an unstable, unnegotiable upstream) is clearly present. **Agree: PASS.**

### D4 — Allocation + Logistics → partnership (PASS, 2/2)
Read `docs/domain/logistics/{README,model}.md/yaml`. Quote confirmed verbatim: "Built by the same
squad as Allocation, shares its model types directly, and ships in the same release -> Shared
Kernel + Partnership with Allocation." `relationships` list both `shared-kernel` and `partnership`
to Allocation, with an explicit justification (same team, same release) satisfying the rubric's
"acceptable if explicitly justified" clause. **Agree: PASS.**

### E1 — SharedDomainRules rejected/reclassified (PASS, 2/2)
Read `docs/domain/context-map.md` Cross-cutting section and the fixture's
`src/SharedDomainRules/README.md` / `GlobalRules.cs`. The run's characterization ("every module MUST
inherit `GlobalRules`" is a shared-kernel anti-pattern) is a faithful paraphrase of the fixture text
("Every module MUST inherit from the classes in this folder… wire it to `GlobalRules` on day one").
The run relocates each rule to its owning context (discount ceiling/rounding → Pricing, allocation
priority → Allocation, customer definition → Accounts/Rentals) and explicitly recommends "dissolving
`GlobalRules`" — reclassified as governance-style relocation, not kept as a shared domain model.
**Agree: PASS.**

### E3 — Share-Equipment TODO flagged (PARTIAL, 1/2) — the only non-PASS verdict
Read the actual fixture TODO in `fixture/src/Rentals/RentalOrderService.cs`:
> `// TODO(rentals): stop maintaining a separate Equipment class here and in Catalog — just share
> Catalog's Equipment entity class directly between the two modules so we don't have to map fields
> back and forth on every sync.`

Read the run's handling: `docs/domain/catalog/README.md` ("Rentals should consume Catalog's
Equipment and drop its duplicate"), `docs/domain/rentals/{README,model}.yaml` ("Duplicate private
Equipment class is tech debt (Q6), not a modelled entity"), and `QUESTIONS.md` Q6 ("Rentals should
consume Catalog's Equipment and drop its duplicate"). Grepped the entire run output plus
`QUESTIONS.md` for "coupl" / "shared kernel" near this topic — the only shared-kernel hit in the
whole run is Q4 (`GlobalRules`), unrelated to Q6/Equipment. The run correctly steers away from the
TODO's literal ask (share the class directly) toward Catalog-as-system-of-record, but never once
names the direct-class-share as a coupling / shared-mutable-model risk — it's framed purely as "tech
debt" / "duplicate". This matches the rubric's PARTIAL criterion ("notices the duplication… without
noting the coupling cost") rather than PASS (which requires the explicit high-coupling framing) or
FAIL (which requires endorsing the share, which the run does not do). **Agree: PARTIAL, 1/2.**

### F2 — Orphan event flagged (PASS, bonus sample, 2/2)
Read `docs/domain/context-map.md` event-flow table. Quote verbatim: "`DepotTransferRequested` |
Allocation | **nobody** … **ORPHAN EMIT — flag.**" `EquipmentAllocated`, `PriceQuoted`,
`RentalOrderPlaced` each marked OK with a real consumer — no false-positive orphan flagged.
**Agree: PASS.**

### F3 — Output contract complete (PASS, bonus sample, 2/2)
Read `docs/domain/INDEX.md` (11 rows, `DOMAIN-0001`..`DOMAIN-0011`, all `status: draft` /
`owner: TBD`) and spot-checked `model.yaml` schema conformance across contexts with aggregates
(Allocation, Pricing, Rentals — each aggregate has `entities`, `value_objects`, `domain_events`,
`invariants` keys) and without (Maintenance, Catalog, VendorIntegrations, etc. — `aggregates: []`
consistently, not omitted). `context-map.md` has both the Mermaid diagram and the Core Domain Chart.
Per-context `README.md` canvases present in every one of the 11 folders. **Agree: PASS.**

## Verdict

10 checks sampled (plus 2 bonus F-group checks for a total of 12 touched). **No disagreements** —
every quote traced back to the runner's actual output (or, where cited, the fixture source) holds
up verbatim or as a faithful, non-fabricated paraphrase. The one non-PASS in the grade (E3) is
correctly scored: the fixture TODO and the run's Q6/Catalog/Rentals text confirm the run recommends
against literal class-sharing but never names the coupling risk, which is exactly PARTIAL under the
rubric's own wording. One minor looseness noted (C1's quote attribution spans a verbatim hit in one
source and paraphrases in two others) — not large enough to move the score.

**Total: unchanged, 43/44.**
