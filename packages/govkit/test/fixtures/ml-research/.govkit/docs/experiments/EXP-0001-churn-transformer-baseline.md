---
id: EXP-0001
title: Churn-prediction transformer vs gradient-boosting baseline
status: published
owner: mai
date: 2026-06-20
metric: auc
dataset: DS-0001
governs:
  - pipelines/train.py
reconciled: sha256:0000000000000000
---

# EXP-0001 — Churn-prediction transformer vs gradient-boosting baseline

## Hypothesis

A small tabular transformer fine-tuned on the churn cohort beats the tuned LightGBM
baseline by at least two AUC points, because the sequential visit history carries signal
the flat feature encoding discards.

## Protocol

Five seeds per arm, identical 70/15/15 split from DS-0001, early stopping on validation
AUC with patience eight. The baseline arm reuses the production LightGBM config frozen in
`pipelines/train.py`; the treatment arm swaps only the model module so the data path stays
byte-identical between arms.

## Results

The transformer reached 0.847 auc against the baseline's 0.851 auc (mean of five seeds,
std 0.004 vs 0.002). The hypothesis is rejected: sequence modelling did not recover enough
signal to offset the smaller effective sample per parameter.

## Reproducibility

`python pipelines/train.py --exp EXP-0001 --seeds 5` regenerates both arms from the frozen
dataset snapshot; seeds, split hashes, and environment lock are recorded alongside the run
artifacts.
