using RentField.Allocation;

namespace RentField.Logistics;

// Plans depot hand-offs and delivery runs. Logistics and Allocation are built by
// the same squad and use each other's model types directly; the two evolve
// together and ship in the same release. A change to how a reservation is shaped
// is a change here too — neither side can move without the other.
public sealed class LogisticsService
{
    private readonly List<DeliveryRun> _runs = new();

    // Handler: every committed reservation becomes a delivery to plan.
    public void On(EquipmentAllocated e)
        => _runs.Add(new DeliveryRun { AssetTag = e.AssetTag, FromDepot = e.DepotId, Date = e.Start });

    public IReadOnlyList<DeliveryRun> Pending() => _runs;
}

public sealed class DeliveryRun
{
    public string AssetTag = "";
    public string FromDepot = "";
    public DateOnly Date;
}
