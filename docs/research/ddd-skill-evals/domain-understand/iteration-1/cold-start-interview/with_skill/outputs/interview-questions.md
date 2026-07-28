# Interview script — freelance translator assignment management

Date: 2026-07-27 · Mode: INTERVIEW (cold start, nothing written) · Feeds: `business-model.md`

The doctrine is **one question at a time**: one question gets a story, five get five
sentences. This file is the running order, not a form to fill in. If you would rather
answer in bulk, that works too — the cost is thinner answers, and I will mark which blocks
came from a bulk reply rather than a conversation.

Ask about money and behaviour, not vision. Vision questions return the mission statement.

---

## Round 1 — who pays, and for what

The single most clarifying question in the set. Everything left of Value Propositions on
the canvas is a consequence of this answer.

1. **Who pays you, and for what?**
2. What exactly would appear on the invoice — subscription, per-seat, per-assignment,
   per-word, a cut of what the freelancer is paid?
3. Is the freelance translator a customer, a user, or both? If translators pay too, this
   is a two-sided platform and it is a different system from a tool an agency buys.
4. Which single line item would hurt most if it went to zero?

## Round 2 — the customer, concretely

5. Which agencies do you have in mind — boutique shops of five people, mid-size LSPs,
   enterprise localisation departments?
6. Do any two of those groups want genuinely different things from you? *(a yes here often
   means two bounded contexts rather than one model with a customer-type flag)*
7. Who would you expect to pay you the most? Who would complain the most?

## Round 3 — the value, from the customer's mouth

8. What does an agency do today to manage freelance assignments, in detail? Spreadsheets,
   email threads, an incumbent TMS, a project manager holding it in their head?
9. What specifically breaks about that? Name the last time it cost someone money.
10. When a customer explains to a colleague why they use you, what do you expect them to
    say?
11. What would you do that an incumbent genuinely cannot?

## Round 4 — differentiation and resources

12. **If a competitor launched a better version of this tomorrow, which part would actually
    cost you customers?** *(the sharpest question here — it turns "core domain" from an
    opinion into a falsifiable claim about competitive exposure)*
13. Is there data or know-how in this that a competitor could not easily get — matching
    history, translator quality scores, rate intelligence, turnaround data?
14. What will you deliberately not build yourselves? Payments, CAT-tool integration,
    machine translation, accounting, e-signature? *(a partnered activity is generic almost
    by definition — you have already decided not to differentiate there)*

## Round 5 — the users, and whether anyone has watched one

15. **When did you last watch a real agency vendor manager do this work?** Ask this early.
    If the honest answer is "we haven't", the whole user side of the canvas is internal
    belief and gets labelled as such.
16. Walk me through a normal day for the person who assigns work to freelancers. Verbs, in
    order, from the first thing they do.
17. Same walkthrough from the freelancer's side — how do they hear about a job, accept it,
    deliver it, get paid?
18. What do they complain about most?
19. What do they do *outside* the system to get their job done? Private spreadsheets,
    WhatsApp, a personal list of "translators I actually trust"? *(workarounds mark
    concepts the model is missing)*
20. What words do they use for these things? "Assignment", "job", "task", "PO", "project",
    "handoff"? The ubiquitous language is theirs, not ours.

## Round 6 — horizons

Answer these separately. Plans stated as facts are how a roadmap ambition ends up modelled
as a shipped capability.

21. What has to be true by the end of this quarter?
22. What is the bet for this year?
23. Where do you want this in three years, and what would have to change?
24. Is anything here that is boring today going to be strategic later? *(this protects a
    capability from being outsourced this quarter and needed as core next year)*

## Round 7 — cost, only if it is live

25. What would the biggest line in the cost base be?
26. Is this cost-driven (cheap, automated, lean) or value-driven (premium, high-touch)?

---

## Stop rule

Stop when the next question would not change how a capability gets classified.
Concretely, stop when:

- `business_role`, `evolution_stage` and `differentiation` are recorded — or explicitly
  `unknown` — for every capability that came up;
- the remaining blocks need someone who is not in the room (record who, then stop);
- the answers start repeating the pitch deck.

`unknown` is a real answer. Pressing until someone invents a plausible evolution stage
produces a confident wrong classification, which is worse than an honest hole because
nothing downstream will ever question it.

## Lenses deliberately not run

Impact Mapping, Product Strategy Canvas and Wardley Mapping are all available at this
stage. None is scheduled, because running all five Understand tools by default exhausts
the room before discovery starts. Reach for one only when a specific decision is stuck:

- **Wardley** — if rounds 4 and 12 leave evolution stage genuinely contested (e.g. "is
  translator matching a commodity or our differentiator?").
- **Impact Mapping** — if a goal from round 21–23 exists but nobody can say how software
  moves it.
- **Product Strategy Canvas** — if the roadmap turns out to be a feature list with no
  through-line to the vision.
