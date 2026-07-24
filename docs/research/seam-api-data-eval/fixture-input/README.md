# RentField

RentField is a B2B platform for companies that rent out heavy industrial
equipment — excavators, generators, pumps, aerial lifts — and run the field
service that keeps that equipment working. Customers reserve units for a window,
we deliver from the nearest depot, bill them, and service the fleet on a
schedule.

## What the platform does

- **Reserving and allocating units.** The heart of the business. We hold a
  finite fleet across several depots and must commit the right physical unit to
  the right customer for the right window without ever promising the same unit
  twice. This is where we win or lose against competitors, and the rules here
  change often.
- **Pricing.** Rental prices move with how busy the fleet is. A unit in high
  demand costs more, and there is a floor below which a rep may not discount, no
  matter how badly they want the deal. Pricing publishes each quote for the
  rentals team to consume.
- **Rentals.** Turning a quote and a reservation into a booked order, then
  handing it to billing.
- **Maintenance scheduling.** Routine record-keeping: when each unit was last
  serviced and when it is next due. Useful, not a differentiator.
- **Catalog and reference data.** The category tree for equipment, the list of
  depots, and the tags used to label units. Simple lookups.
- **Logistics.** Planning depot hand-offs and delivery runs.

## Teams

- The **Fulfilment squad** builds allocation and logistics together as one team;
  the two share model types and always ship in the same release.
- The **Billing team** runs an internal invoicing service. Rentals is its main
  customer — when rentals needs a new field on an invoice, billing adds it. The
  two teams agree the API between them.

## Outside systems

- A legacy **ERP** we sync from every night over an old SOAP endpoint. It is
  unstable, its data shapes shift without notice, and its vendor will not change
  anything for us.
- A third-party **CRM** we import customer accounts from nightly. We take its
  record shapes exactly as they arrive; we have no leverage to change them.
- **Stripe** for card payments, **Auth0** for login, **SendGrid** for email.
  All off-the-shelf.

## Requests in flight

- Sales wants an **activity history on orders** — a timeline in the order screen
  showing who touched an order and when. It's a convenience for them; there is no
  legal or retention angle to it.
