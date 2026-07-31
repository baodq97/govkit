# Hotspots — Harbourline (round 1, 2026-07-30)

**Ids H1–H19 are stable and are never renumbered.** A later round adds ids; it does not reissue
them. Nothing here is closed: every one of these is open because the corpus says it is open, or
because measurement showed a hole. None was resolved to make the document tidy.

Five of them (H2 · H3 · H4 · H5 · H12) are hotspots the **corpus itself declares unresolved** —
"Nobody picked one", "Left unresolved in the meeting", "Not decided", "We have not decided",
"Nobody has signed off on this yet". Those are the strongest findings in this round, because they
are disagreements recorded by the business about itself rather than inferred by me.

| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| H1 | What values can a booking's status take? `booking.status` is `TEXT` with no CHECK and no enumeration (measured: 0 enumeration facts in `facts.jsonl`), and the word "status" occurs in **0 of 8** prose files | measurement — nobody uses the word | booking lifecycle; any state machine | Tuan (operations) |
| H2 | Does "delivered" mean on the vessel or received by the consignee? | Ha vs Duc, 2026-06-02 — "Two meanings, both in daily use. Nobody picked one." | the completion event; customer notification; UL seam | Ha, Duc, and a **real customer** |
| H3 | Is the documentation fee revenue or a pass-through? | Linh, 2026-05-14 — "Both have been true at different times. Left unresolved in the meeting." | quote/invoice seam; what a quote total means | Linh (finance) + Mai (commercial) |
| H4 | How long is a quote good for? 7 days (Mai) or the rate-card week (Linh)? | Mai vs Linh, 2026-05-14 — "Not decided." | whether `QuoteExpired` exists at all | Mai + Linh |
| H5 | Who owns the rate card? | product-brief.md:17 — "We have not decided who owns the rate card." | authority over pricing; the to-be "stop quoting by hand" has no owner | Mai + Linh |
| H6 | Is a "booking" the sheet row, or the customer's request before confirmation? | glossary-draft.txt:3-4 — "Mai and Tuan use it both ways in the same sentence." | aggregate identity; when the lifecycle starts | Mai + Tuan |
| H7 | Is a "job" a different thing from a booking, or the same thing after dispatch? | glossary-draft.txt:5 | whether dispatch creates a second aggregate | Tuan (operations) |
| H8 | Does `container` mean a container **type** (rate-card dimension) or a **physical box**? Measured: one `TEXT` column, 7 prose occurrences across 6 documents, both senses present | measurement + Ha vs Mai's usage | the tracking model and the pricing model at once | Mai + Ha + Duc |
| H9 | Where is a box once it leaves the yard? | Duc, 2026-06-02 — "Once it leaves, only the driver knows." Tuan: making drivers update the sheet "lasted three weeks." | the location read model; who is the source of truth | Duc + Tuan + the **drivers** (quoted by nobody) |
| H10 | A booking is confirmed before anyone knows a slot exists. Is confirmation conditional, or is the invariant "no confirmation without a slot"? | product-brief.md:13 — ranked the #1 pain | ordering of rows 11/12; the invariant | Tuan + Mai + the carriers |
| H11 | Is there a concept for the customer's own purchase-order number? Customers identify bookings by it; "we do not store [it] anywhere"; staff keep it in the notes column "when they remember". Measured: no DDL name matches `purchase order` **or** `notes` | support-log-digest.md:9-10 + measurement | booking identity and aliases | Ha + Mai |
| H12 | Is there one carrier concept or two? | decision-memo:10-11 — "do not pretend in the model that the two are the same thing… Nobody has signed off on this yet." | external-system modelling; the slot-check path | the memo's **unnamed author** + Mai |
| H13 | Does anybody use the `movement` model? Measured: `movement`, `event` and `noted_at` occur in **0 of 8** prose files | measurement | whether tracking is an event log or a status field | the DDL's unnamed author; Tuan |
| H14 | Who writes a booking down? "Whoever picks it up" — the role is explicitly indeterminate | ops-walkthrough.md:3 | actor modelling; authority to create a booking | Tuan (operations) |
| H15 | What are the real complaint proportions? The digest says outright "Rough proportions, not counts" and was "grouped by hand" | support-log-digest.md:3 | `5-strategize` prioritisation, which would otherwise rank on an estimate | Ha, with the mailbox actually counted |
| H16 | Is there a rate-card entity, and at what granularity (week × lane × container type)? Measured: **0** tables or columns match `rate card` | measurement vs Mai, 2026-05-14 | the pricing model; the to-be automated quote | Mai (commercial) |
| H17 | What happens to a booking whose box misses the sailing? The corpus states the outcome occurs ("the sailing may go without it… perhaps twice a month") and stops there | ops-walkthrough.md:14-15 | the exception path; compensation; customer comms | Tuan + Ha + the broker |
| H18 | Is anything ever cancelled? Measured: `rg -i -e cancel -e void -e abort` over the 9 corpus files (6,136 bytes) → **0 matches, 9 files searched**. So nothing written down cancels a booking, a quote or a slot | measurement — a **stated absence in this corpus**, not a designed simplicity | whether the lifecycle has a terminal failure path | Tuan + Mai |
| H19 | Is `db/schema.sql` a design anyone stands behind? Its own first line: "The spreadsheet replacement someone started and abandoned." No author is named anywhere in the corpus | db/schema.sql:1 | how much weight rows 42-44 of the timeline may carry | whoever wrote it |

## Six hotspots that only exist because something was measured

H1, H8, H11, H13, H16 and H18 are not disagreements anyone voiced — they are holes a script found.
That is the point of measuring a structured corpus rather than reading it: **"the schema does not
mention a rate card" is a sentence until a probe list, a corpus and a match rule turn it into a
set.** The set is in `.ddd-flow/mine/reports/absences.json`: of 26 business nouns verified to occur
in the prose, **24 have no name in the DDL**; only `surcharge` and `customer` do.

A note on what that does *not* mean. The DDL is 24 lines and there is no application code, no
migrations directory and no ORM in this snapshot (stage-1 inventory: 9 files). "Absent from the
schema" here means absent from one abandoned file — it is **not** evidence about a running system,
and the corpus does not describe one. The business runs on a spreadsheet and a WhatsApp group
(README.md:3-4), neither of which is in the corpus at all: that is this round's largest unmeasured
set, and no number in these documents covers it.
