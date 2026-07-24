# Loopback — Founder Brief (raw dump, please turn this into something buildable)

From: Priya Nadella (CEO/founder)
To: whoever picks this up
Re: what we're building next quarter

Okay bear with me because I'm excited about this one. 🚀

We keep hearing the same thing from our retail merchants: after someone buys, it
goes silent. They have no idea if the customer loved it, hated it, or is about to
churn and trash them on Trustpilot. The signal is just *gone*. That's the whole
reason Loopback exists — close the loop after the sale.

So here's the vision. We build a **customer intelligence platform** — think of it
as the operating system for post-purchase relationships. Long term I want a
**marketplace** where merchants can plug in third-party enrichment, share
anonymized benchmarks, and eventually buy/sell audience insights. Big, I know.
That's the north star.

For the actual build I already know the shape of it in my head:

- It has to run on a **real-time event-streaming backbone** (Kafka or similar) so
  every touchpoint is an event we can replay. This is non-negotiable for me,
  it's how modern data companies are built.
- On top of that we run an **AI sentiment engine** that reads every response and
  scores mood, so a merchant instantly sees who's angry.
- Then a slick dashboard.

Honestly the streaming + AI part is the moat. If we nail that, everything else
is just plumbing.

What merchants literally ask us for, in their words:
- "I just want to know when someone's unhappy so I can call them before they
  leave a bad review."
- "Send them a quick survey after the order ships and let me see the score."
- "Give me one screen where I can see how we're trending this week."

That's… kind of it, honestly, for what they'll pay for on day one. But the
platform is where we win.

Let's not overthink this. Marcus and Dana both have strong opinions on how the
surveys actually go out — talk to them, they don't fully agree and I don't want
to be the referee. I just want us to start building. Ship something merchants
can feel this quarter.

— Priya
