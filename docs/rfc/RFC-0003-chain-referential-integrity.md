---
id: RFC-0003
title: Chain referential-integrity — resolve cross-artifact references in the gate
status: implemented
owner: baodq97
date: 2026-05-31
governs:
  - packages/govkit/src/commands/verify.ts
---

> Proposes a new public, deterministic surface (root `AGENTS.md` § Lifecycle): one
> `verify` check kind (`reference`) plus a `refs` convention in `govkit.yml`. Accepted by
> the owner (`baodq97`) **before** implementation — the flip was a human act, never an
> agent — dogfooding the lesson RFC-0002's acceptance taught: a public surface rides with
> an accepted RFC, not after it.

## Summary

govkit's headline claim over single-document ADR tools is that it governs the **whole
SDLC chain** (`PRD → RFC → ADR → US → Code`). Today that is true only in prose: `verify`
checks each doc in isolation — front-matter, status enum, id↔filename, INDEX sync, unique
ids — and inspects **zero** chain edges. A dangling reference (a US whose `parent` points
at `RFC-0007` after it was renamed to `RFC-0008`) is exactly the drift a chain-governance
engine should catch, and it is invisible. This RFC closes that gap with the smallest
deterministic check that makes "governs the chain" literally true.

## Decision

Add a **resolve-only** referential-integrity check to the existing no-API-key gate:

- `govkit.yml` `docs.types.<type>` gains an optional `refs: [{ key, type? }]`. Each entry
  declares a front-matter key whose value, **when non-empty**, must resolve to an existing
  doc id anywhere in the governed chain.
- `verify.ts` builds the global id set it already computes for duplicate detection, then
  adds one check: for every doc that declares a ref key with a non-empty value, that value
  must be a known id — otherwise a `reference` violation. Empty/absent → skipped (an
  optional link is not a dangling one).
- It stays **config-not-code**: *which* front-matter key holds the reference is declared in
  `govkit.yml`, not hardcoded.

**Scope is deliberately minimal — ship resolve-only.** A reference is a **single scalar id
per key**; arrays (`parent: [RFC-0001, RFC-0002]`) are a future extension (today `str()`
would coerce a list to a comma-joined string and report a confusing non-resolution — out of
scope for v1). The `type` field is **recorded but not enforced** in v1.

## Alternatives considered

- **Target type-matching** (a US's `parent` must resolve to an id *of type rfc*): deferred.
  Resolve-only catches the real failure mode (a renamed/deleted id) with less surface; type
  enforcement is a follow-on once the convention has adopters.
- **`required: true` on a ref** (every US *must* declare a parent): deferred — that is a
  lifecycle-completeness rule, a different concern from referential integrity, and risks
  false positives on legitimately-rootless docs.
- **Transitive chain walking + cycle detection**: rejected as over-engineering (per
  `IMPROVEMENTS.md`'s rejected list) — resolve-only is the high-impact core; a full graph
  walk is speculative until a real repo needs it.
- **A heavyweight schema dep (AJV/JSON-Schema) to express refs**: rejected — a few lines of
  set-membership reusing the existing `byId` build stays in the Node-built-ins spirit.

## Impact / rollout

- **Existing repos see zero change.** `refs` ships **unset** in the `init` scaffold, and
  the check is resolve-only with empty-skip, so no current doc is newly flagged. govkit's
  own foundational docs (RFC-0001, RFC-0002, ADR-0001) are chain roots with no `parent` —
  they remain green.
- **Dogfood in the same change:** configure `refs` on `adr`/`us`, and add `US-0001`
  (`parent: RFC-0003`) — a genuine child of this RFC — so the live `govkit verify` exercises
  a *resolving* edge, with a dangling-ref fixture pair in the test suite proving it
  discriminates.
- **Rollback** is trivial: removing the `refs` keys from `govkit.yml` disables the check
  with no code change (config-not-code).

## Open questions

- Should `type` enforcement and `required` refs land together as RFC-0003.1 once an external
  adopter exists, or stay deferred indefinitely if resolve-only proves sufficient?
- Array-valued refs (multiple parents): worth the `str()`-handling complexity, or is "one
  parent per key" the right permanent constraint for an SDLC chain?

## As-built

Shipped as the `reference` check in `checkReferences` (`commands/verify.ts`), wired into the no-key
gate. It is resolve-only: for every doc declaring a configured `refs` key (`govkit.yml`
`docs.types.<type>.refs`) with a non-empty value, that value must resolve to a known doc id, else a
`reference` violation; empty/absent is skipped. Config-not-code — which key holds the reference is
declared in `govkit.yml`, not hardcoded. Dogfooded by `US-0001` (`parent: RFC-0003`), the first live
resolving edge, with a dangling-ref fixture pair in the suite proving it discriminates.

## Deviations from design

- **None material — shipped resolve-only exactly as scoped.** Type-enforcement (`type` is recorded
  but not enforced), `required: true` refs, array-valued refs, and transitive chain-walking all remain
  deferred as the Decision and Alternatives specified — unbuilt by design, not by omission.
