---
id: RFC-0002
title: Retry budget for the metering ingest path
status: accepted
owner: dana
date: 2026-07-29
---

# RFC-0002 — Retry budget for the metering ingest path

## Summary

Ingest currently retries a failed batch forever with a fixed 5s backoff, so one poisoned
record holds a partition until someone notices. This proposes a per-batch retry budget and a
dead-letter path, so a bad record costs one partition a bounded amount of time instead of an
unbounded one.

## Context

The retry loop predates the partitioned ingest. When it had to be written we had a single
consumer and a human watching it; neither is true now. Last quarter two incidents traced back
to the same shape: a batch that could never succeed, retried 14k times over nine hours.

## Decision

Six attempts with exponential backoff capped at 60s, then the batch moves to a dead-letter
topic with its failure reason attached. The consumer emits a counter per terminal failure so
alerting sees it without a human reading logs.

## Alternatives considered

Infinite retry with alerting was rejected: it makes the alert the control, and the alert is
the thing that failed both times. A global circuit breaker was rejected as too coarse — one
bad tenant would stop ingest for everyone, which trades a bounded failure for an unbounded one.

## Open questions

Whether six is the right number, or whether the budget should scale with batch size. We have
no measurement either way yet, so six is a starting point to be revised against real data.

## Impact / rollout

Ships behind `ingest.retryBudget`, defaulting to the current infinite behaviour for one
release so the dead-letter path can be watched before it is load-bearing. Rollback is setting
the flag back.
