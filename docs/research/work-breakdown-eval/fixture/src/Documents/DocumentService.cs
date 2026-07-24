namespace RentField.Documents;

// Stores files attached to rentals and accounts — signed agreements, delivery
// photos, inspection sheets. Each document has an owner: the user who uploaded
// it. Only the owner (or an admin) may delete it.
public sealed class Document
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = "";
    public string OwnerUserId { get; set; } = "";   // owner = the user who uploaded it
    public string LinkedEntityId { get; set; } = "";
}

public sealed class DocumentService
{
    private readonly List<Document> _docs = new();

    public Document Upload(string fileName, string uploaderUserId, string linkedEntityId)
    {
        var d = new Document
        {
            Id = Guid.NewGuid(),
            FileName = fileName,
            OwnerUserId = uploaderUserId,
            LinkedEntityId = linkedEntityId
        };
        _docs.Add(d);
        return d;
    }

    public void Delete(Guid id, string requestingUserId)
    {
        var d = _docs.Single(x => x.Id == id);
        if (d.OwnerUserId != requestingUserId)
            throw new InvalidOperationException("Only the document owner may delete it.");
        _docs.Remove(d);
    }
}
