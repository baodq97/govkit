# Pagination

Strategy trade-offs (offset vs. cursor vs. keyset) are well-covered ground — see
[JSON:API pagination](https://jsonapi.org/format/#fetching-pagination) for the shapes and
[Stripe's API pagination docs](https://docs.stripe.com/api/pagination) for a production cursor
example. Default to **cursor pagination** (`limit` + opaque `cursor`) unless the caller genuinely
needs random page access or a total count — see `../assets/openapi-skeleton.yaml`'s
`ResourceList`/`listResources` for the copyable shape.

Enforced by `../redocly.yaml`: `rule/collection-get-needs-pagination` fails the lint if a `GET` on
a collection path declares zero query parameters — it does not check parameter *names*, because
the skeleton fixes those by being copied, not regenerated.

## The one judgement call: what counts as "a collection"

A nested `GET` still needs pagination if it can return an unbounded set — `GET
/users/{id}/orders` is a collection even though it hangs off an item. It's only exempt from the
rule above if the parent aggregate provably bounds the count (e.g. a value object list capped by
an invariant) — state that bound in the resource's README when you skip pagination, so the next
reviewer doesn't have to re-derive it.
