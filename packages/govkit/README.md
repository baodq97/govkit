# govkit

> **Governance you can run, not just read.** A docs-as-code SDLC governance engine for the
> AI-agent era — deterministic, cross-platform, zero-install, **no API key**.

Your design docs (PRD → RFC → ADR → User Story → Code) become a contract a program checks:
correct front-matter, a real status lifecycle, references that resolve, an index that stays in
sync, and a doc that cannot claim "shipped" while the design above it is still undecided.

One bundled file, zero runtime dependencies. `npx govkit` installs nothing.

## 60 seconds

```bash
npx govkit init      # govkit.yml + AGENTS.md + a write-time hook + docs/{product,rfc,adr,issues,domain,releases}/
npx govkit verify    # green on the empty scaffold
```

Now write a user story that claims to be done, under an RFC nobody has accepted yet:

```yaml
# docs/issues/US-0001-tap-to-pay.md
---
id: US-0001
title: Tap to pay at the station
status: done          # shipped…
owner: TBD
date: 2026-07-29
priority: P1
parent: RFC-0001      # …under a design still at `draft`
---
```

```console
$ npx govkit verify
govkit verify: FAIL — 2 doc(s) checked, 1 violation, 1 blocking:
  docs/issues/US-0001-tap-to-pay.md [us]
    - 'US-0001' is done but its parent 'RFC-0001' is draft — not a decided/terminal state (one of [accepted, implemented, superseded])

Fixes:
    fix: [coherence] a decided doc points at a parent that is not decided — advance the parent's status, or repoint `parent:` (the decided set is docs.types.<type>.terminalStatuses)
$ echo $?
1
```

That is the whole idea. Every violation names the repair, and CI runs the same binary with no
Claude and no API key.

## What blocks, and what only warns

Knowing which is which is what makes a gate worth keeping.

| | Command | Blocks? |
|---|---|---|
| **Gate** — is it well-*formed*? | `govkit verify` | **yes**, binary |
| **Quality floor** — is it a real doc, not a stub? | `govkit eval` | **yes**, small required floor |
| **Quality score** — 0–100 trend | `govkit eval` | no, advisory |
| **Lifecycle view** — done / in-flight / cleanup | `govkit report` | never |
| **Recency** — the code moved past the doc | `govkit stale` | never |

`verify` checks front-matter completeness, the status lifecycle, the id↔filename convention,
INDEX sync, globally-unique ids, unresolved placeholders, references that resolve, chain-status
coherence (the example above), and status-conditional sections — a doc at `implemented` must
carry its as-built / deviations note.

**An honest boundary:** a presence/shape rubric *cannot* tell a real artifact from a
keyword-salad with the right headings. So `eval` is scoped as a **floor**, tuned for zero
false-positives on legitimate docs and accepting that a determined gamer passes it. Judging
whether prose is *sound* is a keyed reviewer's job, never part of the no-key CI gate. govkit
would rather name that line than pretend it isn't there.

## Config, not code

Doc dirs, required keys, the status lifecycle, and the quality rubric are all declared in one
`govkit.yml`. Any repo — any doc layout, any quality bar — adopts govkit by editing that file,
never by forking the engine.

```bash
npx govkit init --docs-root .govkit   # isolate kit-managed docs under one folder
npx govkit init --adopt               # existing docs: migrate prose metadata → front-matter
npx govkit init --adopt --apply       #   (dry-run first; anything it cannot find stays failing
                                      #    rather than being asserted unverified)
```

## Commands

**Daily**

```bash
npx govkit verify        # the structural gate
npx govkit eval          # quality floor + advisory score
npx govkit check         # both, one non-zero exit — what CI runs
npx govkit report        # lifecycle view (advisory)
npx govkit report --aging   # + time-in-status from git blame; per-type thresholds in config
npx govkit stale         # docs whose `governs:` code has newer commits (advisory, needs git)
```

**Keeping specs honest against code**

```bash
npx govkit drift         # a doc with `governs:` + `reconciled: sha256:<hex>` fails when the
                         # governed CONTENT moves past the recorded claim — hashed over git blob
                         # OIDs, so squash and rebase do not orphan it
npx govkit drift --ack   # re-vouch: rewrites only the claim, as a git-visible act
npx govkit ledger        # gate a committed docs/ledger.json — schema, unique ids, every `spec`
                         # resolving to a real doc, and append-only vs HEAD (removing an entry
                         # is a violation; flipping `passes` either way is legal)
```

Docs without `reconciled:` stay covered by the advisory `stale` only, so drift adoption is
per-doc and starts at zero false-positives. Every `governs:` pathspec is also existence-checked:
one matching no tracked file fails by name, and no `--ack` can clear it.

**Wiring it into an agent loop**

```bash
npx govkit check --hook  # any gate failure → exit 2 + report on stderr, the blocking-hook
                         # convention. Fail-closed: an operational error also exits 2, because
                         # a broken guardrail should block rather than wave things through.
```

`tiers: { index: advisory }` in `govkit.yml` downgrades chosen verify kinds to warnings. Default
is every kind blocking, so nothing changes until you opt in; advisory violations still print,
reach `--json`, and land in the journal with their tier.

**Measuring the gate itself**

```bash
npx govkit verify --journal    # one JSONL outcome record per run (crashed runs included)
npx govkit calibrate --corpus <dir> --baseline <file>
                               # score the gate against YOUR labeled corpus: <dir>/good/ must
                               # pass, <dir>/weak/ must fail. Exits 1 on any false positive, on
                               # recall/F1 regression, or on corpus shrinkage vs the baseline.
```

A missing baseline is a hard error, and so is an ungraded fixture — no fail-open, no
green-on-nothing. Author your own corpus; the tarball ships none.

## The invariant that shapes everything

A contributor who has never opened Claude Code must be able to run the gates in CI **with no
API key**. So both deterministic layers live only in this CLI:

- **In CI:** `npx govkit check` — Node only, no key.
- **In your editor:** a `PreToolUse` hook runs `npx govkit audit-write`, rejecting a write to a
  governed doc that lacks complete front-matter.

## Authoring the docs it grades

The engine grades artifacts; three Claude Code plugins write them — **swe-flow** (the chain),
**ddd-flow** (domain modelling), **design-flow** (UI design and a live co-design view).
`govkit init` offers all three in the settings it scaffolds.

**[The flow: one feature, start to finish](https://github.com/baodq97/govkit/blob/main/docs/the-flow.md)**
walks the whole chain — which skill to invoke at which step, and what lands on disk.

## Requirements

Node ≥ 20. No other runtime dependency.

## Links

- **Full docs, plugins, and the consumer template:**
  [github.com/baodq97/govkit](https://github.com/baodq97/govkit)
- **Why it is built this way:**
  [design-rationale](https://github.com/baodq97/govkit/blob/main/docs/design-rationale.md)
- **Issues:** [github.com/baodq97/govkit/issues](https://github.com/baodq97/govkit/issues)

MIT © baodq97
