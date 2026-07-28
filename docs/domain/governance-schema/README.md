---
id: DOMAIN-0012
title: GovernanceSchema bounded context
status: draft
owner: baodq97
date: 2026-07-28
mode: define
related_rfcs: [RFC-0007, RFC-0023]
---

# GovernanceSchema bounded context

**Master-data. Stub by design** — no aggregate, no lifecycle, no runtime write.

## Purpose and interface

`govkit.yml` says what a governed document *is* here: which kinds exist, where they live, what each
must declare, which lifecycle states each may be in, and what the quality bar is — so adopting
govkit is an edit to one file, never a fork of the engine. One reader (`config.ts:417 loadConfig`),
so no consumer can hold a divergent view; all eleven other contexts conform, `Calibration` alone
translates (`calibrate.ts:118-123`), and one edge is two-way — `init` writes this file,
`init --adopt` reads it (`adopt.ts:131-138`).

## The one model decision worth recording

**Which keys fail loud, and which degrade.** `docs.root`, `excludeBase`, `tiers`, and the two
layout booleans error at LOAD, because a typo there silently un-governs something — the
"looks-configured-but-isn't" leak. `journal.path`, `ledger.path` and every `waivers:` entry stay
tolerant, validated at USE time, because an unused bad key must not break a gate that never touches
it. That asymmetry is the whole model (`config.ts:432-488` vs `:489-516`; ten invariants in
`model.yaml`).

## Open questions

- **`ratification:` is in this file and no code reads it** (`govkit.yml:128-134`). Reference data
  for humans, sitting in the engine's config — deliberate, per `RFC-0027:135-143`, and worth
  restating because it is the only key here with no reader.
- **No `domain:` type is declared**, so this whole `docs/domain/` tree is ungoverned
  (`govkit.yml:14-75`). The two flags a named design tree needs already exist (`config.ts:52`,
  `:61`). *Owner — an agent may not edit this file.*
