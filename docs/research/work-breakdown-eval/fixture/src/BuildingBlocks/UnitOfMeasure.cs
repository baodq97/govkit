namespace RentField.BuildingBlocks;

// Quantity + unit (hours, days, weeks). Pure conversion helpers, no business
// policy. A neutral technical type shared across modules; it carries no single
// module's rules and never changes on any one module's behalf.
public readonly record struct UnitOfMeasure(decimal Quantity, string Unit)
{
    private static readonly Dictionary<string, decimal> HoursPer = new()
    {
        ["hour"] = 1m, ["day"] = 24m, ["week"] = 168m
    };

    public UnitOfMeasure ToHours()
    {
        if (!HoursPer.TryGetValue(Unit, out var factor))
            throw new InvalidOperationException($"Unknown unit '{Unit}'.");
        return new UnitOfMeasure(Quantity * factor, "hour");
    }
}
