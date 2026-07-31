# Timeline — Harbourline, big-picture EventStorming (round 1, 2026-07-30)

Mode `discover`. **Every row is `candidate`: nobody attended.** `Source` names the human the
document quotes, where it quotes one, and always the file:line — that is attribution, not
confirmation. Nothing here was invented: where the flow has a hole the hole is a hotspot (`H*` in
`hotspots.md`), not a filled blank.

Facilitation note: a real session would open at row 12 (`BookingConfirmed`) and row 6
(`QuoteWorkedOutByHand`) — the brief puts the money on the quote spread and the top pain on
confirming without a slot — and work outward. Rows are listed in time order per the output
contract, not in the order they would be elicited.

| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | Customer | actor | as-is | — | candidate | product-brief.md:3 |
| 2 | BookingEnquiryReceived | event | as-is | Customer / emails or calls | candidate | ops-walkthrough.md:3 |
| 3 | Whoever picks it up | actor | as-is | role explicitly indeterminate — H14 | candidate | ops-walkthrough.md:3 |
| 4 | BookingWrittenToSheet | event | as-is | Whoever picks it up / write the row | candidate | ops-walkthrough.md:3-4 |
| 5 | The sheet (shared spreadsheet) | read-model | as-is | system of record today | candidate | README.md:3; ops-walkthrough.md:3 |
| 6 | QuoteWorkedOutByHand | event | as-is | Commercial / quote by hand | candidate | product-brief.md:8 |
| 7 | Rate card — weekly, per lane, per container type | read-model | as-is | — | candidate | Mai, 2026-05-14, meeting-2026-05-14-pricing.md:5 |
| 8 | SpaceCheckedWithCarrier | event | as-is | Operations / phone the carrier | candidate | ops-walkthrough.md:6 |
| 9 | Carrier with a booking API | external-system | as-is | — | candidate | decision-memo-carrier-integration.md:3 |
| 10 | Carrier taking email, replies within the day | external-system | as-is | — | candidate | decision-memo-carrier-integration.md:3 |
| 11 | SlotAvailabilityConfirmedByPhone | event | as-is | Carrier / phone reply | candidate | ops-walkthrough.md:6; decision-memo:6 |
| 12 | BookingConfirmed **(pivotal)** | event | as-is | Operations / tell the customer it is confirmed | candidate | ops-walkthrough.md:7 |
| 13 | NextSailingOffered | event | as-is | Operations / offer the next sailing | candidate | ops-walkthrough.md:7-8 |
| 14 | AlternativeSailingAccepted | event | as-is | Customer — "usually accepts" | candidate | ops-walkthrough.md:8 |
| 15 | BookingDispatchedToTruck | event | as-is | Operations — the booking becomes a "job" | candidate | ops-walkthrough.md:10; glossary-draft.txt:5 |
| 16 | Driver | actor | as-is | — | candidate | ops-walkthrough.md:10 |
| 17 | BoxPickedUp | event | as-is | Driver / texts | candidate | ops-walkthrough.md:10 |
| 18 | BoxArrivedAtPortGate | event | as-is | Driver / texts | candidate | ops-walkthrough.md:10-11 |
| 19 | whenever the driver texts, someone updates the sheet — "usually the same day, not always" | policy | as-is | — | candidate | ops-walkthrough.md:10-11 |
| 20 | SheetUpdated | event | as-is | Someone / update the sheet | candidate | ops-walkthrough.md:11 |
| 21 | Yard | actor | as-is | knows a box's location only while it is in the yard | candidate | Duc, 2026-06-02, meeting-2026-06-02-tracking.md:8 |
| 22 | DeclarationSubmittedToBroker | event | as-is | Operations / send declaration + packing list | candidate | ops-walkthrough.md:13 |
| 23 | Customs broker | external-system | as-is | — | candidate | ops-walkthrough.md:13 |
| 24 | BrokerQueryRaised | event | as-is | Broker | candidate | ops-walkthrough.md:14 |
| 25 | whenever a broker query is raised, the box sits at the gate until it is answered | policy | as-is | — | candidate | ops-walkthrough.md:14 |
| 26 | SailingDepartedWithoutBox | event | as-is | — "the worst outcome we have", ~twice a month (self-described as approximate) | candidate | ops-walkthrough.md:14-15 |
| 27 | BoxLoadedOnVessel **(pivotal)** | event | as-is | — | candidate | ops-walkthrough.md:17 |
| 28 | JobConsideredDone | event | as-is | Operations | candidate | ops-walkthrough.md:17 |
| 29 | HandedToBilling | event | as-is | Operations | candidate | ops-walkthrough.md:17 |
| 30 | SurchargesCollectedFromThreePeople | event | as-is | Finance | candidate | product-brief.md:15 |
| 31 | InvoiceIssued | event | as-is | Finance — "invoices go out late" | candidate | product-brief.md:15 |
| 32 | SurchargeDisputed | event | as-is | Customer — "a surcharge the customer says was never quoted" | candidate | support-log-digest.md:5-6 |
| 33 | CollectionMissedOnAgreedDay | event | as-is | — | candidate | support-log-digest.md:6-7 |
| 34 | CustomsQueryHeardTooLateToAct | event | as-is | Customer | candidate | support-log-digest.md:7 |
| 35 | UnprofitableBookingReportedByFinance | event | as-is | Finance — reaches operations "a month later" | candidate | Tuan, 2026-05-14, meeting-2026-05-14-pricing.md:11-12 |
| 36 | whenever a customer gives their own purchase-order number, staff keep it in the notes column — "when they remember" | policy | as-is | — | candidate | support-log-digest.md:9-10 |
| 37 | Container location — "nobody can say where a container is without phoning the yard" | read-model | could-be | absent today; nobody has committed to building it | candidate | product-brief.md:14; meeting-2026-06-02-tracking.md:5-6 |
| 38 | Rate visibility for operations — "operations do not see the rate at all" | read-model | could-be | absent today; no owner named | candidate | Tuan, 2026-05-14, meeting-2026-05-14-pricing.md:11 |
| 39 | we will stop quoting by hand | policy | to-be | decided; owner undecided — H5 | candidate | product-brief.md:17 |
| 40 | QuoteExpired | event | could-be | Mai wants it; "Not decided" — H4 | candidate | Mai, 2026-05-14, meeting-2026-05-14-pricing.md:14-15 |
| 41 | SlotCheckedViaCarrierApi | event | could-be | recommended; "Nobody has signed off on this yet" — H12 | candidate | decision-memo-carrier-integration.md:6,10-11 |
| 42 | booking | aggregate | as-is | DDL-derived: 6 columns, no status enumeration | candidate | db/schema.sql:2 (measured, facts.jsonl) |
| 43 | quote | aggregate | as-is | DDL-derived: 5 columns, FK → booking.id, no expiry column | candidate | db/schema.sql:11 (measured, facts.jsonl) |
| 44 | movement | aggregate | as-is | DDL-derived: 4 columns, FK → booking.id; the words `movement`/`event`/`noted_at` occur in **0 of 8** prose files — H13 | candidate | db/schema.sql:19 (measured, facts.jsonl) |

## What is deliberately not here

- **No context boundaries.** Clustering these rows is `3-decompose`'s job.
- **The top-ranked pain is not an event row.** "A booking is confirmed before we know a slot exists
  on the sailing" (product-brief.md:13) states an *ordering condition*, not an occurrence with a
  name of its own. Naming it `BookingConfirmedBeforeSlotKnown` would be my coinage sitting in a
  column of the business's words, so it is recorded as **H10** instead. Rows 11 and 12 carry the
  ordering as the corpus states it.
- **No invented events.** There is no `BookingCancelled`, no `QuoteAccepted`, no `PaymentReceived`:
  nothing in the corpus says a booking is ever cancelled, that a quote is ever formally accepted, or
  that money is ever received. Those are absences in a 9-file corpus, recorded as hotspots where they
  block something, not as timeline rows.
- **No promotion.** Rows 42-44 come from a DDL whose own first line calls it "the spreadsheet
  replacement someone started and abandoned" (db/schema.sql:1). An abandoned file is weaker evidence
  than a meeting minute, not stronger for being machine-readable.
