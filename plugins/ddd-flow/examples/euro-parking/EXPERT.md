# Domain expert session — Euro Parking

> **What this is.** The kata assigns one participant the Domain Expert role: *"mimic the expert for
> parking lot software & management, take business decisions, have the last say on requirements."*
> This file is that person's answers, given in one session, to the questions the modelling raised.
> They stay inside the twelve requirements in `INPUT.md` and add operating detail; per the kata's
> guardrail they are **not** allowed to simplify the inherent complexity away.
>
> **Provenance:** answers spoken by the domain expert in this session, 2026-07-27. Where the expert
> said they did not know, that is recorded as "don't know" and stays unknown — it is not an
> invitation to fill the gap.

**In the room:** Domain Expert (25 years operating parking sites for a mid-size European operator,
now advising the start-up), plus the modeller. No developer, no legal counsel, no finance.

---

## Does anything know that a car actually parked?

> In a garage, yes. Every bay has a sensor in the ceiling — that is how the guidance signage knows
> which way to point you, it counts free bays per level and per type. In a lot, no. A lot is asphalt
> and painted lines. Nobody knows whether bay 17 has a car in it until somebody walks past it.
>
> That is the real difference between the two products, and people keep trying to make us pretend
> otherwise. In a garage we can tell a driver "go to level 3, bay 212". In a lot the best we can
> honestly do is "area C" and let them find a space.

**So the ticket in a lot names an area, not a bay?**

> Correct. Same field on the card, different meaning. Bay in a garage, area in a lot.

**And the spot is released when?**

> Sensor clears in a garage. In a lot there is nothing to release, because nothing was held.

## What if the driver arrives and the bay is taken?

> In a garage that basically doesn't happen, because the sign only sends you to a bay the sensor
> says is free. When it does — sensor fault, or someone parked across two bays — the driver drives
> on and takes the next free one, and the sensors sort themselves out within a minute or two. We do
> not chase it. There is no consequence for the driver.

## What if the site is full?

> The entrance sign says FULL and the barrier does not open. No ticket is issued. If only the
> electric bays are full and you said you drive an electric car, we still let you in and give you a
> normal bay — you just don't get a charger.

**And a truck when the truck bays are full?**

> Then the truck does not come in. A truck cannot use a car bay. It goes the other way round: a car
> may be sent to a truck bay when the car bays are gone, and it pays the car rate. Never the reverse.

## The customer states their vehicle type at the entrance. What if they lie?

> In a lot, nothing happens, because nobody checks. In a garage the camera reads the plate and our
> supplier's system tells us the class from the registration — if it disagrees with what was typed
> in, the driver is charged the higher of the two rates when they pay, and the site manager gets it
> on the daily exceptions list.

**And the disabled and family bays?**

> Those are not vehicle types, whatever the requirement says. Those are entitlements of the person,
> not the car. The machine has no way to check a disabled badge and we have never pretended it does
> — a patrol walks the site and issues a notice. Family bays nobody enforces at all. Do not build a
> rule for those two; build the report that shows a site manager who parked there.

## The magnetic stripe — is it the truth, or a copy?

> The system is the truth. The stripe is a copy, so the machines can be quick.
>
> But — and this is the part everyone gets wrong — **the barrier must open when the network is
> down.** A driver trapped in a garage at 2am because head office is unreachable is the worst thing
> that can happen to us; it ends up in the local paper. So when the exit terminal cannot reach the
> system, it reads the stripe, and if the stripe says paid, it opens.

**Even though the stripe can be rewritten?**

> Yes. We know. It has been abused perhaps four or five times in fifteen years, always at the same
> two sites, and every time the reconciliation the next morning caught it — the exit is logged in
> the terminal even offline, and when the link comes back the terminal uploads what it did. If the
> upload says a ticket left without a payment against it, that is on the exceptions list and the
> site manager decides: usually we write it off, occasionally we send it to the plate we captured.
>
> Losing a few euros a year to that beats trapping one customer.

## Payment and exit — how long between them?

> Fifteen minutes. Pay, walk to your car, drive out. Past fifteen minutes the exit terminal refuses
> the card and you go back to a payment machine and pay the difference. That is a standing complaint
> from customers and we are not changing it.

## What is the amount?

> Per started fifteen minutes, at a rate the operator sets per site and per vehicle class. First
> fifteen minutes free at most sites — that is a per-site setting, some airport sites charge from
> minute one. There is a daily cap, also per site. Nights and weekends can have their own rates at
> some sites; not all.
>
> Rates change constantly. A site manager changes a rate for a weekend event and it has to be live
> at the machines that evening. If you make me raise a support ticket to change a rate, we will not
> buy your product.

**Who sets them, you or us?**

> The operator. Always. You give us the screen.

## Lost ticket?

> Flat charge, the daily cap for that vehicle class, paid at the payment machine — there is a button
> for it. No attendant, no phone call. You then get a fresh card that says paid, and you leave.

## Unpaid card at the exit?

> The machine gives it back and the sign says NOT PAID. Barrier stays down. There is a payment
> machine before every exit for exactly that reason.

## Are the cards reused?

> Of course. The exit machine keeps the card, a technician refills the entrance machines from the
> collected stack twice a week. The same piece of plastic will be a hundred different visits over
> its life. The stripe is rewritten every time.

## The ten years — what exactly is kept?

> The fiscal record: site, entry time, exit time, amount, VAT, payment method, and the machine it
> was paid at. That is what a tax auditor asks for, and in Germany it is ten years under GoBD.
>
> Not the plate. The plate is only in the garage camera system, and that is deleted after seven days
> — we agreed that with the works council and it is not negotiable.

**Is ten years the same everywhere?**

> No, and this is going to bite you. Germany and Austria ten. Netherlands seven. It is different
> again in France and I do not know the number — ask a tax adviser per country. Do not build ten
> years into the code.

## What does an operator actually do all day?

> Six things, and none of them are in your requirements list.
>
> 1. **Set up a site** — how many bays, what type, which level or area, where the entrances and
>    exits are. That happens once, then gets edited whenever they repaint the lines.
> 2. **Set tariffs**, as I said. Weekly, at some sites daily.
> 3. **Reconcile the takings**, every morning, per site: what the machines say they took against
>    what the bank says arrived, and what the coin box actually held.
> 4. **Work the exceptions list** — the offline exits, the plate mismatches, the barrier that stuck
>    open for forty minutes last night.
> 5. **Watch occupancy** — how full was I at 5pm on Friday, per type. That is how they decide
>    whether to repaint ten car bays into six truck bays.
> 6. **Let someone out**, remotely, when a machine has eaten their card. Every site has an intercom
>    to a control room.

**Which of those would they pay for?**

> Three and five. Reconciliation is four hours a week per site done by hand today, and occupancy
> reporting is what they take to the landlord to argue about rent. One and two are table stakes —
> everybody's system does them, but if yours does them badly you lose the deal.

## Is the guidance system yours?

> No, it is bought — cameras, sensors, the LED signs, all one supplier, and there are three
> credible suppliers in Europe. We integrate it. Nobody has ever chosen us because of the signage;
> they choose us and then ask which signage we support.

## How does the start-up make money?

> Per managed bay per month, plus a one-off for the integration at each site. Hardware is passed
> through at cost. The per-bay line is the one that hurts if it goes to zero.

## Which countries first?

> Germany, then Austria and the Netherlands. That is a decision from the founder, not from me.

## Anything you don't know?

> How the payment terminals talk to the acquirer — that is a supplier question and I have never
> needed to know. Whether the sensors can be trusted well enough to bill from, which somebody
> should test before you promise anyone occupancy-based pricing. And nothing about what a
> municipality tender wants, which is a different business from the one I have run.
