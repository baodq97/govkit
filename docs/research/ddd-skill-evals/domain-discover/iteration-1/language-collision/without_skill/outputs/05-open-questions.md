# Open Questions

Ranked by how much downstream work each one blocks. Every question names who can answer it — an open question with no owner is just a note.

---

## Q1 — When is the Relocation Charge actually triggered, and does a cancellation still bill? `BLOCKING`

**Ask:** Finance (MINH), in writing.
**Blocks:** the entire charge model, the cancellation flow, and the Ops/Finance integration point.
**Why it can't be deferred:** the answer determines whether `Relocation Charge` has an independent lifecycle from `Unit Relocation`. If the charge follows completion, the split is cosmetic. If it follows the request and survives cancellation, they are genuinely separate entities with separate terminal states.

Ask all four cases explicitly — MINH's two statements only cover the last one:

| Case | Billable? |
|---|---|
| Contractor cancels before the charge is raised | ? |
| Contractor cancels after request, before dispatch | ? |
| Contractor cancels after dispatch | Yes, per MINH |
| Relocation fails for our reasons (breakdown, unit damaged, driver no-show) | ? (**Q1a**) |

**Q1a** deserves separate weight. Under a literal reading of *"we charge on request, not on completion"*, a contractor pays £180 for a machine that never arrived because our van broke down. That is probably not the intent, and it is the kind of gap that shows up later as a stream of credit notes.

**Secondary:** does Ops currently tell contractors the opposite? If so there is a live exposure — quotes given on the wrong rule — independent of any system work.

---

## Q2 — What is a unit's state while in transit? `BLOCKING`

**Ask:** Ops (HA), plus a depot manager.
**Blocks:** the unit lifecycle, and the scope of INV-1.

Sub-questions:
- Does the transit window itself count as a commitment against the unit?
- What happens to the unit's reservations at the origin depot once it is dispatched?
- Can the unit be reserved at the receiving depot for a window after expected arrival, while still on the road?
- Which depot "holds" the unit mid-drive?

The transcript jumps from *"someone drives it over"* to *"we mark it available"* with nothing in between. Overnight drives mean this state is real and lasts hours. Any booking calendar has to represent it.

---

## Q3 — What exactly counts as an overlapping window? `BLOCKING`

**Ask:** Ops.
**Blocks:** the implementation of INV-1 — the domain's only hard rule.

- Inclusive or exclusive endpoints? Is a reservation ending 09:00 in conflict with one starting 09:00?
- Do the windows include collection and return time, or only the hire period?
- Does transit time consume the window?
- What granularity — day, half-day, hour?

"Never double-booked" is unimplementable until this is nailed down, and the 2023 incident may well have been an off-by-one at exactly this boundary. Worth asking what actually happened in 2023.

---

## Q4 — Are `booked`, `committed`, and `reserved` one concept or several? `HIGH`

**Ask:** Ops, and check against whatever booking records exist.
**Blocks:** the glossary, and therefore every artefact downstream of it.

HA used all three within a few sentences. If they are one thing, pick `Reservation` and move on. If `committed` is broader — covering, say, both contractor reservations and internal holds like maintenance or transit — then INV-1 is scoped wider than reservations alone and the model needs a supertype.

---

## Q5 — Is `available` a stored status or a derived predicate? `HIGH`

**Ask:** Ops.

A unit that is at a depot, not out of service, and has no reservation for the requested window is *available* by derivation. But HA described availability as something a human **marks**. Those are different designs:

- If stored, it can drift from reality and needs reconciliation.
- If derived, "mark it available" really means "record that it arrived", and the location event is the thing to capture.

The second reading is more likely correct and cleaner, but this must be confirmed with Ops rather than assumed — the manual marking may exist for a reason nobody mentioned.

---

## Q6 — Has the double-booking rule ever actually been broken since 2023? `HIGH`

**Ask:** nobody — measure it. Pull booking history and check for overlapping commitments per unit.

INV-1 is currently an assertion protected by a whiteboard. The measurement decides how to treat it:

- **Zero violations:** the human process works. Automate it with confidence and enforce hard.
- **Any violations:** existing data violates the invariant, and any system enforcing it must handle the bad rows before go-live. Also tells us the rule is aspirational, which changes how it should be enforced (block vs warn).

This is cheap and it de-risks the one thing everyone agreed was non-negotiable.

---

## Q7 — Is £180 flat? `MEDIUM`

**Ask:** Finance.
Flat rate, distance band, unit-class dependent, negotiable per contractor, VAT-inclusive? One number in one sentence is not a pricing model. Ask for the rate card rather than the number.

---

## Q8 — Who owns the reservation-cancellation obligation when a unit goes out of service? `MEDIUM`

**Ask:** a depot manager.
Currently "someone". Even before any automation, this needs a named role — and the answer shapes who the eventual system notifies.

---

## Q9 — What makes a unit out of service? `MEDIUM`

**Ask:** a depot manager.
We know who decides. We do not know on what basis, whether there are categories (broken / servicing / retired / off-hire), or whether there is a route back to service.

---

## Q10 — What does the contractor experience when their reservation is cancelled? `MEDIUM`

**Ask:** Ops, and ideally a contractor.
Notification, substitute unit, refund, apology credit — none discussed. This is where the whiteboard gap becomes a customer-facing failure, so it is worth knowing what good looks like.

---

## Process notes for the next session

- **Interview a depot manager.** They own POL-2, POL-3, and the unassigned obligation in Q8, and were not in the room.
- **Get the naming ratified.** `Unit Relocation` and `Relocation Charge` are our words, not theirs. If Ops and Finance already have their own distinct terms, use those instead.
- **Ask what happened in 2023.** It is the origin of the domain's only hard rule and nobody asked. The incident detail will likely answer Q3 for free.
- **Watch for further collisions.** One session surfaced one homonym only because MINH happened to disclaim it out loud. Assume there are others that nobody flagged — `available`, `booked`, and `cancelled` are the likeliest candidates, since each was used by both departments.
