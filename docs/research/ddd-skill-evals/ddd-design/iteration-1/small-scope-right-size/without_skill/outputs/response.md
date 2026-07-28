# Should two people doing an invoicing side project "do DDD first"?

Short answer: no, not the ceremony. Do the cheap 20% of it that pays off at any size, then start building. At two people with zero code, most of DDD's machinery is solving a problem you don't have.

## Why the full thing doesn't fit yet

DDD earns its cost in two situations:

1. **Many teams, one system.** Bounded contexts are mostly an organisational tool — they let separate teams own separate models and stop arguing about whose "Customer" is the real one. You have two people and one head-space. There is no organisation to align, so context mapping is drawing boundaries between yourself and yourself.
2. **Genuinely contested business rules.** DDD shines when the domain is messy and the experts disagree. Freelance invoicing is a well-travelled domain with public reference points — you can look at what Stripe Invoicing, Wave, or FreeAgent do and copy the shape.

Aggregates, repositories, anti-corruption layers, event storming with sticky notes, hexagonal layering: skip all of it for now. At this size the design effort would exceed the value, and the cost is real — you'd spend a week producing documents that the first real customer conversation invalidates.

**What you lose by skipping it:** if the project takes off and grows past ~4-5 people, you'll retrofit boundaries later, which is more expensive than drawing them now. That's a bet worth taking, because most side projects die before they get there.

## The part you should not skip: a half-day of discovery

The one DDD idea that pays at any size is **shared language**. Almost every bug in an invoicing product traces back to two people meaning different things by the same word. This is cheap and you should do it before writing code.

Time-box it to an afternoon, the two of you, one shared document. Three artifacts, nothing more:

### 1. A glossary (20 terms, one line each)

Force yourselves to pick one word per concept and stick to it in code, UI, and database columns. The ones that always cause trouble here:

- **Client** vs. **customer** vs. **contact** — pick one.
- **Invoice** vs. **bill** vs. **statement**. A statement is a summary of several invoices; don't let it become a synonym.
- **Paid** — does it mean "the freelancer clicked Mark as Paid", or "money cleared in the bank"? These diverge and it matters.
- **Overdue** — overdue in whose timezone, counted from issue date or due date?
- **Dunning** — the industry term for chasing. Worth adopting so "reminder", "chase", and "follow-up" don't become three half-implemented features.
- **Credit note**, **partial payment**, **write-off**, **void**.

### 2. The invoice lifecycle, drawn as a state machine

This is the single most valuable diagram in the product. Write out the states and, more importantly, the transitions you forbid:

```
Draft ──send──▶ Sent ──record payment──▶ Partially Paid ──▶ Paid
                 │                                    
                 ├──due date passes──▶ Overdue ──▶ (chasing)
                 └──void──▶ Voided
```

Then answer explicitly:

- Can a **Sent** invoice be edited? (Correct answer in most jurisdictions: no. You void it and issue a new one, or issue a credit note. Getting this wrong early means a painful migration later, because you'll have built an edit form that mutates history.)
- What happens on **overpayment** and **underpayment**?
- Can an invoice go from Paid back to Overdue? (Bounced payments say yes — decide now.)

### 3. What triggers the chasing

Chasing is a scheduler over invoice state, not a feature you sprinkle on top. Write down the rules in plain English before you build it:

> 3 days before due: gentle reminder. On due date: reminder. +7, +14, +30 days: escalating. Stop immediately when payment is recorded or the invoice is voided.

The hard requirement hiding in there: reminders must stop the instant money arrives. Sending a "you owe me" email to a client who paid yesterday is the fastest way to lose a user.

That's it. Glossary + state machine + chasing rules. Half a day, and it's the whole of the DDD you need right now.

## Then build one thin slice end to end

Instead of modelling the whole product breadth-first, pick the narrowest path that produces value and build it all the way through — data, logic, UI, email:

> Create a client → create an invoice with line items → send it as a PDF/link → manually record a payment → one automatic reminder if it's late.

No multi-currency. No tax engine. No payment provider. No recurring invoices. Manual "mark as paid" is fine for v1 — plenty of real invoicing tools shipped that way. One codebase, one database, one deployable. Do not split this into services.

Building that slice will teach you more about your domain in a week than another week of modelling would, and it gives you something to put in front of a real freelancer.

## The genuinely hard parts (which are not domain modelling)

Worth knowing where the pain actually lives, so you budget for it:

- **Invoice numbering.** Many jurisdictions require gapless sequential numbering per legal entity per year, and forbid altering an issued invoice. Check the rules for wherever your users are. This constrains your schema — design it in from day one.
- **Payment reconciliation.** Matching an incoming bank/Stripe payment to the right invoice is fiddly, especially with partial payments and fees deducted at source.
- **Webhook idempotency.** Payment providers deliver events more than once. Your "record payment" path must be safe to run twice.
- **Email deliverability.** Your chasing emails are worthless if they land in spam. Budget real time for domain setup, SPF/DKIM, and a decent sending provider.
- **Money arithmetic.** Integer minor units, never floats. Decide rounding rules for tax up front.

## When to revisit DDD properly

Revisit when one of these fires, not before:

- More than about 4-5 people touching the code, and merge conflicts start following predictable seams.
- The product grows a second real capability — time tracking, expenses, accounting export — and it starts fighting invoicing inside one model.
- You find yourself unable to change invoicing without breaking something unrelated.

At that point the boundaries will be obvious from the pain, which is a much better input than guessing today. If you want, I can run a proper decomposition then — there's a `swe-flow:domain-decompose` skill in this setup that turns a prose description into bounded contexts, aggregates, and events. Using it now would produce a tidy model of a product you haven't validated.

## What to do this week

1. Half-day session: glossary, invoice state machine, chasing rules. One document.
2. Agree the illegal state transitions and write them down as rules, not intentions.
3. Build the thin slice above. Ship it to one real freelancer.
4. Reassess after that conversation.
