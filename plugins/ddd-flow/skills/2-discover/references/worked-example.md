# Worked example — 2-discover

**Input (DISCOVER mode):** an equipment-rental repo whose only domain writing is a set of schema
migration ADRs.

**Ground pass** produced candidates from table names: `ReservationCreated`, `InvoiceIssued` —
both marked `candidate`, sourced to ADR-0012.

**Interview, one question at a time:**

> *"Tell me about the last time a booking went wrong."*
> — "A unit got double-booked across two depots. It's the thing that hurts most."

That answer produced, in one exchange: a **confirmed** event (`EquipmentAllocated`), an
**invariant** stated for the first time (*"the same physical unit can never be committed twice for
overlapping windows, even from a different depot"*), and a **hotspot** (nobody agreed who releases
a unit when the depot changes mid-rental).

**Ubiquitous-language conflict found:** *"Transfer"* meant a physical depot-to-depot move to
operations, and a billing line item to finance. Both recorded, with holders. That single conflict
is worth more to the next step than the whole candidate list from the ground pass.

Note what the example does **not** do: it doesn't promote the two candidate events to confirmed
just because they came from an accepted ADR, and it doesn't settle who releases the unit — that
stays a hotspot with a name attached.
