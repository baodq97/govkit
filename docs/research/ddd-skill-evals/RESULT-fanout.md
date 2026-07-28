# Fan-out: one agent per bounded context, with a shared header

**Speed passed. Quality failed, on two independent measures. Not shipped.**

Bar registered before the run: wall-clock ≤ 361s (50% of baseline), tokens ≤ 418,000 (4×),
quality ≥ 6/6. Baseline is the single-agent i3 run: 104,624 tokens, 722s, 6/6.

Design under test: `ddd_slice.py --header` (cross-cutting facts, ~2.4k chars, read once per agent)
plus `--context <Name>` (~0.9k chars, that boundary only), then seven agents in parallel over one
repo, each writing exactly one `docs/domain/<ctx>/README.md`.

## Speed — passed

| context | tokens | seconds | tool calls |
|---|---|---|---|
| Customs | 64,821 | 349 | 34 |
| Routing | 54,764 | 276 | 24 |
| Quoting | 53,683 | 258 | 21 |
| Consolidation | 49,688 | 209 | 17 |
| Invoicing | 47,589 | 197 | 16 |
| Booking | 46,754 | 176 | 15 |
| Notifications | 41,209 | 112 | 11 |
| **total / slowest** | **358,508** | **349** | 138 |

| | baseline | fan-out | bar | |
|---|---|---|---|---|
| wall-clock | 722s | **349s** | ≤361s | **PASS** — 2.1× faster |
| tokens | 104,624 | **358,508** | ≤418,000 | **PASS** — 3.4× |

The cost model predicted 372k and 232s; tokens landed 4% under, wall-clock 50% over, because the
slowest agent (Customs, 34 calls) ran well past the mean.

## Quality — failed twice

**1. Right-sizing regressed, and this is the serious one.** Right-sizing is doctrine: *"Nine
identical canvases signal ceremony; two deep ones and five stubs signal judgement."* Five of seven
contexts came out bigger than the single agent made them, and total canvas prose went from 564 lines
to 955 — **69% more writing for the same model**.

| context | type | single agent | fan-out |
|---|---|---|---|
| Invoicing | core | **35** (stub) | **180** (full) |
| Booking | core | 90 | 178 |
| Quoting | core | 89 | 180 |
| Customs | core | 90 | 179 |
| Routing | supporting | 53 | 89 |
| Consolidation | supporting | 172 | 114 |
| Notifications | generic | 35 | 35 |

Invoicing shows the mechanism. Both runs saw the same contradiction — `model.yaml` says `core`,
`business-model.md` says commodity, compliance-enforcer, differentiates **no**. The single agent,
holding all seven contexts at once, saw that four labels said `core` while only one capability
differentiated, concluded the labels were unreliable, and stubbed it. Each fan-out agent saw one
context and deferred to the label in front of it.

That is not a bug in the header — the header carries `differentiates` — it is a **missing rule about
which column decides the tier**. Right-sizing is a judgement across the set, and a set of agents
each holding one element cannot make it.

**2. The deterministic grader scored 5/6** against a 6/6 bar, on the fabrication check:
`DeclarationRejected` and `DeclarationAmended` appear with no relative in the fixture's vocabulary.

Both occurrences read *"declared events are a one-way path, with no `DeclarationRejected` or
`DeclarationAmended`"* — a named absence, not an invention, and arguably a false positive of the
same class as the four this run already forced me to fix. It is recorded as a failure anyway.
Widening the absence pattern a second time, at the exact moment it decides a pre-registered bar,
would make the pre-registration worthless. The bar said 6/6.

## What is true regardless

The **speed result is real and large**: 2.1× on wall-clock at 3.4× tokens, with each agent's window
staying small. And every agent produced a genuine finding its slice supported — the Customs agent
caught that the confirmed timeline runs the carrier hand-off before the declaration, violating a
stated rule; the Consolidation agent caught that the only differentiating capability is typed
`supporting`.

So the mechanism works and the coordination does not. The gap is one specific decision — tier
selection — that needs to be made **once, centrally, before the fan-out**, not seven times inside
it. That is a concrete next experiment, not a reason to abandon the shape:

> compute the tier per context deterministically from the header (differentiation beats label, and
> say so), pass each agent its assigned tier, and re-run. If total prose returns to ~564 lines at
> the same wall-clock, the coordination cost is paid.

Until that is measured, fan-out is not shipped. `ddd_slice.py` stays in the tree as the input to
that experiment; no step skill calls it.

---

# Round 2 — the tier decided once, centrally

The previous round's diagnosis was that right-sizing is a judgement across the set and seven agents
holding one context each cannot make it. `ddd_slice.py --header` now computes the tier and hands it
down, and each agent is told to use it as given and to raise disagreement as an open question rather
than by acting on it.

## The rule, and why it is not hand-tuned

When more contexts claim `core` than there are capabilities the business model says differentiate,
the labels are not carrying evidence, so the business model decides instead:

    differentiates: yes           -> full
    generic, or commodity stage   -> stub
    everything else               -> light

The second line matters and was wrong on the first attempt. Mapping `differentiates: no` to a stub
is not what the right-size table says — a stub is for something **bought**, and a compliance context
can carry a real invariant while differentiating on nothing. Evolution stage is the axis that says
"bought", so it decides that one.

Validation: against the single agent's independent judgement on the same fixture, the rule agrees on
**6 of 7 contexts** (only Routing differs — 90 against 53).

## Result

| | baseline | i4 self-selected | i5 tiered | bar | |
|---|---|---|---|---|---|
| prose lines | 564 | 955 (+69%) | **594** | ≤650 | **PASS** |
| quality | 6/6 | 5/6 | **6/6** | ≥6/6 | **PASS** |
| tokens | 104,624 | 358,508 | **330,090** | ≤418,000 | **PASS** |
| wall-clock | 722s | 349s | **514s** | ≤361s | **FAIL** |

Tier compliance was total: 174/180, 90/90, 90/90, 89/90, 82/90, 35/35, 34/35. Nobody upgraded
themselves.

**The hypothesis under test passed.** The 69% prose regression is gone — 594 lines against the
single agent's 564, a 5% difference — and quality came back to 6/6 with it.

**The wall-clock bar failed, and the honest reading is variance, not mechanism.** The same seven-unit
workload produced a slowest agent of 349s last round and 514s this one; three agents beat 349s here
and three did not. Fan-out wall-clock is the max of N samples, so it is the noisiest number in the
set, and one run each is not enough to claim 2×. What can be said from two runs: 1.4× and 2.1×
faster than baseline, both times.

## What a stub bought

Invoicing was cut from 180 self-selected lines to a 34-line stub, and the stub found more. Its own
question — *what is this bought from* — has no answer anywhere on disk, while `model.yaml` shows the
model's largest mass built in-house over eleven years. So `commodity` describes the target state, not
the current one, and the only real buy target is blocked by an invariant reaching into Customs. A
180-line canvas had not said that.

That is right-sizing working as advertised: a stub is a complete answer, not a truncated one.

## Standing

Three of four bars pass and the failing one is the high-variance measure. Not enough to ship on, and
enough to keep: the next thing to measure is wall-clock across repeats, not another design change.
`ddd_slice.py` stays in-tree, still called by no step skill.
