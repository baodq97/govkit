# Euro Parking — the brief

> **This file plus `EXPERT.md` are the source material for this project.** There is no code, no schema and no existing documentation. `EXPERT.md` records one session with a domain expert; anything neither file states is not known.

## The company

Let's assume you are a start-up, and you want to provide software for parking lots & garages for all
major cities in Europe and for various park area providers.

## Requirements

1. You can enter and leave the parking lot or the parking garage through several entrances and exits.
2. There are specific parking spots for different types of vehicles (motorcycles, car, electric car,
   truck/bus, handicapped persons, family-friendly parking spots).
3. Each parking spot has a unique identifier (for parking garage – number & floor or for parking lot
   – number & area).
4. The customer may collect a ticket at each entrance and leave via any exit.
5. The ticket given to the customer contains a parking spot ID where to park.
6. The ticketing information must be stored for 10 years due to tax reasons.
7. There are three types of terminals:
   1. Customers can use the terminals at the entrances to communicate their vehicle details to the
      system.
   2. Customers drive into the parking garage / lot via entrance terminals where they collect the
      tickets.
   3. Customers can pay their tickets at the payment terminals (details of the actual payment process
      like select payment method, put in credit card, enter PIN can be omitted).
   4. Customers must insert their paid ticket at the exit terminals to leave the parking lot / garage.
8. The terminals at the exit gates collect the paid ticket.
9. The ticket has a read/write magnetic stripe containing information including a position to park.
10. The magnetic stripe can be changed by the terminals.
11. Parking garages have a parking guiding system, that guides customers to the correct parking spot.
    The guiding system recognizes the vehicle and guides it to the right parking spot.
12. Parking lots do not have such a system.

## Guardrails

As domain expert, please stay within these guardrails when detailing out the requirements, if
possible. In some cases, it can make sense to challenge/rethink the original requirements, but be
careful to not modify them in such a way that the inherent complexity becomes too limited.

The focus is learning DDD, not sticking to the requirements word for word. However, some amount of
complexity is important to get a realistic impression.

## Provenance

Requirements reproduced verbatim from the **SAP Domain-Driven Design Kata**,
<https://github.com/SAP/curated-resources-for-domain-driven-design/blob/main/ddd-kata.md>
(Apache-2.0). The ddd-crew starter modelling process names this kata as the way to practise the
process end to end.
