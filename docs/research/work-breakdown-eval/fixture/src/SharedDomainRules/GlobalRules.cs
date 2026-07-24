namespace RentField.SharedDomainRules;

// The single definition of the platform's shared business rules. Intent: one
// place so no module can define "customer", "active", or the discount ceiling
// differently from another. Every module is expected to call into this.
public static class GlobalRules
{
    public const decimal MaxDiscountRate = 0.35m;

    // What every module is told to treat as a "customer".
    public static bool IsCustomer(string accountType) =>
        accountType is "renter" or "prospect" or "partner-account";

    // Allocation priority order that pricing, rentals and logistics are all
    // expected to reuse verbatim.
    public static readonly string[] AllocationPriority = { "contract", "walk-in", "internal" };

    // Rounding rule imposed on every money figure across the platform.
    public static decimal Round(decimal amount) => Math.Round(amount, 2, MidpointRounding.AwayFromZero);
}
