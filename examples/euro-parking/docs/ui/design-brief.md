# Design brief — Euro Parking self-service payment kiosk

Surface: the fixed portrait touchscreen where a driver pays before leaving.
Input: `docs/domain/` (ten bounded contexts, four message flows, thirty event-model slices,
nineteen hotspots) and `BRIEF.md`. **There is no PRD and no `docs/api/`** — every consequence of
that is recorded under § Gaps rather than filled in.

`docs/ui/` did not exist before this run, so nothing was carried forward or overwritten.

## The design read

> Reading this as: a **form-flow — a fixed portrait self-service payment terminal, one decision per
> screen** for **every driver at a Euro Parking site: any ability, any language, usually hurried,
> usually with a queue behind them, reading at arm's length in garage glare**, whose one job is
> **pay what this stay owes and get the card back in time to leave inside the fifteen-minute
> window**, in a **transport-signage** language, leaning **a named approximation of the GOV.UK
> Design System retuned to kiosk scale**.

Where each slot came from:

| Slot | Source |
|---|---|
| Page kind | BRIEF.md: "the fixed portrait touchscreen where a driver pays before leaving" |
| Audience | BRIEF.md's audience line, plus `business-model.md`'s driver story map — which is flagged there as *an operator's belief about drivers*, never observed (Q8 / H19). The audience the aesthetic is picked for is therefore itself an assumption. |
| The single job | `DOMAIN-FLOW-0002` — the scenario "the money runs through"; the driver's half of it ends with the card back in their hand and fifteen minutes on the clock |
| Vibe | derived, not given: no brand assets, no logo, no colours and no vibe words exist anywhere in the repo (**Gap G-15**) |
| System family | decided here — see ADR-UI-001 |

No clarifying question was asked. The two readings that could have diverged — "a payment screen"
versus "a public machine anyone must succeed at" — are settled by the brief's own audience
sentence, so asking would have been a question dump with a known answer.

## ADR-UI-001 — one design system for this surface

**Decision.** A named approximation of the **GOV.UK Design System (govuk-frontend)**, retuned to
kiosk scale. Not the package itself: it is a British public-sector system carrying British
government brand assumptions, and this is a German commercial operator.

**What is taken:** plain-language copy rules; a single accent doing brand work with semantic
colours kept separate; ink-on-paper contrast rather than tinted surfaces; the focus style as a
yellow bar plus an ink keyline; error summaries that say what happened and what to do; no
decorative chrome anywhere.

**What is retuned:** the type scale is anchored at 28px, not 19px — the reading distance is arm's
length in glare, not a phone in a hand; targets are 60px minimum and 100px for the primary action;
the layout is a single column of full-width bands, because at 452px of usable width a grid buys
nothing.

**Alternatives rejected.** *Material 3* — its density, elevation and ripple are phone-scale and
its motion vocabulary is exactly what a queue does not want. *A vendor terminal UI kit* — none is
named anywhere in the sources, and adopting an unnamed one would be a decision with no owner.
*No system at all* — this surface will grow entrance and exit screens; ad-hoc means three
inconsistent machines at one site.

**Icon family:** one, and it is "none" — text plus four drawn glyphs (↓ → ✓ €). A terminal that
must keep working with the network down (`terminal-operations/README.md`, partition tolerance)
ships no icon font, and every hardware target is labelled in words instead.

## Affordances — what the hands meet, before any styling

These outrank every aesthetic decision below them, and three of the five are things that live
*outside* the screen.

1. **LOST TICKET is a physical button on the machine**, not a control in the UI. "A button on the
   payment machine… no attendant" (EXPERT, `timeline.md` 30). This is the single most consequential
   line in the design: a driver with no card cannot begin a flow from a screen that opens with
   "insert your card", so the entry point has to be hardware. It is drawn in the fascia on all
   fourteen frames and appears in the UI on none of them.
2. **The card slot is a place, not an idea.** Every instruction that refers to it carries a ↓ aimed
   at where it physically is, and the fascia highlights the slot when the screen is talking about it.
3. **The machine takes coins.** Reconciliation matches "machines vs bank vs **coin box**" every
   morning (`business-model.md`), so a coin slot exists and every payment screen offers both paths.
4. **Nothing hovers.** No affordance anywhere depends on hover, and no state is reachable only by
   one.
5. **Glare and distance set the floor.** Light background beats dark under garage glare
   (`prototype-craft.md` § Surface floors). **No screen text anywhere is under 24px** — the kiosk
   floor — with 27–42px for whatever the screen is actually about, and 62–72px for the amount and
   the deadline so they read from outside the queue. The only type below 24px in the file is on the
   fascia (11–13px): those are labels silkscreened on metal in the drawing, not screen text.
   The first draft of this prototype ran its secondary register at 20–23px and failed this check
   on measurement, which is the reason the pre-flight says measure rather than estimate.

**And a sixth that is a design addition, not a source:** the **HELP** intercom button. The sources
place the control-room intercom at the *exit* ("machine eats the card → intercom"). Three error
states on this surface have no other way forward. It is drawn, and recorded as **Gap G-6** — if the
payment machine has no intercom, the recovery copy on three frames is wrong and this is the first
thing to fix.

## The three dials

| Dial | Value | Reason |
|---|---|---|
| `variance` | **2** | The quiet constraints win (`design-read.md` signal 6). A public machine every driver must succeed at, in glare, at arm's length, with a queue behind them — the audience picks the aesthetic, and this audience picks convention. Boldness is spent once, on the yellow deadline band. |
| `motion` | **1** | A kiosk has no hover; nothing may gate on a transition while somebody waits behind you; the terminal must boot and run with the network down. Reduced motion is not a preference to respect here, it *is* the design. The one thing that changes over time — the countdown — is information, not animation. |
| `density` | **2** | One question per screen. Six facts at most, one amount, one action. A driver reading a line-item table while standing up is a driver still standing up. |

## The signature element

**The window band: ink on signage yellow, "Drive out by 11:22 · 14 min 32 sec left".**

One invariant in this domain is enforced against the driver: *exit must follow payment within
fifteen minutes; past it the card is refused* (I1, `parking-visit/aggregates/ParkingVisit.md` §3).
Today a driver meets that rule as a barrier that will not lift and a card handed back — the expert
calls it "a standing complaint from customers and we are not changing it" (`DOMAIN-FLOW-0003`).
The rule is not being changed, so the design's only available move is to make it unmissable
*before* it is broken. It appears three times, in decreasing weight: a one-line yellow strip on
*Amount to pay* (before you pay), the full band on *Paid, take your card* (the moment it starts),
and a strip again on *Pay the difference*. Nothing else on this surface uses yellow except the
focus style and the LOST TICKET button — both of which are also "look here, this bites".

## Rejected defaults

**The generic default for this brief, written down first.** For "design a parking payment kiosk",
the era's default output is: white background, one saturated blue primary, Inter or a
system-ui stack, rounded 12–16px cards with soft shadows floating on a tinted surface, a green tick
in a circle for success, a red banner for failure, a summary card listing the stay as line items,
and a "Continue" button. Candidate C in `.design-flow/preview/candidates/consumer-fintech.json` is
that default written out as a complete token file, so the diff against what shipped is a file diff
and not a claim.

| The default | What happened | Why |
|---|---|---|
| Cards, radii, elevation | **Replaced.** Flat full-width bands separated by 3–6px rules; radius zero everywhere inside the screen | A shadow is a light cue, and this screen is read in glare where light cues vanish. At 452px usable width a card inside a card spends 32px of the only dimension the amount needs. |
| Inter / system-ui | **Replaced.** A DIN/Frutiger signage stack, falling back to the system grotesque | Signage lineage matches the reading distance, and a kiosk that must boot with the network down cannot fetch a webfont. Recorded honestly: the licensed face is DIN Next; the prototype falls back. |
| Saturated blue primary | **Survives, justified.** `#0B4A8F`, one accent, brand only | European parking signage is white-on-blue; this is convention the driver already reads, not a palette preference. It does exactly one job — the primary action — and never marks state. |
| Green tick / red banner for state | **Survives, restructured.** Semantic colours are a separate, deliberate set (paid / declined / warning), each as a soft band with a 12px colour bar, never as the brand accent | The hard rule is one brand accent plus deliberate state colours; what was rejected is state colour leaking into buttons and headers. |
| A "Continue" / "Submit" primary | **Replaced.** Every button says what it does and what it costs: "Pay €4,00", "Try again, €4,00", "Go back, wrong vehicle" | `prototype-craft.md` tells list. On a machine taking money, the amount belongs on the control. |
| Success screen as a receipt summary | **Replaced.** The paid screen is 60% deadline | The driver's next problem is not what they paid, it is that they have fifteen minutes. |
| A dark "premium terminal" look | **Rejected as candidate B** (`.design-flow/preview/candidates/night-terminal.json`) | Light beats dark under glare for a public kiosk. It is the more photogenic direction and it would fail in the room it lives in. |

**The pick was made without a human.** No person was available to choose by eye, so the call is
recorded here: candidate A ("signage") was chosen against B ("night terminal") and C ("consumer
fintech") on the glare rule and the anti-default diff above. All three are complete token files and
**all three pass `check_tokens.mjs` at exit 0** — worth knowing, because it means the gate proves
declared contrast, not judgement.

## Copy and language

- **Vocabulary is the domain's, in the driver's register.** "Started 15 minutes", "the most a car
  pays in a day", "pay the difference", "lost ticket" — all from
  `discovery/ubiquitous-language.md`. Nothing on screen says visit, aggregate, stripe field,
  terminal id or paid flag.
- **The words nobody used stay unused.** No reservation, booking, subscription, season ticket,
  refund, cancellation or customer account appears anywhere — `ubiquitous-language.md` forbids
  introducing them downstream, and "Request a refund" is exactly the control a decline screen
  invites you to invent.
- **Errors never blame and never apologise.** "Your card was not charged. The bank turned the
  payment down." Every one of the four error frames offers at least one way forward.
- **A recorded collision.** The expert's word for the plastic is **card**; the brief's word is
  **ticket**; `ubiquitous-language.md` keeps both rows because the collision is the finding. The
  screens say **card**, because that is what the driver is holding and what the exit machine keeps
  — but the physical button keeps its stated label, **LOST TICKET**. So this design ships one
  deliberate inconsistency between a moulded button and every screen. It is the honest reading of
  two confirmed sources and it needs a human to settle.
- **Language.** The frames are drawn in the English variant for review; a German site ships German
  by default (Germany is the first market, `business-model.md`). The DE · EN · NL row follows that
  stated sequence. Nothing in the sources says which languages are required (**Gap G-16**).

## Example values — numbers that are illustrative, not specification

| Value | Status |
|---|---|
| €1,00 per started 15 min · 5 blocks · €4,00 · entry 10:00 · priced 11:07 | **Sourced** — EM-14's own worked example, verbatim |
| Paid 11:07 → window to 11:22; refused at 11:28; back at a machine 11:31 | **Sourced** — EM-18 / EM-20 timings |
| Daily caps €12 / €25 / €25 / €40, truck rate €2,50, difference €2,00 | **Examples.** No source gives any cap or the difference rule |
| "Bay 212 · Level 3", "Hauptbahnhof Garage · Machine 3", "Exit B · Level 1" | **Examples.** Bay 212 on level 3 is EM-01's own example; the site and machine names are invented |
| "Stripe facing up", "the machine gives it back" | **Examples** — plausible hardware behaviour, stated nowhere |

## Gaps — what the upstream does not say

Recorded, not invented. The first four are things this surface renders that the domain has not
named; the rest are decisions a human owes before build.

| # | Gap | Upstream |
|---|---|---|
| G-1 | **No `docs/api/` and no PRD exist.** Screens bind to domain commands and events instead, so there is no RFC 9457 error catalogue to diff the error states against — the error list here is derived from the domain's *missing* rejection paths, which is weaker | absence |
| G-2 | **A declined payment has no event anywhere in the model** — "no rejection event exists for a declined payment" | F3, `ParkingVisit.md` §5 |
| G-3 | Every cap, the truck rate and the difference amount are examples | no source |
| G-4 | Nobody said how a terminal tells "system unreachable" from "system says no", or which way to fail on a slow answer. The design fails toward telling the truth and taking no money | `terminal-operations/README.md` |
| G-5 | Coins are taken, but change, overpayment and exact-change behaviour are unstated — and **no refund concept exists in the language at all**. Nothing on screen promises change | H9 + `ubiquitous-language.md` |
| G-6 | The intercom is placed at the exit by the sources; this design puts HELP on the payment machine because three error states have no other way out | `business-model.md` |
| G-7 | A mismatch charges the higher rate and **there is no dispute path anywhere in the language** — the screen can only offer HELP | `vehicle-identification/README.md` |
| G-8 | A failed stripe write has no stated failure mode, so *Paid* declares no error state rather than inventing one | `terminal-operations/README.md` critique 2 |
| G-9 | The deadline this screen promises is enforced by the *exit* machine, and **offline it is not enforced at all** — the stripe carries no payment time | H10, EM-21 |
| G-10 | How "the difference" is priced is unstated: from `paidAt`, or from entry with the first payment deducted, and does the cap apply again? The €2,00 drawn assumes the first reading | D-3 |
| G-11 | Nobody said whether a **fresh** window starts after paying the difference. **The design starts one** — the alternative is a driver refused twice for the same walk. This is a design decision standing in for a business answer and it is the loudest thing here | flow 3.5 |
| G-12 | H12 has no answer, so the machine **asks the driver** which class to pay the cap for. A driver will choose the cheapest; the leakage is the spread between the cheapest and dearest cap. The UI cannot fix this — only a rule can | H12 |
| G-13 | No printed receipt is drawn: nobody stated one, though in the first market a VAT receipt is the kind of thing a driver expects | absence |
| G-14 | No cancel control on *Amount to pay* — no source says how a driver gets a captive card back without paying | absence |
| G-15 | No brand assets exist: no logo, no colours, no typeface, no name treatment. The wordmark drawn is a plain setting of the operator's name | absence |
| G-16 | No language requirement is stated anywhere | absence |

**And the one under all of them.** `PayTicket`, `PayDifference` and `PresentCardAtExit` carry only
the stripe — `assignedSpot` and `paidFlag` — and **nothing identifies the visit** (H13 / F7: "a
repository cannot load this root from what its own commands carry"). Every screen showing an entry
time, a duration or an amount assumes that is resolved. If H13 resolves any other way, *Amount to
pay* cannot be drawn at all.

## Where the user's model and the domain's model disagree

Three findings for a human, not papered over:

1. **The domain has one `ExitRefused` event; the driver has two completely different days.**
   Finding 3.1 records that a driver who *has* paid is currently shown NOT PAID. *Pay the
   difference* therefore opens with "You paid €4,00 at 11:07" and never shows those words — but
   that is this design contradicting a sign the business already installed, and D-2 is the question
   that settles it.
2. **The model treats the lost ticket as a charge; the driver treats it as a rescue.** The events
   `LostTicketCharged` and `ReplacementCardIssued` carry a site and a class and no visit, because
   there is nothing to look up. The screens have to ask a stranger to classify their own vehicle
   before they can leave, and that is a leakage decision wearing a UI.
3. **The domain's paid state is durable; the driver's is a countdown.** In the model `paid` is not
   a timer state — `PaymentWindow{paidAt, expiresAt}` is evaluated when the exit asks. On this
   surface the window is the loudest object on the screen. Both are correct; they are two models of
   one fact, which is the point.

## Quality floor (present, not announced)

No screen text under 24px; the primary reading register 27–42px; the amount and the deadline
62–72px. Nothing tappable under 60px; the primary action is 100px. Focus is a yellow bar with an
ink keyline, drawn on the *Lost ticket, vehicle class* frame — the machine has no stated keyboard,
so this covers an accessibility keypad if one exists and costs nothing if it does not. No
animation, no hover, no colour-only signal: every state carries a word and a shape as well as a
colour, which is also why there is no `prefers-reduced-motion` block — there is no motion to
reduce.

**Dark mode is deliberately out of scope**, and `color.dark` in `tokens.json` is empty on purpose:
this is fixed hardware in a lit garage, read under glare, where the light surface is the
accessibility decision (candidate B is the dark version and was rejected on exactly that).

## Pre-flight

Both gates at exit 0. Blockers all pass, with two stated honestly rather than ticked quietly:

- **"Open the prototype and read it cold."** No browser was available in this environment. The
  frames were read as source, screen by screen, against the tells list — which is weaker than
  looking, and is the one blocker a reviewer should re-run first by opening the file.
- **"Every RFC 9457 problem type of a screen's bound operations has an error entry."** There is no
  `docs/api/` and therefore no error catalogue to diff against (G-1). The error states were derived
  from the domain's own *missing* rejection paths (F3) instead, which is a weaker source and is
  recorded as such.

Advisories: all tick except one worth naming for the reviewer — **the seven screens share a
chassis** (top bar, band, rows, amount, action, fascia). On most surfaces that would be the "no
screen earned its shape" tell; on one physical machine a driver uses for ninety seconds it is the
point, and the shapes that matter do differ (an almost-empty invitation, an amount-led decision, a
deadline-led confirmation, a four-option list). A reviewer who disagrees should say so — it is a
judgement, not an oversight.

## Out of scope

Entrance terminal (`DeclareVehicleDetails`), exit terminal (`PresentCardAtExit`), the FULL and NOT
PAID signs, the control-room screen, and every operator surface (tariff editor, reconciliation
view, exceptions list, occupancy report). Lots are out of scope too: the payment flow here is the
garage one, and `EM-10` warns explicitly against porting the garage slice to a lot.
