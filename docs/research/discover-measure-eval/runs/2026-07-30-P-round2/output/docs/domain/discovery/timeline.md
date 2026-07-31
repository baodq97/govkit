# Timeline — Harbourline big-picture EventStorming (candidates only)

Session date 2026-07-30 · mode DISCOVER · **0 confirmed, 43 candidates**. `Status` is evidence,
`State` is time; they are independent columns. `Source` names the file, and where a named person is
on a dated record, the person and the date.

Walked in time order below, but the walk *started* at `QuoteIssued` and `BookingConfirmed` — the two
places the brief says the money is lost — and worked outward, rather than starting at "customer
calls".

| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | Rate card (weekly, per lane, per container type) | read-model | as-is | Commercial | candidate | Mai, 2026-05-14 |
| 2 | RateCardUpdated | event | as-is | Commercial | candidate | Mai, 2026-05-14; product-brief.md |
| 3 | Customer | actor | as-is | — | candidate | product-brief.md |
| 4 | Commercial | actor | as-is | — | candidate | Mai, 2026-05-14 |
| 5 | Operations | actor | as-is | — | candidate | Tuan, 2026-05-14; ops-walkthrough.md |
| 6 | Finance | actor | as-is | — | candidate | Linh, 2026-05-14 |
| 7 | Customer service | actor | as-is | — | candidate | Ha, 2026-06-02 |
| 8 | Yard | actor | as-is | — | candidate | Duc, 2026-06-02 |
| 9 | Driver | actor | as-is | — | candidate | ops-walkthrough.md |
| 10 | Shared sheet | read-model | as-is | — | candidate | README.md; ops-walkthrough.md |
| 11 | WhatsApp group / driver texts | external-system | as-is | Driver | candidate | README.md; ops-walkthrough.md |
| 12 | BookingRequested | event | as-is | Customer / emails or calls | candidate | ops-walkthrough.md |
| 13 | BookingRecorded | event | as-is | "whoever picks it up" / write the row into the sheet | candidate | ops-walkthrough.md — actor undefined, see H12 |
| 14 | QuoteIssued | event | as-is | Commercial / work the quote out by hand from the rate card | candidate | product-brief.md; db/schema.sql `quote.quoted_on` — position in the flow unknown, see H21 |
| 15 | QuoteCalculated (not by hand) | event | **to-be** | — | candidate | product-brief.md "We have decided we will stop quoting by hand" — the only decided change in the corpus |
| 16 | QuoteExpired | event | **could-be** | — | candidate | Mai, 2026-05-14 "Mai wants a quote to expire" — duration undecided, see H4 |
| 17 | SlotAvailabilityChecked | event | as-is | Operations / phone the carrier | candidate | ops-walkthrough.md |
| 18 | Carrier — email, replies within the day | external-system | as-is | — | candidate | decision-memo-carrier-integration.md; ops-walkthrough.md |
| 19 | Carrier — published booking API | external-system | **could-be** | — | candidate | decision-memo-carrier-integration.md "Nobody has signed off on this yet", see H9 |
| 20 | SlotAvailabilityConfirmed | event | as-is | Carrier | candidate | ops-walkthrough.md "If there is space" |
| 21 | BookingConfirmed | event | as-is | Operations / tell the customer it is confirmed | candidate | ops-walkthrough.md — **pivotal**; the brief contradicts its ordering, see H1 |
| 22 | AlternativeSailingOffered | event | as-is | Operations | candidate | ops-walkthrough.md "we offer the next sailing" — refusal branch unstated, see H14 |
| 23 | whenever there is no space on the sailing, offer the next sailing | policy | as-is | — | candidate | ops-walkthrough.md |
| 24 | TruckDispatched | event | as-is | Operations | candidate | ops-walkthrough.md "The truck goes out"; glossary-draft.txt ("job" = a booking dispatched to a truck) |
| 25 | ContainerCollected | event | as-is | Driver / texts | candidate | ops-walkthrough.md |
| 26 | ContainerArrivedAtPortGate | event | as-is | Driver / texts | candidate | ops-walkthrough.md |
| 27 | MovementNoted | event | as-is | "someone" / update the sheet, "usually the same day, not always" | candidate | ops-walkthrough.md; db/schema.sql `movement(event, noted_at)` — see H16 |
| 28 | CustomsDeclarationSubmitted | event | as-is | actor not stated / send the declaration with the packing list | candidate | ops-walkthrough.md — see H13 |
| 29 | Customs broker | external-system | as-is | — | candidate | ops-walkthrough.md |
| 30 | CustomsQueryRaised | event | as-is | Customs broker | candidate | ops-walkthrough.md |
| 31 | whenever the broker raises a query, the box stays at the port gate until it is answered | policy | as-is | — | candidate | ops-walkthrough.md |
| 32 | SailingDepartedWithoutContainer | event | as-is | — | candidate | ops-walkthrough.md — "the worst outcome we have", "perhaps twice a month" (the document's own estimate, not a count) |
| 33 | ContainerLoaded | event | as-is | — | candidate | ops-walkthrough.md — **pivotal**; this is the yard/ops sense of "delivered", see H5 |
| 34 | whenever the box is loaded, the job is done and it goes to billing | policy | as-is | — | candidate | ops-walkthrough.md |
| 35 | InvoiceIssued | event | as-is | Finance | candidate | product-brief.md (pain 3: late, surcharges collected from three people); support-log-digest.md |
| 36 | SurchargeDisputed | event | as-is | Customer | candidate | support-log-digest.md "a surcharge the customer says was never quoted" — see H10 |
| 37 | CollectionMissedOnAgreedDay | event | as-is | — | candidate | support-log-digest.md |
| 38 | CustomsQueryReachedCustomerLate | event | as-is | — | candidate | support-log-digest.md "heard about too late to act on" |
| 39 | Container location board | read-model | **could-be** | Customer service | candidate | Ha, 2026-06-02 (two phone calls to answer); product-brief.md pain 2 |
| 40 | "Will it make the sailing" outlook | read-model | **could-be** | Customer service | candidate | Ha, 2026-06-02 — nothing states how it would be computed, see H17 |
| 41 | Margin visibility for operations | read-model | **could-be** | Operations | candidate | Tuan, 2026-05-14 "operations do not see the rate at all" — see H20 |
| 42 | Booking | aggregate | as-is | — | candidate | db/schema.sql `booking` (6 columns) |
| 43 | Quote | aggregate | as-is | — | candidate | db/schema.sql `quote` (5 columns) |

## Notes on what is deliberately absent

- **No context clusters.** Rows are in time order only. Grouping them is `3-decompose`'s job.
- **Nothing after `ContainerLoaded` except `InvoiceIssued`.** Ops stops there ("we consider the job
  done and it goes to billing"); the billing flow was never described by anyone. The gap is H23,
  not a row.
- **No `BookingCancelled`, no `QuoteRejected`, no `ContainerDelivered`(consignee sense).** Nothing in
  the corpus says these occur. Inventing them would be undetectable downstream; the corresponding
  gaps are H14 and H5.
- **One element could not be placed on the as-is / to-be / could-be axis at all**: drivers updating
  the sheet themselves, which was tried and lasted three weeks (Tuan, 2026-06-02). It is not today's
  practice, not a decided change, and not an untried idea. Recorded as H22 rather than guessed into a
  state.
- `db/schema.sql` is prefixed "The spreadsheet replacement someone started and abandoned" — its
  three tables are candidate evidence of intent, not of a running system, and its author is unnamed.
