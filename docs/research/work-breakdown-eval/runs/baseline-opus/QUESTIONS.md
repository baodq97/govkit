# Questions the breakdown would normally put to the user — and the assumption taken

The `work-breakdown` skill is declarative (it teaches slicing rather than running an interview),
so these are the judgment calls where I would confirm intent. Per the run instructions I did
not stop; each records the assumption I proceeded on.

1. **Should authorization be its own slice or folded into accept?**
   Assumption: its own **S** slice (US-05). Break trigger 2 — "unauthorized decider refused" is a
   distinct proof from the accept/reject happy paths — and isolating it keeps US-02 under L. It
   guards both decision branches at one entry point, so it ships once after US-02.

2. **Notification (AC4) covers both accept and reject — one slice or two?**
   Assumption: **one** slice (US-04) that subscribes to a common `TransferDecided` event, with a
   single hard upstream (US-02, which introduces the event). Reject's email rides the same
   subscription once US-03 lands, so no second notification slice is needed. Rejected the
   alternative of folding an email into each of US-02 and US-03, which would duplicate the
   SendGrid adapter change across two slices.

3. **Does the "reservation records pending/accepted/rejected transfer status" flag get its own
   slice?**
   Assumption: **fold into US-01** (intake sets it to `pending`). It is data plumbing for the
   pending state, not an independently demonstrable behaviour; a standalone flag slice would be a
   horizontal XS sliver.

4. **Which slice owns AC5 ("decision traceable to the exact reservation")?**
   Assumption: the reservation **linkage** (reservation id on `DepotTransferRequested` and on the
   `transfer_approval` row) lands in **US-01**; the trace is **confirmed** when a decision writes
   `decided_by`/`decided_at` in US-02/US-03. AC5 is therefore listed against US-01 with
   confirmation in the decision slices rather than assigned to a single slice.

5. **Output artifact shape — a plain slice backlog, or governed govkit User Story docs?**
   Assumption: this skill is atomic and "calls no other skill", so I produced the **breakdown
   document** (slices + sizing + break-trigger analysis + ordering) and did **not** invoke
   `spec-author` to write governed `US-*` docs or touch any `INDEX.md`. IDs `US-01…US-05` are
   suggested future stories. Dependencies are written as body `Blocked by:` lines (never a
   `blockedBy` front-matter key, which the govkit schema does not support).

6. **Target granularity (how many slices)?**
   Assumption: **five**. Derived from the ACs + the RFC's own decomposition (intake, accept,
   reject, notification, authorization), each a thin vertical cut. Not split finer because finer
   cuts would go horizontal (schema-only, event-only, adapter-only).

7. **Is the Allocation/Logistics change one slice or two?**
   Assumption: **one** (inside US-02). `teams.yaml` (fulfilment owns both, shared release),
   the `LogisticsService` header (shared model types, ship together), and the RFC ("one decision
   made on both sides at once") all say they are not independent boundaries. Splitting on that
   seam would produce non-demonstrable horizontal layers, so break trigger 3 does **not** apply
   there.
