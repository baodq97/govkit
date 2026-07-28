# ddd-flow per-skill evals

Moved out of `plugins/ddd-flow/skills/*/evals/` — the plugin package (git-subdir at
`plugins/ddd-flow`) shipped 37 KB of eval JSON referencing fixtures that live HERE, outside
the package, so a consumer could never run them. Fixture paths inside each `evals.json` are
relative to `docs/research/ddd-skill-evals/` (e.g. `fixtures/nordic-freight/...`).
