---
id: RFC-0031
title: init scaffolds the agent contract — AGENTS.md reaches the npx path, not just template/
status: draft
owner: TBD
date: 2026-07-29
governs:
  - packages/govkit/src/commands/init.ts
  - packages/govkit/templates/AGENTS.default.md
  - scripts/check-sync.mjs
---

> Raised from the field: a user ran `npx govkit init` and found no `AGENTS.md`. That is the
> shipped behaviour, not a mistake in their run — and it is the wrong behaviour. Drafted at
> `status: draft`; the flip to accepted is the owner's.

## Summary

govkit ships two halves. The **enforcement** half is deterministic — `govkit.yml`, the
PreToolUse hook, the CI gate. The **contract** half is prose an agent reads *before* it writes:
the doc chain, the change-class → gate table, the never-self-flip constraints. That half lives
in `AGENTS.md`.

Only one of the two adoption paths delivers both. Copying `template/` gets the contract
(`template/AGENTS.md`, 65 lines). `npx govkit init` does not — it writes `govkit.yml`,
`.claude/settings.json`, the freshness hook and the INDEX stubs, and stops. It cannot do
otherwise: the published package ships `files: ["dist", "templates"]`, and
`packages/govkit/templates/` holds three defaults, none of them an agent contract.

The asymmetry is backwards relative to how govkit is actually adopted. `npx` is the low-friction
path — the one the READMEs lead with, the one a user reaches for first — so the path that
attracts the most adopters is precisely the one that delivers enforcement without the rules the
enforcement exists to enforce. An agent in such a repo discovers the gate the way it discovers
any unfamiliar failure: by tripping it. It learns that a status flip is forbidden when `verify`
rejects the commit, not from a line it read first. Every constraint that the gate cannot check
at all — *owner names a HUMAN*, *sub-agents propose, the main agent applies*, *halt at a
threshold rather than invent the missing artifact* — simply never arrives.

This RFC makes `init` write `AGENTS.md` from a bundled default that is byte-identical to
`template/AGENTS.md`, pinned by the existing mirror check.

## Decision

Add one scaffold entry, sourced the same way as every other one.

- **`packages/govkit/templates/AGENTS.default.md`** — a verbatim copy of `template/AGENTS.md`,
  which is already consumer-generic prose: it names `govkit.yml` as the source of truth for doc
  dirs, cites `npx govkit verify`, and references the plugins by name. Nothing in it is specific
  to this repo, so it ships unmodified.
- **`init` writes `AGENTS.md`** at the repo root via the existing `bundledDefault()` reader — the
  same runtime-read mechanism as `govkit.yml` and the hook, so there is no second copy of the
  text embedded in JS and no new code path.
- **Idempotence is the safety property, and it already holds.** An existing `AGENTS.md` is
  skipped and reported, never clobbered. This matters more here than for any other entry: any
  repo that has run a coding agent probably already has an `AGENTS.md`, and it is hand-written.
  A test pins the skip explicitly rather than relying on the general loop staying correct.
- **`scripts/check-sync.mjs` gains the mirror pair** `templates/AGENTS.default.md ↔
  template/AGENTS.md`, so the two adoption paths cannot ship different contracts. This is the
  same guard already covering `govkit.default.yml ↔ template/govkit.yml`.

**Why not generate the contract from `govkit.yml` (decided).** The chain, the dirs and the
statuses *are* derivable from config, so a generated `AGENTS.md` would never drift from the
schema. But the load-bearing half of the file is not derivable: the change-class → gate table,
the authority split, and the halt rule are judgment encoded as prose, not projections of a
config. A generator would emit the mechanical part accurately and the part that actually
constrains an agent not at all. A static default, mirrored and pinned, delivers the whole
contract; keeping it in step with a changed schema is a doc edit, which is what it already is.

**Why root `AGENTS.md` and not `.claude/`-scoped (decided).** `AGENTS.md` is the cross-vendor
convention (closest-file-wins, read by agents beyond Claude Code), and the file it describes —
`govkit.yml` — sits at the root too. Burying it under `.claude/` would tie a vendor-neutral
contract to one vendor's directory.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Do nothing — document that `template/` is the full-surface path** | The status quo, and it is already documented that way (`README.md`, `help.ts`). It is still wrong: the documented split hands the most-used path the enforcement without the rules. Being accurate about a bad default does not fix it. Rejected. |
| **Generate `AGENTS.md` from `govkit.yml`** | Cannot drift from the schema, but can only emit the derivable half; the change-class table and the authority split are judgment, not config projections. See Decision. Rejected. |
| **Ship it behind a flag (`init --agents`)** | Preserves byte-identical default output, which is the usual reason to gate an `init` change. But an opt-in contract is one nobody opts into, and the whole finding is that the default is missing it. Rejected — the flag would recreate the gap it was added to close. |
| **Write `AGENTS.md` only when absent, and merge a govkit section into an existing one** | The friendliest behaviour for a repo that already has a contract, and the tempting one. It means parsing and editing someone's hand-written agent instructions — a destructive edit under a scaffold command, with no marker convention to make it idempotent. Deferred: `init` skips, and the skip line tells the user the file was left alone. A marked, splice-able block (as `report --pr-body` does, RFC-0021) is the right shape if this is ever wanted. |
| **Put it under `docs/`** | Agents read the closest `AGENTS.md` from the working directory; a copy under `docs/` is not on that path for code changes. Rejected. |

## Impact / rollout

- **Behaviour change to `init`'s default output** — the first one since RFC-0007. A greenfield
  `init` now creates 10 files rather than 9. Purely additive: no existing file's content changes.
- **Existing repos are unaffected in the way that matters.** Re-running `init` on a repo that
  already has an `AGENTS.md` skips it; re-running on one scaffolded before this change adds the
  contract it was missing, which is the intended migration and needs no command of its own.
- **`--force` remains uniform: it overwrites, `AGENTS.md` included.** Deliberate, and the one
  sharp edge here — `--force` is an explicit, documented "overwrite existing files", and carving
  out a per-file exception would make the flag's contract conditional on which file it names.
  The risk is real (a hand-written contract is a worse thing to lose than a `govkit.yml`) and is
  named rather than special-cased; the non-`--force` skip is the guard that carries the weight.
- **Package size** grows by ~3.7 KB in `templates/`. Immaterial.
- **Touched surfaces:** `init.ts` (one scaffold entry), the new bundled default,
  `check-sync.mjs` (one mirror pair), `help.ts` and both READMEs (init's output is described in
  three places — all three now name the contract).
- **Tests:** (a) `init` creates `AGENTS.md` and the content carries the load-bearing clauses —
  chain, `verify` invocation, never-self-flip — so a truncated or empty default fails rather
  than passing on mere existence; (b) an existing `AGENTS.md` is skipped and its bytes survive.
- **Rollback** is deleting the scaffold entry; no consumer state needs migrating.

## Open questions

- **Should `--force` spare `AGENTS.md`?** Decided uniform for v1 (above), but this is the
  clause most likely to be revisited after a real user loses a hand-written contract to a
  `--force` they ran for an unrelated reason. Revisit on evidence, not in the abstract.
- **Does `--docs-root` need to rewrite the contract's prose?** `AGENTS.md` names
  `docs/product`, `docs/rfc` … as a parenthetical example after stating that the dirs are
  declared in `govkit.yml`. Under `--docs-root .govkit` that example is stale while the sentence
  above it stays true. Left alone in v1: templating prose paths costs a substitution pass over
  the file, and the config it defers to is the authority. Recorded so a reader does not mistake
  it for an oversight.
- **Does the contract belong in `adopt` mode too?** `init --adopt` migrates metadata and writes
  no scaffold at all today. An adopting repo arguably needs the contract most — but `--adopt`'s
  guarantee is that it touches only front-matter it was asked to. Out of scope; if wanted, it
  is a separate decision about what `--adopt` is allowed to create.
