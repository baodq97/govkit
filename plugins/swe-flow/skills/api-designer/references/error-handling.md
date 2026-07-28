# Error Handling

Shape: [RFC 9457, Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457) —
this obsoletes the original 2016 Problem Details RFC as of July 2023. The media type
(`application/problem+json`) and the five base fields (`type`, `title`, `status`, `detail`,
`instance`) are unchanged; RFC 9457 adds an IANA registry for common `type` URIs and formalizes
extension members for per-error context.

Copy `../assets/problem-details.yaml`'s `ProblemDetails` schema into `components/schemas` and
`$ref` it from every 4xx/5xx response — don't hand-roll the fields per endpoint.

Enforced by `../redocly.yaml`: `rule/error-is-problem-json` fails the lint if any 4xx/5xx response
serves a content type other than `application/problem+json`.

## The one judgement call: what goes in `type` vs `detail`

- `type` identifies the **error kind** — stable across every occurrence, resolvable to docs
  (`.../problems/insufficient-funds`). Reuse it across endpoints that share the failure mode;
  don't mint a new `type` per endpoint for the same underlying problem.
- `detail` and any extension members carry **this occurrence's** specifics (which field, which
  id, which limit was hit). Never put a value that changes per-request into `title` or `type`.
