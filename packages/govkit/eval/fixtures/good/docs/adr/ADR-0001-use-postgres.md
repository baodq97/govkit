---
id: ADR-0001
title: Use PostgreSQL for the primary store
status: accepted
owner: TBD
date: 2026-05-31
---

## Context

The service needs a durable, transactional store for billing records. Write volume
is moderate (low hundreds per second) and we require strong consistency for money
movements, plus a mature operational and backup story the team already understands.

## Decision

We will use PostgreSQL 16 as the primary datastore. Row-level constraints enforce
invariants at the database, and logical replication feeds read replicas for reporting.

## Consequences

We gain ACID guarantees and a well-trodden ops path. We accept the cost of running a
stateful service and the need for connection pooling under bursty load. Migrating off
later would be a significant trade-off, which we judge acceptable for the durability win.
