---
id: US-0001
title: Resolve cross-artifact references in the verify gate
status: open
owner: TBD
date: 2026-05-31
priority: P1
parent: RFC-0003
---

As a govkit adopter, I want `govkit verify` to flag a doc whose `parent` points at a
non-existent id, so that a renamed or deleted upstream artifact cannot silently leave a
dangling chain edge behind.

This story implements the resolve-only check accepted in RFC-0003 (its `parent`). It is the
first governed doc in this repo to exercise a *resolving* reference end-to-end — the live
dogfood that proves the new check works on real chain data, not only on test fixtures.

## Acceptance criteria

- [ ] A doc whose configured ref key (`parent`) is non-empty and resolves to a known id
      produces no `reference` violation.
- [ ] A doc whose `parent` does not resolve to any known id produces exactly one `reference`
      violation naming the key and the unresolved value.
- [ ] A doc with an empty or absent `parent` is skipped (an optional link is not a dangling
      one) — existing rootless docs see zero change.
- [ ] `govkit verify` on this repo stays green with `US-0001 parent: RFC-0003` present.
