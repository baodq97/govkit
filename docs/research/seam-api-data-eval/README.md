# SEAM eval — do `api-designer` + `data-model` correctly CONSUME the domain-decompose contract?

The **seam** between `domain-decompose` (producer of `model.yaml` v0.10.0) and its two downstream
consumers on the swe-flow chain:

```
goal-define → domain-decompose ──model.yaml──┬─→ api-designer  → docs/api/
                                             └─→ data-model    → docs/data/
```

The domain model is graded 44/44; it deliberately embeds the traps below. This eval measures whether
the two consumer skills **honor the contract** — right-size the same way, turn core invariants into
concrete mechanisms, keep metadata discipline, preserve names/ids, emit their full output — rather
than re-deriving or re-inflating the domain.

## What's here

| Path | Role |
|---|---|
| `fixture-input/` | The consumer scenario: the RentField codebase (`src/ docs/ config/ db/ README.md`) **plus** the graded 44/44 domain model at `fixture-input/docs/domain/`. This is the ONLY thing the runner reads. |
| `rubric.md` | 16 checks / 36 pts (grader-only — never shown to the runner). |
| `README.md` | This file (protocol — grader-only). |
| `runs/<name>/` | One directory per run: the runner's emitted `docs/api/` + `docs/data/`, plus the grader's filled results table. |

## Blinding protocol (measurement integrity)

The runner is **blind** to the rubric.

1. The runner reads ONLY:
   - the two skill directories under test — `plugins/swe-flow/skills/api-designer/` and
     `plugins/swe-flow/skills/data-model/` (SKILL.md + `references/`), and
   - `fixture-input/` (the codebase + `docs/domain/`).
2. The runner NEVER reads `rubric.md`, this `README.md`, or anything under `runs/`. Leaking the
   rubric turns a capability test into a teach-to-the-test.
3. `fixture-input/docs/domain/` legitimately contains the `model.yaml` vocabulary (`subdomain_type`,
   `tactical_pattern`, `aggregates: []`, `notes:`) — that IS the consumed contract, not a hint. No
   input file tells the runner what the API or schema *should* look like; producing that is the
   capability under test. Do not add prose that pre-answers the API/schema shape.
4. **Write-scope lock (F11):** the skills under `plugins/swe-flow/` are the system under test and are
   strictly READ-ONLY. All eval material lives under this directory only. If a skill seems unfair to
   grade, the fix goes DOWN into the rubric/fixture (scope the check, add a fixture prose source, or
   drop the check) — NEVER up into the skill.

## Rerun procedure

Run the two consumers as **two independent, blind invocations** (they are siblings; either order):

1. **Set up a clean run workspace** (keeps the runner's output isolated and re-gradeable):
   ```bash
   RUN=runs/<name>            # e.g. runs/after-opus
   mkdir -p "$RUN"
   cp -r fixture-input "$RUN/workspace"
   ```
   The runner operates inside `$RUN/workspace/`, where `docs/domain/` already exists and `docs/api/`
   + `docs/data/` do not yet.

2. **Invoke `api-designer`** on the workspace: "design the API for this domain" (it should detect
   `docs/domain/`, consume it, and emit `docs/api/`). No other steer.

3. **Invoke `data-model` (FORWARD)** on the workspace: "design the database / schema from the domain"
   (it should detect `docs/domain/`, consume it, and emit `docs/data/`). No other steer.

4. **Collect** the emitted trees:
   ```bash
   cp -r "$RUN/workspace/docs/api"  "$RUN/docs-api"
   cp -r "$RUN/workspace/docs/data" "$RUN/docs-data"
   ```

5. **Grade** with `rubric.md`, filling the results table. Every verdict quotes a path + line from the
   run output (citation rule). Score PASS = full / PARTIAL = half / FAIL = 0; save as
   `$RUN/GRADE.md`. Absence-of-thing checks (R1, R2, R4, M2, M3) cite a grep that returns nothing — rubric.md's Cite
   instructions for R2 (no event/aggregate ceremony), M2 (no global owner table), and M3 (no fabricated
   `tenant_id`) likewise require citing an absence, same as R1 and R4.

6. To compare models/versions, repeat under a new `runs/<name>/` and diff the results tables.

## The embedded traps (grader orientation — not shown to the runner)

The graded domain model already right-sized everything; a faithful consumer must not undo it:

- **Bought-adapter generic** contexts (Payments/Stripe, Identity/Auth0, Notifications/SendGrid),
  `aggregates: []` — must get **no** business tables and **no** resource CRUD (R1).
- **Master-data** Catalog (`crud`, `aggregates: []`) — plain lookup tables + CRUD, no aggregate
  ceremony, no domain events (R2); **supporting** Maintenance stays a light CRUD + `NextDue` calc (R3).
- **Core invariants → mechanisms:** Allocation's no-double-commit-across-depots-for-overlapping-windows
  must become an actual exclusion constraint / unique index / transactional check (C1); Pricing's
  utilization floor a validation/constraint (C2); the versioned `PriceQuoted` Published-Language
  contract must surface as a versioned API contract (C3).
- **Metadata discipline:** `created_at/by`-style columns are infrastructure, not domain (M1); and
  crucially there is **no single global owner table** — the polysemic owners (`SalesRepId`,
  `OwnerUserId`, custodian `DepotId`) stay per-context, projected toward authorization (M2).
- **Continuity:** ubiquitous-language names flow `model.yaml` → API paths → table names (N1); context
  ids/slugs stay stable (N2); each skill emits its full documented output contract (P1/P2).
