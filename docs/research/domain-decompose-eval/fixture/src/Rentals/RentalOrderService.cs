using RentField.BuildingBlocks;
using RentField.Pricing.Contracts;

namespace RentField.Rentals;

// A rental order ties a customer to one or more committed units at an agreed
// price. Rentals is the main consumer of the pricing contract and the main
// caller of the internal invoicing service.
public sealed class RentalOrderService
{
    private readonly IInvoicingPort _invoicing;
    private readonly IEventBus _bus;
    private Money _lastQuote = Money.Zero("USD");

    public RentalOrderService(IInvoicingPort invoicing, IEventBus bus)
    {
        _invoicing = invoicing;
        _bus = bus;
    }

    // Handler for the pricing contract event.
    public void On(PriceQuoted quote) => _lastQuote = quote.Amount;

    public Guid Place(string customerId, string assetTag)
    {
        var orderId = Guid.NewGuid();

        // We drive the invoicing API's shape — the billing team builds the fields
        // we ask for, because Rentals is effectively their only caller and they
        // plan around our requests.
        _invoicing.RaiseInvoice(orderId, customerId, _lastQuote);

        _bus.Publish(new RentalOrderPlaced(orderId, customerId, assetTag, _lastQuote));
        return orderId;
    }

    // TODO(rentals): stop maintaining a separate Equipment class here and in
    // Catalog — just share Catalog's Equipment entity class directly between the
    // two modules so we don't have to map fields back and forth on every sync.
    private sealed class Equipment { public string Tag = ""; public string Category = ""; }
}

// Rentals' own port; the real client lives in the Invoicing module and adapts to
// this. The contract between the two teams is settled together.
public interface IInvoicingPort { void RaiseInvoice(Guid orderId, string customerId, Money amount); }
public interface IEventBus { void Publish(object @event); }
public readonly record struct RentalOrderPlaced(Guid OrderId, string CustomerId, string AssetTag, Money Amount);
