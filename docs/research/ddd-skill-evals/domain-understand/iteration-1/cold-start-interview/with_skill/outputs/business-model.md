---
id: DOMAIN-BM-0001
title: Freelance translator assignment management — business model & user needs
status: draft
owner: TBD
date: 2026-07-27
mode: interview
---

<!--
Intended destination in the product repo: docs/domain/business-model.md
Written here because no repo exists yet.

STATE OF THIS DOCUMENT: skeleton, not a canvas. One line of input exists ("a tool for
agencies to manage freelance translator assignments") and no interview has happened.
Every block below is either that one line, or empty. Empty blocks are questions, not
oversights — see Open questions. Do NOT feed this into domain-decompose yet: the
core/supporting/generic classification it has to make would be a coin flip.
-->

## Sources

| Source | What it gave |
|---|---|
| User request, 2026-07-27 | One sentence: "a tool for agencies to manage freelance translator assignments." Product intent, not validated business model. |

Nothing else. No repo, no PRD, no README, no pricing page, no OKRs, no deck.

## Who was in the room

**Nobody.** This run had no human available to answer questions.

The skill cannot substitute for these people, and a canvas written without them is fiction
with a table around it. Needed before this document is worth anything:

| Role | Why they are needed | Status |
|---|---|---|
| Whoever owns the product/business strategy | Value proposition, revenue streams, horizons | Not present |
| Whoever owns the P&L | Cost structure, key partners | Not present |
| Domain expert — someone who has actually run agency-side vendor management | Key activities, what breaks today | Not present |
| **Real end users — agency project managers / vendor managers, and freelance translators themselves** | The entire user side of this canvas | Not present |
| People who will build and test it | Feasibility, evolution-stage reality check | Not present |

The last row is the one that is usually skipped. Note that no proxy was available either —
so there is not even internal belief recorded below, let alone user evidence.

## Business Model Canvas

Filled right-to-left per the canvas discipline: Customer Segments and Value Propositions
first. Both are stated intent, not evidence, and it stops there.

| Block | Content | Source |
|---|---|---|
| **Customer segments** | Stated: "agencies" — presumably translation/localisation agencies. Unresolved: is this a one-sided model (agency pays) or two-sided (agency + freelancer)? Freelance translators are named as *subjects of* the assignments, not as customers. Agency size, geography and specialism all unknown, and they are likely to split the segment. | User request 2026-07-27 — intent only |
| **Value propositions** | Stated: manage freelance translator assignments. This names a product category, not a value proposition — it does not say which problem is being removed, whose, or what they do instead today (spreadsheets? email? an incumbent TMS?). | User request 2026-07-27 — intent only |
| **Channels** | *(empty)* | — |
| **Customer relationships** | *(empty)* | — |
| **Revenue streams** | *(empty)* — nobody has said who pays, for what, or how. | — |
| **Key activities** | *(empty)* | — |
| **Key resources** | *(empty)* — in particular, no answer on whether any proprietary data or matching know-how exists. That answer usually locates the core domain. | — |
| **Key partners** | *(empty)* — including whether payments, CAT-tool integration, or MT are deliberately not built in-house. Partnered activities hand you generic classifications nearly for free. | — |
| **Cost structure** | *(empty)* | — |

Nine blocks, two of them intent-only, seven empty. That ratio is the accurate picture of
what is currently known.

## User Story Map

**Not built.** A story map needs a user whose day someone has watched. No user, proxy, or
observation exists here, and a backbone invented at this desk would be a designer's guess
about translation-agency workflow that three downstream skills would then treat as
observed fact.

What building it needs:

1. Pick one segment from the canvas above (once the canvas distinguishes them).
2. One agency-side vendor manager walks through a normal day out loud, in order — verbs,
   not screens.
3. One freelance translator does the same, separately. If the two maps disagree about the
   same step, that disagreement is the most valuable finding of the whole exercise.
4. Mark pain: where do they re-key data, wait, phone someone, keep a private spreadsheet?
   Workarounds mark missing concepts.
5. Record the words they use — those are the ubiquitous-language candidates.

## Goals

| Horizon | Goal | Source |
|---|---|---|
| Short (this quarter) | unknown | — |
| Medium (this year) | unknown | — |
| Long (1–3 years) | unknown | — |

All three unknown. This matters more than it looks: without the long horizon there is no
way to protect a capability that is boring today and strategic in eighteen months, and
that is exactly the mistake a first decomposition makes.

## Capability classification inputs

| Capability | business_role | evolution_stage | differentiation | Source |
|---|---|---|---|---|
| Assignment management (the only capability named) | unknown | unknown | unknown | User request 2026-07-27 |

One row, three unknowns. `unknown` is a legitimate value here and is deliberately left
rather than guessed — a fabricated evolution stage is how a commodity gets modelled as
core, and nothing downstream ever re-examines it.

No other capability is listed, because no other capability has been mentioned by anyone.
Vendor sourcing, rate cards, quality review, invoicing, CAT-tool integration and payment
are all *plausible* for this product category — which is precisely why they are not in
this table. Plausible is not stated.

## Open questions

Ordered by how much each one changes the downstream decomposition. Every one of them needs
a person; none can be resolved by reading anything, because nothing has been written.

**Blocking — the decomposition cannot be trusted without these**

1. Who pays, and for what exactly appears on the invoice? — product/business owner
2. Is the freelance translator a customer, a user, or both? A two-sided model is a
   different architecture from a tool an agency buys. — product/business owner
3. What do agencies do today instead, and what specifically breaks about it? — domain
   expert plus at least one real agency
4. If a competitor shipped a better version of this tomorrow, which part would actually
   cost you customers? — product/business owner *(this is the sharpest question in the
   set: it converts "core domain" into a falsifiable claim)*
5. Is there any data or know-how here a competitor could not easily get — matching
   history, quality scores, rate intelligence? — product/business owner

**Needed before the story map**

6. When did anyone last watch a real agency vendor manager do this work? — product owner
7. Walk me through a normal day for the person who assigns the work. — agency vendor manager
8. Same walkthrough, from the freelance translator's side. — a real freelancer

**Needed for classification and horizons**

9. What has to be true by the end of this quarter? This year? In three years? — product owner
10. What will you deliberately not build yourselves — payments, CAT-tool integration, MT,
    accounting? — product owner plus engineering
11. Do two kinds of agency want genuinely different things from this (e.g. boutique vs
    enterprise LSP)? — domain expert *(a yes here usually means two contexts, not one with
    a flag)*

## Next step

Answer question 1, then 2. The interview script in `interview-questions.md` runs the rest
in order. Do not proceed to `domain-discover` or `domain-decompose` from this document as
it stands.
