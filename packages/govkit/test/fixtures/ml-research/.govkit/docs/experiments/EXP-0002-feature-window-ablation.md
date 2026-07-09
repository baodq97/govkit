---
id: EXP-0002
title: Feature-window ablation for the churn cohort
status: analyzed
owner: mai
date: 2026-07-01
metric: auc
dataset: DS-0001
---

# EXP-0002 — Feature-window ablation for the churn cohort

## Hypothesis

Shrinking the behavioural feature window from ninety days to thirty days costs less than
one AUC point, because most churn signal concentrates in the final month of activity.

## Protocol

Three window sizes (90, 60, 30 days), five seeds each, on the same frozen DS-0001 split as
EXP-0001 so the arms stay comparable across experiments. Everything except the window
constant is pinned; the analysis notebook consumes the same run-artifact schema the
training pipeline emits.

## Interim analysis

The 30-day arm sits 0.6 auc points under the 90-day arm — inside the hypothesised budget.
Publication is deferred until the holdout month confirms the gap does not widen with
seasonality.
