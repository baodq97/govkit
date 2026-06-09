---
id: US-0003
title: CLI prints a raw stack trace when govkit.yml is missing (and on other operational errors)
status: done
owner: baodq97
date: 2026-06-09
priority: P2
---

As a govkit adopter, I want a missing or unreadable `govkit.yml` (and any other expected
operational error) to print a single actionable line and exit non-zero, so that running a
command in the wrong directory reads as a normal error — not an unhandled exception with a
Node stack trace.

## What happened (repro from the 0.3.0 publish verification)

Running the published `govkit@0.3.0` in a directory with no `govkit.yml`:

```
file:///.../dist/cli.js:7380
    throw new Error(
          ^

Error: govkit: no govkit.yml at /tmp/x/govkit.yml — run `govkit init` first (ENOENT: no such file or directory, open '/tmp/x/govkit.yml')
    at loadConfig (.../dist/cli.js:7380:11)
    at runVerify (.../dist/cli.js:8197:33)
    at main (.../dist/cli.js:8590:22)
    ... full Node stack trace ...
Node.js v24.16.0
```

The exit code is non-zero (good) and the **message itself is already actionable** ("run
`govkit init` first"). The defect is purely presentation: `loadConfig` throws and nothing at
the CLI top level catches it, so Node dumps the throw site + stack trace. This is the same
class as US-0002 (an actionable condition surfaced as a crash) but on the config-load path,
and it generalizes — any thrown operational error (unreadable config, bad YAML in
`govkit.yml`, an unknown subcommand) has the same ugly shape.

## Acceptance criteria

- [x] Running any command (`verify`, `eval`, `check`, …) with no `govkit.yml` prints one
      line — `govkit: no govkit.yml at <path> — run \`govkit init\` first` — to stderr and
      exits non-zero, with **no stack trace**.
- [x] The CLI entry point wraps command dispatch in a single top-level handler that catches a
      thrown error, prints `govkit: <message>` to stderr, and exits 1 — so every known
      operational failure (missing/unreadable config, malformed `govkit.yml`) reads the same.
- [x] A genuinely unexpected error still surfaces its stack (gated behind the `GOVKIT_DEBUG`
      escape hatch) so real bugs are not silently swallowed.
- [x] A test covers the missing-config path: the handler produces the clean message and a
      non-zero exit, not an unhandled throw.

## Notes

Scope is the CLI presentation layer (the `main`/entry wrapper), not `loadConfig`'s logic —
the thrown message is already correct; it just needs a top-level catch. Keep the no-API-key,
deterministic contract unchanged.

## Resolution

Fixed in commit `f7cdb9f`, shipped in `govkit@0.3.1`. The entry point now wraps `main()` in a
`.catch` that prints one `govkit: <message>` line to stderr and exits 1; the full stack is
gated behind `GOVKIT_DEBUG`. Integration test in `test/cli.test.ts` asserts the missing-config
path emits no `at …` frames.
