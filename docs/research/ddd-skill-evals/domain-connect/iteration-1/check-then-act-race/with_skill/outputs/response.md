I walked three scenarios through the boundaries and wrote them to `docs/domain/message-flows/`.

**Verdict: the split holds in the back half and breaks in the front half.** Do not start building the Booking↔Consolidation boundary as drawn.

## What I traced

| Flow | Scenario | Why | Msgs | Cross-boundary queries |
|---|---|---|---|---|
| 0001 | Book a part-load shipment onto a departure | the scenario the +18% premium is sold against | 7 | 1 |
| 0002 | Sealed container → cleared → invoiced → notified | most crossings (4 of 7 contexts), only path reaching Invoicing | 6 | **0** |
| 0003 | Two bookings race for the last slot | discovery hotspot #1, the March double-commit | 8 | 4 |

I skipped quote issuing (single context, teaches nothing) and the refused-carrier case (hotspot #3 has no modelled path at all — nothing to draw, so it is an open question instead).

## The three things worth stopping for

**1. Booking↔Consolidation is check-then-act across a boundary — the March double-commit is the boundary, not a bug.** Flow 0001 #2 asks Consolidation for remaining capacity, #3 commands it to reserve. Flow 0003 shows what that costs: #2 and #4 both return 20 m³, then #5 and #7 both act on that answer, and 33 m³ lands on a 20 m³ container. The invariant lives in `ContainerLoad` (Consolidation); the decision is taken in Booking. Two aggregates cannot uphold one rule under concurrency, and no amount of care inside Booking closes the gap. Fix: one `ReserveCapacity` command that Consolidation accepts or rejects. That also takes the pair from 8 messages to 3, so the chatty-pair reading resolves itself — I am explicitly **not** proposing a merge.

**2. Customs' invariant has nothing enforcing it.** Customs owns *"a shipment cannot be handed to a carrier before its declaration is submitted"*, but flow 0001 hands to the carrier at #6 on `BookingConfirmed`, while `DeclarationSubmitted` does not occur until flow 0002 #3. The context map has no Customs↔Routing edge at all. This one was not on anyone's hotspot list and it is a live compliance hole.

Conveniently it also fixes Routing. Routing today receives `BookingConfirmed` and forwards it, `aggregates: []`, *"owns no rule of its own"* — a hop, not a boundary. Subscribing it to `DeclarationSubmitted` (which currently has zero subscribers) gives it the one decision it should own. Cheaper than deleting the context, and the alternative — folding Routing into Booking — is worse: it puts the carrier-release rule next to the customer-commitment rule.

**3. Invoicing cannot produce an invoice from what it is sent.** It receives `DeclarationCleared {declarationId, clearedAt}` and emits `InvoiceIssued {invoiceId, customerId, total}`. Nothing on any path supplies customer, price, volume or the premium — Invoicing's only inbound edge in the whole map is Customs. Either there is an undocumented dependency (my guess: a shared database) or the model is wrong. Same class of problem one step earlier: `ContainerSealed {containerId, fillRate}` cannot build a `Declaration` keyed on `shipmentRef, portCode`. Fix these by widening the events, not by adding queries — do not put a synchronous hop into the one clean spine in the system.

## What is actually working

Flow 0002's spine — Consolidation → Customs → Invoicing → Notifications — is five messages, four contexts, **all events, zero queries, nothing blocked on anything being up**. That boundary set is sound and should not be re-litigated. Its problems are payload problems, not boundary problems. Worth recording so the next reviewer does not reopen it.

## What I need from people before this can be closed

The blocking one: **the rejection has no name.** Flow 0003 ends at message #8 in a state the business has already described — *"a shipment is bumped and the Guaranteed Consolidation promise is broken"* — and there is no event, command or read model for it anywhere in `docs/domain/`. The unhappy path of your highest-value scenario is unmodelled. I deliberately did not invent one; that goes to the planners via `domain-discover`, along with: is the premium refunded, or is the shipment re-planned onto the next departure? The shape of the fix to (1) depends on the answer.

Seven more open questions are in the index — including one you should not let slide: nobody has stated whether invoicing is *within* 24h of clearance, *after* 24h, or *every* 24h. Those are three different businesses and three different designs.

One note on hygiene: only the **events** in this model have agreed names. Every command and query I had to draw — `RequestBooking`, `RemainingCapacity?`, `ReserveCapacity`, `SealContainer`, `HandShipmentToCarrier` — is unnamed in the ubiquitous language and marked unconfirmed in the tables. If you build now, the team names them in code and you inherit whatever they pick.

## Files

- `docs/domain/message-flows/README.md` — index, 12 consolidated findings with evidence + status, 8 open questions
- `docs/domain/message-flows/DOMAIN-FLOW-0001.md` — booking commit
- `docs/domain/message-flows/DOMAIN-FLOW-0002.md` — clearance → invoice → notify
- `docs/domain/message-flows/DOMAIN-FLOW-0003.md` — the slot race

All `status: draft`, findings `proposed`. I did not touch a single `model.yaml` — accepted findings go back through `domain-decompose` in update mode so they pick up the reconciliation and stable-id rules, and the missing events go to `domain-discover` to be confirmed by people rather than by me.

Separately, and out of scope for this step: Consolidation owns the invariant behind the premium you charge for and is labelled `supporting` with 1 aggregate, while Invoicing is labelled `core` with 34 tables against a business model that says *"nobody has ever chosen us because of our invoices"*. Flows can show where the work happens; they cannot rank subdomains. That is a `domain-strategize` conversation — recorded in the index, not decided here.
