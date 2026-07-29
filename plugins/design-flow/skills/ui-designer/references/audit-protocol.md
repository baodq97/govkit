# AUDIT mode — audit before touching anything

Misclassifying the mode is the single biggest source of bad redesign output. Detect first:

- **Preserve** — the brand and IA stay; the execution modernizes.
- **Overhaul** — the direction itself is being replaced.
- If ambiguous, ask ONCE, with both readings stated.

## The audit record (write it before proposing anything)

Written to `docs/ui/audit.md`, in this order:

1. **Tokens as built** — the actual palette, type stack, spacing, radius, shadow values
   extracted from the code/live surface (not what any old doc claims). This is the visual
   audit: identify the design elements (color, typography, sizing, spacing, iconography,
   visual forms) before judging them.
2. **Component inventory** — which of the core components exist (buttons, cards, forms,
   inputs, badges, modals, toasts, tables, navigation, …), where each is defined, and which
   are duplicated or inconsistent — duplication here is the design-debt measure.
3. **IA and flows** — the screen map as it exists, and where the current flow loses the
   target action.
4. **Dial reading of the existing surface** — variance/motion/density as built, so the
   redesign's dials are a stated delta, not a vibe.
5. **Accessibility baseline** — declared-token contrast via `check_tokens.mjs` if tokens
   exist or can be extracted; focus visibility; reduced-motion handling. Sampled findings are
   labeled leads, not verdicts.
6. **Findings table** — severity-tiered (blocker / warning / advisory), each finding citing
   what was observed (file, screen, or element). No finding without something observed;
   "could not inspect X" is reported as exactly that, never converted into a plausible claim.

## Preservation rules

**What never changes silently** — changing any of these requires the owner's explicit
direction, recorded in the brief:

- URLs and routes
- Navigation labels and their order
- Form field names and their semantics
- The logo/wordmark and legal copy
- Anything a downstream system parses (ids, data attributes named in docs)

Modernisation levers, in priority order when preserving: token cleanup (collapse near-
duplicate values) → type scale discipline → spacing rhythm → component consolidation →
motion/polish. Layout re-architecture is overhaul territory, not a lever.

## Output

`docs/ui/audit.md` replaces the FORWARD deliverables. If the audit convinces the owner to
redesign, the follow-up runs FORWARD mode with the audit as upstream input — the audit's
"tokens as built" become the preserve-set, and the never-changes-silently list transfers
verbatim into the new brief.
