# Issue Index

| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
| [US-0001](./US-0001-chain-referential-integrity.md) | Resolve cross-artifact references in the verify gate | done | baodq97 | 2026-05-31 |
| [US-0002](./US-0002-yaml-parse-error-crash.md) | verify crashes with a raw stack trace on invalid YAML front-matter | done | baodq97 | 2026-06-06 |
| [US-0003](./US-0003-missing-config-raw-stack-trace.md) | CLI prints a raw stack trace when govkit.yml is missing (and on other operational errors) | done | baodq97 | 2026-06-09 |
| [US-0004](./US-0004-marketplace-entry-drift.md) | swe-flow marketplace entry drifted from plugin.json — version and description stale | done | baodq97 | 2026-07-08 |
| [US-0005](./US-0005-hash-anchored-citation-mode.md) | Evaluate an opt-in hash-anchored strict mode for citations (VeriContext prior art) | open | baodq97 | 2026-07-29 |
| [US-0006](./US-0006-skill-lint-trigger-shape-rule.md) | skill-lint rule — a non-orchestrator skill must be trigger-shaped or declare disable-model-invocation | done | baodq97 | 2026-07-31 |
| [US-0007](./US-0007-ddd-flow-step-skills-orchestrator-only.md) | Mark the 9 ddd-flow step skills orchestrator-only (disable-model-invocation + paths) | done | baodq97 | 2026-07-31 |
| [US-0008](./US-0008-plugin-scoped-stop-gate-hook.md) | Plugin-scoped Stop hook so a plugin-only consumer gets the gate (with a LIVE cross-source dedup probe first) | done | baodq97 | 2026-07-31 |
| [US-0009](./US-0009-agents-rules-path-split.md) | Split AGENTS.md's per-path rules into path-scoped .claude/rules/*.md for lazy governance load | done | baodq97 | 2026-07-31 |
| [US-0010](./US-0010-freeze-status-edit-block.md) | F-freeze — a skill-scoped PreToolUse hook that blocks agent status edits (status front-matter + INDEX status columns) | done | baodq97 | 2026-07-31 |
| [US-0011](./US-0011-askuserquestion-owner-decisions.md) | Structure owner decisions as AskUserQuestion — artifact-type pick and gate-close ratification prompt | done | baodq97 | 2026-07-31 |
| [US-0012](./US-0012-agent-skills-preload.md) | Preload the canonical skill into genuinely-mirrored role agents via the skills:/tools frontmatter (kill embed drift) | done | baodq97 | 2026-07-31 |
| [US-0013](./US-0013-workflows-as-slash-commands.md) | Expose the .claude/workflows/*.js orchestrations as / slash-commands via thin wrappers that degrade to the by-hand order | done | baodq97 | 2026-07-31 |
| [US-0014](./US-0014-gate-skill-livestate-and-gotchas.md) | F7 + F6 — inject live gate-verify state into the gate-close skill, and add LEARNING-LOOP-seeded Gotchas sections to the gate + spec-author skills | done | baodq97 | 2026-07-31 |
