using RentField.BuildingBlocks;
using RentField.Pricing.Contracts;

namespace RentField.Pricing;

// Dynamic price for a rental window. The rule that makes this ours: the quote can
// never fall below a floor derived from how heavily the fleet is already used.
// When utilization is high the floor rises; a rep cannot discount under it to win
// a deal, no matter what discount they request.
public sealed class PricingEngine
{
    private readonly IEventBus _bus;
    public PricingEngine(IEventBus bus) { _bus = bus; }

    public Money Quote(string category, Money listRate, decimal utilization, decimal requestedDiscount)
    {
        if (utilization is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(utilization));

        // Floor climbs with utilization: at 100% utilization the floor is the full
        // list rate (no discount permitted at all).
        var floor = listRate.Multiply(0.60m + 0.40m * utilization);

        var discounted = listRate.Multiply(1m - requestedDiscount);
        var final = discounted.Amount < floor.Amount ? floor : discounted;

        // Publish the quote on the shared contract for the rentals team.
        _bus.Publish(new PriceQuoted(category, final, utilization, ContractVersion: "v2"));
        return final;
    }
}

public interface IEventBus { void Publish(object @event); }
