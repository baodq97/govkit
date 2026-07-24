From: Marcus Feld <marcus@loopback.io>
To: build-team@loopback.io
Cc: Priya Nadella
Subject: RE: post-purchase feedback thing — how it actually needs to work

Read Priya's brief. I'm on board with the outcome but let me tell you what
closes deals, because I'm the one on the calls.

Merchants don't care about surveys. They care about *response rate*. Every
merchant I talk to has tried some email survey tool and gotten crickets — the
emails sit unopened in a promotions tab for three days and die there. It's
demoralizing.

The thing that actually works is **SMS**. A text hits, people read it, they tap
a number. So my strong ask: the first version is one text message, one question,
one tap to answer. "How was your order? Reply 1–5." That's it. Anything longer
and we lose them. If we ship a long web form nobody fills out, we've built a
very elegant thing that generates no data and I can't sell it.

So please: SMS-first, one question, brutally short. We can add fancy stuff later
but the wedge is a text people actually answer.

Also — and this matters for whatever you pick for delivery — heads up that
finance is not renewing the SendGrid contract, it lapses Aug 31. After that our
only sanctioned outbound path is the SES setup the infra folks stood up. So
whatever sends the messages has to go through that once the calendar flips. Just
flagging so nobody builds on top of something that's about to disappear.

Gotta jump on a call. Ping me if you need the actual merchant quotes.

— Marcus
Head of Sales
