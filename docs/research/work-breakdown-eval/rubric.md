# RentField — work-breakdown scoring rubric (ground truth)

Grades one run of the `work-breakdown` skill against `fixture/` + `fixture/docs/rfc-transfer-approval.md`
(RFC-9101). The runner never sees this file (see `README.md` → Blinding).

**Total: 32 points** across 2 groups, **14 checks**. Per check: **PASS = full**, **PARTIAL = half**
(round to 0.5), **FAIL = 0**.

> **Authoritative total: 32.** Group A (traps T1–T6) = 16; Group B (general breakdown quality) = 16.
> Do not re-derive at grading time; use 32.

**Grading rule (mandatory).** Every verdict must **quote the runner's output** — the exact slice
title, size, `Blocked by:` line, or parallelizability note that earns it — or state the **explicit
absence** ("no slice records a dependency on the migration"). No verdict from inference. If the
runner asked a clarifying question instead of deciding, grade only what it **committed to on paper**.

**What counts as "the runner's output" (multi-file runs).** A run directory may hold a **deliverable
backlog** (`WORK-BREAKDOWN.md` and any per-slice `US-*.md`) plus **judgment-call notes**
(`QUESTIONS.md`, `RUN-NOTES.md`). All of these are the runner's output and may be quoted — but the
**backlog is the primary graded artifact**: every check must be earnable from what the sequencer
would actually act on. The notes are **corroborating evidence** (quote them to confirm the runner's
intent), never a **substitute** for a backlog element — if a requirement lives only in a side-note
and never reaches the backlog, grade the backlog as it stands. An unresolved clarifying question in
`QUESTIONS.md` is not a commitment (per "committed to on paper", above).

**The runner is graded on judgement, not vocabulary.** It need not use the words "vertical",
"blocking edge", or a trap's name. Credit substance: a cut that is demonstrably end-to-end, an
ordering the sequencer can act on, a coupling surfaced in any words. Cross-check every dependency
claim against the actual fixture code before awarding C3 / C8.

Citations key: **SK** = `plugins/swe-flow/skills/work-breakdown/SKILL.md` (its five sections:
*Vertical slices*, *Sizing ladder*, *Four break triggers*, *Ordering and blocking edges*, and
*Parallel-safety is derived, not declared* — the skill has no `references/`, so every documented
demand traces to one of these five). Fixture anchors are cited by path + fact.

---

## Ground truth — the code the breakdown must navigate

Facts a correct breakdown depends on (all discoverable from the fixture, none labelled in the RFC):

- **G-FILE.** `src/Allocation/AllocationService.cs` is **one file** holding the `Reservation` class,
  the `AllocationService.Commit` logic, **and** the `DepotTransferRequested` / `EquipmentAllocated`
  event records. Any work item touching the reservation model **and** any work item touching the
  transfer event contract both edit **this same file** → they are not file-disjoint. (T1)
- **G-ORPHAN.** `DepotTransferRequested` is published in `Commit` and consumed by **nothing** —
  the code says *"Nothing listens for this yet."* An "emit the event" change produces **no
  observable behaviour** until a consumer lands. (T2)
- **G-NOID.** `DepotTransferRequested(AssetTag, FromDepot, ToDepot, When)` carries **no reservation
  id**; AC5 forces adding it — a small edit at the record **and** its emit site in `Commit`. (T1/T6-adjacent)
- **G-LOG.** `src/Logistics/LogisticsService.cs` `On(EquipmentAllocated)` schedules a run on **every**
  commit; the feature requires it to react to an **accepted** transfer instead. Allocation+Logistics
  share types and ship together — the emitted shape and the consumed shape are one joint change. (real edge)
- **G-MIG.** `db/migrations/0001_audit_log.sql` exists; the new `transfer_approval` table is
  `0002…`. Both the **queue read view** and the **persisted decision record** read/write it → the
  migration must precede **both**. (T4)
- **G-SG.** `src/Vendors/ExternalServiceClients.cs` `SendGridNotificationClient.SendReceipt(to, body)`
  hardcodes subject `"Your RentField receipt"`; the decision email needs its own subject. A tiny
  (XS) refactor to parameterise the subject. (T6)

**Reference correct cut** (one valid vertical breakdown; runners may cut differently and still pass —
grade substance): (1) **migration** `transfer_approval` [S]; (2) **accept-one-transfer** end-to-end —
pending intake + accept path + availability re-check + reservation status + enriched accepted event +
Logistics schedules it + email + test [M, blocked by 1]; (3) **reject-one-transfer** end-to-end —
reject path + release hold + email + test [S–M, blocked by 1]; (4) **pending-transfers queue** read
view [S, blocked by 1]; authorization rule + event-id + reservation-status field + SendGrid subject
**folded into** the slices whose deliverable needs them, not stood up alone.

---

## A. Traps — T1–T6 (6 checks = 16 pts)

### A1 (T5) — Slices are VERTICAL, not horizontal layers (3 pts)
The RFC's three sections (*Approver surface* / *Approval service logic* / *Data and events*) bait a
schema→service→UI split.
**PASS:** Slices cut top-to-bottom — at least one slice (e.g. accept-one-transfer) spans table +
decision logic + event/Logistics + email + test and is demonstrable on its own; the breakdown does
**not** produce "the schema" / "the service layer" / "the queue UI" as separate horizontal layers.
**Typical FAIL:** Three (or more) slices named per layer — a migration/schema slice, a
service-logic slice, a UI/queue slice — where nothing is demonstrable until the last lands.
**Citation rule:** Quote the slice list; PASS needs a slice whose deliverable is end-to-end
observable, FAIL is layer-named slices. **Cite:** SK §"Vertical slices over horizontal layers"
(*"Nothing is demonstrable until slice 3"*); RFC §Approver surface / §Approval service logic / §Data.
**Verdict:** __ / 3

### A2 (T3) — The XL decision engine is SPLIT into reviewable slices (3 pts)
§Approval service logic bundles pending intake + accept + reject + availability re-check +
authorization + two announcements, and says outright it *"cannot be reviewed as a single change."*
**PASS:** This is broken into ≥2 independently reviewable slices (e.g. accept-path and reject-path
as separate slices, with authorization / re-check folded or sliced) AND, if the runner sizes it,
it is not carried as a single L/XL unit.
**PARTIAL:** Recognises it is too big / sizes it XL but leaves it as one slice, or splits into only a
vague two without distinct proofs.
**Typical FAIL:** One "approval engine" / "approval service" slice covering the whole decision flow.
**Citation rule:** Quote the slice(s) covering the decision flow + any size. **Cite:** SK §"Sizing
ladder" (*"XL … must break down — never start an XL as one unit"*); SK break trigger #2 (accept and
reject *"prove out differently"*); RFC §Approval service logic.
**Verdict:** __ / 3

### A3 (T1) — Hidden same-file coupling in `AllocationService.cs` is SURFACED (3 pts)
The "reservation records transfer status" work and the "transfer event carries reservation id +
emit-site change" work look independent (model field vs event contract) but both edit
`src/Allocation/AllocationService.cs` (G-FILE).
**PASS:** The breakdown surfaces that these cannot proceed as independent/parallel work — either
**merges** them into one slice, or records a **blocking/serialization edge**, or explicitly marks
them **not file-disjoint / not concurrently runnable** because they touch the same file.
**PARTIAL:** Puts both edits in one slice incidentally without noting the coupling, OR notes coupling
but still lists them as parallelizable elsewhere.
**Typical FAIL:** Two separate slices (reservation-status; event-contract) presented as independent
or parallel, no same-file coupling noted.
**Citation rule:** Grader opens `AllocationService.cs`, confirms both concerns live in it, then
checks whether the runner's two work items are (correctly) coupled or (wrongly) called independent.
**Cite:** SK §"Ordering and blocking edges"; SK break trigger #3; fixture `AllocationService.cs`
(Reservation + `DepotTransferRequested` + `Commit` in one file).
**Verdict:** __ / 3

### A4 (T4) — The migration is an ORDERING edge preceding TWO slices (2 pts)
The `transfer_approval` migration is read/written by both the queue read view and the persisted
decision record (G-MIG).
**PASS:** A migration slice exists AND **at least two** feature slices are recorded as blocked
by / ordered after it (e.g. both the queue slice and the decision slice carry a `Blocked by:` the
migration, or the sequence places it first with both consumers after).
**PARTIAL:** Migration present and one dependent slice ordered after it, but a second real consumer
is left un-ordered; OR ordering stated only as prose with no per-slice edge.
**Typical FAIL:** No migration slice, or the migration folded into one feature slice while another
slice silently also needs the table.
**Citation rule:** Quote the migration slice + each `Blocked by:`/ordering line. **Cite:** SK
§"Ordering and blocking edges" (*"US-B cannot start until US-A ships its migration"*); fixture
`db/migrations/`, RFC §Data and events.
**Verdict:** __ / 2

### A5 (T2) — The unverifiable emit chunk is MERGED or RE-CUT, not shipped alone (3 pts)
`DepotTransferRequested` is orphaned today (G-ORPHAN); an "emit the accepted/approval event" chunk
has no observable behaviour until a consumer (Logistics / the decision handler) lands.
**PASS:** No standalone "emit event" / "add the event" slice is presented as independently
shippable/testable — the emit is **folded into a slice that also lands its consumer** (so the pair
is demonstrable), or the runner explicitly flags that an emit-only cut cannot be verified and
re-cuts it.
**PARTIAL:** Emit is a separate slice but the runner notes it needs a consumer to verify / pairs it
via a dependency edge (rather than merging).
**Typical FAIL:** A standalone "publish `DepotTransfer…` event" slice with an acceptance criterion,
treated as independently verifiable, no note that nothing observes it.
**Citation rule:** Quote the slice covering the emit + its stated AC/verification. **Cite:** SK
§"Vertical slices…" (*"each slice delivers a thin but complete behaviour a user or a gate can
observe"*); SK break trigger #4 (*"no point where you can show it working"*); fixture
`AllocationService.cs` comment *"Nothing listens for this yet"*.
**Verdict:** __ / 3

### A6 (T6) — The SendGrid subject refactor is FOLDED into the slice that needs it (2 pts)
`SendReceipt` hardcodes a subject; the decision email needs its own (G-SG). This is an XS refactor.
**PASS:** The subject/adapter tweak is folded into a notify-bearing vertical slice (accept or reject
email), sized XS or simply carried inside a larger slice — not a standalone item.
**PARTIAL:** Called out as small/trivial but still listed as its own slice; OR folded but sized
S/M as if it were substantial.
**Typical FAIL:** A standalone "refactor SendGrid client" / "generalise the notification adapter"
slice with no user-observable deliverable of its own.
**Citation rule:** Quote where the SendGrid change appears (folded vs standalone) + any size.
**Cite:** SK §"Sizing ladder" (*"XS … fold into a larger slice"*); fixture
`ExternalServiceClients.cs` `SendReceipt` fixed subject.
**Verdict:** __ / 2

---

## B. General breakdown quality (8 checks = 16 pts)

### B1 — Every slice ends in an independently testable, reviewer-rejectable deliverable (3 pts)
**PASS:** Each slice names a concrete observable outcome (a behaviour, a test, a demo) a reviewer
could reject on — no slice is a pure internal-plumbing chunk with nothing to show. (The accept and
reject slices each end in a distinct proof.)
**PARTIAL:** Most slices are demonstrable but one or two are plumbing-only with no stated deliverable.
**Typical FAIL:** Multiple slices with no observable deliverable (e.g. "wire up the handler",
"add the field"), or acceptance left implicit across the board.
**Citation rule:** Quote each slice's deliverable/AC. **Cite:** SK §"Vertical slices…"
(*"Each good slice can be shipped, reviewed, and closed on its own evidence"*).
**Verdict:** __ / 3

### B2 — Blocking edges are SOUND and COMPLETE vs the code (3 pts)
Grader cross-checks every dependency claim against the fixture.
Real edges: queue ← migration; decision(accept/reject) ← migration; Logistics-schedules-on-accepted
← Allocation-emits-accepted (G-LOG, shared-release partnership); accept/reject ← the
`AllocationService.cs` reservation/event change (or merged).
**PASS:** Every blocking edge the runner lists is real (verifiable in code) AND every real edge
above is represented (as an edge or by merging the coupled work). No invented edges (e.g. accept
blocking reject) and no missing migration/Logistics dependency.
**PARTIAL:** Most edges right but one real edge missing OR one invented/unjustified edge.
**Typical FAIL:** Migration or Logistics dependency absent, or fabricated ordering not grounded in code.
**Citation rule:** For each edge, quote the runner's line and name the code fact that confirms/refutes
it. **Cite:** SK §"Ordering and blocking edges"; fixture `db/migrations/`, `LogisticsService.cs`,
`AllocationService.cs`.
**Verdict:** __ / 3

### B3 — Sizes assigned on the documented XS–XL ladder (2 pts)
The SKILL.md *Sizing ladder* table teaches the five sizes and a rule-of-thumb per size, but never
instructs the author to write down a justification — so a stated rationale is **credited, not
required**. Demanding a written rationale would invent a requirement the skill never teaches, against
the corpus's own design promise (README §Independence: *"no check invents a requirement the skill
never teaches"*).
**PASS:** Each slice carries a size from the skill's ladder (XS/S/M/L/XL) and that size is plausibly
consistent with the ladder's rule of thumb for the slice's scope (behaviours count / boundaries
crossed / demo-in-one-sitting). A one-line rationale, if present, strengthens the evidence — but a
bare-but-correct ladder label still earns full credit. XL, if used, triggers a split (see A2).
**PARTIAL:** An off-ladder scale (t-shirt beyond XS–XL, story points), OR a size clearly at odds with
its slice's scope (e.g. a multi-boundary, multi-day slice labelled XS).
**Typical FAIL:** No sizing, or labels with no relation to the ladder.
**Citation rule:** Quote each size (and its rationale, if the runner gave one). **Cite:** SK §"Sizing
ladder" (the table).
**Verdict:** __ / 2

### B4 — Parallel-safety DERIVED from touched files + closing concurrency statement (2 pts)
SK §"Parallel-safety is derived, not declared" now makes this a **documented output contract**, not
an optional nicety: each slice carries a `Touches:` file list (best-effort estimate), parallel-safety
is *derived* from disjoint/overlapping sets rather than asserted, and the breakdown **ends with a
concurrency statement** — which slices may run concurrently and why. The skill states outright:
*"Silence is an incomplete breakdown, not a safe default."* So absence of a concurrency statement is a
real defect here, and any false disjointness claim is worse. (The specific same-file coupling is also
scored at A3; this check grades the general contract + the false-claim guard.)
**PASS:** A closing concurrency statement names which slices may run concurrently, derived from
per-slice `Touches:`/file-level reasoning, AND does **not** call two slices that both edit
`AllocationService.cs` file-disjoint (consistent with A3).
**PARTIAL:** A concurrency statement is present but asserted without deriving it from touched-file
sets (no `Touches:` basis), OR one overlap is missed — provided **no** false parallel / file-disjoint
claim is made.
**Typical FAIL:** No concurrency statement at all (the skill calls silence "an incomplete
breakdown"), OR a parallelism claim contradicted by shared files — e.g. calling the two
`AllocationService.cs` edits file-disjoint or safe to run concurrently.
**Citation rule:** Quote the concurrency statement and any `Touches:` lines; if none, record the
explicit absence (→ FAIL). Cross-check every disjointness claim against the files each named slice
touches. **Cite:** SK §"Parallel-safety is derived, not declared" (*"Give each slice a `Touches:`
line… End every breakdown with a concurrency statement… Silence is an incomplete breakdown"*);
fixture `AllocationService.cs`.
**Verdict:** __ / 2

### B5 — Dependencies modelled in body text, NOT an invented front-matter key (1 pt)
**PASS:** Ordering is expressed as a `Blocked by: …` (or equivalent) line in the slice body / prose,
per the skill — the runner does **not** invent a `blockedBy:` front-matter field.
**PARTIAL:** Dependencies in prose but sequencing is vague / not per-slice actionable.
**Typical FAIL:** Invents a `blockedBy` front-matter key (which the govkit schema does not resolve),
or records no dependencies at all.
**Citation rule:** Quote the dependency notation. **Cite:** SK §"Ordering and blocking edges"
(*"do NOT invent a front-matter key: model the dependency in the user-story body text"*).
**Verdict:** __ / 1

### B6 — Break triggers applied where they fire (2 pts)
**PASS:** The breakdown's cuts are justified by the skill's four triggers where they apply — the RFC
title itself contains **"and"** (trigger #1); accept vs reject need **different proofs** (#2); the
flow **crosses Allocation + Logistics + notifications** (#3); the decision engine **can't be demoed
in one sitting** (#4). At least two triggers named or clearly used to justify a split.
**PARTIAL:** One trigger invoked, or splits made without connecting them to any trigger.
**Typical FAIL:** No reasoning tied to the triggers; cuts asserted arbitrarily.
**Citation rule:** Quote the runner's justification against the trigger it uses. **Cite:** SK
§"Four break triggers".
**Verdict:** __ / 2

### B7 — Edges kept few — no slice stacked on multiple upstreams (1 pt)
**PASS:** Each slice stands on at most ~one upstream dependency; where a slice would be blocked by
both the migration and the `AllocationService.cs` change, the runner re-slices/merges so it rests on
a single upstream — per the skill's "keep the edges few" guidance.
**PARTIAL:** Mostly single-upstream but one slice carries a 2-deep chain left unaddressed.
**Typical FAIL:** A slice blocked by three-plus others, or a tangle the sequencer can't act on.
**Citation rule:** Quote the dependency lines and count upstreams per slice. **Cite:** SK §"Ordering
and blocking edges" (*"a slice blocked by three others is usually mis-cut… each stands on a single
upstream dependency at most"*).
**Verdict:** __ / 1

### B8 — Output contract complete (2 pts)
**PASS:** The output is a usable backlog: a list of slices, each with an id/title, a size, an
acceptance criterion / deliverable, and its ordering — enough for a sequencer to act. Covers all of
AC1–AC5 (pending queue, accept, reject, notify, traceable-to-reservation).
**PARTIAL:** Slice list present but one required element missing across the board (no sizes, or no
per-slice AC, or an AC of the RFC dropped).
**Typical FAIL:** Free-form prose with no discrete slices, or the breakdown omits a whole RFC
behaviour (e.g. never covers reject, or never covers the queue).
**Citation rule:** Map each slice to id/size/AC/ordering and each of AC1–AC5 to a slice. **Cite:**
SK §"Vertical slices…" + §"Sizing ladder" + §"Ordering…" (the three things the skill says an output
carries); RFC §Acceptance criteria.
**Verdict:** __ / 2

---

## Results table (fill per run — quote the runner's output for every verdict)

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 (T5) Slices vertical, not layers | 3 | | | |
| A2 (T3) XL decision engine split | 3 | | | |
| A3 (T1) Same-file coupling surfaced | 3 | | | |
| A4 (T4) Migration precedes two slices | 2 | | | |
| A5 (T2) Unverifiable emit merged/re-cut | 3 | | | |
| A6 (T6) SendGrid refactor folded | 2 | | | |
| B1 Slices independently testable/rejectable | 3 | | | |
| B2 Blocking edges sound + complete vs code | 3 | | | |
| B3 Sizes on the XS–XL ladder | 2 | | | |
| B4 Parallel-safety derived + concurrency statement | 2 | | | |
| B5 Deps in body text, not front-matter key | 1 | | | |
| B6 Break triggers applied | 2 | | | |
| B7 Edges kept few (≤~1 upstream) | 1 | | | |
| B8 Output contract complete (AC1–AC5) | 2 | | | |
| **TOTAL** | **32** | | | |

Scoring: PASS = full, PARTIAL = half (round to 0.5), FAIL = 0. Record the total and, for any
non-PASS, one line on what a full-credit answer would have said.
