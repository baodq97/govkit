# Understand step — draft done, 6 questions block the rest

I checked: no repo, no docs, no prior artifacts. The only input is one sentence, so I did the
understand step the only honest way — reconstructed the domain from industry knowledge, and
labelled every line as **stated by you / assumed by me / general domain knowledge**.

Draft: `understanding.md` — problem framing, actors, happy path, a 20-term glossary, scope
boundary, 8 invariants, 10 risks/assumptions, ranked open questions.

## The one decision I can't make for you

Your sentence fits three different products, and they don't share a core:

| Wedge | Core object | Hard part |
|---|---|---|
| **A. Resourcing / vendor management** | vendor profile + offer | matching, availability, rate resolution, fallbacks |
| **B. Production workflow (TMS-lite)** | job + file handoff | translate → edit → proof chaining, deadline cascade |
| **C. Vendor finance ops** | PO + invoice | rates, currencies, tax, reconciliation |

I guessed **A** because "assignments" is the noun you used. If it's actually B or C, most of the
draft's glossary and boundaries change — not the roadmap, the aggregates.

## Blocking questions (6)

1. Which wedge — A, B, or C? What must this beat a spreadsheet at?
2. Multi-tenant SaaS for many agencies, or one agency's internal tool? Rough scale/segment?
3. Is the assignable unit a whole project, or a per-language-per-service job? (i.e. does one
   project fan out into many dependent assignments?)
4. Can one job be offered to several freelancers at once, first-accept-wins? Or does a PM assign
   one named person?
5. Is money in v1 — rates, POs, vendor invoices — or is v1 purely operational?
6. Do freelancers log into the product, or do they only ever get email? (Portal adoption is the
   standard failure mode of this category — email-first may be the better design.)

## If you'd rather not answer

Say "go with your defaults" and I'll proceed on the assumption register in §11: wedge A,
multi-tenant SaaS for small agencies (2–20 PMs), project fans out into per-pair-per-service jobs,
fan-out offers with first-accept-wins, POs and vendor invoices in scope, freelancers get accounts.
Every one of those is written down and reversible, and the first thin slice — create job →
shortlist → offer → accept → deliver — tests four of them with real users inside a week.

What I'd advise against: skipping straight to a domain model on my guesses. Q1 and Q3 alone
determine the aggregate boundaries, and getting them wrong is a rewrite, not a refactor.

One flag on the market: this category has incumbents (XTRF, Plunet, Protemos, LSP.expert,
Wordbee). I have not verified their current state, so treat that as something to confirm rather
than as research. "Why would an agency switch" is worth an answer before we scope anything.
