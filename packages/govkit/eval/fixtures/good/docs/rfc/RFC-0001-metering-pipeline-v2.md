---
id: RFC-0001
title: Metering pipeline v2
status: accepted
owner: TBD
date: 2026-05-31
---

## Summary

Replace the nightly cron aggregator with a streaming pipeline so usage is visible
within minutes instead of the next day.

## Alternatives and trade-offs

We considered keeping cron (simple, but laggy), a fully managed stream (low ops, but
costly at our volume), and an in-house streaming consumer. The in-house option best
balances latency against cost given existing infrastructure.

## Impact and rollout

Dual-write for two weeks, backfill historical windows, then cut traffic over behind a
feature flag with a one-command rollback.

## Open questions

How do we treat late-arriving events older than the watermark — drop, or re-aggregate?

## Recommendation

Adopt the in-house streaming design and revisit the watermark policy before GA.
