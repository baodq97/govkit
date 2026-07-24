# Work breakdown — RFC-9101 "Depot transfer approval and notification flow"

Applies `swe-flow:work-breakdown` to the accepted RFC against the RentField fixture.
Skill principles used: **vertical slices over horizontal layers**, the **XS–XL sizing ladder**,
the **four break triggers**, and **ordering / blocking edges recorded in the story body**
(govkit has no `blockedBy` front-matter field — the schema resolves `parent` only — so
dependencies are written as a `Blocked by:` line, per the skill).

---

## 0. Is the whole RFC one unit of work? No — it is XL, must break down

The RFC self-declares it: *"This whole decision engine — pending intake, the accept path, the
reject path, the availability re-check, the authorization rule, and the two announcements — is
more than one sitting of work; it cannot be reviewed as a single change."* That is the XL rung:
**never start an XL as one unit.**

All four break triggers fire on the RFC as written:

1. **Title contains "and".** *"Depot transfer approval **and** notification flow"* — approval and
   notification are separate cuts (they prove out differently: a scheduled/released move vs. an
   email leaving the building).
2. **ACs need different verification.** AC2 (accept ⇒ a Logistics run appears) and AC3
   (reject ⇒ the hold is released, no run) are proven by *opposite* end states; AC1 (a row is
   readable in a queue) and AC4 (two emails sent) are each a third and fourth distinct proof.
3. **It crosses more than one boundary.** A DB migration, the Allocation module, the Logistics
   module, and the Vendors/SendGrid adapter are all touched.
4. **It cannot be demoed in one sitting.** There is no single point at which the entire flow can
   be shown working.

### One boundary that must NOT be cut — the Allocation/Logistics seam

Break trigger 3 says "each side of a boundary is its own cut" — but it means *independent*
boundaries. Allocation and Logistics are **not** independent here:

- `teams.yaml` → the **fulfilment** squad `owns: [allocation, logistics]` with
  `release_cadence: shared`.
- `LogisticsService.cs` header: *"Logistics and Allocation … use each other's model types
  directly; the two evolve together and ship in the same release."*
- The RFC: *"the shape Logistics consumes and the shape Allocation emits are one decision made on
  both sides at once."*

So the accept path's *Allocation-emits-accepted-announcement* and
*Logistics-schedules-off-it* are **one vertical slice**, not two. Splitting them would produce
horizontal layers — an emitter nothing consumes, then a consumer nothing feeds — neither
demonstrable on its own. This is the deliberate trap in break trigger 3, and slice S2 keeps
both sides together.

---

## The slices

Five vertical slices. Each is a thin top-to-bottom cut (schema → domain logic → event →
read/side-effect → test) that ships an observable behaviour. IDs `US-01…US-05` are the future
user stories.

| ID | Slice | Size | Delivers | Blocked by |
|----|-------|------|----------|------------|
| US-01 | Pending intake + approver queue | **L** | AC1, AC5 (linkage) | — |
| US-02 | Accept ⇒ Logistics schedules the move | **L** | AC2, AC5 (trace confirmed) | US-01 |
| US-03 | Reject ⇒ release the hold | **M** | AC3, AC5 (trace confirmed) | US-01 |
| US-04 | Decision notification email (both depots) | **M** | AC4 | US-02 |
| US-05 | Decision authorization guard | **S** | Approval-logic authz rule | US-02 |

Every slice stands on **at most one** upstream dependency (the skill's re-slice bar: "a slice
blocked by three others is usually mis-cut").

---

### US-01 — Pending intake and the approver queue  ·  size L

**Behaviour (the vertical cut):** when Allocation commits a unit to a non-home depot, a transfer
is written as `pending` and shows up in a read-only pending-transfers queue an approver can open.

**Delivers:** AC1. Establishes the AC5 reservation linkage (the row carries the reservation it
concerns; the trace is *confirmed* once a decision is recorded in US-02/US-03).

**Touches (thin, end-to-end):**
- **Schema:** new migration under `db/migrations/` adding `transfer_approval`
  (`id, asset_tag, from_depot, to_depot, requested_for, status, decided_by, decided_at`),
  seeded with `status = 'pending'` and `decided_by/decided_at` null.
- **Event shape:** `DepotTransferRequested` (`AllocationService.cs:82`) today carries only
  `AssetTag, FromDepot, ToDepot, When`. Add the **reservation id** (AC5), and change the single
  emit site at `AllocationService.cs:70` inside `Commit(...)`.
- **Reservation model:** record whether a reservation currently sits under a
  pending/accepted/rejected transfer (RFC "Data and events"), so the same unit is not offered for
  a second move while one is in flight; set it to `pending` at intake.
- **Persistence:** a handler that listens for `DepotTransferRequested` and inserts the `pending`
  row (nothing listens today — `AllocationService.cs:67-68`).
- **Read view:** the pending-transfers queue query — one row per pending transfer
  (asset, from-depot, to-depot, requested date), the approver's "whole world" (RFC "Approver
  surface"). Empty queue ⇒ nothing to do.
- **Test:** commit a cross-depot reservation ⇒ exactly one `pending` row appears in the queue,
  carrying its reservation id.

**Why L and not split further:** the two halves ("persist as pending" + "readable in a queue")
are AC1's single bundled proof; splitting them would go **horizontal** (a table nobody reads, or
a query over nothing). It sits at the L rung — ship as one slice — because no break trigger
splits a genuinely-vertical foundation cut.

**Why it is first:** it is the only enabling slice; every decision slice reads the state it lays
down. It carries no upstream dependency of its own.

`Blocked by:` — none.

---

### US-02 — Accept a pending transfer ⇒ Logistics schedules the move  ·  size L

**Behaviour:** an approver accepts a pending transfer; the unit's availability for the window is
re-checked, the transfer is marked `accepted` (reservation stays owned by the accepting depot),
an *accepted-transfer* announcement is emitted, and **Logistics schedules a delivery run off that
announcement** — no longer off the raw commit for cross-depot moves.

**Delivers:** AC2. Confirms AC5 for the accept path (writes `decided_by`/`decided_at` against the
reservation-linked row).

**Touches (thin, end-to-end — spans Allocation *and* Logistics as one cut, see §0):**
- **Decide entry point:** introduce the approval-service `Decide(transferId, accept, decidedBy)`
  path with its accept branch — re-confirm no overlap using the *same* rule Allocation already
  enforces (`Reservation.Overlaps`, `AllocationService.cs:17,46-51`), flip `status → accepted`,
  record decider + timestamp, keep `DepotId` pointed at the accepting depot.
- **Announcement:** emit a new `TransferDecided` event (reservation id, asset, from/to depot,
  outcome = accepted, decided-by). This is the shared contract US-04 subscribes to.
- **Logistics rewire:** `LogisticsService.On(EquipmentAllocated)` (`LogisticsService.cs:14-15`)
  adds a run for **every** commit. For cross-depot moves it must instead add the run on the
  accepted announcement. Because Allocation emits and Logistics consumes the same model
  (shared release), this side of the change ships in the same slice.
- **Queue side-effect:** the accepted row leaves the pending queue (RFC "Approver surface":
  every action leaves a visible outcome; an already-decided transfer does nothing).
- **Test:** accept a pending transfer ⇒ row leaves the queue, a `DeliveryRun` appears; a raw
  cross-depot commit alone no longer produces a run.

**Why L and one slice:** AC2 is one behaviour whose proof requires the announcement *and* the
Logistics consumption together. Splitting Allocation-emit from Logistics-consume is the exact
horizontal anti-pattern §0 rejects.

`Blocked by:` US-01 (needs the persisted `pending` state and the queue to read it from).

---

### US-03 — Reject a pending transfer ⇒ release the hold  ·  size M

**Behaviour:** an approver rejects a pending transfer; it is marked `rejected`, the underlying
hold is released so the unit returns to the book, and nothing is ever scheduled.

**Delivers:** AC3. Confirms AC5 for the reject path (writes `decided_by`/`decided_at`).

**Touches (thin, end-to-end):**
- **Reject branch** on the `Decide(...)` path: flip `status → rejected`, record decider +
  timestamp.
- **Release the hold:** call `Reservation.Release()` (`AllocationService.cs:18`) so `Status`
  becomes `released` and the overlap check (`AllocationService.cs:46`) stops counting it — the
  unit is re-bookable.
- **Announcement:** emit `TransferDecided` with outcome = rejected (Logistics ignores this
  outcome; US-04 emails on it).
- **Queue side-effect:** the rejected row leaves the queue; no `DeliveryRun` is created.
- **Test:** reject a pending transfer ⇒ reservation is `released`, the unit can be re-committed
  for the same window, no delivery run exists.

**Why separate from US-02 (break trigger 2):** accept and reject *prove out differently* — one
ends in a scheduled move, the other in a released hold. Different proofs ⇒ different slices. The
RFC states this outright.

`Blocked by:` US-01 (needs the persisted `pending` state and the `Reservation` it releases).
*Independent of US-02* — both read US-01's pending state; whichever decision slice lands first
scaffolds the shared `Decide` skeleton, a merge detail, not a hard block.

---

### US-04 — Decision notification email to both depots  ·  size M

**Behaviour:** on any transfer decision, the sending depot and the receiving depot each receive
an email describing the decision, via the existing SendGrid adapter extended with a
transfer-decision subject and body.

**Delivers:** AC4.

**Touches (thin, end-to-end):**
- **Adapter:** `SendGridNotificationClient` today only does `SendReceipt` with the fixed subject
  `"Your RentField receipt"` (`ExternalServiceClients.cs:32`). Add a transfer-decision send with
  its own subject and body (the underlying `ISendGridSdk.Send(to, subject, body)` already takes a
  subject). Per the RFC, the adapter change is **not** shipped alone — it rides this wiring slice
  ("the email is only worth sending once there is a real accept/reject outcome to describe";
  an adapter method nobody calls would be a horizontal XS sliver).
- **Subscribe:** a handler on `TransferDecided` that sends to both `from_depot` and `to_depot`.
- **Test:** a decision event ⇒ two emails with the transfer-decision subject/body, one per depot.

**Why M and single-upstream despite AC4 spanning accept *and* reject:** the notification
mechanism is built and demonstrated on the accept path once `TransferDecided` exists (US-02).
Because reject (US-03) emits the *same* event, its email is covered automatically once US-03
lands — no extra notification work. So the one hard prerequisite is the event contract from
US-02.

`Blocked by:` US-02 (introduces the `TransferDecided` contract this subscribes to). AC4 is fully
covered on the reject path too once US-03 has also landed; no further work in this slice.

---

### US-05 — Decision authorization guard  ·  size S

**Behaviour:** only an approver for either the sending or the receiving depot may decide a given
transfer; anyone else is refused. Acting on an empty or already-decided transfer does nothing
(RFC "Approver surface").

**Delivers:** the authorization rule from "Approval service logic".

**Touches (thin, end-to-end):**
- A guard at the `Decide(...)` entry point checking the decider's depot against the transfer's
  `from_depot`/`to_depot`; refuse otherwise. Guards **both** the accept and the reject branch at
  one point.
- **Test:** an approver from an unrelated depot is refused; a sending- or receiving-depot
  approver is allowed; deciding an already-decided transfer is a no-op.

**Why its own slice (break trigger 2):** "unauthorized decider is refused" is a distinct proof
from the accept/reject happy paths, and isolating it keeps US-02 from bloating past L. Small
enough (S) to ship on its own once a decide path exists.

`Blocked by:` US-02 (needs the `Decide(...)` entry point to guard).

---

## Ordering (blocking edges, as a sequencer would run them)

```
US-01  (foundation: pending state + queue)
  ├── US-02  (accept ⇒ Logistics; introduces TransferDecided)
  │     ├── US-04  (notification, both depots)
  │     └── US-05  (authorization guard)
  └── US-03  (reject ⇒ release hold)
```

- **Wave 1:** US-01.
- **Wave 2:** US-02 and US-03 (parallel; both only need US-01).
- **Wave 3:** US-04 and US-05 (parallel; both only need US-02).

Every edge is a single upstream dependency. The `Blocked by:` lines above go in each user
story's **body** — do **not** add a `blockedBy` front-matter key (unsupported by the govkit
schema, which resolves `parent` only).

---

## AC coverage check

| AC | Slice(s) | Proof |
|----|----------|-------|
| AC1 pending + queue | US-01 | commit cross-depot ⇒ pending row readable in queue |
| AC2 accept ⇒ scheduled | US-02 | accept ⇒ DeliveryRun appears; raw commit no longer schedules cross-depot |
| AC3 reject ⇒ released, never scheduled | US-03 | reject ⇒ reservation released, no run |
| AC4 email both depots on accept & reject | US-04 (+US-03 for reject path) | decision ⇒ two transfer-decision emails |
| AC5 decision traceable to reservation | US-01 (linkage) + US-02/US-03 (decided_by/at) | row carries reservation id; decision recorded against it |

All five ACs covered; no slice is XL; no slice carries more than one upstream edge.
