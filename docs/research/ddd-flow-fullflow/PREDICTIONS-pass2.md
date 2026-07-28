# Pass 2 — predictions registered before the run

Written 2026-07-27, before any pass-2 step ran. Kept outside the run repo so no step can read it.

Pass 1 ran the same eight steps on `INPUT.md` alone, with no domain expert. It **declined** five
context candidates and recorded, for each, the condition that would promote it. Pass 2 adds
`EXPERT.md`, a domain-expert session that meets several of those conditions. So pass 1 wrote its own
falsifiable test, and these are the readings.

| # | Prediction | Pass-1 basis | Falsified if |
|---|---|---|---|
| P1 | **Pricing / Tariff becomes a bounded context**, probably core | declined with "the first stated pricing rule" as the promotion condition; expert states per-15-min rates, per-site free periods, daily caps, lost-ticket fee, and that operators change rates weekly | no pricing context appears, or pricing is folded into Ticketing without argument |
| P2 | **Occupancy exists in garages and not in lots**, and the asymmetry becomes structural rather than a note | H1 declared undecidable; expert answers per-bay sensors in garages, nothing in lots, and bay-vs-area on the ticket | one uniform spot model covering both, or occupancy modelled for lots |
| P3 | **An operator-facing context appears** (site setup, tariffs, reconciliation, exceptions, occupancy reporting, remote release) | H21: the buyer had zero documented action; expert lists six daily jobs and names which two they pay for | the operator half is still absent, or is one undifferentiated admin blob |
| P4 | **`Ticket` splits** into the physical medium and the record, or the split is explicitly re-argued and rejected with the new evidence | the ADC named the split and blocked it on H15; expert confirms cards are collected and reissued twice a week | neither the split nor a stated reason for keeping one aggregate |
| P5 | **Corrective policies get written** — pass 1 had 0 of 6 | expert gives the offline-exit case a complete repair path: terminal logs offline, uploads on reconnect, exceptions list, site manager writes off or pursues the plate | the canvases still carry relaxed invariants with no named repair |
| P6 | **Context count rises from 6 to 8–10** | three declined candidates now have their promotion conditions met | fewer than 8, or more than 11 (over-decomposition) |
| P7 | **Canvases stay inside the line budgets** added in (b), on input roughly 2.5× richer | budgets are new and were only measured on the thinner input | any canvas over its budget by more than the 15% slack |
| P8 | **GDPR-vs-retention becomes a stated design constraint**, not an open question | H16 was open; expert draws the line explicitly — fiscal record kept ten years, plate data deleted after seven days, and the ten years varies by country | retention modelled as a single global rule |

Two things that should **not** change, and would be a regression if they did:

- **The unknowns the expert did not close stay unknown** — acquirer protocol, whether sensors are
  billable-grade, municipality tenders. The expert said "I don't know" to those in as many words.
- **No step invents a number the expert did not give.** He gave no volumes: no arrivals per minute,
  no bays per site, no tickets per day. Throughput and size cells should still read `unknown`.
