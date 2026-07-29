---
name: ui-designer
description: >
  Design the user-facing surface and ship a REAL clickable-looking prototype: PRD + docs/domain
  + docs/api (or a prose brief) → docs/ui with a prototype.html anyone can open, plus the
  tokens and screen inventory it derives from. Use when the user says "design the UI",
  "frontend design", "design tokens", "UI spec", "make a mockup", "redesign this page",
  "thiết kế giao diện". AUDIT mode reviews an existing UI first. To LOOK at the result or
  co-design live, use design-flow:view — this skill builds, that one shows.
---

# UI Designer

## What "done" looks like

**A person who reads no documents opens `docs/ui/prototype.html` and understands the product.**
They see the real screens, in the real brand, with the real words and real numbers a user would
read, including the states where things go wrong. That artifact is the deliverable; the tokens
and the screen inventory exist to make it verifiable and to keep it from drifting.

This is the bar because a design that only exists as a table of `**Primary action**: Pay` lets
everyone nod along without agreeing on anything. The moment you have to write the actual price,
the actual error sentence, and the actual button label, the disagreements surface — which is the
entire point of designing before building.

## Hard rules

- **The prototype is the deliverable, and it is real.** Real copy, real numbers, real brand.
  Never `Lorem ipsum`, never "Screen title here", never a gray box captioned "empty state".
  If you don't know a number, choose a plausible one and say in the brief that it is an example
  (enforced: `check_prototype.mjs`).
- **Every color in the prototype resolves to a token role** — `var(--c-*)`, never a literal hex
  outside the `:root` block the scaffold generates. This is what keeps the picture and the
  contrast gate talking about the same design (enforced: `check_prototype.mjs`).
- **The design read comes first and is recorded** — page kind, audience, the page's single job
  (target action), vibe, system family — in `tokens.json` meta and prose in the brief
  (enforced: `check_tokens.mjs`). Ask at most ONE clarifying question, and only when the read
  genuinely diverges; never a question dump.
- **Dials are explicit and reasoned, never silent** — variance/motion/density 1–10 with a
  written reason. Using a default is fine; using it silently is a gate failure (enforced:
  `check_tokens.mjs`).
- **Every declared contrast pair passes WCAG AA** — 4.5:1 body, 3:1 large (enforced:
  `check_tokens.mjs`; exact math on declared tokens, never sampled from a rendered page).
- **Every declared screen gets drawn, states included** (enforced: `check_prototype.mjs`). A
  state the inventory rules out (`n/a — …`) needs no frame; a state it promises does. When the
  same screen has materially different content rather than a different state — an amount at a
  mismatched rate, a replacement card instead of the original — declare it under `**Variants**`
  so it gets a frame that survives the next regeneration.
- **Name the surface's physical and platform affordances before styling them.** Ask what the
  user's hands actually touch: a hardware button that must appear on every screen, a card
  slot, a keyboard, a thumb reach zone, a screen read in glare. These are constraints the
  brief rarely spells out and they change layout more than any aesthetic choice — on a real
  parking-kiosk brief, three independent designers each found that "lost ticket is a physical
  button" moved it out of the UI and into the machine chrome, which was the best decision in
  the design.
- **One design system per project, and adopting or approximating one is an ADR** — the same
  late-decision rule as api-designer's integration technology. One icon family. One accent for
  brand; semantic state colors (paid / declined / warning) are a separate, deliberate set, not
  extra accents.
- **UI copy is the domain's ubiquitous language in the user's vocabulary** — a person manages
  notifications, not webhook config. When `docs/domain/` exists, never rename or invent its
  concepts. Errors say what happened and what to do, and never blame the user: "Your card was
  not charged. Try again or use another card."
- **One signature element per surface** — spend boldness once; everything around it stays
  quiet. The quality floor ships without being announced: legible at the real reading distance,
  visible focus for every input the surface actually has, reduced motion respected, touch
  targets sized for the real hand (≥44px pointer, ≥56px for a public kiosk).
- **Anti-slop is a method, not a blacklist** — derive what you'd produce for *any* similar
  brief, then revise or justify every place this design matches it (recorded in the brief's
  "Rejected defaults"). Never inherit another era's banned-hex list.
- **Never silently regenerate `docs/ui/`** — if it exists, read it first; overwrite only on
  explicit direction, and record in the brief what you kept vs replaced and why.
- **No decision without a source** — cite the PRD/domain/API element (or the brief sentence)
  that motivated it. "The upstream doesn't say" is a recorded gap, never invented precision.

## Where this fits

The authoring half of design-flow (`design-flow:view` is the showing half — the live co-design
surface and feedback loop). Cross-plugin, this is the frontend-design step: the counterpart of
swe-flow's `api-designer` (machine contract) and `data-model` (persistence contract) — the
human contract. It consumes the PRD's persona/metrics, `docs/domain/` naming, and `docs/api/`
operations + error catalogs when they exist; a prose brief works standalone. The UI is the
*second model of the same PRD*: ddd-flow models the domain, ui-designer models the user's
mental model — where the two disagree is a finding for the human, not something to paper over.

## Pick the mode

- **FORWARD** — design something. Input: PRD + `docs/domain/` + `docs/api/` if present, else a
  prose brief.
- **AUDIT** — review an existing UI before changing it. See `references/audit-protocol.md`.
  If a redesign is ambiguous between preserve and overhaul, ask once — misreading that mode is
  the biggest source of bad redesign output.

## Consume the upstream

| Upstream element | UI surface |
|---|---|
| PRD persona / audience | The design read's audience slot — the audience picks the aesthetic, not your taste |
| PRD success metric | What the primary action per screen optimizes for |
| Ubiquitous language (`docs/domain/`) | Screen and entity names, copy vocabulary — verbatim |
| Aggregate | A view family (list + detail) |
| API Retrieval operation | A read view — with its empty and loading states |
| API State Creation / Transition | A form or action flow — with optimistic vs confirmed states |
| API error catalog (RFC 9457) | The UI error-state catalog: each problem type gets user-vocabulary copy saying what happened and what to do |
| Domain event | A notification/toast/activity surface, when user-facing |
| Domain invariant | Usually the thing the signature element makes unmissable — a rule the user will be judged by should be visible before they break it |

## Workflow (FORWARD)

1. **Read the upstream (or take the brief), and check `docs/ui/` first** — if it exists, read
   it and carry decisions forward rather than regenerating over them.
2. **Declare the design read** — one line, five slots: "<page kind> for <audience>, whose one
   job is <target action>, in a <vibe> language, leaning <system family>." Signals and
   procedure in `references/design-read.md`.
3. **Name the affordances** — what the hands touch, what the eyes fight (glare, distance, one
   thumb, a queue behind them). Write them into the brief; they outrank aesthetics.
4. **Set the three dials with reasons**, then **route to a design system** (an official package
   or a named approximation; record the choice as an ADR).
5. **Draft 2–3 candidate directions and let the user pick by eye** — write each as a complete
   token file to `.design-flow/preview/candidates/<name>.json` and open them in
   `design-flow:view`. The pick decides; the rejected ones become Rejected-defaults entries.
   With no browser, present them in chat — the pick is still the user's.
6. **Run the self-critique** — derive the generic default for this brief; revise or justify
   every match. Record survivors under "Rejected defaults".
7. **Write `tokens.json` and the screen inventory, and gate them:**
   `node ${CLAUDE_SKILL_DIR}/scripts/check_tokens.mjs docs/ui/tokens.json` until exit 0.
8. **Build the prototype** — scaffold, then design into it:
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/scaffold_prototype.mjs \
     docs/ui/tokens.json docs/ui/screens docs/ui/prototype.html --device kiosk|phone|desktop
   ```
   The scaffold gives you the token variables, one device frame per declared screen-state, and
   nothing else. Fill every frame with the real screen: real copy, real numbers, the layout a
   person sees. Then gate it:
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/check_prototype.mjs \
     docs/ui/prototype.html docs/ui/tokens.json docs/ui/screens
   ```
   Iterate until exit 0. Filling frames is where the design happens — budget your effort here,
   not on the chrome the scaffold already wrote.
9. **Look at it.** Open the prototype (or screenshot it) and read it as a stranger would: can
   you name each screen's one action and what happens when it fails? Fix what you find.
10. **Iterate on the surface, not in chat** — keep `design-flow:view` open; each round, read the
    feedback events it collected and apply them (act on unambiguous notes, bring only conflicts
    back to chat).
    **Running without a human or a browser** (an autonomous or CI run): do not stall on the
    steps that expect one. Pick the candidate yourself on a stated criterion from the brief,
    record the rejected directions as complete token files so the owner can still choose later,
    read the prototype as source instead of on screen, and say in the brief which calls were
    yours. A design nobody could review yet is still better than a design nobody made.

11. **Run the pre-flight** — `references/preflight.md`; blockers must pass, advisories are
    judgment. Close with the view's reader test before review.

## Pinned mechanics

Run these; don't ask an agent to judge by prose what a script decides.

- `scripts/check_tokens.mjs` — design read complete, dials reasoned, valid hex, WCAG contrast
  on every declared pair, no unfilled placeholders. Exit 0/2/1 (clean / gate fail / tool crash).
- `scripts/scaffold_prototype.mjs` — emits the prototype shell: `:root` variables derived from
  `tokens.json`, one device frame per declared screen-state, neutral chrome. Three independent
  designers hand-rolled this same shell before drawing anything; it is written once here so the
  variables can't be retyped wrong.
- `scripts/check_prototype.mjs` — every declared screen drawn, no unfilled frames or filler
  text, no color that bypassed the token gate, the declared type stack actually applied.
- `assets/tokens-skeleton.json` — copyable skeleton whose placeholder slots deliberately fail
  the gate until filled.

## References

| Reference | Load when |
|-----------|-----------|
| `references/design-read.md` | Declaring the read, deriving dials, the self-critique procedure |
| `references/screens-and-states.md` | Deriving the inventory, state coverage, copy rules |
| `references/prototype-craft.md` | Filling frames well: what makes a screen read as real, per-surface floors, common tells |
| `references/audit-protocol.md` | AUDIT mode: audit-before-touch, preservation rules, never-changes-silently list |
| `references/preflight.md` | The severity-tiered checklist — each item cites the rule it checks |

## Output

```
docs/ui/
├── INDEX.md
├── design-brief.md        # design read + affordances + dial reasons + design language
│                          #   + signature element + rejected defaults + gaps + out of scope
├── tokens.json            # roles, type, spacing, iconography, contrast pairs — gate-clean
├── prototype.html         # THE DELIVERABLE — every screen-state, real copy, opens anywhere
└── screens/
    └── <context-slug>.md  # flow diagram (Mermaid) + per screen: primary action, states,
                           #   copy notes, API bindings
```

AUDIT writes `docs/ui/audit.md` (findings with severity + the never-changes-silently record +
component inventory) instead of generating a design.
