# Hotspots — Acme platform rebuild (ground pass, 2026-07-27)

Twelve open questions. This is the most useful file in the set: with 0 confirmed elements, the
honest output of a document-only pass is a good list of what nobody knows, routed to the person who
could answer it.

Two of these (#1, #6) are hotspots the ADR authors themselves left open. The rest are holes the
ground pass hit. None has been resolved, and none should be resolved by whoever schedules the
workshop — a hotspot closed to make a document tidy is a decision nobody made.

| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| 1 | Is a renewal a **new contract** or a **state of the existing contract**? The legacy schema models it both ways in different tables | ADR-0005 §Consequences (author-acknowledged, unsettled) | Contract aggregate boundary; the `ContractRenewed` event; possibly a context boundary | Contracts domain expert + whoever owns renewals commercially |
| 2 | Who actually does anything in this domain? No artifact names a single human role — not one actor, not one command | ground pass, both ADRs | the entire timeline: with no actors there are no commands, and with no commands the events are unattributed | Ops lead, credit control, sales — one Big Picture workshop |
| 3 | What are the values of the deferred picklists — invoice status, dunning stage, contract status, renewal type? Those transitions **are** the domain events | ADR-0004 §Deferred, ADR-0005 §Deferred | the event timeline; each transition is a candidate event that already exists, enumerated, outside this repo | `@platform` — get the optionset pass inventory before the workshop |
| 4 | What is in `solutions/legacy/Contracts/src/Workflows/`? Deferred to Phase 4 and never read — it is the only place in the estate where policies are written down | ADR-0005 §Deferred | every policy (0 found) and most invariants; walking into a workshop without it wastes the room re-deriving what is already encoded | `@platform` — read it, do not wait for Phase 4 |
| 5 | What distinguishes a **Credit Note** from a **Write-Off**? Both reduce a receivable; neither is defined anywhere | ground pass, ADR-0004 §Decision | billing aggregate boundaries; whether these are one concept with two states or two genuinely different business acts | Finance / credit control |
| 6 | Was `leg_ContractDraftV2` skipped because the business has **no draft concept**, or because the migration was unfinished? ("0 attrs — placeholder slice") | ADR-0005 §Decision (author-acknowledged skip) | whether Contract has a pre-signature lifecycle at all, and therefore whether events exist before `ContractRenewed` | Contracts domain expert + `@platform` |
| 7 | Are `acme_foundation` / `acme_billing` / `acme_contracts` real **bounded contexts**, or legacy table-prefix groupings renamed? ADR-0002 asserts one solution per BC, but the grouping traces to the `leg_` prefixes, and no language or behaviour evidence supports it | ground pass, ADR-0004 §Context | `domain-decompose` — whether it treats these four as given or as candidates to be tested against discovered language | Author of ADR-0002 |
| 8 | What is a **Contract Party**, and how does it relate to `acme_company` in foundation? Two ways to model a counterparty coexist | ground pass, ADR-0005 §Decision + §Cross-BC | the contracts/foundation boundary; whether Company is a shared kernel or a duplicated concept | Contracts domain expert + `acme_foundation` owner |
| 9 | Who or what triggers a **dunning run** — a scheduled policy, or a person deciding? And is a "run" one event or many? | ground pass, ADR-0004 §Decision | the first candidate policy in the whole domain; also whether DunningRun is an aggregate or a batch job | Credit control |
| 10 | Where do **payments** live? `acme_paymentallocation` is the only trace — there is no Payment, Receipt or Remittance table in `acme_billing` | ground pass, ADR-0004 §Decision | the billing boundary; a missing payment concept means either an external system (gateway/bank) or an unmapped context | Finance + `@platform` |
| 11 | What happens to invoices, service levels and renewal options when a contract **terminates or changes mid-cycle**? | ground pass — no artifact states any rule | the invariants (0 found). This is the "what goes wrong" question that usually produces the first rule anyone says out loud | Contracts + billing experts together, in the same room |
| 12 | What are `acme_foundation` and BCs 1–2? ADR-0001/0002/0003 are referenced by both ADRs but absent from the repo | ground pass | ≥2 of ≥4 contexts have no artifact at all — the map has a hole, not just low resolution | `@platform` |

## Routing

Three of these do not need a workshop and should be closed by fetching a document before one is
scheduled — cheapest first:

- **#3** the optionset inventory, **#4** the legacy workflow source, **#12** the missing ADRs.

Each converts guesswork into evidence at near-zero cost, and #4 in particular may turn the empty
policy section of `timeline.md` into a real list. Doing them first also means the workshop spends
its scarce attention on what only people can answer.

The remaining nine need the room. **#1**, **#2** and **#11** are the ones that decide whether the
decomposition is a domain model or a schema re-drawing.
