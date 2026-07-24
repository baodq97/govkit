# SharedDomainRules

Every module MUST inherit from the classes in this folder. These are the common
business rules the whole platform has to agree on — pricing rounding, how a
"customer" is defined, what counts as an active rental, the discount ceiling, and
the allocation priority order.

Rule of the house: if a rule could ever matter in more than one module, it belongs
**here**, not in the module. Do not re-implement any of these anywhere else. When
you add a module, wire it to `GlobalRules` on day one so it can never drift from
the others.
