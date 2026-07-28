# Domain Discovery — acme platform rebuild

**Source repo:** `fixtures/acme-repo` (read-only)
**Evidence base:** `docs/adr/ADR-0004-billing-schema.md`, `docs/adr/ADR-0005-contracts-schema.md`
**Date of run:** 2026-07-27
**Purpose:** input package for bounded-context decomposition.

---

## Headline verdict

**Do not run a full bounded-context decomposition on this evidence yet.**

The repo contains 2 files. Both are accepted schema ADRs. There is no source code, no
migration, no ORM model, no test, no README, and no relationship or enumeration definition
anywhere in the repo.

Against the ten input categories a decomposition normally consumes, this repo satisfies
**1.5 of 10**:

| # | Decomposition input | Present? | Where |
|---|---|---|---|
| 1 | Candidate context names | Partial — 2 of ≥4 | ADR-0004 L12, ADR-0005 L11 |
| 2 | Entity list per context | Yes, for 2 contexts (11 tables) | ADR-0004 L21–26, ADR-0005 L20–24 |
| 3 | Entity attributes | **No** — counts only; 209 attributes unnamed | ADR-0004 L21–26, ADR-0005 L20–24 |
| 4 | Relationships / cardinality | **No** — 0 defined, all deferred | ADR-0004 L44, ADR-0005 L35 |
| 5 | Enumerations / state machines | **No** — 0 of 4 named picklists have values | ADR-0004 L45, ADR-0005 L36 |
| 6 | Invariants / business rules | **No** | — |
| 7 | Domain events | **No** | — |
| 8 | Actors / use cases | **No** | — |
| 9 | Transaction boundaries | **No** | — |
| 10 | Behavioural code | **No** — 0 code files in repo | — |

What *is* safely derivable: a coarse context map at the solution-boundary level, an entity
inventory, a term glossary, and a ranked list of the questions that must be closed before
aggregate boundaries can be drawn. That is what this package contains.

---

## The three findings that most affect decomposition

1. **Every relationship in the system is deferred.** Both ADRs push all lookup columns to a
   later "relationship pass" (ADR-0004 L44, ADR-0005 L35). Aggregate boundaries are decided
   by cardinality and transactional co-change; with 0 foreign keys documented, any aggregate
   proposal would be invention, not derivation.

2. **`acme_foundation` is the de-facto shared kernel and it has no ADR in this repo.** Both
   documented contexts depend on it (ADR-0004 L38, ADR-0005 L30). Its entity set is known
   only through three incidental mentions — `acme_currency`, `acme_company`, `acme_country`.
   Decomposing billing and contracts without the shared kernel's shape will produce boundaries
   that shift the moment ADR-0001..0003 surface.

3. **The contracts context has one unresolved aggregate-boundary question, flagged by its own
   author.** ADR-0005 L45–46 states it is unsettled whether a renewal is a new contract or a
   state of the existing one, and that the legacy schema models it both ways. This is the
   single highest-value question in the package: it determines whether `Contract` is one
   aggregate or two, and whether `RenewalOption` is an entity or a value object.

---

## Files in this package

| File | Contents |
|---|---|
| `01-evidence-inventory.md` | Everything read, everything referenced-but-absent, coverage numbers |
| `02-ubiquitous-language.md` | 14 evidenced terms, 8 collisions/ambiguities, 5 conspicuously missing concepts |
| `03-context-candidates.md` | Candidate contexts, dependency edges, per-entity notes, sizing signals |
| `04-open-questions.md` | 12 ranked blockers, each with what closing it unlocks and how to close it cheaply |
| `discovery.json` | Machine-readable form of the above for the decomposition step |

## Reading the confidence labels

Every claim in this package carries one of three labels. They are not decoration — the
decomposition should treat them differently.

- **`evidenced`** — stated in an ADR. Cited by file and line. Safe to build on.
- **`inferred`** — not stated, but follows from evidenced facts or from platform convention.
  Stated with its reasoning so it can be refuted. Verify before building on it.
- **`absent`** — the repo is silent. Recorded so the decomposition does not silently
  fabricate it. Never build on it.
