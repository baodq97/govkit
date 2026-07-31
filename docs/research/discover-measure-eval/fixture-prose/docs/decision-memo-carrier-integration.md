# Memo — do we integrate with the carrier?

Two carriers cover 80% of our sailings. One publishes a booking API; the other takes email and
replies within the day.

If we integrate with the first, slot availability stops being a phone call for most bookings. The
cost is that our booking flow has to cope with two completely different upstreams, and the email
carrier will not change.

Recommendation: integrate the one that has an API, keep the email path manual, and do not pretend in
the model that the two are the same thing. Nobody has signed off on this yet.
