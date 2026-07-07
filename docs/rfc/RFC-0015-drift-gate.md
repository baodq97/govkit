---
id: RFC-0015
title: Deterministic spec↔code drift gate — reconciled shas and an explicit ack ritual (govkit drift)
status: implemented
owner: baodq97
date: 2026-07-07
reconciled: c6840a4b44b3992cb24bb2a2d780da1dcd9dfe9a
governs:
  - packages/govkit/src/commands/drift.ts
---

> Promotes doc–code drift from the RFC-0009 advisory PROXY to a deterministic GATE: a doc that
> opts in with a `reconciled: <sha>` front-matter claim fails `govkit drift` when its governed
> code has moved past that sha, and the only ways out are the two honest ones — update the doc,
> or explicitly `--ack` that the change didn't invalidate it. Zero false positives by
> construction: only opted-in docs participate, and the gate never self-acks. The owner
> delegated approval in-session and implementation ships in the same PR, so this RFC lands
> directly at `status: implemented`, the RFC-0013 precedent.

## Summary

`govkit stale` (RFC-0009) is honest about being a proxy — it answers "the governed code moved",
never "the doc is wrong" — and for exactly that reason it can never block. That leaves a real
gap: nothing in the system can *enforce* that a spec and its code were ever reconciled. The
2026-07 research sweep confirmed the gap is industry-wide — no surveyed SDD tool (Spec Kit,
Kiro, Tessl) does deterministic, CI-verifiable spec↔code drift detection; Fowler's review of
the category concedes there is "no 100% guarantee they will be respected". F2 was the sweep's
top differentiation candidate, and this RFC is its implementation.

The move that makes a gate honest where a proxy could not be: stop asking git *when* things
changed and start recording *what code state the doc author actually vouched for*. A governed
doc opts in by carrying BOTH its existing `governs:` key and a new optional front-matter key,
`reconciled: <git sha>` — the author's recorded claim "this doc is true as of this code
state". `govkit drift` computes, per opted-in doc, the most recent commit touching any of its
governs paths (`git log -1` over the pathspecs); a mismatch is a drift violation, exit 1. The
message names the doc, the stale sha, the current sha, and both honest exits. Reconciliation
is a deliberate act — `govkit drift --ack [docPath]` rewrites `reconciled:` to the current sha
for one doc (or all opted-in docs without an argument), and that rewrite lands in the git diff
for review. The gate never acks itself.

## Motivation

RFC-0009 drew the line correctly for its mechanism: git-recency cannot distinguish a rename
from a rewrite, so blocking on it would train people to make empty doc edits — the exact lie
RFC-0008 rejected. But the *category* of doc–code drift does not have to stay advisory
forever; it only has to stay advisory as long as the check is a proxy. A recorded `reconciled`
sha is not a proxy. It is a claim the author made on purpose, and checking a claim against
reality is precisely what gates are for. The research sweep found no tool that closes this
loop deterministically — every SDD toolchain trusts the model to keep spec and code aligned,
which is the instruction-not-guardrail posture this repo keeps declining. This RFC gives the
category its gate: the ritual (ack) supplies the semantic judgment the machine cannot make,
and the machine enforces that the ritual happened.

## Design

**The opt-in.** A doc participates when its front-matter carries both `governs:` (existing,
RFC-0009) and `reconciled: <git sha>` (new, optional). Docs without `reconciled:` are
untouched — `stale` keeps covering them advisorily, and `drift` never mentions them. Adoption
is per-doc, so the gate is zero-false-positive by construction: nothing fails that did not
explicitly claim a code state.

**The check.** For each opted-in doc, `govkit drift` resolves the most recent commit sha
touching ANY of its governs paths (`git log -1` over the pathspecs) and compares it to the
recorded `reconciled` sha. Mismatch ⇒ violation, exit 1, with a message naming the doc, the
stale sha, the current sha, and the two honest exits: update the doc and then ack, or ack
directly if the code change did not invalidate the doc. Two precision rules keep the
comparison honest: the doc's OWN path is always excluded from its governed pathspecs (a doc
can never drift itself — otherwise a self-matching glob re-drifts on every ack commit and the
ritual never converges), and the recorded claim is read as the raw front-matter token, never
through YAML's type coercion (an unquoted all-digit sha must not lose its leading zero). A
malformed claim is itself a violation, never a crash or a skip: an empty/garbage `reconciled`
value, or governs paths with no commit history at all, fail loud naming the doc.

**The ack.** `govkit drift --ack [docPath]` rewrites `reconciled:` to the current sha for one
doc, or for all opted-in docs when no argument is given. The rewrite is a working-tree edit
that lands in the diff a reviewer reads — the vouching is visible, attributable, and
reversible. The gate itself never updates the key. The rewrite is surgical down to the token:
only the sha value changes (a same-line `# comment` after it survives), and a `reconciled:`
line carrying no same-line value (the value on a YAML continuation line) is refused with a
rewrite-by-hand error rather than corrupted.

**Where it lives.** `drift` is a sibling git-gated command like `stale`, NOT a verify kind.
The verify core stays pure-fs; the no-git floor invariant (README, RFC-0009) outranks tiers
integration, so a future RFC-0014 tiers hookup is deferred as an open question rather than
smuggled in. `drift` joins `--journal` (RFC-0012) and `--hook` (RFC-0013) with full gate
semantics: drift found ⇒ would-be exit 1 ⇒ exit 2 under `--hook`.

## Alternatives

| Option | Why rejected |
|---|---|
| **Content-hash the governed files into the doc** | Hash churn on every whitespace or comment commit makes it a false-positive factory — the avalanche RFC-0009 refused, rebuilt with hashes instead of timestamps. A sha names a state; the ack ritual supplies the judgment. |
| **Make drift a verify kind** | Breaks verify's no-git purity — the defining invariant that the default gate runs pure-fs with no key. `--changed` and `stale` set the precedent: git-touching paths are opt-in siblings, never folded into the floor. |
| **Auto-ack when the doc is edited** | Destroys the ritual: any edit near the sha line would silently vouch for code the author never read. The ack must be a distinct, deliberate act that a reviewer can see and question. |
| **Keep drift advisory-only inside `stale`** | The research gap is precisely the absence of a GATE. An advisory that no one is forced to reconcile is what every surveyed SDD tool already fails to enforce; shipping a second advisory would not close F2. |

## Impact / rollout

- **Purely additive and dark until opted in:** no doc carries `reconciled:` at ship time
  unless its author adds it; `verify`/`eval`/`check`/`stale` are byte-for-byte unchanged, and
  the no-key CI gate never runs `drift`.
- **Reuses the `stale` git plumbing discipline:** `execFileSync('git', …)` with errors
  surfaced; no git or no commits degrades to an explanatory note, mirroring RFC-0009's
  skip-honesty (a missing git is not a failure, but it is never silently green).
- **Adoption path:** start with the docs whose wrongness is most expensive (implemented RFCs
  with `As-built` claims); `--ack` without an argument makes bulk onboarding one reviewed
  commit.
- **Rollback** is removing the `reconciled:` keys or not running `drift`; nothing else reads
  the key.

## Open questions

- **Tiers for drift.** Whether drift violations should participate in RFC-0014's
  advisory/blocking tiers is deferred — it depends on the unresolved question of git-touching
  checks ever joining the verify surface, and the no-git floor wins until that is settled.
- **`--changed` scoping for monorepos.** A large repo may want drift checked only for docs
  whose governs paths intersect the changed set; deferred until a consumer needs it.
- **Should `--ack` require a non-terminal doc status?** Acking a `superseded` doc is arguably
  meaningless; deferred pending evidence it happens in practice.

## Roadmap fit

Implements the F2 research candidate — the top-differentiation gap of the 2026-07 sweep — and
extends the R4/R5 positioning: govkit as the deterministic enforcement layer beneath SDD
toolchains that themselves offer no guarantee their specs are respected.

## As-built

Shipped as `commands/drift.ts` (`govkit drift`, `--ack`), as recorded in the same PR; review-
hardening lands before merge, keeping accepted design == shipped code. The command is
git-gated outside the no-key floor by construction — `check` never calls it — and the `--hook`
exit-2 mapping and `--journal` recording ride the existing cli-edge plumbing from RFC-0012/13
unchanged.

## Deviations from design

Review hardening (sprint-3 fixer pass) changed the shipped behavior beyond the original text;
the load-bearing ones are folded into § Design above and recorded here as post-review deltas:

- **Two extra violation classes** beyond the sha mismatch: an empty or non-sha `reconciled`
  value is a violation naming the doc (a claim that cannot be checked is a broken claim), and
  governs paths with no commit history fail loud as unverifiable — such docs are also
  *unackable* (an ack cannot vouch for a code state that does not exist), so an ack run
  reporting them exits non-zero.
- **Self-path exclusion:** the doc's own path is appended as an `:(exclude)` pathspec when
  resolving its governed sha — added after review found the livelock where a doc whose governs
  glob matches itself (e.g. `docs/**`) re-drifts on every ack commit forever.
- **Comment-preserving, bare-key-refusing ack:** the rewrite replaces only the value token, so
  a same-line `# comment` survives; a `reconciled:` line with no same-line value token
  (continuation-line YAML) is refused with the rewrite-by-hand operational error instead of
  being half-rewritten into a corrupt two-line scalar.
- **Raw-token reading:** the claim is judged from the front-matter block's raw text (the same
  line-location machinery the ack rewrite uses, on the block span exported by
  `frontmatter.ts`), not the YAML-parsed value — YAML coerces an unquoted all-digit sha like
  `0123456` to a number and drops the leading zero, producing a false violation quoting a
  value not on disk.
- **`--ack` is rejected in combination with `--hook`** (exit 2): an ack rewrites docs, and a
  blocking hook must never mutate — hooks gate, they don't ack. With `--journal`, an ack run's
  record carries `drift.ack: true` so a sensor consumer can tell it from a check run
  (`drifted > 0` with `ok: true` is legal only there).

## Recommendation

Ship `govkit drift` as the deterministic spec↔code gate: per-doc opt-in via `reconciled:`,
sha-comparison against the governs pathspecs, exit 1 on mismatch, and a never-automatic
`--ack` ritual whose rewrite is reviewed in the diff. Prefer this over content-hashing (false-
positive factory), over a verify kind (breaks the no-git floor), over auto-ack (silent
vouching), and over staying advisory (the gap F2 names) — each rejected above.
