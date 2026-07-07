# govkit

> **Governance you can run, not just read.** A docs-as-code SDLC governance engine for the
> AI-agent era — deterministic, cross-platform, zero-install, **no API key**.

govkit turns your design docs (PRD → RFC → ADR → User Story → Code) into a contract a
machine enforces. Generation is cheap; **trust is the product.** A document being
well-formed — or having been produced by an LLM — does not make it good, so govkit keeps the
deterministic, no-key checks separate from any LLM judgment.

```bash
npx govkit verify     # structural gate — blocks on malformed/incoherent docs
npx govkit eval       # quality floor (blocks) + advisory 0–100 score
npx govkit check      # verify + eval, one non-zero exit for CI
```

One bundled file, zero runtime dependencies — `npx govkit` ships nothing to install.

## Two trust layers

| Layer | Command | Question | Result |
|---|---|---|---|
| **Gate** (quality *control*) | `govkit verify` | Is it well-**formed**? | binary pass/fail — blocks merge |
| **Eval** (quality *signal*) | `govkit eval` | Is it a complete, non-stub doc? | required **floor** blocks + advisory **0–100** score |

`verify` enforces front-matter completeness, the status lifecycle, id↔filename convention,
INDEX sync, globally-unique ids, no unresolved placeholders, chain referential-integrity,
chain-status coherence (a doc may not ship while its `parent`'s design is still undecided),
and status-conditional required sections (an `implemented` doc must carry its as-built /
deviations note). `eval` adds a deterministic **structural floor** (not an empty stub, no
leftover template filler, canonical sections as *distinct* headings) plus an advisory score
to watch quality trend — both no-key.

**An honest boundary:** a presence/shape rubric *cannot* tell a real artifact from a
keyword-salad with the right headings. So `eval` is a **floor**, tuned for zero
false-positive on legitimate docs, accepting that a determined gamer passes it. Judging
whether the prose is *sound* is a keyed reviewer's job, never part of the no-key CI gate.

## Measuring the gate itself (RFC-0012)

- **`--journal`** on `verify` / `eval` / `check`: append one JSONL gate-outcome record per
  run to `.govkit/journal.jsonl` (configurable via `journal.path`; root-confined; a write
  failure warns and never changes the exit code; crashed runs still record `ok: false`).
- **`govkit calibrate --corpus <dir> [--baseline <file> [--update-baseline]]`**: run the
  eval floor against a labeled corpus — `<dir>/good/` must pass, `<dir>/weak/` must fail —
  and exit 1 on any false positive, on recall/F1 regression, or on corpus shrinkage vs the
  committed baseline. A missing baseline file is a hard error (no fail-open); an ungraded
  corpus fixture is a hard error (no green-on-nothing). Author your own corpus; the tarball
  ships none.

## Wiring the gate into an agent loop (RFC-0013 / RFC-0014)

- **`--hook`** on `verify` / `eval` / `check`: maps any gate failure to **exit 2** and routes
  the report to stderr — the blocking-hook convention (Claude Code feeds exit-2 stderr back
  to the model). Fail-closed: an operational error under `--hook` also exits 2; a broken
  guardrail blocks rather than waves through. Example (Stop hook):
  `npx --yes govkit check --hook` — the session cannot end on a red gate.
- **`tiers:`** in `govkit.yml`: downgrade chosen verify kinds to `advisory` (warn, don't
  block): `tiers: { index: advisory }`. Default: every kind blocking — zero behavior change
  until you opt in. Unknown kind or value fails loud at config load. Advisory violations
  still print, reach `--json`, and land in the journal with their tier — visible, just not
  blocking. The eval floor is untouched (it has its own required/advisory split).

## Config, not code

Doc dirs, required keys, the status lifecycle, and the quality rubric are all declared in a
single `govkit.yml` — any repo (any doc layout, any quality bar) adopts govkit by editing
that file, not by forking the engine.

```bash
npx govkit init               # scaffold govkit.yml + the audit-write hook + docs/*/INDEX.md
npx govkit init --adopt       # existing docs: migrate prose metadata → front-matter (dry-run)
```

## The invariant that shapes everything

A non-Claude-Code contributor must be able to run the gates in CI **with no API key**. Both
deterministic layers live only in this CLI:

- **In CI:** `npx govkit check` (→ `verify` then `eval`) — Node only, no key.
- **In Claude Code:** a `PreToolUse` hook runs `npx govkit audit-write` to block a write to a
  governed doc that lacks complete front-matter.

Two advisory, read-only commands never affect an exit code: `govkit report` (lifecycle view —
done / in-flight / cleanup) and `govkit stale` (flags a doc whose `governs:` code has newer
commits than the doc; git-gated).

## Requirements

Node ≥ 20. No other runtime dependency.

## Links

- **Full docs, the swe-flow authoring plugin, and the consumer template:**
  [github.com/baodq97/govkit](https://github.com/baodq97/govkit)
- **Issues:** [github.com/baodq97/govkit/issues](https://github.com/baodq97/govkit/issues)

MIT © baodq97
