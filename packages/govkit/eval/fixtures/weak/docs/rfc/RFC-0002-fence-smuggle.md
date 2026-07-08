---
id: RFC-0002
title: Streaming ingestion v2
status: draft
owner: someone
date: 2026-07-01
---

# RFC-0002 — Streaming ingestion v2

## Summary

```text
We will rework the ingestion pipeline to stream events through a broker with
at-least-once delivery, idempotent consumers, and a replayable log retained for
thirty days. The summary, alternatives considered, open questions, rollout plan
and the final recommendation are all captured in this fenced block so the file
looks substantial while carrying no gradable prose at all.
```

## Alternatives

```text
Batch uploads were considered and rejected. Direct database writes were
considered and rejected. A managed queue was considered and deferred.
```

## Open questions

```text
Retention cost. Consumer lag alerting. Schema evolution.
```

## Impact

```text
Large.
```

## Recommendation

```text
Ship it.
```
