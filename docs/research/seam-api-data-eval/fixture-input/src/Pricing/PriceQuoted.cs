namespace RentField.Pricing.Contracts;

// STABLE INTEGRATION CONTRACT. Other modules depend on this shape, not on anything
// inside Pricing. It is versioned: a breaking change ships as a NEW version and the
// old one is kept until every consumer has migrated. Changelog below.
//
//   v1: (Category, Amount)
//   v2: (Category, Amount, Utilization, ContractVersion)   <-- current
//
// Known consumers: Rentals.
public readonly record struct PriceQuoted(
    string Category,
    RentField.BuildingBlocks.Money Amount,
    decimal Utilization,
    string ContractVersion);
