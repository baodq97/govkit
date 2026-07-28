---
name: api-designer
description: >
  Use when designing REST or GraphQL APIs, creating OpenAPI 3.1 specifications, or planning
  API architecture — resource modeling, versioning strategies, pagination patterns, and error
  handling standards. Trigger when the user says "design an API", "create OpenAPI spec", "REST
  API design", "GraphQL schema", "API versioning", "pagination patterns", or asks about HTTP
  resource modeling, API contracts, or error response structure. Also trigger on "design the
  API for this domain", "turn the domain model into an API", or "now build the API" when a
  domain model exists in `docs/domain/`. Works standalone from a prose description too.
---

# API Designer

## Hard rules

- No verbs in URIs — `/users/{id}`, never `/getUser/{id}` (enforced: `redocly.yaml`)
- Every collection endpoint has pagination (enforced: `redocly.yaml`)
- Every error is RFC 9457 (`application/problem+json`) (enforced: `redocly.yaml`)
- No breaking changes without a versioned migration path
- Never expose an aggregate's invariant-only fields via Published Language — that's
  OWASP API3:2023 Broken Object Property Level Authorization (the 2023 merge of API3:2019
  "Excessive Data Exposure" and API6:2019 "Mass Assignment"), an authorization control, not a
  schema-hygiene preference
- Integration technology (REST/gRPC/messaging) is decided at workflow step 6, recorded as an ADR —
  never assumed before the candidate endpoint list and relationship review
- When `docs/domain/` exists, never rename or invent domain concepts — map what's there
- Every bounded context gets its OWN emitted `docs/api/<context>/openapi.yaml` — a README alone is not a deliverable. Before declaring done, verify each context folder actually contains its spec file (e.g. `ls docs/api/*/openapi.yaml`); a linked-but-missing spec is an incomplete result.

Specification-first API design: domain → resources → OpenAPI 3.1 contract → validated mock.

## Where this fits

This is the API-design step of the swe-flow chain: `goal-define` → `ddd-flow:3-decompose`
(ships in the `ddd-flow` plugin; the handoff is the `docs/domain/` tree, not an import) →
**`api-designer`**. When `docs/domain/` exists, consume it; otherwise work from a prose
description — both paths produce the same contract under `docs/api/`.

## Consume the domain model

First check for `docs/domain/` (ddd-flow decompose output: `context-map.md`, per-context folders
each with `README.md` + `model.yaml`). If present, treat it as authoritative input and map it
onto the API — don't re-derive the domain or rename its concepts:

| Domain element | API surface |
|---|---|
| Bounded context | An API surface (service / tag group / versioned base path) |
| Aggregate | A top-level resource (collection + item) |
| Entity (non-root, inside aggregate) | A sub-resource under its aggregate root |
| Value object | A schema component (no own endpoint; embedded/reused) |
| Domain event | A webhook/event endpoint (default) — or a state-transition sub-resource for client-driven transitions; see `references/openapi.md` § Domain events |

One spec per bounded context; never collapse two contexts into one surface or fan one aggregate
across contexts. The aggregate root's resource is the consistency boundary — keep transactional
writes within it. Reuse the domain's ubiquitous-language names verbatim.

Map the `relationships` in `model.yaml` onto API dependencies. Two axes, and only one of them
decides a contract: `direction` says which way the dependency runs, `our_roles` / `their_roles` say
how each side governs it. Which roles get a contract — and which are downstream acts that publish
nothing — is decided in one place, `references/rest-patterns.md` § Relationship role → does this
context get a contract at all; read it there rather than reasoning from the direction. Spec
mechanics (URI shape, status codes, schema layout) live in the references below.

## Workflow

The integration technology and the endpoint list are LATE decisions, not the starting assumption —
a candidate endpoint TABLE is reviewed before any YAML gets written:

1. **Read the domain (or take prose)** — read `docs/domain/` if present and apply the mapping
   above; else take a prose description and identify resources, relationships, and operations
2. **Confirm relationship roles** — for each entry in `model.yaml`'s `relationships`, read
   `our_roles`, not `direction`: `open-host` / `published-language` / `supplier` / `partnership` /
   `customer` / `conformist` / `acl` / `shared-kernel` / `separate-ways` / `other`; it feeds step 5
3. **Name each operation's responsibility** — State Creation / Retrieval / State Transition /
   Computation, per `references/rest-patterns.md` § Operation-responsibility taxonomy
4. **Derive the candidate endpoint list (CEL)** — run
   `${CLAUDE_SKILL_DIR}/scripts/derive_cel.py` against `docs/domain/` (owned by a
   sibling script, not this skill) to produce a candidate endpoint TABLE (resource, operation,
   responsibility); review the table before writing any spec
5. **Evaluate contract necessity per relationship (REL)** — apply
   `references/rest-patterns.md` § Relationship role → contract decision: drop endpoints for a
   context whose role says it gets no new contract
6. **Decide integration technology, then write the contract** — REST/gRPC/messaging is decided
   here, not assumed at step 1; record the decision as an ADR. For REST, copy
   `assets/openapi-skeleton.yaml`, fill it in, and lint:
   `npx @redocly/cli lint --config ${CLAUDE_SKILL_DIR}/redocly.yaml openapi.yaml`
7. **Mock and verify** — `npx @stoplight/prism-cli mock openapi.yaml`
8. **Plan evolution** — versioning strategy and deprecation policy

## Ruleset & skeletons

Spec mechanics are pinned, not re-explained on every run:

- `redocly.yaml` — the enforced ruleset: problem+json error shape, pagination on every collection,
  no verbs in URIs, required operationId/description. Lint against it; don't ask an agent to judge
  by prose what a linter already fails.
- `assets/openapi-skeleton.yaml` — copyable OpenAPI 3.1 skeleton covering all four operation
  responsibilities. Copy it; don't regenerate the shape from a prompt.
- `assets/problem-details.yaml` — copyable RFC 9457 Problem Details schema.

## References

Load on demand — mechanics link to the spec/RFC and the redocly rule that enforces them; only the
domain-to-API judgement a linter can't check is written out:

| Reference | Load When |
|-----------|-----------|
| `references/rest-patterns.md` | Relationship-role → contract decisions, Published Language vs internal model, operation-responsibility taxonomy |
| `references/versioning.md` | What forces a version bump vs. what doesn't |
| `references/pagination.md` | What counts as "a collection" that needs pagination |
| `references/error-handling.md` | RFC 9457 error responses — what goes in `type` vs `detail` |
| `references/openapi.md` | Domain event → webhook vs. state-transition resource |

## Output

Write under the project's `docs/api/` directory (create it if missing), mirroring the
the decompose layout: one shared index plus one folder per bounded context (or one folder for
a standalone API).

```
docs/api/
├── INDEX.md
└── <context-slug>/
    ├── README.md        # resource model, mapping notes, versioning/deprecation
    └── openapi.yaml     # OpenAPI 3.1 spec (lint-clean)
```

Each context folder contains:

- Resource model (table or diagram) — and, when sourced from `docs/domain/`, the
  aggregate → resource / event → endpoint mapping
- OpenAPI 3.1 spec (`openapi.yaml`, lint-clean, mock-verified)
- Error catalog (all 4xx/5xx) and versioning/deprecation strategy
