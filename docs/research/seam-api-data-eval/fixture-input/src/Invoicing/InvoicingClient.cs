using RentField.BuildingBlocks;
using RentField.Rentals;

namespace RentField.Invoicing;

// Thin client over our OWN internal invoicing service, which another team inside
// the company runs. Rentals is its main customer, so when Rentals needs a new
// field on an invoice, the invoicing team adds it to their API. We agree the
// contract together and they plan their work around our requests.
public sealed class InvoicingClient : IInvoicingPort
{
    private readonly IHttpApi _api;
    public InvoicingClient(IHttpApi api) { _api = api; }

    public void RaiseInvoice(Guid orderId, string customerId, Money amount)
        => _api.Post("/invoices", new { orderId, customerId, amount.Amount, amount.Currency });

    // Handler: also raise an invoice when an order is placed via the bus.
    public void On(RentalOrderPlaced e) => RaiseInvoice(e.OrderId, e.CustomerId, e.Amount);
}

public interface IHttpApi { void Post(string path, object body); }
