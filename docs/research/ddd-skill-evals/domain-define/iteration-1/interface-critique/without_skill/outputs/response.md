**Verdict: don't freeze it.** The design reads tidy, but the tidiness is hiding three blockers on the Booking↔Consolidation seam — and one of them already cost you a double-committed container in March.

I wrote two documents into the repo:

- `docs/domain/booking/context-canvas.md` — the bounded context canvas. Booking never had its public interface written down anywhere; the canvas reconstructs it (purpose, inbound/outbound messages, language, decisions, assumptions, open questions) so domain experts can review the thing you're about to freeze.
- `docs/domain/booking/interface-review.md` — the critique: 12 interface questions applied, 10 fire, findings F1–F10 with severity and a recommended order of work.

**The three blockers**

1. **Query-then-command is the wrong message shape (F1).** Booking reads Consolidation's remaining capacity, decides for itself there's room, then commands a reserve. The no-overbooking invariant lives in Consolidation, so the decision is being made in the one context that can't enforce it — and the gap between read and write is a race. Two bookings read 20 m³ free, both reserve 15, both succeed. That's discovery hotspot 1 word for word. It should be one command Consolidation accepts or rejects, with a `CapacityRefused` answer carrying a reason. This isn't a locking problem to solve later; the message shape is what makes the race possible.

2. **`ConsignmentLine` is an internal entity exposed as a Shared Kernel (F2).** Both contexts write it, so neither can change it alone and nobody owns its rules — expensive on your most important seam. And it isn't actually shared: Booking's version has `weightKg` and `hazardClass`, Consolidation's has `stackable`. Same name, different shape, already diverged. Worse, Consolidation plans stacking without knowing weight while Booking's `hazardClass` goes nowhere — so the sharing isn't even delivering the data it was meant to. Demote it to a message payload (a value, not an entity) and let each side keep its own planning model.

3. **There is no failure surface (F6, F8).** The published events are `BookingRequested` and `BookingConfirmed` — happy path only. Nothing says refused, cancelled, amended, or bumped. Bumped is the one that stings: Guaranteed Consolidation is sold on the promise that a shipment won't be bumped, and the model can't express the event the premium exists to prevent. On top of that, `Booking.status` — the single field every consumer will branch on — has no enumerated values.

**Also worth your attention**

- `BookingConfirmed` publishes `containerId`, which is Consolidation's identifier for Consolidation's aggregate, and duplicates a fact Consolidation already announces via `CapacityReserved`. Meanwhile `BookingRequested` drops `customerId`, weight, hazard class and the line breakdown, so every consumer has to call back into Booking to enrich (F5).
- `ShipmentRef` is minted in Booking, keyed on by Customs' declarations, and published on no event. The identifier stitching the downstream chain together travels by a route nobody has documented (F4).
- "Consignment" means goods-handed-over in Booking and a billable line in Invoicing. Finance and ops already collide on this. Freezing propagates the ambiguity into every downstream contract (F3).
- No relationship names a pattern — who conforms to whom, where translation sits. "Downstream" even means *depends on* in `model.yaml` and *flows to* in the context map. "Frozen" is a statement about who's allowed to break whom, so this has to be settled first (F7).
- Booking is declared downstream of Quoting but holds no quote reference, so Quoting's validity-window invariant has no enforcement point anywhere (F9).

**The strategic caveat (F10).** Your context map hasn't been revisited since March, four of seven contexts are labelled core, and Consolidation — the capability the business model names as *the* differentiator and charges a premium for — is labelled supporting, while Invoicing ("nobody has ever chosen us because of our invoices") is core with 34 tables. If that classification is wrong, the Booking/Consolidation split is the seam most likely to move, and it's exactly the seam this interface spans. Freezing a contract across a boundary you may redraw buys nothing and costs a migration.

Steps 1–5 in the review all change the message set. Freeze now and you freeze twice. What *is* safe to publish today is the customer-facing vocabulary, once the "consignment" clash is resolved.

Everything above is at domain level — message shape, ownership, language, failure paths. No transport or endpoint design; that comes after the seam is settled.

Two open items I couldn't close from the repo and recorded as questions instead of guessing: who mints `ShipmentRef` and when, and whether a customer can amend volume after confirmation (which would silently invalidate a capacity reservation). Also flagged: no customer has been in any discovery session, so every "what customers value" claim in the business model is the commercial director speaking for them.
