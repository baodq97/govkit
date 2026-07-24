# work-breakdown evaluation corpus — RentField / RFC-9101

A blind evaluation harness for the swe-flow `work-breakdown` skill. A **runner** breaks the
RFC-9101 *depot transfer approval and notification flow* down into shippable slices using only the
skill and the fixture; a **grader** scores the output against a rubric the runner never sees. The
fixture + RFC are seeded with traps that separate a genuine vertical breakdown (independently
testable slices, honest dependency edges, sizes on the ladder) from a mechanical one (horizontal
layer-slices, hidden couplings, unverifiable chunks, an unsplit XL).

```
work-breakdown-eval/
├── README.md      ← you are here (protocol; graders/runners read the relevant half only)
├── rubric.md      ← ground-truth scoring key — GRADERS ONLY, never the runner
├── fixture/       ← the RentField repo snapshot + docs/rfc-transfer-approval.md (RFC-9101)
└── runs/          ← one subfolder per run (files flat): the runner's breakdown + its GRADE.md
```

## Roles

- **Runner** — an agent invoking `work-breakdown` on the RFC + `fixture/`. Produces a slice
  breakdown (a backlog of vertical slices with sizes, deliverables, and ordering). Sees `fixture/`
  (including the RFC) and the skill only.
- **Grader** — a *separate* agent (or the same human wearing a different hat, in a fresh context)
  that scores the runner's output against `rubric.md`. Never breaks the work down itself.
- **Verifier** (optional) — re-runs the grade independently and diffs the two rubric fills;
  disagreements are adjudicated against the quoted evidence and the fixture code.

## Blinding rules (hard)

A runner reads **only**:
- everything under `fixture/` (the RentField snapshot **and** `fixture/docs/rfc-transfer-approval.md`),
  and
- the skill under test: `plugins/swe-flow/skills/work-breakdown/SKILL.md`.

A runner must **never** read:
- `rubric.md` (the scoring key — it names the traps and the expected cut),
- this `README.md` (the protocol — it names the traps),
- `runs/` (prior outputs and grades — anchoring),
- the sibling `docs/research/domain-decompose-eval/` corpus (its README/rubric label the same
  RentField code with strategy answers).

If the runner is an agent, launch it with a working directory scoped to `fixture/` and pass only the
skill path. If a human runs it, they get `fixture/` and the skill, nothing else. Any leak of
`rubric.md` or this README voids the run — the fixture is designed so the right breakdown is
*derivable from the RFC + code alone*; that is the whole point.

**Fixture leak-audit.** No file under `fixture/` contains the words *vertical slice, horizontal
layer, blocking edge, XL, XS, break trigger, file-disjoint,* or *parallelizable*. The RFC describes
the feature in plain product/engineering prose (deliberately arranged into surface / service / data
sections to **bait** a layer-split); the couplings, the orphaned event, the same-file overlap, the
migration ordering, and the small refactor must all be **inferred from the RFC + the code**, never
read off a label. The `> SYNTHETIC FIXTURE RFC` banner and the out-of-range id `RFC-9101` mark it as
a test artifact without hinting at any trap.

## What the fixture hides (grader/author orientation — NOT for runners)

Six planted traps, each discoverable from the RFC + code, none labelled:

- **T1 — hidden same-file coupling.** "Reservation records transfer status" and "the transfer event
  carries a reservation id" look like independent work, but `src/Allocation/AllocationService.cs`
  holds the `Reservation` class, the event records, **and** `Commit` in one file — the two edits
  collide. A correct breakdown surfaces this as a blocking edge / merge and does **not** call them
  file-disjoint.
- **T2 — unverifiable chunk.** `DepotTransferRequested` is emitted but consumed by nothing
  (*"Nothing listens for this yet"*). An "emit the event" slice has no observable behaviour until a
  consumer lands → must be merged or re-cut.
- **T3 — an XL that must split.** §Approval service logic bundles pending intake + accept + reject +
  re-check + authorization + two announcements and says it *"cannot be reviewed as a single change."*
- **T4 — migration ordering.** The `transfer_approval` migration must precede both the queue read
  view and the persisted decision record.
- **T5 — layer-slicing bait.** The RFC's *Approver surface* / *Approval service logic* / *Data and
  events* sections invite a schema→service→UI horizontal split; the correct cut is vertical
  (accept-one-transfer through every layer).
- **T6 — fold the small refactor.** `SendGridNotificationClient.SendReceipt` hardcodes its subject;
  generalising it is an XS change to fold into the notify slice, not a standalone item.

The mapping from these to the 14 rubric checks is in `rubric.md`. This section exists so a
grader/author can orient fast; it is part of the material a **runner must not read**.

**Deliberately ungraded skill guidance (scope note).** SKILL.md's *Ordering and blocking edges*
section also tells the author to **"Label every edge hard or soft."** None of the 14 checks grade
that label: B2 grades whether the edges are *sound and complete* against the code, B7 grades whether
they are *few*, and A4 grades the migration ordering — none require the runner to tag an edge hard
vs soft. This is a **deliberate scope decision, not an oversight**: hard/soft is a presentation
nicety whose substance (a real edge, correctly few) is already covered, and grading the literal
label would reward vocabulary over judgement (see §Independence, *"grades judgement, not
vocabulary"*). Recorded here so the gap reads as intentional.

## Procedure — a single run

1. **Set up.** Copy `fixture/` into a scratch workspace (or point the runner at it read-only). Do
   not copy `rubric.md` or this README in.
2. **Run.** The runner invokes `work-breakdown` on `fixture/docs/rfc-transfer-approval.md` with the
   `fixture/` code available for grounding. Capture the full output — the slice list with sizes,
   per-slice deliverables/ACs, ordering/`Blocked by:` lines, per-slice `Touches:` lines, and the
   closing concurrency statement.
3. **Archive.** Save the runner's files **flat** in the run directory `runs/<label>/` (the baselines
   are `runs/baseline-opus/` and `runs/baseline-sonnet/`) — the breakdown backlog
   (`WORK-BREAKDOWN.md`, any `US-*.md`) together with its judgment-call notes (`QUESTIONS.md`,
   `RUN-NOTES.md`). There is **no `output/` subfolder**.
4. **Grade (separate agent).** The grader opens `rubric.md` and the run's output, fills the results
   table, and — per the grading rule — **quotes the runner's exact output** (or the explicit
   absence) for every one of the 14 verdicts, cross-checking each dependency claim (A3/A4/B2) against
   the fixture code. Save it as `runs/<label>/GRADE.md` (a verifier's independent re-grade lands
   beside it as `VERIFY.md`).
5. **Verify (optional).** A second grader re-fills the table blind to the first; diff the two and
   reconcile against quoted evidence only.

## Before / after protocol (skill regression)

1. **Baseline.** Run + grade against the current skill. Record the total and the per-check verdicts.
2. **Edit** the skill (`plugins/swe-flow/skills/work-breakdown/SKILL.md`).
3. **Re-run** on the **same** RFC + `fixture/` (unchanged) with the **same** `rubric.md` (unchanged).
4. **Diff the tables.** A real improvement is a check moving FAIL/PARTIAL → PASS **without** any
   check regressing. A net total rise driven by one check jumping while another drops is not a clean
   win — inspect it.

Keep `fixture/` and `rubric.md` frozen across a before/after pair; only the skill changes. If the
fixture or RFC must change (new trap), that starts a **new baseline** — old and new totals are not
comparable.

## Independence — how graders/verifiers stay honest

- **Writer ≠ scorer.** The agent that produced the breakdown never grades it. Grading runs in a
  fresh context with no memory of the runner's reasoning — only its written output.
- **Evidence-quoted verdicts.** Every verdict cites the runner's own words or a stated absence, and
  every dependency verdict is cross-checked against the fixture code, so a verifier can re-derive the
  grade from the artifact rather than trust the grader's summary.
- **Rubric grades judgement, not vocabulary.** The runner need not use the skill's terms; the checks
  reward substance (an end-to-end cut, an actionable ordering, a surfaced coupling) in any wording.
- **Rubric demands only what the skill documents.** Every check traces to one of the five SKILL.md
  sections (vertical slices / sizing ladder / break triggers / ordering edges / parallel-safety
  derived); no check invents a requirement the skill never teaches. In particular the concurrency
  statement B4 grades is now a mandated output ("Silence is an incomplete breakdown"), not optional.
