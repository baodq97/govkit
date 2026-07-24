namespace RentField.Accounts;

// Customer accounts. Each account is owned by a sales rep: SalesRepId is the rep
// who owns the commercial relationship and is the only person allowed to change
// terms on it.
public sealed class SalesAccount
{
    public string AccountId { get; set; } = "";
    public string SalesRepId { get; set; } = "";   // the rep who owns this account
    public string Name { get; set; } = "";
    public string Segment { get; set; } = "";
}

public sealed class CustomerAccountService
{
    private readonly Dictionary<string, SalesAccount> _accounts = new();

    // Nightly import from the third-party CRM. We take the CRM's record shape
    // exactly as it arrives — its field names, its segment codes, its id format —
    // and store it. We have no say over the CRM's model and do not reshape it;
    // our code just mirrors whatever the vendor exports.
    public void ImportFromCrm(CrmAccountRow row)
    {
        _accounts[row.crm_account_id] = new SalesAccount
        {
            AccountId = row.crm_account_id,
            SalesRepId = row.owner_rep_code,
            Name = row.account_name,
            Segment = row.segment_code
        };
    }

    public SalesAccount? Find(string accountId) => _accounts.GetValueOrDefault(accountId);
}

// Shape dictated entirely by the CRM vendor's export — we mirror its field names
// verbatim rather than translating them.
public sealed class CrmAccountRow
{
    public string crm_account_id = "";
    public string owner_rep_code = "";
    public string account_name = "";
    public string segment_code = "";
}
