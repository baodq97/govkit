# The design read, the dials, and the self-critique

## Read the room before anything else

Six signal classes to read from the brief and the upstream artifacts, before any visual
decision:

1. **Page kind** — landing, app surface, dashboard, docs, editorial, form flow.
2. **Audience** — from the PRD's persona section when it exists. The audience picks the
   aesthetic, not your taste.
3. **The single job** — the one action a successful visit performs (the target action). The
   PRD's success metric usually names it. Everything on the page either serves this action or
   competes with it.
4. **Vibe words and references** — adjectives, named products, screenshots the brief points at.
5. **Existing brand assets** — logo, colors, fonts already in the repo or linked. These are
   constraints, not suggestions.
6. **Quiet constraints** — regulated industry, public sector, accessibility mandates,
   enterprise procurement. These OVERRIDE aesthetic preference.

Then declare the read in one line, five slots, before anything else:

> Reading this as: **<page kind>** for **<audience>**, whose one job is **<target action>**,
> in a **<vibe>** language, leaning **<system family>**.

The same five values go into `tokens.json` `meta.designRead`, where the gate checks they are
filled. Ask at most ONE clarifying question — never a dump — and only when two readings
genuinely diverge and the artifacts cannot settle it. If you can infer confidently, do not ask.

## The three dials

| Dial | 1–3 | 4–7 | 8–10 |
|---|---|---|---|
| `variance` — how far from convention | conventional, system-faithful | opinionated within the system | signature-led, layout takes risks |
| `motion` — animation presence | essentially static; reduced-motion is the design | purposeful moments (page-load, reveal) | orchestrated, motion is content |
| `density` — information per viewport | airy, marketing-spacious | balanced product surface | dense, data-forward |

Derive values from the read: an enterprise dashboard for analysts wants high density and low
motion; a portfolio wants high variance; a public-sector form wants low variance and the
official system. Any value is legitimate — **an unexplained value is not**. Write the reason
into `meta.dials.reason`; the gate fails on a silent baseline.

Dial names are frozen (`variance`, `motion`, `density`) — never invent aliases, so
cross-references in briefs and reviews stay stable.

## The self-critique (anti-slop as a method)

After drafting the plan and before emitting artifacts:

1. **Derive the generic default.** Ask: for *any* brief of this kind and audience, what
   palette, type pairing, hero, and layout would I produce? Write it down in two sentences.
   (Calibration: at any moment there are recognizable AI-default looks — e.g. warm-cream +
   high-contrast serif + terracotta accent, or near-black + one acid accent. The specific
   looks rotate with model generations; the *procedure* of naming today's defaults is what
   transfers. Do not import a past era's blacklist.)
2. **Diff the plan against it.** Every place the plan matches the default is either revised or
   explicitly justified — "this brief actually asks for it because <source>".
3. **Record the outcome** in `design-brief.md` under **Rejected defaults**: what the default
   was, what replaced it or why it survived. This section is what lets a reviewer see the
   design was chosen, not emitted.

Where the brief pins a direction, the brief wins — including when it asks for a default look.
Spending freedom on a default is the failure; obeying the brief never is.

## Writing bans that hold

When the brief or brand rules ban something (an em-dash, an emoji, a pattern), write the ban
**binary**, not graded — "use sparingly" has a measured history of being ignored; "zero, no
exceptions" holds. Every ban except true zero-tolerance ones carries an override path that
requires a recorded justification in the brief, naming the rule and the reason.
