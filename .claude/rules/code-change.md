---
paths:
  - "packages/**"
  - "plugins/**"
  - "scripts/**"
---

# Code-change rules

> Loaded only when a session touches `packages/**`, `plugins/**`, or `scripts/**` (Claude Code
> lazy-loads a `.claude/rules/*.md` on a `paths:` glob match). The always-on global contract — the
> authority split and the change-class / Lifecycle-gates table — stays in the root `AGENTS.md`.

## Coding rules

- Match neighbouring style. Mimic before invent.
- **No new dependency** without an RFC or a PR note (state why; prefer Node built-ins).
- Comments explain **why**, not what.
- **No silent catch.** Log with context, rethrow wrapped, or suppress explicitly with a one-line
  reason. Cross-platform care: handle CRLF — Windows checkouts are first-class.
- Generated/bundled files (`dist/**`) — edit source, then `build`.
- **Never pipe a gate through `head`/`tail`/`grep` inside a `&&` chain** — the pipe swallows the
  failing exit code and turns a blocking gate into a no-op. Capture to a file or check
  `${PIPESTATUS[0]}`/`$?` explicitly before chaining (LEARNING-LOOP Round 12; it bit us live).
- **Never pipe `git push` output either** — a swallowed non-zero exit turned a failed push into
  an empty-diff PR that merged clean (Distill Round 1: PR #6/#7). When the push outcome matters,
  confirm the remote ref actually moved (`git ls-remote origin <ref>`).
- **`git fetch` before any `checkout -B <branch> origin/<ref>`** — a stale remote-tracking ref
  silently rebases new work onto history main has already left behind (Distill Round 1).
- **Cross-cutting rename/vocab change:** before the first edit, produce an exhaustive
  symbol/call-site inventory (grep/codegraph) and state the count. The rename lands as ONE
  coherent change set — intermediate states are expected not to compile — and verifies with the
  FULL test suite, never scoped.
- **Run evidence is exhibit, not source:** machine-generated run artifacts (eval corpora and run
  outputs under `docs/research/**`, shipped example outputs like the root `examples/`) are
  frozen evidence — exclude them from source-code gates (formatter/linter config) when the
  directory is born, and never reformat committed evidence to make a gate green (Round 22).
- **Reconcile-as-you-go:** editing a file under any governed doc's `governs:` updates that
  doc's as-built/reconciled in the same change, or hands the ack to the owner explicitly —
  drift found at close-time is an accumulation failure (Round 17).
- **Gate the INDEX, not the working tree:** `drift` compares staged/committed blob OIDs, so a
  full gate over UNSTAGED edits certifies the previous state and goes red only after you land —
  green-before-commit proved nothing twice in one session (Round 23: drifted 4 at 04:23,
  drifted 1 at 04:42, each minutes after a green check). Stage first —
  `git add -A && bun run check && git commit` — or re-run the gate immediately after landing.

## The minimalism ladder (before writing ANY code)

Walk it top-down for every piece of code you are about to write; stop at the first rung
that answers. The best code is the code never written — but never minimize away trust
boundaries, data-loss handling, security, or accessibility.

1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works

Same spirit everywhere (KISS): the boring, obvious solution wins by default — cleverness,
abstraction, and configurability must each earn their place with a concrete, present need
(YAGNI), and anything that already exists once is reused, never re-implemented (DRY).
