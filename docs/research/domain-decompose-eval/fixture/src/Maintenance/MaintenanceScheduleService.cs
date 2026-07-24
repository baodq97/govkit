namespace RentField.Maintenance;

// Tracks service jobs for each unit: create, update, list, and compute the next
// due date from a fixed interval. Straightforward record-keeping — none of the
// pricing or allocation rules live here, and there is nothing to keep atomically
// consistent beyond a single record.
public sealed class MaintenanceRecord
{
    public Guid Id { get; set; }
    public string AssetTag { get; set; } = "";
    public DateOnly LastServiced { get; set; }
    public int IntervalDays { get; set; }
    public bool OutOfService { get; set; }
}

public sealed class MaintenanceScheduleService
{
    private readonly List<MaintenanceRecord> _records = new();

    public MaintenanceRecord Create(string assetTag, DateOnly lastServiced, int intervalDays)
    {
        if (string.IsNullOrWhiteSpace(assetTag)) throw new ArgumentException("Asset tag required.");
        if (intervalDays <= 0) throw new ArgumentException("Interval must be positive.");

        var record = new MaintenanceRecord
        {
            Id = Guid.NewGuid(),
            AssetTag = assetTag,
            LastServiced = lastServiced,
            IntervalDays = intervalDays
        };
        _records.Add(record);
        return record;
    }

    public void Reschedule(Guid id, DateOnly lastServiced)
        => _records.Single(x => x.Id == id).LastServiced = lastServiced;

    public IReadOnlyList<MaintenanceRecord> List(string assetTag)
        => _records.Where(r => r.AssetTag == assetTag).ToList();

    // The one calculation in this module: when a unit is next due for service.
    public DateOnly NextDue(Guid id)
    {
        var r = _records.Single(x => x.Id == id);
        return r.LastServiced.AddDays(r.IntervalDays);
    }
}
