# VERIFY — baseline-sonnet GRADE.md audit

Independent re-read of the runner output (`context-map.md`, per-context `README.md`/`model.yaml`,
`INDEX.md`, `RUN-NOTES.md`) against `rubric.md` and against every quote in `GRADE.md`. Note: this
run's GRADE.md contains **zero FAIL verdicts**, so the mandated "every FAIL in B/C" sample is
vacuous; sampled all non-PASS verdicts (both are C: C1, C2; both E PARTIALs: E1, E3) plus a spread
of PASS verdicts across every other group.

## Sampled checks (11 of 19)

| Check | Grader verdict | Verified? | Notes |
|---|---|---|---|
| A1 | PASS | Agree | `context-map.md` Core Domain Chart table confirms Allocation=core, Catalog=master-data/reference, Vendors=generic wording verbatim; relationships live separately in the Mermaid graph + per-context `relationships:` keys, not pinned onto the label. |
| A2 | PASS | Agree | Core Domain Chart is context→type table; Vendors/BuildingBlocks/SharedDomainRules deviation notes quoted verbatim from `context-map.md` lines 37-43. |
| B1 | PASS | Agree | `allocation/model.yaml` invariant text and `pricing/model.yaml` "core invariant (the utilization-driven discount floor)" match quotes exactly; both fixture-stated invariants, not invented. |
| C1 | PARTIAL | Agree | Grepped the whole run for "ownership"/"polysem" — zero hits outside GRADE.md itself. `accounts/README.md`, `documents/README.md`, `allocation/README.md` each define "owner"/"owns" independently with no cross-reference or explicit decline of an Ownership context. Matches rubric's PARTIAL wording precisely; not FAIL (no Ownership context minted, no forced global definition either). |
| C2 | PARTIAL | Agree | Grepped for "regulated/retention/legal/escalat" — only hit is `context-map.md`'s "no legal or retention angle" (current-state quote, exactly as graded). No sentence anywhere states what would flip audit into a bounded context. Escalation condition genuinely absent. |
| D1 | PASS | Agree | Mermaid edge + `erp-sync` notes ("ACL, quarantines the raw feed" / "translation only, no domain model of RentField's own") quoted correctly. |
| D4 | PASS | Agree | Mermaid "shared-kernel, same squad" + `logistics/README.md` "shared-kernel pair" match; `teams.yaml` fulfilment squad owns both allocation+logistics with `release_cadence: shared`, confirming the justified-shared-kernel variant is fixture-grounded, not invented. |
| D5 | PASS | Agree | Mermaid "customer-supplier: Rentals drives the API" + `invoicing`/`rentals` model.yaml `type: customer-supplier`; `teams.yaml` billing comment "rentals is its main consumer and drives its API" confirms substance. |
| E1 | PARTIAL | Agree (close call, but well-reasoned) | `context-map.md` line 43 and `RUN-NOTES.md` lines 82-84 confirm the run rejects `SharedDomainRules` solely on "no call site was found" / "unenforced or abandoned" grounds — never states that mandating one universal business-rule model across every module is wrong *in principle*, regardless of enforcement. The grader's distinction (empirical non-use vs. anti-pattern-in-principle) is a real, textually supported gap, not invented nuance. |
| E2 | PASS | Agree | `context-map.md` line 42 quote matches verbatim; explicitly contrasted with `SharedDomainRules` row directly below it ("not a working shared kernel"), satisfying the "distinct treatment" requirement. |
| E3 | PARTIAL | Agree | `context-map.md` line 27 frames the TODO as "duplication debt" (implying the fix is to wire the sharing), and `catalog/model.yaml` repeats "Rentals is meant to share this context's Equipment type directly... but does not yet" — genuinely neutral/leaning-toward-sharing framing. Fixture TODO comment (`RentalOrderService.cs:37-39`) explicitly proposes sharing the entity; the run never calls this a coupling risk or recommends against it. PARTIAL is correct, not FAIL (duplication *is* noticed) and not PASS (no coupling-cost flag). |
| F2 | PASS | Agree | Event-flow table quote ("`DepotTransferRequested`... **none found**... **Orphan.**") verbatim; `EquipmentAllocated`/`PriceQuoted`/`RentalOrderPlaced` all correctly marked OK, no false-positive orphan flag. |
| F3 | PASS | Agree | `INDEX.md` confirms DOMAIN-0001..0011, all `status: draft`/`owner: TBD`; sampled `model.yaml` files (allocation, pricing, maintenance, catalog, vendors) all carry `entities`/`value_objects`/`domain_events` keys with `[]` when empty, matching the schema requirement. |

(11 sampled ≥ required 8; covers both C FAILs-that-turned-out-PARTIAL, both non-PASS E's, ≥1 D
verdict — five D's actually — and 6 PASSes.)

## Findings

None. Every quoted string in the sampled rows was located verbatim in the corresponding runner
file. Every non-PASS verdict is textually supported: grepping the full run output for the concepts
the rubric demands (polysemy/Ownership for C1; regulated/retention/escalation for C2; anti-pattern
framing for E1; coupling/high-coupling for E3) confirms genuine absence, not the grader missing
something that was actually there. No PASS rested on a vague gesture — each PASS quote is a direct,
attributable sentence or table row from the run, and cross-checked against the fixture
(`teams.yaml`, `RentalOrderService.cs` TODO) where the rubric cites fixture facts.

Arithmetic re-verified independently: A=4, B=12, C=3, D=10, E=4, F=6 → **39/44**, matching
`GRADE.md`'s category subtotals and total exactly.

## Verdict

No disagreements. Total confirmed at **39/44**. No adjustment.
