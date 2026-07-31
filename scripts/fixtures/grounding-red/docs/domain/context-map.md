# Context map (fixture — the btm shape)

A decompose artifact drawn over a discovery timeline nobody confirmed: `discovery/model.json` holds
4 candidate elements, **0 confirmed events, 0 confirmed rules**. This is the exact state that passed
`govkit verify`/`eval` on btm-systems while its author stalled two days and rolled back — a context
map cut from candidates a mining run proposed.

The grounding-readiness check (`ddd_check.py` check 16, `grounding-under-ratified`) exists so this
state is no longer silent. This fixture pins that it fires here and stays silent on a grounded model
(`examples/euro-parking`). See `scripts/ddd-grounding.test.mjs`.
