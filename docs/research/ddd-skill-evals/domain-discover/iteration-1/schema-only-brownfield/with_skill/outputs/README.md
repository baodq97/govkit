---
id: DOMAIN-DISC-0001
title: Acme platform rebuild — discovery session 2026-07-27
status: draft
owner: TBD
date: 2026-07-27
mode: discover
technique: eventstorming-big-picture (ground pass only — no workshop held)
---

## Read this first

**No discovery happened yet.** This run completed step 1 of the process (ground the candidates from
what is written down) and could not run steps 2–4, because a workshop needs people and nobody was
in the room. Everything in `timeline.md` and `ubiquitous-language.md` is a **candidate** derived
from two schema ADRs. Not one element has been confirmed by a person who knows the business.

That distinction is the whole point of this step. A ground pass reads documents; discovery happens
when a domain expert says *"no, that's not how it works."* Feeding this file set into
`domain-decompose` as-is would produce bounded contexts with **zero domain events and zero
invariants**, assembled from table names — which is exactly the failure this step exists to prevent.
See "What to do next" below for the shortest path to a real input.

## Who was in the room

| Role | Present | Notes |
|---|---|---|
| Domain expert (contracts) | **no** | every contract finding below is document inference |
| Domain expert (billing / finance) | **no** | every billing finding below is document inference |
| Real end user | **no** | nothing here reflects how anyone actually works |
| Product / business strategy | **no** | no view on which of these areas is core vs. supporting |
| Developers / platform | **no** in session | `@platform` owns both ADRs and is the obvious first invitee |

## Mode and sources

Mode: **DISCOVER** — the repo has artifacts, so candidates were mined before any interview.

Read in full:

- `docs/adr/ADR-0004-billing-schema.md` — accepted, 2026-06-02, `acme_billing`, 6 tables
- `docs/adr/ADR-0005-contracts-schema.md` — accepted, 2026-06-09, `acme_contracts`, 5 tables

That is the entire repo. There is no code, no domain layer, no PRD, no spec, no test suite, no
`docs/domain/`.

Referenced by those ADRs but **absent from the repo** (unread, and each one is a coverage hole):

| Referenced artifact | Referenced from | Why it matters |
|---|---|---|
| ADR-0002 ("one solution per bounded context") | ADR-0004 §Context | the rule that drew every boundary in the rebuild |
| ADR-0001 / ADR-0003 (`acme_foundation` + BCs 1–2) | ADR-0004 §Context, both §Cross-BC | 2 of the ≥4 contexts have no artifact at all |
| `scripts/phase2_billing.py`, `phase2_lib.py` | ADR-0004 §Decision | holds the per-attribute mapping — the only place column semantics exist |
| `solutions/legacy/Contracts/src/Workflows/` | ADR-0005 §Deferred | **the policies live here**; deferred to Phase 4, never read |
| The optionset pass (invoice status, dunning stage, contract status, renewal type) | both §Deferred | **the state transitions are the domain events**; deferred, so unavailable |

## Coverage

**Covered:** the *shape* of two schemas — `acme_billing` (Invoice, InvoiceLine, CreditNote,
DunningRun, PaymentAllocation, WriteOff) and `acme_contracts` (Contract, ContractLine,
RenewalOption, ServiceLevel, ContractParty), plus the three foundation nouns they point at
(Company, Currency, Country), and the one behavioural sentence written down anywhere:
*"invoices are raised against a contract."*

**Not covered — and who is needed:**

| Gap | Who could close it |
|---|---|
| Every domain event, in past tense, with a time order | contracts + billing domain experts, one workshop |
| Every actor and command — no artifact names a single human role | ops lead, credit control, sales |
| Every policy ("whenever X, then Y") — zero found | legacy workflow owner + `@platform`, plus a read of `src/Workflows/` |
| Every invariant / business rule — zero found | domain experts, via "what goes wrong" questions |
| Every read model — no artifact mentions anything anyone looks at | end users (and ask about the spreadsheets) |
| Whether these four solutions are real bounded contexts or renamed legacy prefixes | whoever wrote ADR-0002 |
| `acme_foundation` and BCs 1–2 entirely | `@platform` |

## Confidence

**0 confirmed elements · 22 candidates still unconfirmed · 12 open hotspots.**

Read that first number literally. The candidate list is a preparation artifact, not a finding. Two
further honesty notes about what is in `timeline.md`:

1. **It is not yet a timeline.** Schemas encode structure, not sequence. The sequence numbers are
   list positions, not time order. The single ordering fact available is that a contract exists
   before an invoice is raised against it (ADR-0004 §Cross-BC dependencies).
2. **Most candidate events are noun→event inferences** — `acme_creditnote` reading as
   `CreditNoteIssued`. No artifact contains that verb. Each such row says so in its source cell.
   These are prompts to put in front of an expert, and they are as likely to be wrong as right.

## The visual surface

Not started — a live wall has value only when participants are watching it form, and there were no
participants. `model.json` is written in the preview format, so the wall is one command away when
the session is scheduled:

```bash
node <plugin>/skills/domain-visualize/scripts/preview-server.cjs --dir .swe-flow/discovery
```

Copy `model.json` into that directory before the session and the candidates render as the starting
wall; participants' clicks land in `events.jsonl` and merge into the next round.

## Where these files belong

The repo has `docs/` but no `docs/domain/`, so the canonical destination is
`docs/domain/discovery/` (created fresh). This run was directed to an evaluation output directory
and the fixture repo is read-only, so nothing was written into it. Copy the five files across
unchanged when adopting them.

## What to do next

**Do not run `domain-decompose` on this yet.** It consumes `timeline.md` and
`ubiquitous-language.md` as its step-2 input and will be exactly as good as they are — right now
that means contexts named after tables, with no events and no invariants, which is a schema
re-drawing wearing DDD vocabulary.

The cheapest path to a real input is **one 90-minute Big Picture EventStorming** with a contracts
expert, a billing/credit-control expert, and `@platform`. Start at the pivotal event — the one that
carries the money — not at the chronological beginning.

Open with these five, one at a time, and let each answer produce the next:

1. *"Tell me about the last invoice that didn't get paid. What happened, step by step, and who did each step?"* — pulls the billing timeline, the dunning actors and the write-off/credit-note distinction out at once.
2. *"When was the last renewal that went wrong?"* — goes straight at hotspot #1 (is a renewal a new contract or a state of the old one), which ADR-0005 itself leaves open.
3. *"What would happen if a contract terminated mid-cycle after the invoice had already gone out?"* — invariants hide behind this question.
4. *"When a contract is signed, what happens automatically, and what does somebody have to remember to do?"* — a remembered step is an unautomated policy and usually a missing domain concept.
5. *"What do you look at before you decide to send a dunning letter? Is there a spreadsheet?"* — the read models, and the spreadsheet is almost always a missing context.

Two follow-ups worth booking separately, once the wall exists:

- **Read `solutions/legacy/Contracts/src/Workflows/` before the workshop, not in Phase 4.** It is the only place in the estate where policies are written down; walking in without it wastes the room's time re-deriving them.
- **Get the optionset pass values** (invoice status, dunning stage, contract status, renewal type). Those transitions are candidate domain events, already enumerated by somebody, currently deferred.

After the workshop, re-run this skill in **UPDATE** mode: it merges the delta, promotes candidates
that people confirmed, and keeps the ones nobody could speak to as hotspots rather than deleting
them. Then hand off to `domain-decompose`.
