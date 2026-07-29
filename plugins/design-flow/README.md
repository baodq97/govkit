# design-flow

The experience-design loop of the govkit ecosystem — the third sibling plugin: **swe-flow**
authors the governed chain, **ddd-flow** models the domain, **design-flow** models what the
user sees. It meets ddd-flow at `docs/domain/` and swe-flow at `docs/ui/` — artifact seams,
never imports (RFC-0030).

## Surfaces

- **`skills/ui-designer`** — the frontend-design step: PRD + `docs/domain/` + `docs/api/` (or
  a prose brief) → `docs/ui/` — a design brief with a recorded design read (five slots,
  including the page's single job) and reasoned dials, a `tokens.json` whose declared contrast
  pairs `scripts/check_tokens.mjs` verifies with exact WCAG math (declared-only scope — no
  browser, no sampling; three-state exit contract), and a screen inventory where every screen
  names its one primary action and its empty/loading/error states bound to the API's RFC 9457
  error catalog. FORWARD designs; AUDIT reviews an existing UI audit-before-touch and records
  what must never change silently.
- **`skills/view`** — the live co-design surface: one extractor (`ui_view.mjs`) turns
  `docs/ui/` into a single payload; a frozen shell renders it as lenses (token sheet with
  computed contrast verdicts, component gallery wearing the declared tokens, screen wireframes
  with empty/loading/error toggles, candidate directions picked by eye, gaps). The preview
  server pushes live re-renders over SSE, and every click, note, candidate pick, and approval
  the user leaves lands in `events.jsonl` for the agent's next round — feedback happens on the
  surface, not chat-about-chat. Phase 1 previews are ephemeral under `.design-flow/preview/`;
  Phase 2 publishes to `docs/ui/_views/` as gate evidence.

## The loop

Candidate pick (2–3 directions rendered side by side, the user chooses by eye; rejected ones
become Rejected-defaults entries) → working rounds (annotate on the surface → agent applies to
the artifacts → live reload) → reader test (a fresh-context agent opens the published view and
must be able to name each screen's primary action and error behaviour) → gate-close cites the
published view as live evidence.

Like its siblings: authors drafts, calls the deterministic gates, never flips a status.
