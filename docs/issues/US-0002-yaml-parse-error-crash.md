---
id: US-0002
title: verify crashes with a raw stack trace on invalid YAML front-matter
status: open
owner: TBD
date: 2026-06-06
priority: P1
---

As a govkit adopter, I want `govkit verify` to report an invalid-YAML front-matter block as
a normal violation (file, line, hint), so that a single malformed doc fails the gate with an
actionable message instead of crashing the whole run with an unhandled exception.

## What happened (repro from a real consumer init)

`monorepo-template`'s `bootstrap.sh` writes `owner: @baodq97` (unquoted `@` — reserved in
YAML). Running `govkit verify` (0.2.0, vendored tarball) over that doc:

```
YAMLParseError: Plain value cannot start with reserved character @ at line 4, column 8:
owner: @baodq97
       ^
    at Composer.onError (.../govkit/dist/cli.js:5157:30)
    ... full Node stack trace ...
```

Exit code is non-zero (good) but the output is a crash, not a gate result: no file path in
the message, the remaining docs are never checked, and in the `audit-write` hook the stack
trace is what the agent sees.

## Acceptance criteria

- [ ] A doc whose front-matter fails YAML parsing produces one `frontmatter` violation
      naming the file, line/column, and the parser message — the run continues and checks
      the remaining docs.
- [ ] `govkit verify` exits non-zero with the normal violations summary, no stack trace.
- [ ] `audit-write` reports the same violation shape for the offending write.
- [ ] A corpus fixture with `owner: @handle` (unquoted) covers the regression.
