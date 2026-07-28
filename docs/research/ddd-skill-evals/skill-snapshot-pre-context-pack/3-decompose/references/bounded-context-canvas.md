# Bounded Context Canvas

Use this to fill each context's `README.md` — what a bounded context is responsible for and how
it talks to others (adapted from the ddd-crew Bounded Context Canvas). Keep it concise; a canvas
is a summary, not an essay.

## Template

```markdown
# <Context> bounded context

## Purpose
<One sentence: what business capability this context owns.>

## Strategic classification
- Sub-domain type: core | supporting | generic
- Why: <one line — e.g. "core: the booking engine is our differentiator">

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| <Term> | <definition — may differ from the same word elsewhere> |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| <Other> | <PlaceBooking> | command \| query \| event |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| <Other> | <BookingConfirmed> | event \| command |

## Aggregates
- <AggregateName> — <one-line responsibility>

## Business rules (draft)
<!-- ONLY rules the user stated. Never invent. If none given, write "None captured yet." -->
```

## Filling guidance

- **Purpose** is the most clarifying field — if you can't state it in one sentence, the boundary
  is probably wrong or too big; ask the user.
- **Ubiquitous language** is where boundaries prove themselves: a term that means something
  different here than in a neighbouring context is *why* they're separate contexts.
- **Inbound/outbound** make the context a service candidate. Prefer events outbound (loose
  coupling) over synchronous commands where the domain allows.
- A context with only generic responsibilities and no core aggregates is a candidate to buy or
  outsource rather than build.
