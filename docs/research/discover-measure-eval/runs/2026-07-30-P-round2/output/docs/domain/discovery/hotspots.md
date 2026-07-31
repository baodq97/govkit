# Hotspots — Harbourline discovery, 2026-07-30

Ids H1–H23 are stable: future rounds add, never renumber. None is resolved here — an open hotspot
is a finding; a quietly closed one is a decision nobody made. "Raised by" cites the source this run
read; no hotspot was raised by a person *to* this run, since nobody attended.

| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| H1 | Is a booking confirmed before or after the slot check? Brief's pain #1 says confirmed before a slot is known to exist; ops walkthrough says the carrier is phoned before confirming. Both cannot be the general case. | product-brief.md vs ops-walkthrough.md | ordering of BookingConfirmed; the slot invariant | Tuan + Mai |
| H2 | Who owns the rate card? Stated undecided outright. | product-brief.md — "We have not decided who owns the rate card" | to-be quoting (row 15); any pricing aggregate | Mai, Linh, leadership |
| H3 | Is the documentation fee revenue or a pass-through? "Both have been true at different times." | Linh vs Mai (commercial practice), 2026-05-14 | invoice lines; margin calculation | Linh + Mai, decided together |
| H4 | How long is a quote good for — 7 days, or the rate-card week? | Mai vs Linh, 2026-05-14 | QuoteExpired (row 16); quote/rate-card coupling | Mai + Linh |
| H5 | What does "delivered" mean — on the vessel, or received by the consignee? The consignee leg is invisible to Harbourline today. | Ha vs Duc, 2026-06-02 — "Nobody picked one" | end of the tracking timeline; customer-facing status | Ha, Duc, and a real customer |
| H6 | What is "a booking" — the sheet row, or the customer's pre-confirmation request? | glossary-draft.txt — Mai and Tuan use both in one sentence | Booking aggregate identity and its start event | Mai + Tuan |
| H7 | Is a "consignment" the customs goods or the finance invoice line? | glossary-draft.txt | customs/billing seam | Linh + broker contact |
| H8 | Does a "lane" include the container type or not? The rate card is keyed on the answer. | glossary-draft.txt | rate-card key; quote reproducibility | Mai |
| H9 | Do we integrate with the API carrier? Recommended, not signed off. | decision-memo-carrier-integration.md — "Nobody has signed off on this yet" | SlotAvailabilityChecked to-be shape; two-upstream model | whoever the memo is addressed to |
| H10 | Which surcharges bind a quote? A quarter of complaints are "a surcharge the customer says was never quoted"; the abandoned schema collapses three surcharges into one `NUMERIC` (`quote.surcharges`). | support-log-digest.md; db/schema.sql | quote contents; invoice disputes | Mai + Linh |
| H11 | Where does the customer's PO number live? Not stored anywhere; kept "in the notes column when they remember". | support-log-digest.md | booking identity as customers reference it | Ha + a customer |
| H12 | Who records a booking? "Whoever picks it up" is not an actor. | ops-walkthrough.md | actor on BookingRecorded (row 13) | Tuan |
| H13 | Who prepares the customs declaration and who answers a broker query? Ops calls clearance "its own thing" and names nobody. | ops-walkthrough.md | rows 28, 30–31; the customs hand-off | Tuan; the broker |
| H14 | What happens when the customer refuses the next sailing? "Usually accepts" leaves the other branch — including whether a booking is ever cancelled — unwritten. | ops-walkthrough.md | completeness of the confirm branch; whether a cancel event exists at all | Tuan + Ha |
| H15 | What happens to the booking after SailingDepartedWithoutContainer (the "worst outcome", ~2×/month per the walkthrough's own estimate)? Rebooked, re-quoted, who tells the customer? | ops-walkthrough.md | recovery path after row 32 | Tuan + Ha |
| H16 | Which time matters for a movement — when it happened or when the sheet was updated ("usually the same day, not always")? The DDL only has `noted_at`. | ops-walkthrough.md; db/schema.sql | tracking timeline fidelity; rows 25–27 | Tuan + Duc |
| H17 | How would anyone know whether a box will make the sailing? Ha's half of the customer question; no cut-off time appears anywhere in the corpus. | Ha, 2026-06-02 | read-model row 40 | Tuan + carrier contact |
| H18 | Are "slot" and the carrier's "allocation" exactly the same thing, and who translates between the API carrier and the email carrier the memo says must not be modelled as one? | glossary-draft.txt; decision-memo-carrier-integration.md | carrier-facing contract | carrier contacts + Tuan |
| H19 | What are the booking states? `booking.status` is free-text and no document lists its values; "job" suggests dispatch is a state change somebody cares about. | db/schema.sql; glossary-draft.txt | Booking lifecycle | Tuan |
| H20 | Should operations see the rate/margin? Today they learn a booking was unprofitable from finance a month later. Pain, but no decision recorded. | Tuan, 2026-05-14 | read-model row 41; state of row 41 (could-be vs to-be) | Mai + Tuan + leadership |
| H21 | Where does quoting sit in the flow? The ops walkthrough never mentions a quote; the schema hangs `quote` off `booking`. Before the booking, after recording, after confirming? | ops-walkthrough.md (absence) vs db/schema.sql | position of row 14; quote/booking relationship | Mai + Tuan |
| H22 | Drivers updating the sheet themselves: tried once, lasted three weeks. Is that abandoned practice, a change someone still owns, or a dead idea? Unplaceable on the as-is/to-be/could-be axis without a person. | Tuan, 2026-06-02 | state of rows 25–27's recording path | Tuan |
| H23 | What actually happens in billing? Ops stops at "it goes to billing"; invoices are late because surcharges come "from three different people" — who, and what are they each adding? | ops-walkthrough.md; product-brief.md pain #3 | everything after row 34; InvoiceIssued's inputs | Linh |

Note on evidence: this table contains no disagreement surfaced *in session* — there was no session.
H1, H3, H4, H5 are disagreements the documents themselves record between named people; the rest are
gaps and contradictions found by reading. Per the skill, a timeline gap is a hotspot, not a blank to
fill.
