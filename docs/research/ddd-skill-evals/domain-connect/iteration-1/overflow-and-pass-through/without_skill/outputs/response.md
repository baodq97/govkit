Traced the quote-to-invoice lifecycle across all seven contexts and wrote it up as a message flow.

**Artifact:** `/home/bd/personal-projects/govkit/docs/research/ddd-skill-evals/domain-connect/iteration-1/overflow-and-pass-through/without_skill/repo/docs/domain/flows/quote-to-invoice.md` — front-matter `DOMAIN-FLOW-0001`, sitting next to `context-map.md`. It has the as-is flow (13-row message table + Mermaid sequence diagram), eight ranked findings, a target flow diagram, and four open questions. Mermaid to match the repo's only other diagram; no renderer installed locally, so the diagrams are unverified visually.

I added a file and touched nothing existing — the `model.yaml` files and `context-map.md` are unchanged, since other evals read the same fixture.

## The shape of the flow

13 messages are needed end to end; 11 are modelled, and **all 11 are events**. The repo defines no commands and no queries anywhere. The two missing messages are the only two that cross a boundary to ask for a decision — and they carry the hardest invariant in the business. Nothing forced them to be designed, so they got built as query-then-mutate.

After confirmation the flow splits into two chains that **never rejoin**: Booking → Routing → carrier, and Consolidation → Customs → Invoicing. Nothing correlates the shipment that went on a truck with the declaration that cleared and the invoice that was raised.

## What the trace turned up

**F1 — the no-overbooking invariant is enforced outside the context that owns it (critical).** Consolidation owns *"committed volume must never exceed capacity"*, but the decision "is there room?" is taken in Booking, from a query's return value, and only then does Booking command the reserve. Between answer and command the answer is a guess. Two bookings both read "3 m³ free", both proceed. That is hotspot #1 — *"nobody agrees where the check should have happened"* — and the flow says where: nowhere. Business cost isn't a data glitch; an overbooked container bumps a shipment, and that breaks the Guaranteed Consolidation promise, the +18% premium product. Fix: delete the query, send one `ReserveCapacity` command Consolidation may refuse.

**F2 — the confirmed timeline violates a confirmed invariant (critical).** The customs clerk stated *"a shipment cannot be handed to a carrier before its declaration is submitted"*. The timeline puts `ShipmentHandedToCarrier` at #6 and `DeclarationSubmitted` at #8. The message flow makes it worse: Customs is triggered by `ContainerSealed` (#7), so the declaration cannot exist before sealing, which is already after hand-off. As drawn, the invariant is unsatisfiable — nothing in the flow could ever hold it. Either the timeline is wrong or Routing hands over shipments illegally today. Different fixes, so this is the first question to settle.

**F3 — no message carries the shipment's identity (high).** `ShipmentRef` is listed as shared across four contexts, but no message carries it. The identifier chain is `bookingId` → `containerId` → `declarationId` → `invoiceId`, each hop dropping the last. `DeclarationCleared(declarationId, clearedAt)` is all Invoicing ever receives — it can satisfy its own invariant while having no idea which customer or which price the line belongs to. Shared DB reads are filling the gap, which is why `ShipmentRef` looks like a building block instead of a payload field.

**F4 — the premium never reaches the invoice (high).** Invoicing's only inbound message is `DeclarationCleared`. The product tier is set at quote/booking time and both payloads drop it; `ContainerSealed` carries `fillRate`, the one number showing whether the promise was kept, and it goes to Customs, not Invoicing. So the differentiating product's revenue is reconstructed off-model, and no message carries evidence for a refund dispute.

**F5 — Routing is a pass-through, not a context (medium).** Its own model says no aggregates, *"owns no rule of its own"*. It consumes `BookingConfirmed`, emits `ShipmentHandedToCarrier`, carrier from a standing contract. That's an outbound adapter with a name and 3 tables. Either collapse it into Booking's ACL, or give it the decision it's missing — hotspot #3, carrier refusal of a sealed container, is the rule with no home. Recommend collapse now (business model rates routing "no differentiation — the partner network is the asset, not the routing step"), but don't collapse before F2 is answered.

**F6/F7/F8 (medium–low).** No quote-acceptance message exists and `BookingRequested` doesn't carry `quoteId`, so Quoting's validity rule is written down and unreachable. The `ConsignmentLine` shared kernel is doing a message's job — `BookingRequested` carries only an aggregate `volumeM3`, so Consolidation must reach into Booking's data to plan a stack; the word also means two different things at the two ends (hotspot #2), so that seam needs translation, not a shared type. And Notifications subscribes to Invoicing alone, so the customer only hears from us at invoice time.

## First call

F2 before anything else — it's a fork, and the two readings need different fixes. F1 next; it has a named incident and a direct line to the premium product.
