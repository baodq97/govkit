# Ubiquitous language

Terms as participants used them, with the definition **they** gave. Where a word was used but never
defined, the row says so instead of supplying a definition.

| Term | Definition | Held by | Status |
|---|---|---|---|
| **Transfer** | a physical depot-to-depot move of a unit — someone drives it over, usually overnight | Operations (Ha) | confirmed |
| **Transfer** | the £180 line on the invoice; the physical move is out of scope — "the physical move isn't my problem, the charge is" | Finance (Minh) | confirmed |
| Dispatched | the point after which Finance bills the transfer even if the contractor cancels | Finance (Minh) | confirmed |
| Dispatched | when the driver sets off with the unit — the drive that Ops says the charge depends on | Operations (Ha) | confirmed |
| Available | the state a unit is put into once it is physically at the receiving depot | Operations (Ha) | confirmed |
| Committed | a unit held for a window; the same unit may not be committed for two overlapping windows, even at different depots | Operations (Ha) | confirmed |
| Booked | used interchangeably with committed ("if the machine is already booked") | Operations (Ha) | confirmed |
| Reservation | used, not defined — the thing that must be cancelled when a unit goes out of service | Operations (Ha) | candidate — definition never elicited |
| Out of service | a unit state; the depot manager decides it, and it obliges cancellation of the unit's reservations | Operations (Ha) | confirmed |
| Depot manager | the role with authority to declare a unit out of service | Operations (Ha) | confirmed |
| Contractor | the party who asks for a machine at a different depot, and who cancels | Facilitator / Ha / Minh | confirmed |

## The collision — "Transfer"

Both rows stay. This is the session's most valuable output and merging it into one definition would
destroy it.

The two meanings are not two words for one thing. They have **different lifecycles**:

| | Operations' Transfer | Finance's Transfer |
|---|---|---|
| Begins at | the drive starting (element 7) | the request being raised (element 4) |
| Ends at | arrival at the receiving depot (element 9) | the invoice line, once raised |
| Survives cancellation? | no — no drive, no move | yes — "we charge on request, not on completion" |
| Depends on the drive happening? | it *is* the drive | explicitly not |

Ha's "the charge only exists if the drive actually happened" and Minh's "not always" are the same
sentence about two different objects. The disagreement (HS-1) is downstream of the collision, not
separate from it.

A second, quieter collision sits under **Dispatched**: both use the word for the same moment, but
Finance treats it as a billing point of no return and Ops treats it as the start of a physical
activity whose completion is what counts. Recorded, not reconciled.

Note also that **committed**, **booked** and **reservation** were used for what may be one concept
or three. Nobody was asked. Left as three rows with the ambiguity visible rather than collapsed into
a tidy single term.

## Not resolved here

Naming is `domain-decompose`'s problem to inherit, not discovery's to solve. What discovery owes it
is both meanings, with holders attached — which is what this file is.
