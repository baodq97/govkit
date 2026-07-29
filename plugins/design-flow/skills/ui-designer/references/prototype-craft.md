# Filling the frames — what makes a screen read as real

The scaffold hands you empty device frames. Everything that matters happens now. This file is
about the difference between a frame that convinces someone and a frame that looks like a
placeholder wearing makeup.

## Write the screen someone would photograph

A real screen carries specifics a template can't invent:

- **Real numbers, not `$XX.XX`.** "€14,50", "Entry 09:14 · Duration 2 h 46 min", "14:32
  remaining". If the upstream doesn't give you a number, pick a plausible one and note in the
  brief that it is an example. A fake-precise number is better than a blank, because it forces
  the layout question "how wide does this get?" — but say which numbers are examples, so nobody
  ships your placeholder as a spec.
- **Real sentences, in the interface's voice.** "Your card was not charged. Try again or use
  another card." — not "Error message here", not "An error occurred."
- **The brand, present but quiet.** A wordmark, the product name where a user would see it, the
  one accent doing brand work. A prototype with no brand reads as a wireframe of someone else's
  product.
- **Density that matches the real content.** If a list holds twelve rows in production, draw
  enough rows that the scroll question is visible. Three perfect rows hide the problem.

## Draw the states as different screens, not variants of one

The empty, loading, and error states are separate designs with separate jobs:

| State | Its job | The tell that it was skipped |
|---|---|---|
| Empty | Invite the action that fills it | A gray box that says "No data" |
| Loading | Hold the layout so nothing jumps | A centered spinner over a blank page |
| Error | Say what happened and the way out | Red text, no recovery action |

An error state with no recovery path is the single most common gap, and it is the one users
actually hit. Give every error at least one thing to press.

## Surface floors — the numbers that change per surface

The audience and the hardware set the floor, and these are the values a reviewer can check:

| Surface | Body text | Touch/click target | Read distance | Watch for |
|---|---|---|---|---|
| Public kiosk / terminal | ≥24px | ≥56px, primary ≥80px | arm's length, glare | Light background beats dark under glare; no hover states — nothing hovers |
| Phone | ≥16px | ≥44px | 30cm, one thumb | Primary action inside thumb reach, not top-right |
| Desktop app | ≥14px | ≥32px | 60cm, pointer + keyboard | Every action reachable by keyboard, visible focus ring |
| TV / far display | ≥32px | remote focus states | 3m | Focus travel, not pointer position |

These are floors, not targets. When a brief's audience justifies more (low-vision users, gloves,
sunlight, a queue), go past them and say why in the brief.

## Hardware and platform affordances

Before styling, name what the user's hands meet. Things that live *outside* the screen change
the design more than anything inside it:

- A **physical button** on the machine (a lost-ticket button, an intercom, a stop) belongs in
  the device chrome and is present on every screen — putting it in the UI of one screen is a
  design error, not a style choice.
- **Card slots, printers, scanners** need their moment in the flow drawn: "insert card below"
  points at real hardware, so the instruction must sit where the hardware is.
- **No hover on touch.** Any affordance that only appears on hover does not exist on a kiosk or
  a phone.
- **Keyboards, remotes, screen readers** — if the surface has them, focus order is design work,
  not an afterthought.

## Common tells that a prototype was faked

Read your own frames looking for these:

- Every screen has the same layout with different words — no screen earned its shape.
- The error state is the happy path with a red banner glued on.
- Buttons say "Submit", "OK", "Continue" instead of what they do ("Pay €14,50").
- Text that a real user would never read: system vocabulary, internal ids, "record created".
- Perfect data: no long name, no truncation, no zero state, no plural of one.
- Decoration that would survive on any other product's screen unchanged.

## Working with the scaffold

- **Every screen gets a resting frame plus one per declared state.** The resting frame is where
  users spend their time; design it first, then the states.
- **Colors come from `var(--c-*)`.** The scaffold's own neutral chrome is fenced between
  `GENERATED CHROME START`/`END` markers and exempt; everything you write is not. If you need a
  color the tokens don't have, add it as a role so the contrast gate sees it — that is the
  point, not an obstacle.
- **Use literal glyphs (✓ ↑ €), not numeric HTML entities**, in prototypes. `&#10003;` is
  readable to a browser but looks like a hex color to a text scanner, and you will spend more
  time explaining the false positive than typing the character.
- **Regenerate the shell rather than hand-editing chrome.** If the gate says the prototype
  predates the current scaffold, re-run it and move your screens into the new shell.

## Effort budget

Spend it on the screens users spend time in and the states that decide whether they succeed:
the primary action's screen, the error that blocks it, the empty state that starts it. A
beautiful settings page and a vague error screen is a design that will be blamed for the wrong
thing.
