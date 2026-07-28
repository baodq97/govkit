# Interviewing to surface the business model and user needs

Business-model interviews fail differently from domain interviews. The common failures are asking
executives to describe strategy in the abstract (you get the website copy back), and accepting
internal opinion as user evidence.

## Four rules

**1. Ground first, ask second.** Read the README, pricing page, PRDs, OKRs. Never ask what they
already say. Confirm rather than elicit: *"Your pricing page shows a per-day fee and a priority
transfer add-on — is the add-on where the margin is?"*

**2. One question at a time.** Same reason as domain interviews: one question gets a story, five
get five sentences.

**3. Ask about money and behaviour, not vision.** Vision questions return the mission statement.

| Instead of | Ask |
|---|---|
| "What's your value proposition?" | "What do customers say when they explain why they chose you?" |
| "Who are your customers?" | "Who paid you the most last quarter? Who complained the most?" |
| "What's core to the business?" | "If a competitor launched a better ___ tomorrow, would you lose customers?" |

That last question is the sharpest instrument here. It converts "core domain" from an opinion into
a falsifiable claim about competitive exposure.

**4. Separate what is true now from what is planned.** Ask each horizon explicitly. Plans stated as
facts are how a roadmap ambition ends up modelled as a shipped capability.

## Question sets by block

### Customer segments

- "Who paid you the most last quarter?"
- "Which group is growing fastest? Which is shrinking?"
- "Do any two groups want genuinely different things from you?" *(a yes here often means two
  contexts rather than one with a flag)*

### Value propositions

- "When a customer explains to a colleague why they use you, what do they say?"
- "What's the problem they had before you existed? What did they do instead?"
- "What do you do that a competitor genuinely can't?"

### Revenue streams

- "What exactly appears on the invoice?"
- "Is there anything customers pay extra for?"
- "Which line item would hurt most if it went to zero?"

### Cost structure and key resources

- "What's the biggest line in the cost base?"
- "Is there data or know-how here a competitor couldn't easily get?" *(intellectual resources
  usually sit inside the core domain)*

### Key partners

- "What do you deliberately not do yourselves? Why?" *(a partnered activity is generic almost by
  definition — the organisation already decided not to differentiate there)*

### Goals across horizons

- "What has to be true by the end of this quarter?"
- "What's the bet for this year?"
- "Where do you want to be in three years — and what would have to change?"
- "Is anything here that's boring today going to be strategic later?" *(this one protects a
  capability from being outsourced this quarter and needed as core next year)*

### User needs — and who you are actually talking to

- "Walk me through what a user does on a normal day."
- "What do they complain about most?"
- "What do they do outside the system to get their job done?" *(workarounds mark missing concepts)*
- "When did you last watch a real user do this?"

Ask the last question early. If the honest answer is "we haven't", the whole user side of this
canvas is internal belief, and it must be labelled as such rather than presented as user evidence.

## The stop rule

Stop when the next question would not change how a capability gets classified. Specifically:

- classification inputs (`business_role`, `evolution_stage`, `differentiation`) are recorded or
  explicitly `unknown` for every capability that came up
- the remaining blocks need someone not in the room — record who, and stop
- answers have started repeating the pitch deck

`unknown` is a real answer and a useful one. Pressing until a stakeholder invents a plausible
evolution stage produces a confident wrong classification, which is worse than an honest hole
because nothing downstream will ever question it.

## Recording

Source per block: interview (who, when) or document (which file). Where a claim about users came
from an internal proxy rather than a real user, say so on the canvas. That distinction is invisible
in the prose six months later, and it changes how much weight the next decision should carry.
