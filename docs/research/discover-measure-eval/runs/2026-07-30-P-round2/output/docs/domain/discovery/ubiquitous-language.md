# Ubiquitous language — Harbourline (candidates only)

Every definition is the one its holder gave, in the source cited. **Colliding senses are kept side
by side, deliberately unresolved** — the collision is the boundary signal `3-decompose` needs, and
qualifying the words apart here would delete it. All rows `candidate`: the glossary itself opens
with "written down after an argument about them. Not agreed."

| Term | Definition | Held by | Status | Source |
|---|---|---|---|---|
| booking | the row in the sheet | staff (sheet practice) | candidate | glossary-draft.txt |
| booking | the thing the customer asked for, before anything was confirmed | Mai, Tuan — "both ways in the same sentence" | candidate | glossary-draft.txt |
| job | a booking that has been dispatched to a truck | Operations | candidate | glossary-draft.txt |
| consignment | what the customs paperwork calls the goods | Customs paperwork / broker | candidate | glossary-draft.txt |
| consignment | the invoice line | Finance | candidate | glossary-draft.txt |
| delivered | the box is on the vessel | Duc (yard), operations | candidate | glossary-draft.txt; Duc, 2026-06-02 |
| delivered | the goods have reached the consignee — "not something we even see" | customers, via Ha (customer service) | candidate | glossary-draft.txt; Ha, 2026-06-02 |
| slot | space on a sailing | Harbourline staff | candidate | glossary-draft.txt |
| allocation | the carrier's word for a slot | Carrier | candidate | glossary-draft.txt |
| lane | origin/destination pair — "sometimes includes the container type, sometimes not" | commercial (rate card is per lane, per container type) | candidate | glossary-draft.txt; Mai, 2026-05-14 |
| rate card | weekly rates, per lane, per container type: base rate plus surcharges | Mai (commercial) | candidate | Mai, 2026-05-14 |
| surcharges | fuel, congestion, and a documentation fee — "where the disagreements are" | Mai (commercial) | candidate | Mai, 2026-05-14 |
| documentation fee | revenue | Linh (finance) | candidate | Linh, 2026-05-14 — "both have been true at different times" |
| documentation fee | a pass-through | Mai (commercial) | candidate | Linh, 2026-05-14, describing commercial's usage |
| quote | the price worked out by hand from the rate card; spread over carrier cost is the margin | product brief (unattributed) | candidate | product-brief.md; db/schema.sql `quote(base_rate, surcharges, quoted_on)` |
| confirmed | what we tell the customer once the carrier says there is space | Operations | candidate | ops-walkthrough.md |
| box / container | the physical container; customers ask "where is my box" | everyone; customers via support tickets | candidate | ops-walkthrough.md; support-log-digest.md |
| purchase order number | the customer's own reference for the booking — "we do not store anywhere" | Customers | candidate | support-log-digest.md |

## Live collisions and near-collisions (7)

1. **booking** — sheet row vs pre-confirmation request; same two people use both senses. (H6)
2. **delivered** — on vessel vs reached consignee; the second sense covers ground Harbourline
   cannot even observe. Ha and Duc, on the record, 2026-06-02; "Nobody picked one." (H5)
3. **consignment** — customs goods vs finance invoice line. (H7)
4. **documentation fee** — revenue vs pass-through, finance vs commercial, "both true at
   different times". A money-classification collision, not a naming one. (H3)
5. **lane** — one term, unstable definition: with or without container type. The rate card is
   keyed on it, so the instability is priced in. (H8)
6. **slot / allocation** — two words, one meaning, across the company/carrier boundary — a
   translation the carrier integration would have to own. (H18)
7. **job / booking** — operations renames the booking at dispatch; a phase-triggered synonym,
   which is language changing at a hand-off. (H6, H19)

Not measured by script, deliberately: the corpus is 8 prose files + 1 abandoned DDL. The playbook's
stage-6 polysemy recipe applies to structured containers (two same-named *fields* with different
types or targets); here the senses come with named holders in the prose, and "counting how often a
word appears across documents tells you which files used it, never which meaning it carried." The
one structured artifact contributes one near-collision by reading: `quote.surcharges` is a single
`NUMERIC(12,2)` — the plural of the meeting notes (three distinct surcharges, disputed severally)
collapsed to one number by whoever abandoned the schema. Recorded at H10.
