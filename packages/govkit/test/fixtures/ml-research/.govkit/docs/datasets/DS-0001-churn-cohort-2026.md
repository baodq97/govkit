---
id: DS-0001
title: Churn cohort 2026 — frozen training snapshot
status: validated
owner: linh
date: 2026-06-15
license: internal-restricted
---

# DS-0001 — Churn cohort 2026

## Provenance and collection

Nightly warehouse export of account activity joined with billing events, frozen on
2026-06-01 and content-addressed so every experiment cites an immutable snapshot. Rows
with incomplete consent flags are dropped at export time, before the snapshot hash is
taken.

## Validation

Schema and distribution checks run against the previous quarter's snapshot; drift beyond
two standard deviations on any marginal blocks the freeze. The 2026 freeze passed with one
waived column (documented in the export log).
