---
id: RFC-0001
title: Webhook dispatch — replace per-event HTTP with a batched queue
status: accepted
owner: TBD
date: 2026-07-08
---

## Summary

Dispatching one HTTP POST per event tops out at ~120 events/s per worker, and p95 delivery
latency hit 8.4s during the 2026-06-12 incident (INC-231, 41k events backlogged). Replace
per-event POSTs with a per-endpoint batch queue: group up to 50 events or 200ms, whichever
comes first, one POST per batch, ordering preserved within an endpoint.

## Alternatives and trade-offs

- **Keep per-event POSTs, add workers.** Linear cost growth — reaching 1,000 events/s needs
  ~9 workers vs 2 today — and receiver rate limits (Shopify caps at 4 req/s per store) still
  bind. Rejected on cost and on an external cap no worker count scales past.
- **Managed queue (SQS FIFO + Lambda).** Removes ops burden but adds a 60–90ms enqueue hop,
  and the FIFO tier caps at 300 msg/s per message group — below our measured per-endpoint
  peak of 480/s (metrics dashboard, week of 2026-06-08). Rejected on the throughput ceiling.
- **Batched queue on the existing Redis (chosen).** Reuses the Redis 7 instance already
  deployed for sessions; the benchmark in `bench/webhook-batch.ts` sustains 2,100 events/s
  per worker at p95 310ms with 50-event batches.

## Impact and rollout

Dual-dispatch behind the `webhook_batch` flag for two weeks; receivers see a `batch: true`
header so integrators can opt out per endpoint during the window. Rollback is flipping the
flag — the per-event path stays deployed until the flag has been on for 30 days.

## Open questions

Batches mix event types today; whether type-segregated batches are worth one queue per type
depends on integrator feedback collected during the flag window.

## Recommendation

Ship the Redis batch queue behind `webhook_batch`, keep the per-event path as the rollback
for 30 days, and decide on type-segregated batches from flag-window feedback before removal.
