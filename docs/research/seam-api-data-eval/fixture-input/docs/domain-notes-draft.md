# Domain notes (draft — from an early whiteboard session, not kept up to date)

These are rough notes from when we first sketched the system. Some of it changed
during build; nobody has cleaned this up.

## Modules we thought we'd have

- **Availability** — a standalone module that tracks which units are free on
  which dates, separate from anything else.
- **Allocation** — picks a unit once Availability says it's free.
- **Pricing**, **Rentals**, **Maintenance**, **Catalog**, **Logistics**.

## Early rules we wrote down

- Pricing is just list price minus whatever discount the rep negotiates. There is
  **no minimum** — if a rep wants to give it away to land a strategic account,
  that's a sales decision, not a system rule.
- To squeeze more revenue out of the fleet, a single unit **can be held at two
  depots at once** and whichever depot's customer shows up first gets it.
- Maintenance is tracked **inside Allocation** — it's just another status a unit
  can be in, so it doesn't need its own module.

## Open questions from that session

- Do we need a separate reference-data area, or does each module keep its own
  lists? (Undecided at the time.)
