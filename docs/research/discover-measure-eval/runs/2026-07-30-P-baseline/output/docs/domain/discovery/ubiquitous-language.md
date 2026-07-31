# Ubiquitous language — Harbourline (round 1, 2026-07-30)

**Collisions are kept side by side and unresolved.** No word here has been qualified into
`container_type` / `container_id` to tidy it up: the collision is the finding, and it is the seam
`3-decompose` needs. Every row is `candidate` — no person was in the room to hold a definition, so
`Held by` names who the *document* attributes it to.

`Occ` is measured, not impressionistic: occurrences across the 9-file corpus from
`.ddd-flow/mine/reports/terms-census.json` and `reports/polysemy.json`
(whole-word, case-insensitive, singular/plural; synonyms deliberately **not** collapsed).

| Term | Definition | Held by | Status | Occ | Source |
|---|---|---|---|---|---|
| booking | the row in the sheet | glossary, unattributed | candidate | 15 in 7 docs | glossary-draft.txt:3 |
| booking | the thing the customer asked for, before anything was confirmed | Mai and Tuan — "both ways in the same sentence" | candidate | 15 in 7 docs | glossary-draft.txt:3-4 |
| job | operations word for a booking that has been dispatched to a truck | Operations | candidate | 2 in 2 docs | glossary-draft.txt:5 |
| consignment | what the customs paperwork calls the goods | Customs paperwork / broker | candidate | 1 in 1 doc | glossary-draft.txt:6 |
| consignment | the invoice line | Finance | candidate | 1 in 1 doc | glossary-draft.txt:6 |
| delivered | on the vessel | Duc (yard/ops), 2026-06-02 | candidate | 2 in 2 docs | meeting-2026-06-02-tracking.md:12; glossary-draft.txt:7 |
| delivered | reached the consignee — "which is not something we even see" | Customers, reported by Ha (customer service), 2026-06-02 | candidate | 2 in 2 docs | meeting-2026-06-02-tracking.md:12-13 |
| container | a **type** — a rate-card dimension, per lane per container type | Mai (commercial); Operations writing the sheet | candidate | 7 in 6 docs | meeting-2026-05-14-pricing.md:5; ops-walkthrough.md:4 |
| container | a **physical box** whose location a customer asks for | Ha (customer service); Customers | candidate | 7 in 6 docs | meeting-2026-06-02-tracking.md:5; product-brief.md:14 |
| box | the physical container | Operations, Yard, Driver | candidate | — | ops-walkthrough.md:10; meeting-2026-06-02-tracking.md:8 |
| slot | space on a sailing | Harbourline | candidate | 3 in 3 docs | glossary-draft.txt:9 |
| allocation | the carrier's word for a slot | Carrier | candidate | 1 in 1 doc | glossary-draft.txt:9 |
| lane | origin/destination pair | glossary, unattributed | candidate | 5 in 5 docs | glossary-draft.txt:10 |
| lane | origin/destination pair **including** container type — "sometimes includes it, sometimes not" | glossary, unattributed | candidate | 5 in 5 docs | glossary-draft.txt:10 |
| documentation fee | revenue | Linh (finance) | candidate | 2 in 1 doc | meeting-2026-05-14-pricing.md:8 |
| documentation fee | a pass-through | Commercial | candidate | 2 in 1 doc | meeting-2026-05-14-pricing.md:8 |
| surcharge | added on top of a base rate — fuel, congestion, documentation fee | Mai (commercial) | candidate | 4 in 3 docs | meeting-2026-05-14-pricing.md:5-6 |
| base rate | the per-lane, per-container-type rate before surcharges | Mai (commercial) | candidate | 1 in 1 doc | meeting-2026-05-14-pricing.md:5 |
| rate card | weekly price list, per lane, per container type | Mai (commercial) | candidate | 4 in 2 docs | meeting-2026-05-14-pricing.md:5 |
| quote | the price given to a customer (noun) | Commercial | candidate | 6 in 2 docs | product-brief.md:7-8 |
| quote | to price a lane (verb) — "two people quote the same lane differently" | Commercial | candidate | 6 in 2 docs | product-brief.md:9 |
| the sheet | the shared spreadsheet that is today's system of record | everyone | candidate | — | README.md:3; ops-walkthrough.md:3 |
| sailing | the vessel departure a box is loaded onto | Operations | candidate | 8 in 5 docs | ops-walkthrough.md:6; decision-memo:3 |
| slot availability | whether the carrier has space — a phone call today | Operations | candidate | — | ops-walkthrough.md:6; decision-memo:6 |
| status | **no holder and no definition anywhere.** `booking.status TEXT`, no CHECK, no enumeration; the word occurs in **0 of 8** prose files | nobody | candidate (absence) | 0 in prose | db/schema.sql:8 measured — H1 |
| movement | **DDL-only vocabulary.** A table named `movement` with `event` and `noted_at`; none of the three words occurs in any prose file | nobody | candidate (absence) | 0 in prose | db/schema.sql:19 measured — H13 |

## Seven terms carry two rows; four of those are attributed disagreements

Counted: `booking`, `consignment`, `delivered`, `container`, `lane`, `documentation fee`, `quote` each
appear twice, deliberately. Four of the seven are disagreements someone is on record about — those
four are below. `lane` and `quote` are variance within one holder's usage rather than two holders
disagreeing, and `consignment`'s two senses sit in one unattributed glossary line; kept, but weaker.

### The four attributed collisions, and why none of them is resolved here

1. **booking** — sheet row vs pre-confirmation request. The glossary records that two people use both
   senses *in one sentence*. This is a lifecycle-start question, not a naming one.
2. **delivered** — on-vessel vs received-by-consignee. Recorded verbatim as "Two meanings, both in
   daily use. Nobody picked one." The customer-facing sense refers to an event Harbourline says it
   cannot observe.
3. **container** — type vs physical unit, against exactly **one** `TEXT` column in the DDL.
   Measured, not intuited: 7 occurrences across 6 documents, both senses present.
4. **documentation fee** — revenue vs pass-through, with "Both have been true at different times."

Stage 6 of the measure playbook found **0 proven schema-internal senses**: only `id` and
`booking_id` appear in more than one table, and each has one type and one reference target
(`reports/polysemy.json`). The polysemy in this domain is entirely in the *prose*, not the schema —
which is itself the finding, because a 24-line DDL with no enumerations cannot encode a
disagreement.

**Synonym pairs left unresolved on purpose:** box/container, allocation/slot, job/booking. Collapsing
them would delete the boundary evidence; the matcher does not collapse them either, which is why
`box` has no `Occ` figure from the term census.
