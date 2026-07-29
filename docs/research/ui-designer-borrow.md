# design-flow borrow record — 5 sources → one plugin

Companion to RFC-0030. Records where each component of `plugins/design-flow/` (ui-designer +
view) came from, and what was examined and rejected. Sources studied 2026-07-29 (two clones +
one skill file + two roadmap.sh PDFs; two parallel read-only sub-agents produced the deep
reads):

| Source | Form | One-line character |
|---|---|---|
| anthropics/skills `frontend-design` | 1 SKILL.md | Studio-designer voice: design plan → critique vs generic defaults → build; copy-as-design-material |
| Leonxlnx/taste-skill (tasteskill.dev) | 13 SKILL.md, no code | Anti-slop rulebook: Design Read, 3 dials, countable rules, ~60-box pre-flight, tells blacklist |
| nextlevelbuilder/ui-ux-pro-max-skill | 14-CSV BM25 engine + workflow stack | plan→build→see→review loop; deterministic audit script with a severity exit contract; persisted MASTER.md |
| roadmap.sh Design System | roadmap PDF | The coverage map: design language → tokens (color/layout/type/iconography) → core components → governance/tooling |
| roadmap.sh UX Design | roadmap PDF | The upstream step: target outcome/actor/action, personas, flows, UX patterns, impact measurement |

## Convergence (what all the method sources agree on)

1. **Record the design decision before code** — Design Read + dials (taste-skill), token plan
   + signature (Anthropic), MASTER.md-before-building (ui-ux-pro-max). Defaults allowed;
   silent defaults are the failure.
2. **Deterministic layer split from judgment layer, only the deterministic layer gates** —
   ui-ux-pro-max exits non-zero only on `high`; its own comment calls sampled contrast "a
   lead, not a verdict". Maps 1:1 onto govkit's gate/eval/judge (RFC-0001).
3. **Anti-slop as procedure, not inventory** — the tells rotate with model generations; the
   derive-the-default-then-justify-matches procedure transfers.

## Borrow ledger

| Component in ui-designer | Source | Adaptation |
|---|---|---|
| Design read: 5 recorded slots, one-question budget | taste-skill §0 + Anthropic "pin the subject" | Moved from chat prose into `tokens.json` meta → machine-checked by `check_tokens.mjs` |
| `job` slot (target action) | roadmap.sh UX (target outcome/actor/action) + Anthropic "the page's single job" | One slot, not a UX phase |
| 3 dials, explicit-and-reasoned, frozen names | taste-skill §1 | Silent-baseline-fails made literal: gate checks `dials.reason` |
| Design-system routing + "one system, honesty rule" → ADR | taste-skill §2 | Recorded as ADR, mirroring api-designer's integration-technology rule |
| Token plan shape (roles/type/spacing/iconography) | roadmap.sh Design System token bands + Anthropic's compact token plan | `tokens.json` sections |
| WCAG AA contrast as the machine gate | ui-ux-pro-max `design-audit.mjs` | Re-founded on *declared pairs* (exact math) instead of DOM sampling (their own "lead, not verdict") |
| Three-state exit contract, collect-all-errors, path-anchored output | ui-ux-pro-max audit + `validate_data.py` | `check_tokens.mjs` |
| Skeleton that fails the gate until filled | govkit's own placeholder rule | `<...>` slots are violations by design |
| One primary action per screen | taste-skill "No Duplicate CTA Intent" ∥ roadmap.sh UX "make it clear where to act" (independent convergence) | Per-screen contract field |
| Empty/loading/error state contract, errors bound to RFC 9457 catalog | taste-skill §4.5 + api-designer's error catalog | The cross-artifact traceability is new here |
| Copy rules (user vocabulary, active voice, errors direct) | Anthropic "More on writing in design" | Fused with ddd ubiquitous language — UI copy is its user-facing register |
| Self-critique vs the generic default, "Rejected defaults" section | Anthropic process §2 + taste-skill anti-default discipline | Recorded in the brief so a reviewer sees choice, not emission |
| One signature element, quality floor unannounced | Anthropic restraint section | Hard rule 7 |
| FORWARD/AUDIT dual mode, audit-before-touch, never-changes-silently list | taste-skill §11 + data-model's mode split + roadmap.sh "from existing design" | `audit-protocol.md` |
| Severity-tiered pre-flight with rule↔item bijection | taste-skill §14 (bijection) + ui-ux-pro-max (severity gates) | Two tiers instead of 60 flat boxes |
| Binary bans beat "use sparingly" | taste-skill §9.G | Written as method in `design-read.md` |
| Never silently regenerate; read-first, explicit force | ui-ux-pro-max `skipped_exists` | Hard rule 9 |
| No finding/decision without observation; gaps are first-class | ui-ux-pro-max zero-result contract | Hard rule 10 |

## The view loop — pieces found already built (checked before building)

A second sweep asked "does the interactive surface already exist somewhere?" before writing
one. Findings:

| Piece | Found in | Reuse |
|---|---|---|
| Two-way live loop (SSE push + user clicks recorded to `events.jsonl` for the agent's next turn) | **in-house**: `ddd-flow/skills/view/scripts/preview-server.cjs` (itself adapted from obra/superpowers' brainstorm companion) | Copied with only session-dir/env deltas — the loop mechanism cost zero new code |
| Frozen-shell + extractor + two-phase (ephemeral preview vs published) architecture | in-house: `ddd-flow:view` | Pattern mirrored; new `ui_view.mjs` extractor + a new design shell (tokens self-render, so the shell is far smaller than the domain one) |
| "Showcase → human picks → only then apply" | anthropics/skills `theme-factory` | The candidate-pick opening move: 2–3 token directions side by side, picked by eye |
| Co-authoring choreography (context gathering → per-section refinement → reader testing) | anthropics/skills `doc-coauthoring` | The loop's conversation shape; reader test = fresh-context agent must name each screen's primary action and error behaviour |
| Browser-over-real-app verification (server lifecycle + screenshot loop) | anthropics/skills `webapp-testing` + ui-ux-pro-max's SEE step | Deliberately NOT in the design gate — reserved for the verifier tier once real code exists |

What existed nowhere: a spec-level preview that renders `docs/ui/` artifacts before any
component code — that part (extractor + design shell) was built new.

## Rejected, with reasons

| Mechanism | Source | Why |
|---|---|---|
| Cliché blacklists (hex families, banned fonts, tells lists) | taste-skill §9, §4.2 | Era-bound to one model generation; inheriting them inherits stale taste. Method borrowed, contents not. |
| Browser audit in the gate (Playwright, 6 viewports, screenshots) | ui-ux-pro-max | Minutes-scale, approximate contrast; belongs to the verifier/review tier, not a deterministic gate. |
| 14-CSV style/palette/font database + BM25 engine | ui-ux-pro-max | A content product to curate, not a governance mechanism; references carry method, the model carries current design knowledge. |
| 60-box flat checklist | taste-skill §14 | Unweighted flat lists get rubber-stamped; kept the bijection, added severity tiers. |
| Pseudo-random variety engines (simulated RNG, combinatorial pickers) | gpt-tasteskill, image-to-code | Unjustified variety — "the seed said so" is not a rationale a reviewer can evaluate. |
| Cross-project anti-repetition rules ("different palette family than your last project") | taste-skill | Requires persistent state the skill layer doesn't have; would be an unverifiable assertion. |
| Stack-pinned content (Tailwind v4 conventions, GSAP skeletons, install commands) | taste-skill §3/§5/App. A–C | Shelf-life content masquerading as rules; the skill stays stack-agnostic, ADR records the stack. |
| Full brand governance (brand-guidelines.md → token compiler → asset registry) | ui-ux-pro-max `brand` skill | Worth its own thin doc type someday (RFC-0030 open question); overweight for the design step. |
| Behavior-change frameworks (Fogg, Hook, gamification) | roadmap.sh UX | The upstream UX step's material, not frontend design; noted as future `ux-designer` scope. |
| Governed `uxd`/`ui` doc type in `govkit.yml` | — | Design lifecycles are non-linear; deferred to the enterprise-lifecycle FSM thread (see RFC-0030 alternatives). |
