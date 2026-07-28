# OpenAPI 3.1

Spec: [spec.openapis.org/oas/v3.1.0](https://spec.openapis.org/oas/v3.1.0). Structure, required
fields, `$ref` resolution, and data-type keywords are the spec's job to define and
`../redocly.yaml`'s job to enforce (`operation-operationId`, `operation-description`,
`operation-summary`, plus the `recommended` Redocly ruleset) — don't re-derive them here.

Don't write a spec from a blank file. Copy `../assets/openapi-skeleton.yaml`, rename the resource,
and fill in the fields; then lint:

```bash
npx @redocly/cli lint --config plugins/swe-flow/skills/api-designer/redocly.yaml docs/api/<context>/openapi.yaml
```

For error bodies, copy `../assets/problem-details.yaml`'s `ProblemDetails` schema — see
`references/error-handling.md`. Code generation (`openapi-generator-cli`) and mock serving
(`prism`) are standard CLI tools with their own docs; not repeated here.

## Domain events: webhook vs. state-transition resource

The one judgement call the spec doesn't make for you — a `domain_event` from `model.yaml` can
surface two legitimate ways, picked by *who acts*:

- **Outbound webhook (default)** — other systems must be notified asynchronously that something
  happened (`OrderShipped`, `CoursePublished`). Model it under OpenAPI 3.1 `webhooks:`. Default
  because a domain event is, by definition, a fact broadcast to consumers — check the
  `relationships` + event consumers in `model.yaml`.
- **State-transition sub-resource** — the event is the result of a command the API client itself
  issues synchronously. Model the transition as a resource, never an RPC verb:
  `PUT /courses/{courseId}/publication` (→ `CoursePublished`). Prefer idempotent `PUT` on a
  singleton sub-resource for a state set once.

The two **compose**: a client-driven transition can also emit a webhook for downstream consumers
(`PUT .../publication` returns 200 *and* fans out a `coursePublished` webhook — see
`../assets/openapi-skeleton.yaml`'s `publishResource` + `resourcePublished` pair for the pattern).
Creation-type events (`EnrolmentRequested`) usually ride their `POST` — no extra endpoint needed.
