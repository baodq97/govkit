---
name: api-designer
description: >
  Use when designing REST or GraphQL APIs, creating OpenAPI 3.1 specifications, or planning
  API architecture — resource modeling, versioning strategies, pagination patterns, and error
  handling standards. Trigger when the user says "design an API", "create OpenAPI spec", "REST
  API design", "GraphQL schema", "API versioning", "pagination patterns", or asks about HTTP
  resource modeling, API contracts, or error response structure. This is also the API-design
  step of the swe-flow chain: when a domain model already exists in `docs/domain/` (from
  domain-decompose), use this skill to turn those bounded contexts and aggregates into API
  surfaces and contracts — trigger on "design the API for this domain", "turn the domain model
  into an API", or "now build the API" after a decomposition. Works standalone from a prose
  description too.
license: MIT
---

# API Designer

Specification-first API design: domain → resources → OpenAPI 3.1 contract → validated mock.

## Where this fits

This is the API-design step of the swe-flow chain: `goal-define` → `domain-decompose` →
**`api-designer`**. When `docs/domain/` exists, consume it; otherwise work from a prose
description — both paths produce the same contract under `docs/api/`.

## Consume the domain model

First check for `docs/domain/` (domain-decompose output: `context-map.md`, per-context folders
each with `README.md` + `model.yaml`). If present, treat it as authoritative input and map it
onto the API — don't re-derive the domain or rename its concepts:

| Domain element | API surface |
|---|---|
| Bounded context | An API surface (service / tag group / versioned base path) |
| Aggregate | A top-level resource (collection + item) |
| Entity (non-root, inside aggregate) | A sub-resource under its aggregate root |
| Value object | A schema component (no own endpoint; embedded/reused) |
| Domain event | A webhook/event endpoint (default) — or a state-transition sub-resource for client-driven transitions; see `references/openapi.md` § Webhooks |

One spec per bounded context; never collapse two contexts into one surface or fan one aggregate
across contexts. The aggregate root's resource is the consistency boundary — keep transactional
writes within it. Reuse the domain's ubiquitous-language names verbatim.

Map the `relationships` in `model.yaml` onto API dependencies: a **downstream** context calls the
**upstream**'s API; a **shared-kernel** pair reuses shared schema components; an **ACL** boundary
translates the upstream's schema instead of re-exposing it. Spec mechanics (URI shape, status
codes, schema layout) live in the references below.

## Workflow

1. **Read the domain (or take prose)** — read `docs/domain/` if present and apply the mapping
   above; else take a prose description and identify resources, relationships, and operations
2. **Design contract** — URI patterns, HTTP methods, request/response schemas
3. **Write spec** — OpenAPI 3.1 YAML; lint with `npx @redocly/cli lint openapi.yaml`
4. **Mock and verify** — `npx @stoplight/prism-cli mock openapi.yaml`
5. **Plan evolution** — versioning strategy and deprecation policy

## References

Load on demand:

| Reference | Load When |
|-----------|-----------|
| `references/rest-patterns.md` | Resource design, HTTP methods, URI conventions |
| `references/versioning.md` | API versions, breaking changes, deprecation |
| `references/pagination.md` | Cursor, offset, keyset pagination |
| `references/error-handling.md` | RFC 7807 error responses, status codes |
| `references/openapi.md` | OpenAPI 3.1 spec templates, code generation |

## Hard Rules

- No verbs in URIs — `/users/{id}`, never `/getUser/{id}`
- Every collection endpoint has pagination
- Every error is RFC 7807 (`application/problem+json`)
- No breaking changes without a versioned migration path
- When `docs/domain/` exists, never rename or invent domain concepts — map what's there
- Every bounded context gets its OWN emitted `docs/api/<context>/openapi.yaml` — a README alone is not a deliverable. Before declaring done, verify each context folder actually contains its spec file (e.g. `ls docs/api/*/openapi.yaml`); a linked-but-missing spec is an incomplete result.

## Output

Write under the project's `docs/api/` directory (create it if missing), mirroring the
domain-decompose layout: one shared index plus one folder per bounded context (or one folder for
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
