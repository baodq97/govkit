using RentField.BuildingBlocks;

namespace RentField.Vendors;

// Thin adapters over third-party commodity services. None of these carry any of
// our business rules — each wraps a vendor SDK and nothing more. If a better
// vendor came along we would swap the adapter and move on. There is no model to
// build here.

// Card payments via Stripe.
public sealed class StripePaymentClient
{
    private readonly IStripeSdk _sdk;
    public StripePaymentClient(IStripeSdk sdk) { _sdk = sdk; }
    public string Charge(Money amount, string token)
        => _sdk.CreateCharge((long)(amount.Amount * 100), amount.Currency, token);
}

// Login / user identity via Auth0.
public sealed class Auth0IdentityClient
{
    private readonly IAuth0Sdk _sdk;
    public Auth0IdentityClient(IAuth0Sdk sdk) { _sdk = sdk; }
    public string? ResolveUserId(string bearer) => _sdk.Verify(bearer)?.Subject;
}

// Transactional email via SendGrid.
public sealed class SendGridNotificationClient
{
    private readonly ISendGridSdk _sdk;
    public SendGridNotificationClient(ISendGridSdk sdk) { _sdk = sdk; }
    public void SendReceipt(string to, string body) => _sdk.Send(to, "Your RentField receipt", body);
}

public interface IStripeSdk { string CreateCharge(long minorUnits, string currency, string token); }
public interface IAuth0Sdk { Auth0Principal? Verify(string bearer); }
public interface ISendGridSdk { void Send(string to, string subject, string body); }
public sealed class Auth0Principal { public string Subject = ""; }
