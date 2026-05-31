# Aggregate Design Canvas

Use this when modelling each aggregate inside a context (adapted from the ddd-crew Aggregate
Design Canvas). An aggregate is a **consistency boundary**: everything inside stays valid within
one transaction; everything outside reaches it only through its root.

## Template

```markdown
### Aggregate: <Name>   (root: <RootEntity>)

Purpose: <one line — what invariant this aggregate exists to protect>

Entities (have identity):
- <Entity> — <attributes>

Value objects (no identity, equal by value, immutable):
- <VO> — <attributes>

Handled commands → emitted events:
| Command (imperative) | Event (past tense) |
|---|---|
| <PlaceOrder> | <OrderPlaced> |

Enforced invariants:
<!-- ONLY rules the user stated. Never invent. -->
- <e.g. "an order must have at least one line item">

Relationships:
- References other aggregates BY ID only (never by object reference).
```

## Design rules (from ddd-methodology.md)

- **Keep aggregates small.** A large aggregate widens the transaction and invites contention;
  when in doubt, split — a smaller aggregate referencing another by ID is usually better.
- **One transaction per aggregate;** between aggregates use eventual consistency (an event from
  one triggers a handler on another). State that must change atomically belongs in one aggregate;
  state that tolerates delay should be separate.
- **Root guards the boundary.** External code talks only to the root; nothing references internal
  entities except transiently. Deleting the root deletes the whole aggregate.
- **Entity vs value object:** a concept is an **entity** if it has an id, its own
  lifecycle/status, is referenced by id from elsewhere, or — in a brownfield model — already has
  its own table/repository, *even when it looks like plain data*. Make it a **value object** only
  when instances are interchangeable and you would never point at one by id. Default to *entity*
  when a source already gives the concept identity; do **not** demote an identified concept (a
  `Fact` or `Rule` that has its own id and is fetched/updated on its own is an entity, not a value
  object — only the immutable pack-bundle snapshot of it, e.g. `PackFact`, is a value object).
  Push behaviour into value objects; keep entities lean.
- **Versioned / snapshot state has one owner.** The aggregate that *produces* a snapshot or
  version owns it; other contexts hold a reference (id + version), never a copy. Don't hang a
  version or published-snapshot off a *consumer* aggregate — that misplaces the consistency
  boundary (e.g. a published pack version belongs to the producing context, not to the app that
  reads it).
- **Boundaries will move.** Expect to revisit aggregate boundaries as understanding deepens —
  this is normal, not a failure.

## When to ask the user

Don't guess — ask (per SKILL.md step 5) when state that must stay atomically consistent spans
candidate aggregates, when a concept's entity-vs-value-object identity wasn't stated, or when an
invariant is implied by the description but never made explicit.
