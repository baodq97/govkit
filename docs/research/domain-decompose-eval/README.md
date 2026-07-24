# domain-decompose evaluation corpus — RentField

A blind evaluation harness for the swe-flow `domain-decompose` skill. A **runner** decomposes the
RentField fixture using only the skill; a **grader** scores the output against a rubric the runner
never sees. The fixture is seeded with traps that separate a genuine strategic+tactical
decomposition from a mechanical one (uniform tactical modelling, capabilities minted as contexts,
illegitimate sharing, swallowed conflicts).

```
domain-decompose-eval/
├── README.md      ← you are here (protocol; graders/runners read the relevant half only)
├── rubric.md      ← ground-truth scoring key — GRADERS ONLY, never the runner
├── fixture/       ← the RentField repo snapshot the runner decomposes
└── runs/          ← one subfolder per run: the runner's docs/domain output + the filled rubric
```

## Roles

- **Runner** — an agent invoking `domain-decompose` on `fixture/`. Produces a `docs/domain/`
  decomposition. Sees `fixture/` and the skill only.
- **Grader** — a *separate* agent (or the same human wearing a different hat, in a fresh context)
  that scores the runner's output against `rubric.md`. Never decomposes.
- **Verifier** (optional) — re-runs the grade independently and diffs the two rubric fills;
  disagreements get adjudicated against the quoted evidence.

## Blinding rules (hard)

A runner reads **only**:
- everything under `fixture/`, and
- the skill under test: `plugins/swe-flow/skills/domain-decompose/` (SKILL.md + references/).

A runner must **never** read:
- `rubric.md` (the scoring key),
- this `README.md` (the protocol — it names the traps),
- `runs/` (prior outputs and grades — anchoring),
- anything under `/home/bd/personal-projects/self-learning/` (the ground-truth theory the rubric is
  derived from — reading it turns an open-book design task into an answer-key copy).

If the runner is an agent, launch it with a working directory scoped to `fixture/` and pass only the
skill path. If a human runs it, they get `fixture/` and the skill, nothing else. Any leak of
`rubric.md`, this README, or the self-learning docs voids the run — the fixture is designed so the
right answer is *derivable from the fixture alone*; that is the whole point.

The fixture is leak-audited: no file under `fixture/` contains the words *core, supporting, generic,
bounded context, subdomain, aggregate, anti-corruption, conformist, shared kernel, published
language, DDD*, or any context-mapping pattern name. The classifications and relationships must be
**inferred from business prose and code**, never read off a label.

## Procedure — a single run

1. **Set up.** Copy `fixture/` into a scratch workspace (or point the runner at it read-only). Do
   not copy `rubric.md` or this README in.
2. **Run.** The runner invokes `domain-decompose`. Because the fixture has no `docs/domain/`
   convention yet, expect the skill to create `docs/domain/` fresh (output-template §1 detection).
   Capture the full output — `context-map.md`, every `<context>/model.yaml` + `README.md`,
   `INDEX.md`, and any questions/notes the runner emitted.
3. **Archive.** Save the output under `runs/<date>-<label>/output/`.
4. **Grade (separate agent).** The grader opens `rubric.md` and the run's output, fills the results
   table, and — per the grading rule — **quotes the runner's exact output** (or the explicit
   absence) for every one of the 19 verdicts. Save as `runs/<date>-<label>/rubric-filled.md`.
5. **Verify (optional).** A second grader re-fills the table blind to the first; diff the two, and
   reconcile against quoted evidence only.

## Before / after protocol (skill regression)

To measure whether a skill edit helped:

1. **Baseline.** Run + grade against the current skill. Record the total and the per-check verdicts.
2. **Edit** the skill (`plugins/swe-flow/skills/domain-decompose/…`).
3. **Re-run** on the **same** `fixture/` (unchanged) with the **same** `rubric.md` (unchanged).
4. **Diff the tables.** Compare per-check verdicts baseline → after. A real improvement is a check
   moving FAIL/PARTIAL → PASS **without** any check regressing. A net total rise driven by one
   check jumping while another drops is not a clean win — inspect it.

Keep `fixture/` and `rubric.md` frozen across a before/after pair; only the skill changes. If the
fixture must change (new trap), that starts a **new baseline** — old and new totals are not
comparable.

## Independence — how graders/verifiers stay honest

- **Writer ≠ scorer.** The agent that produced the decomposition never grades it. Grading runs in a
  fresh context with no memory of the runner's reasoning — only its written output.
- **Evidence-quoted verdicts.** Every verdict cites the runner's own words or a stated absence, so a
  verifier can check the grade against the artifact rather than trusting the grader's summary.
- **Rubric derives from sources, not from a run.** Each check in `rubric.md` cites the ground-truth
  doc it comes from; graders apply the fixed key, they don't invent criteria per run.
- **The self-learning docs are off-limits to everyone during a run** — they are the theory the
  rubric already encodes; a grader re-reading them mid-grade risks re-deriving a different key.

## What the fixture hides (grader/author orientation — NOT for runners)

RentField is a B2B industrial-equipment rental + field-service platform, deliberately **not** a
regulated industry. Planted, discoverable from code + prose but never labelled:

- **Core:** equipment allocation + dynamic pricing — real enforced invariants (no double-allocation
  of a unit across depots, utilization-based price floor).
- **Supporting:** maintenance scheduling — validation + CRUD + one interval calculation.
- **Generic:** Stripe / Auth0 / SendGrid vendor adapters.
- **Master-data:** catalog taxonomy, depots, tags — lookup CRUD.
- **Ownership trap:** "owner" means three different things (depot holding the unit, sales rep owning
  the account, user who uploaded a document).
- **Audit trap:** an `audit_log` migration + a "sales wants an activity history on orders" request,
  worded as a convenience, nothing legal/retention.
- **Sharing traps:** `src/SharedDomainRules/` (anti-pattern plant) next to `src/BuildingBlocks/`
  (legitimate `Money`/`UnitOfMeasure`), plus a TODO to share the `Equipment` class between Rentals
  and Catalog.
- **Relationship material:** legacy SOAP ERP (ACL), CRM import accepted as-is (conformist), Pricing→
  Rentals versioned contract (OHS/published language), Allocation+Logistics one joint team
  (partnership), internal invoicing whose API Rentals drives (customer-supplier).
- **One orphan event:** `DepotTransferRequested` (published, consumed nowhere).
- **One stale draft** (`fixture/docs/domain-notes-draft.md`) that contradicts the code in several
  specifics.

The mapping from these to the 19 rubric checks is in `rubric.md`. This section exists so a
*grader/author* can orient fast; it is part of the material a **runner must not read**.
