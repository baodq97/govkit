---
id: MC-0001
title: Churn LightGBM v3 — production model card
status: released
owner: mai
date: 2026-07-02
parent: EXP-0001
---

# MC-0001 — Churn LightGBM v3

## Intended use

Weekly churn-risk scoring for retention outreach. Scores rank customers for human review;
they never trigger automated account actions, and downstream teams consume the decile, not
the raw probability.

## Limitations and risks

Trained only on the 2025–2026 cohort of DS-0001, so cohorts acquired through the partner
channel are under-represented and their scores are less calibrated. Known bias: tenure
correlates with region, and the model inherits it — the caveat travels with every export.

## Provenance

Selected by EXP-0001, where the incumbent architecture beat the transformer challenger;
the training entrypoint is the frozen pipeline this card's parent experiment governs.
