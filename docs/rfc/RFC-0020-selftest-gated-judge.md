---
id: RFC-0020
title: Selftest-gated substance judge — the judge must prove itself before it judges
status: accepted
owner: baodq97
date: 2026-07-08
---

> Amends RFC-0019 (substance-judge) and extends RFC-0012's immune-system posture to the keyed
> layer: before the `swe-flow:judge` issues any verdict, the skill must prove the judging
> environment is trustworthy — the deterministic `govkit calibrate` must be green AND the judge
> must rank a known-good fixture strictly above a known-weak one — or it REFUSES to judge and
> records the refusal. Every verdict pins model id, temperature 0, and a content hash of the
> scoring anchors, so any score is reproducible and auditable after the fact. Skill-side only;
> the engine is untouched. Drafted at `status: draft`; the accept is the owner's.

## Summary

RFC-0012 gave the deterministic floor an immune system: `govkit calibrate` scores the gate
itself against a labeled corpus, and a gate whose accuracy is asserted rather than measured is
refused. RFC-0019 shipped the keyed substance judge — and left its own trust as an open
question ("Calibration corpus for the judge itself… deferred"). Today the judge's verdicts are
exactly the self-attestation this repo keeps rejecting: an LLM scores docs on a 0–100 scale and
nothing ever checks whether that LLM, on this day, with this rubric copy, can even tell good
from bad. This RFC closes the gap with a **selftest precondition** in the `substance-judge`
skill, run once per invocation before any real doc is scored:

1. **Deterministic half (no key).** Run the existing `govkit calibrate` against the labeled
   `good/`/`weak/` corpus with its committed baseline. A nonzero exit means the deterministic
   sensor underneath the judge is broken or regressed — refuse.
2. **Keyed ranking probe.** Dispatch the judge on one pinned known-good fixture and one pinned
   known-weak (floor-passing keyword-salad) fixture, same rubric, same model as the real run.
   The good fixture's score must be **strictly above** the weak one's — or refuse.

On any failure the skill issues **no verdicts**: it stops with an explicit
`judge not trustworthy` message and appends a refusal record to the same `.govkit/evals/`
file, so the record stream stays honest exactly when the judge fails hardest — the RFC-0012
"the sensor must stay honest" posture, applied to Layer 3.

Additionally, every verdict (and refusal) record must pin its full provenance: the exact
**model id** (never an alias), **temperature 0**, and an **`anchorsHash`** — a sha256 content
hash of the scoring-anchors file actually read — so a score can be re-derived and audited
after the fact, and an anchors edit that forgot to bump `rubricVersion` is caught by hash
mismatch instead of trusted by declaration.

**Prior art:** ponytail's benchmark harness (`benchmarks/agentic/judge.py --selftest`) gates
its over-engineering LLM judge the same way — a published rubric, a fixed judge model at
temperature 0, and a selftest that must rank a deliberately over-engineered reference strictly
above a minimal one, printing `NOT TRUSTWORTHY` and refusing to judge real submissions
otherwise. This RFC generalizes that pattern onto govkit's governed-doc judge.

## Design

**Selftest as a skill step, not an engine feature.** The `substance-judge` SKILL.md gains one
step between "gate on the floor" and "fan out the judge":

- Run `npx govkit calibrate --corpus <corpus> --baseline <baseline>` (the consumer's corpus
  where one exists; this repo's `packages/govkit/eval/fixtures` + committed baseline when
  dogfooding). This half needs no key and reuses the shipped command — the skill calls govkit,
  never reimplements it (the AGENTS.md one-directional rule).
- Dispatch the ranking probe: two `swe-flow:judge` runs on the pinned fixture pair, on the
  same model the real run will use. Require `score(good) > score(weak)` strictly. In
  cross-model mode, **each** model of the panel must pass its own probe — a (rubric, model)
  pair is the unit of comparability (RFC-0019), so it is also the unit of trust.
- Any failure ⇒ print `judge not trustworthy: <which half failed and why>`, append one refusal
  record (`"score": null`, `"success": false`, `reason` starting `"refused: judge not
  trustworthy — …"`) per planned doc-run to the `.govkit/evals/` JSONL, and stop. No partial
  verdicts.

**The fixture pair is a skill asset.** The calibrate corpus's `weak/` tree floor-fails by
construction — the judge refuses unfloored docs by contract, so those fixtures prove nothing
about substance ranking. The probe therefore needs a pair the floor cannot separate: a sound
reference doc and a floor-passing keyword-salad doc (the exact gaming shape RFC-0001's
red-team produced). The pair ships pinned under
`plugins/swe-flow/skills/substance-judge/references/selftest-fixtures/`, labeled and
append-only like the calibrate corpus.

**Provenance pinning in the record.** The judge agent's output contract
(`plugins/swe-flow/agents/judge.md`) gains two required fields next to the existing
`rubricVersion`/`model`: `temperature` (fixed at `0` — the agent contract states it and the
record proves it was claimed) and `anchorsHash` (`sha256:<hex>` of the anchors file content,
LF-normalized, computed by the orchestrating skill with a stock `node -e`/`shasum` one-liner
and passed to each judge dispatch so all verdicts in one run pin the same bytes). Two records
agree on the scale only if `rubricVersion`, `anchorsHash`, `model`, and `temperature` all
match; `anchorsHash` is what makes `rubricVersion` verifiable instead of merely asserted.

**Invariant check.** `calibrate` stays pure no-key Node exactly as RFC-0012 shipped it — the
skill invokes it, nothing in it learns the judge exists. The judge and its selftest stay
keyed, opt-in, and out of every CI workflow, hook, and exit-code contract; the selftest adds
zero engine surface (no new command, no new flag, no new config key). The refusal path makes
the keyed layer *more* honest without making it any more required.

## Alternatives

| Option | Why rejected |
|---|---|
| **Trust-the-judge status quo** | Asserted-not-measured accuracy — the precise self-attestation RFC-0012 built calibrate to refuse for the floor. A judge that never proves it can rank good above weak emits numbers, not measurements. |
| **Engine-side `govkit judge-selftest` command** | Puts keyed logic one `import` from the no-key binary — the same coupling RFC-0019 rejected for a `govkit judge` CLI. The engine gains nothing it can run without a key; the invariant outranks the convenience. |
| **Fold the ranking probe into `calibrate` itself** | `calibrate` is no-key by contract (RFC-0012's invariant check); a keyed probe inside it breaks the one property that lets it run in CI. Preferred: the skill composes the two halves instead of merging them. |
| **Selftest per verdict rather than per invocation** | N× probe cost for docs judged seconds apart under the same (rubric, model, anchorsHash) tuple; run-level is the honest granularity of "this judging environment works right now". |
| **Skip the deterministic half, probe only** | The calibrate half is free (no key, milliseconds) and catches a different failure — a regressed floor or broken corpus underneath the judge — that the ranking probe cannot see. Rather than choose, run both; only the probe spends tokens. |

## Impact / rollout

- Plugin-only surface: `substance-judge` SKILL.md + `judge.md` agent contract + the pinned
  selftest fixture pair; swe-flow 0.6.0 → 0.7.0. The govkit engine is byte-for-byte untouched.
- Record schema change is additive (`temperature`, `anchorsHash`, the refusal-record shape);
  pre-existing verdict lines stay parseable, and consumers of the deepeval shape ignore the
  extra provenance keys.
- `rubricVersion` stays `substance-v1` — the anchors content does not change; only its hash is
  now carried as proof.
- Rollback is reverting the two skill/agent files and deleting the fixture pair; no engine
  state, no config keys, no migration.

## Open questions

- **Strict `>` or a margin?** Ponytail requires strictly-above; a margin (e.g. ≥ 10 points)
  would also catch a judge that barely separates the pair. Start strict; revisit once refusal
  and spread data accumulate in `.govkit/evals/`.
- **Pair count.** One good/weak pair ships first (cost-honest, ponytail's shape is two pairs);
  whether a pair per doc type earns its probe cost needs real refusal data.
- **Should refusals also feed `--journal`?** That would touch the engine's record union
  (RFC-0012 governs `journal.ts`) — deferred; the `.govkit/evals/` refusal record already
  keeps the keyed sensor honest without engine surface.
- **Selftest result validity window.** Per-invocation now; caching a green selftest across a
  session trades cost against staleness and needs evidence the cost matters first.

## Recommendation

Gate the keyed judge on proving itself: calibrate green plus a strict good-above-weak ranking
probe before any verdict, refusal (recorded, explicit) instead of untrustworthy scores, and
full provenance — model id, temperature 0, anchors content hash — pinned in every record.
Prefer this skill-side composition over the trust-the-judge status quo (self-attestation),
over an engine-side selftest command (keyed logic in the no-key binary), over folding the
probe into calibrate (breaks its no-key contract), and over per-verdict probing (cost without
added trust) — each rejected above.
