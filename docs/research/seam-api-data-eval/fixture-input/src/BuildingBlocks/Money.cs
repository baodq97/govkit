namespace RentField.BuildingBlocks;

// A currency-safe amount. No business policy lives here — arithmetic only.
// Reused by every module that touches money. Immutable; equal by value.
public readonly record struct Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Cannot add amounts in different currencies.");
        return this with { Amount = Amount + other.Amount };
    }

    public Money Multiply(decimal factor) => this with { Amount = Amount * factor };

    public static Money Zero(string currency) => new(0m, currency);
}
