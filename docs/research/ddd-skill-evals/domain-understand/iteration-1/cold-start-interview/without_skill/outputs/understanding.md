# Understanding — freelance translator assignment management (working title)

Status: **draft, unvalidated.** Built from a one-sentence brief plus general knowledge of the
language-services industry. Nothing here has been confirmed by you, and there is no repo, no
existing doc, and no user research to check it against.

Provenance labels used throughout:

- `[STATED]` — came from your brief.
- `[ASSUMED]` — my inference. If wrong, something in the design changes. Listed in §11.
- `[DOMAIN]` — general industry knowledge, not specific to your product, not verified this session.

---

## 1. What I actually have

> "a tool for agencies to manage freelance translator assignments"

That is the whole input. `[STATED]`: three nouns — *agency* (buyer/orchestrator), *freelance
translator* (supplier), *assignment* (the unit of work being managed). Everything below is
reconstruction around those three.

---

## 2. Problem framing

`[DOMAIN]` A translation agency (LSP — language service provider) sells work in more language
pairs and subject domains than it can staff internally, so most delivery is subcontracted to a
pool of freelancers. The recurring operational pain is:

1. **Match** — for this job, who can do this pair, in this specialization, by this deadline, at a
   rate that keeps margin, with acceptable past quality?
2. **Book** — get a yes fast, and have a fallback when the first choice declines or goes silent.
3. **Track** — is it started, late, delivered, reviewed? Who is chasing whom?
4. **Close the money loop** — PO out, delivery in, invoice matched, paid in the right currency.

`[ASSUMED]` The status quo you'd be replacing is spreadsheets + email + a shared drive, or an
expensive enterprise system the agency uses only 20% of.

### The wedge question

Three products fit that same sentence, and they have different cores. Picking one changes the
data model, not just the roadmap.

| Wedge | Core object | Hard part | Wins when |
|---|---|---|---|
| **A. Resourcing / vendor management** | Vendor profile + offer | Matching, availability, rate resolution, fallback chains | The agency's pain is "who do I give this to, fast" |
| **B. Production workflow (TMS-lite)** | Job + file handoff | Task chaining (translate → edit → proof), file states, deadline cascade | The pain is "work gets lost between steps" |
| **C. Vendor finance ops** | PO + invoice | Rates, currencies, tax, reconciliation, payment runs | The pain is "we can't tell what we owe or what a project cost" |

`[ASSUMED]` You mean A, because "assignments" is the noun you reached for. That assumption drives
most of this document. **This is question 1 in §12.**

---

## 3. Actors

| Actor | Cares about | Notes |
|---|---|---|
| Project manager / vendor manager | Filling jobs fast, deadline visibility | `[ASSUMED]` the primary paying user |
| Freelance translator | Clear offer terms, no extra portal to babysit, getting paid | `[DOMAIN]` lives in email; portal adoption is the classic failure mode |
| Reviewer / editor | Receiving upstream work on time | Often also a freelancer — same profile, different role on a job |
| Agency finance | POs, invoices, cost per project | May be one person wearing the PM hat too |
| End client | Status, delivery | `[ASSUMED]` out of scope for v1; a read-only view is the usual v2 ask |
| Agency admin/owner | Margin, vendor pool health, capacity | Reporting consumer |

---

## 4. Candidate happy path

```
client request
  → project created (client, deadline, files, source language)
  → split into jobs (one per target language × service, e.g. DE→EN editing)
  → shortlist candidates (pair + specialization + availability + rate + past score)
  → send offer(s)
  → accept / decline / expire  → fallback to next candidate
  → PO issued, work in progress
  → delivery + QA/review
  → client delivery
  → freelancer invoices → paid
```

Two structural notes worth flagging now:

- The **project → job** split is where the domain gets its shape. A project with 5 target
  languages × 3 steps is 15 assignments with a dependency graph, not 15 independent rows.
- **Offer ≠ assignment.** An offer is a proposal that can be sent to several people at once; an
  assignment is the accepted one. Collapsing them into one entity is a modelling mistake that is
  expensive to undo later.

---

## 5. Candidate glossary

Naming warning `[DOMAIN]`: this industry uses *project*, *job*, *task*, and *assignment*
interchangeably and inconsistently across tools. Pin these before writing any code — a fixed
ubiquitous language is worth more here than in most domains.

| Term | Working definition | Confidence |
|---|---|---|
| Client | Organisation buying the translation | high |
| Project | One client request, one deadline, one source file set | high |
| Job / Assignment unit | Work for one language pair + one service, assignable to one vendor | medium — naming unresolved |
| Service / Task type | Translation, editing, proofreading, MTPE, certified, DTP, subtitling | `[DOMAIN]` |
| Language pair | source → target, incl. locale (pt-BR ≠ pt-PT) | high — locale matters |
| Specialization | legal, medical, patent, marketing, technical, financial | `[DOMAIN]` |
| Vendor / Freelancer | External supplier with a profile | high |
| Vendor profile | pairs, specializations, CAT tools, certifications, capacity, docs | `[ASSUMED]` |
| Rate card | per-word / per-hour / per-page / minimum fee, per pair, per service, currency | `[DOMAIN]` |
| Availability | calendar + capacity (words/day), plus blackout dates | `[ASSUMED]` |
| Offer | Proposal of a job to a vendor; has expiry; may fan out | `[ASSUMED]` |
| Purchase order | Commercial commitment to the vendor for an accepted job | `[DOMAIN]` |
| Delivery / handoff | Files returned by the vendor for a job | high |
| QA score / feedback | Post-delivery quality record feeding future matching | `[DOMAIN]` (LISA/MQM/DQF frameworks exist) |
| Invoice / payment | Vendor billing and settlement | `[DOMAIN]` |
| NDA / contract | Signed agreements gating who may see which client's files | `[DOMAIN]`, compliance-relevant |

---

## 6. Scope boundary (proposed)

**In** `[ASSUMED]`: vendor pool + profiles, job creation and splitting, offers and acceptance,
deadline tracking, delivery capture, basic PO/cost, basic quality history.

**Out** `[ASSUMED]`, integrate rather than build: CAT editor, translation memory, termbase,
machine translation, full accounting/ledger, e-signature, payment rails.

The boundary between "assignment manager" and "TMS" is the one that will erode first. Write it
down now or the product becomes a worse memoQ in 18 months.

---

## 7. Rules and invariants to confirm

These are the ones that generate real design decisions:

1. **Single accepted assignee per job.** If offers fan out to 5 vendors, two can accept in the
   same second. That is a genuine concurrency requirement, not an edge case — decide first-accept-
   wins vs PM-confirms.
2. **Rate resolution order.** Job-specific override > vendor rate for this client > vendor default
   rate > agency default for the pair. `[ASSUMED]` — needs your confirmation, it is a frequent
   source of billing disputes.
3. **Deadline cascade.** vendor deadline < internal review deadline < client deadline. Changing
   the client deadline must ripple, or must explicitly refuse to ripple.
4. **Job dependencies.** Editing cannot start before translation delivers. Do you model this as a
   real dependency graph or as advisory dates?
5. **Reassignment mid-flight.** If a vendor is pulled off after partial work, is there partial
   pay? Does the PO get amended or cancelled and reissued? This has audit consequences.
6. **Time zones.** Every deadline is an instant, stored in UTC, displayed in the viewer's zone. In
   a product whose suppliers are global, a naive local-datetime column is a guaranteed incident.
7. **Confidentiality.** A vendor may only see files for clients whose NDA they've signed. If true,
   access control is domain logic, not an afterthought.
8. **Currency.** Vendor paid in EUR, client billed in USD. Which rate, fixed at which moment?

---

## 8. Context questions that shape architecture

- **Multi-tenant SaaS** serving many agencies, or one agency's internal tool? Changes everything
  about isolation, onboarding, and configurability.
- **Scale**: 10 jobs/week or 10,000? A single agency's PM board and a marketplace are different
  systems.
- **Who logs in**: do freelancers get accounts, or do they only ever touch email links? `[DOMAIN]`
  Freelancer portal adoption is the standard failure mode of this category — an email/magic-link
  flow often beats a portal.
- **Compliance**: freelancer PII, EU GDPR, client NDAs, possibly ISO 17100 audit trails.
- **Integrations expected on day one**: CAT tools (Trados/memoQ/Phrase), accounting (Xero/
  QuickBooks), storage (Drive/Dropbox), email.
- **Existing constraints**: your stack, team size, target ship date, budget.

---

## 9. Prior art `[DOMAIN]` — unverified

The category is mature. Vendor/project management for LSPs: XTRF, Plunet, Protemos, LSP.expert,
Wordbee, TranslationProjex. CAT/TMS (adjacent, not the same): Trados, memoQ, Phrase.

I did not verify the current state of any of these in this session — treat this as a prompt for
you to confirm, not as market research. The implication stands either way: "why would an agency
switch" needs an answer before scoping, and the usual honest answer for a new entrant is *simpler
and cheaper for small agencies who find the incumbents overbuilt*.

---

## 10. Risks

| Risk | Why it bites |
|---|---|
| Generic PM tool | Without matching intelligence or rate/PO logic, you lose to Airtable + email at €0 |
| Two-sided cold start | Freelancers won't adopt a portal; agencies won't pay if freelancers don't respond |
| Rates/currency/tax depth | Looks like a lookup table, is actually the hardest table in the system |
| Scope creep into CAT/TM | Unbounded; kills small teams |
| Compliance surprises | NDAs and PII arrive late and force schema rework |

---

## 11. Assumption register

Every row is something I made up. If any is wrong, tell me — each one moves the design.

| # | Assumption | If wrong | Cheapest check |
|---|---|---|---|
| A1 | Wedge is resourcing/matching (A), not workflow (B) or finance (C) | Core aggregate changes | You answer Q1 |
| A2 | Multi-tenant SaaS sold to many agencies | Tenancy, auth, config all change | You answer Q2 |
| A3 | Freelancers get accounts and log in | Email-first design instead | Ask 3 freelancers |
| A4 | Project splits into per-pair-per-service jobs | Flat job list is simpler but caps growth | You answer Q3 |
| A5 | Offers can fan out to several vendors | Removes the concurrency requirement | You answer Q4 |
| A6 | POs and vendor invoices are in scope | Drops the whole finance surface | You answer Q5 |
| A7 | Client-facing portal is out of scope for v1 | Adds a third actor and an auth boundary | You answer |
| A8 | No CAT/TM integration in v1 | Adds file-format and API work early | You answer |
| A9 | Quality scores feed future matching | Drops a whole subsystem if not | You answer |
| A10 | Small agencies (2–20 PMs) are the target segment | Enterprise means SSO, audit, SLAs | You answer Q2 |

---

## 12. Open questions, ranked

**Blocking — I can't produce a defensible domain model without these:**

1. **Which wedge (§2, A/B/C)?** What is the single job the tool must do better than a spreadsheet?
2. **Multi-tenant SaaS for many agencies, or one agency's internal tool?** And roughly what
   segment/scale?
3. **Is the unit of assignment a whole project or a per-language-per-service job?** i.e. does one
   project fan out into many assignments with dependencies?
4. **Can one job be offered to several freelancers at once, first-accept-wins?** Or does a PM
   assign a single named person?
5. **Is money in scope for v1** — rates, POs, vendor invoices — or is v1 purely operational?
6. **Do freelancers log into your product, or do they only receive email?**

**Non-blocking, needed before build:**

7. Deadline model: hard client deadline with internal buffers, or per-step dates?
8. Quality feedback: free-text notes, a 1–5 score, or a real MQM-style error typology?
9. Files: do you store and hand off files, or only link to storage the agency already uses?
10. Required integrations on day one.
11. Compliance: GDPR, NDAs, ISO 17100 audit trail?
12. Your stack, team, and target date.

---

## 13. What I'd do next

1. You answer Q1–Q6 (or say "go with your defaults" and I'll run A1–A10 as written).
2. Lock the glossary in §5 — especially project/job/assignment/offer.
3. `goal-define` on the chosen wedge, then `domain-decompose` into bounded contexts. My prior
   given A1: *Vendor Pool*, *Work Allocation* (offers/assignments), *Delivery & Quality*,
   *Commercials* (rates/POs/invoices).
4. Build one thin vertical slice before broadening: create job → shortlist → offer → accept →
   deliver → mark done. That slice alone tests A1, A3, A4, and A5 with real users.
