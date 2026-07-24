# VERIFY — baseline-head-opus GRADE.md audit

Independent re-check against the runner's actual output files (not the grader's summary).
Rubric max confirmed at 44 (rubric §top explicitly supersedes "41"); GRADE.md correctly uses 44
as denominator, scores 41/44.

No FAIL verdicts exist anywhere in GRADE.md (all checks are PASS or PARTIAL), so "every FAIL in
B/C" is a vacuous set — sampled the two PARTIALs in B/C instead (B4, C1), plus a spread of PASSes
across every other group, satisfying "≥1 D, ≥1 E, ≥2 PASS" with margin.

## Sampled checks (10)

### A1 — PASS — AGREE
Core Domain Chart in `context-map.md` (lines 76–90) lists every context with a type: Allocation
core, Pricing core, Rentals/Logistics/Maintenance/Catalog/Accounts/Fleet/Documents supporting,
Invoicing/Payments/Identity/Notifications generic. Contexts carry context-map relationship edges
(`shared-kernel`, `open-host`, `conformist`, `ACL`, etc.), not a label pinned to the context as an
intrinsic property. Grader's quotes match verbatim. Hard anchors (Allocation/Pricing core,
Maintenance supporting, Stripe/Auth0/SendGrid generic) all hit. Agree PASS.

### B1 — PASS — AGREE
`allocation/model.yaml` invariants: "The same physical unit can never be committed twice for
overlapping windows, not even from a different depot." `pricing/model.yaml` invariant: "A quote
can never fall below the utilization-derived floor; at 100% utilization the floor equals the full
list rate." Both are rich models (Reservation aggregate with value objects + 2 domain events;
Quote aggregate with Money value object + PriceQuoted event). Grader's quotes are verbatim from
these files. Agree PASS.

### B2 — PASS — AGREE
`maintenance/model.yaml`: single `MaintenanceRecord` aggregate, `value_objects: []`,
`domain_events: []` — confirmed exactly as quoted. No aggregate ceremony beyond one entity.
Agree PASS.

### B3 — PASS — AGREE
`payments/model.yaml`: `aggregates: []` (confirmed by direct read — 0 aggregate/entity/value/event
keys in the file). Same shape for identity/notifications (0 hits on
`entities:|value_objects:|domain_events:` grep). No domain model built for any of the three. Agree
PASS.

### B4 — PARTIAL (1.5/3) — AGREE
`catalog/model.yaml` (read directly) mints three aggregate roots: `Category` (`root: Category`),
`Depot` (`root: Depot`), `Tag` (`root: Tag`), each with an `entities` list — this contradicts the
"pure reference data, no aggregates" requirement for full credit, exactly as the grader quotes.
`catalog/README.md` does say "None captured — pure reference data" for business rules, but the
model.yaml still ceremony-wraps three lookup tables as aggregate roots. Grader's citation of
`name:`/`root:` keys is accurate. Agree PARTIAL.

### C1 — PARTIAL (1.5/3) — AGREE
Grepped every README + context-map.md for "owner"/"polysemy". No "Ownership" context exists;
ownership is kept per-context: Documents (`Owner | The user who uploaded the document`), Accounts
(`Sales rep | The party who owns the commercial relationship`), Allocation (`Depot | The location
that OWNS a unit while it is committed`). But nowhere does the run register that "owner" itself is
a polysemous term used with different referents across these three contexts — the only explicit
polysemy call-out in the whole run is for "Depot" (`catalog/README.md` line 48: `"Depot" is
polysemous — here it is a reference record; in Allocation it is the party that owns a committed
unit`), not for "owner". Grader's claim ("only *Depot* polysemy noted") is verified correct via
direct grep + read. Agree PARTIAL.

### C2 — PASS — AGREE
`context-map.md` "Deliberately NOT modeled" section: audit_log treated as "technical audit
metadata... explicitly described as 'a convenience for the sales team… nothing legal or
retention-related'... no `ActivityHistory` context or aggregate is created", plus the escalation
condition: "(Contrast: had it carried a legal/retention obligation, it would be a domain
concern.)" Both required elements (capability treatment + escalation condition) present verbatim.
Agree PASS.

### D1 — PASS — AGREE
`context-map.md` line 71–72 legend: "ACL (anti-corruption layer) — downstream translates the
upstream's shifting/foreign model into its own clean shapes and never lets the raw model leak
inward. *(Fleet ← Legacy ERP.)*" Matches grader's quote exactly, named "ACL" with protective-
translation substance. Agree PASS.

### D4 — PASS — AGREE
`context-map.md` diagram: `Allocation <-->|shared-kernel| Logistics`; team table: "fulfilment |
Allocation, Logistics | shared code + shared release → shared kernel"; "ships them together as one
deployable" (Load-bearing extraction seam section). This is the rubric's explicitly-accepted
alternate form ("explicitly justified shared kernel between two peers under one owner" — fulfilment
squad owns both). Quotes verified verbatim. Agree PASS.

### E1 — PASS — AGREE
`context-map.md` "Deliberately NOT modeled": "`SharedDomainRules` / `GlobalRules` as a context or
shared kernel. A platform-wide 'every module MUST inherit' base is a false shared kernel that
couples *all* contexts. Its rules are redistributed to their owners" — rejected and reclassified
(rules redistributed to Pricing/Accounts/Allocation/BuildingBlocks), not adopted as a shared domain
model. Quote verified verbatim. Agree PASS.

### F2 — PASS — AGREE
`context-map.md` event-flow table: `DepotTransferRequested | Allocation | **none** | ⚠ **Orphan
emit**`; the other three events (`PriceQuoted`, `EquipmentAllocated`, `RentalOrderPlaced`) are all
marked "OK" with a real consumer — no false-positive orphan flags. Cross-verified against
`allocation/model.yaml` (`DepotTransferRequested` listed as a domain event with no downstream
consumer in the relationships section) and `allocation/README.md` ("none — orphan"). Agree PASS.

## Additional spot-checks (not in the 10 above, done for extra confidence)

- **F1**: Conflicts & reconciliation table has 7 rows (draft vs. code), well above the required
  "at least two of (a)-(d)" — floor/discount, double-depot, Maintenance placement, and Availability
  are all present and chosen "B (code/README)". Confirms PASS.
- **F3**: `INDEX.md` lists exactly DOMAIN-0001…0013, all `status: draft` / `owner: TBD`, matching
  13 contexts with README+model.yaml pairs (verified directory listing + spot-read of
  payments/pricing model.yaml showing `aggregates: []` and full aggregate schema respectively).
  Confirms PASS.
- Recomputed the score arithmetic independently from the 19 per-check verdicts in GRADE.md's
  table: A=4, B=10.5, C=4.5, D=10, E=6, F=6 → total 41/44. Matches GRADE.md's stated total and
  category subtotals exactly — no arithmetic drift.

## Verdict

10 checks sampled (plus 2 extra spot-checks = 12 total examined). Zero disagreements: every
grader quote traced to an exact string in the runner's output files, every PASS had substantive
supporting evidence (not a vague gesture), and both PARTIALs (B4, C1) are correctly justified by
content the grader could point to and that I independently confirmed by reading the files myself.

**Corrected total: unchanged, 41/44.**
