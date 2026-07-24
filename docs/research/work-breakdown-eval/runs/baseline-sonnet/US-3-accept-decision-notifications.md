## US-3 — Accept decision notifies both depots

Parent: RFC-9101 (Depot transfer approval and notification flow)
Size: S
Blocked by: US-2 (needs a real accepted decision to describe, and hangs its email off that
decide-entry)

### Story

As a sending or receiving depot, I want an email when a transfer involving me is accepted, so I
find out from the system instead of when a truck shows up.

### Touches

- `src/Vendors/ExternalServiceClients.cs`: generalize `SendGridNotificationClient` beyond its one
  fixed-subject receipt (`SendReceipt`) so it can send a transfer-decision email with its own
  subject and body (Q5 for the one-capability-vs-two assumption; Q6 for the cross-team-ownership
  flag on this file).
- The accept branch from US-2: call the new capability for both the sending depot and the
  receiving depot once accept has actually succeeded.

### Acceptance criteria

- **AC4 (accept half)** — "on accept ... the sending depot and the receiving depot each receive an
  email describing the decision."

### Verification

Accept a pending transfer → both the sending-depot and receiving-depot addresses receive an email
whose subject and body describe the accept decision (asset, from-depot, to-depot). No email on a
refused or no-op accept attempt (see US-2's guards).

### Why this is separate from US-2

"The unit gets scheduled" and "the two depots get an email" are different proofs (break trigger
2), and US-2 is already an L on its own — folding the email in would tip it past "can demo in one
sitting" (trigger 4). The RFC also sequences it explicitly: "the email is only worth sending once
there is a real accept/reject outcome to describe."
