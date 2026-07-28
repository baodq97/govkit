# Versioning

Strategy trade-offs (URI vs. header vs. content-negotiation versioning) and the deprecation
header conventions (`Deprecation`, `Sunset` — [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594))
are well-covered ground; default to **URI versioning** (`/v1/...`) unless the context already
has a documented reason not to.

## The one judgement call: what forces a version bump

Not every domain change is an API break. Map it through the domain model, not the wire format:

- A **new aggregate field** the domain model added is a non-breaking addition — clients ignore
  unknown fields.
- A **changed invariant** that changes what the field *means* (not just its presence) is breaking,
  even if the wire shape (type, name) is untouched — the contract is semantic, not just structural.
- A **relationship role changing** (e.g. a `conformist` renegotiating to `customer-supplier`) is a
  reason to revisit the contract's shape, but not by itself a version bump — record it as an ADR
  against the contract, then decide if the resulting schema change is breaking by the rule above.
