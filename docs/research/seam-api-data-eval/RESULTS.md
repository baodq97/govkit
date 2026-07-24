# SEAM eval — results (batch run `wf_5c75a887-e4c`, 2026-07-24)

Scores whether the swe-flow `api-designer` + `data-model` skills **consume** the `domain-decompose`
`model.yaml` v0.10.0 contract faithfully — right-size the same way, turn core invariants into
concrete mechanisms, keep metadata discipline, preserve names/ids, emit their full output — rather
than re-deriving or re-inflating the graded 44/44 domain. 16 checks / 36 pts, 5 groups R/C/M/N/P.
Protocol and blinding rules: `README.md`. Ground-truth key: `rubric.md` (graders only).

**This corpus is baseline-only. There is NO after-run, because grading warranted no skill change** —
both consumers already honored the contract at the bar (opus 35/36, sonnet 34.5/36), so no fix was
authored and no treatment condition exists to measure. The two residuals are watch-items, not defects
(see below).

## Conditions

One condition — the two shipped skills, unmodified — run by an **opus** and a **sonnet** runner as
two independent, blind invocations (`api-designer`, then `data-model` FORWARD) on the same frozen
`fixture-input/` (RentField codebase + the graded `docs/domain/`). Run labels: `baseline-*`. No
`after-*` runs: the baseline cleared the bar, so per the write-scope lock (F11) nothing was patched.

## Totals

| Condition | Run label | opus | sonnet |
|---|---|---:|---:|
| Baseline (shipped, unmodified) | `baseline-*` | **35/36** | **34.5/36** |

Opus grader gave 36/36; the sonnet verifier adjusted it to **35** (N1 → PARTIAL). Sonnet graded
34.5/36, verifier clean.

## Per-category breakdown

Group maxima: **R** 11 · **C** 8 · **M** 7 · **N** 4 · **P** 6 → 36.

| Run | R (11) | C (8) | M (7) | N (4) | P (6) | Total |
|---|---:|---:|---:|---:|---:|---:|
| `baseline-opus` (grader, pre-adjust) | 11 | 8 | 7 | 4 | 6 | **36** |
| `baseline-opus` (verifier-adjusted) | 11 | 8 | 7 | 3 | 6 | **35** |
| `baseline-sonnet` (verifier clean) | 9.5 | 8 | 7 | 4 | 6 | **34.5** |

### Verifier adjustments (sonnet verifiers, independent re-fill)

- **`baseline-opus`: N1 PASS → PARTIAL (−1), 15 checks sampled.** Two API paths dropped their domain
  nouns — `RentalOrder → /orders`, `SalesAccount → /accounts` — matching the rubric's own PARTIAL
  worked example for N1 (name continuity). N goes 4/4 → 3/4; total 36 → **35**.
- **`baseline-sonnet`: clean, 12 checks sampled, 0 disagreements.** The one sub-ceiling group was
  already in the grader's fill: **R1 PARTIAL (−1.5)** — retrievable `/payments` + `/notifications`
  resource surfaces exceed the bought-adapter callback/config bar. R = 9.5/11.

## What held (contract consumed correctly)

- **Right-sizing preserved.** No business tables and no resource CRUD materialized for the
  bought-adapter contexts (Payments/Stripe, Identity/Auth0, Notifications/SendGrid, `aggregates: []`);
  master-data Catalog stayed plain lookup-CRUD with no aggregate ceremony and no domain events.
- **Core invariants became real mechanisms.** Allocation's no-double-commit invariant surfaced as an
  actual exclusion constraint; Pricing's utilization floor as a `CHECK quote_not_below_floor`
  constraint — not restated as prose.
- **Metadata discipline held.** No single global owner table; the polysemic owners
  (`SalesRepId`, `OwnerUserId`, custodian `DepotId`) stayed per-context. `created_at/by` treated as
  infrastructure, not domain.
- Category detail (opus, pre-adjust): **R 11/11 · C 8/8 · M 7/7 · N 4/4 · P 6/6**. Sonnet:
  **R 9.5/11 · C 8/8 · M 7/7 · N 4/4 · P 6/6**.

## Verdict

The v0.10.0 `model.yaml` contract (`subdomain_type` / `tactical_pattern` / `aggregates: []`) is
consumed correctly downstream by both siblings. No table or API materialized for a bought-adapter
context, master-data stayed lookup-CRUD, core invariants became concrete mechanisms, and no global
owner table appeared. The two sub-ceiling checks are the two watch-items below, not contract breaks —
so **no skill change was made and no after-run was performed.**

## Watch-items (recorded, not chased)

- **Naming carry-through on API paths (opus N1).** The weaker/stronger split is not the issue here —
  both runners preserved ids; opus specifically shortened two resource paths past the domain noun.
  Watch whether path-generation ever sheds the ubiquitous-language name under either model.
- **Slight generic over-materialization by the weaker model (sonnet R1).** Sonnet surfaced retrievable
  `/payments` + `/notifications` resource surfaces where the bought-adapter bar wants only
  callback/config. Watch whether a weaker consumer re-inflates a generic context.

## Provenance

- **Workflow run:** batch `wf_5c75a887-e4c` (before-runs, 2026-07-24). This corpus is one of three
  graded in that before-batch (27 agents, ~2.04M subagent tokens **batch-total**, not seam-only).
- **Fixture:** `fixture-input/` — RentField C# codebase + the graded 44/44 `docs/domain/` (the
  consumed contract). The ONLY thing the runner reads.
- **Runners:** blind (scoped to the two skill dirs under test + `fixture-input/`; never
  `rubric.md`/`README.md`/`runs/`). Paired opus + sonnet.
- **Graders:** **opus**. **Verifiers:** **sonnet**, independent re-fill (15 checks sampled on opus,
  12 on sonnet).
- **Write-scope lock (F11):** the skills under `plugins/swe-flow/` were READ-ONLY throughout; the
  clean baseline is therefore a true HEAD baseline.

## Rerun pointer

To grade a future edit to either consumer, follow the **before/after protocol in `README.md`**:
freeze `fixture-input/` + `rubric.md`, change only the skill under test, re-run both consumers as two
blind invocations, diff per-check verdicts. A clean pass holds the contract-honoring result with no
per-check regression — in particular the bought-adapter contexts must stay table-free and the core
invariants must stay concrete mechanisms.
