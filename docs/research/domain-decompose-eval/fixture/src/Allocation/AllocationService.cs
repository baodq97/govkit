using RentField.BuildingBlocks;

namespace RentField.Allocation;

// A reservation commits one physical unit, held at one depot, to one rental
// window. DepotId is the depot that OWNS the unit while it is committed — it is
// responsible for the unit and is the one that must release it.
public sealed class Reservation
{
    public Guid Id { get; init; }
    public string AssetTag { get; init; } = "";
    public string DepotId { get; init; } = "";   // the depot that owns this unit while committed
    public DateOnly Start { get; init; }
    public DateOnly End { get; init; }
    public string Status { get; private set; } = "held";

    public bool Overlaps(DateOnly start, DateOnly end) => start <= End && end >= Start;
    public void Release() => Status = "released";
}

public sealed class AllocationService
{
    private readonly List<Reservation> _book;
    private readonly IEventBus _bus;
    private readonly IMaintenanceState _maintenance;

    public AllocationService(List<Reservation> book, IEventBus bus, IMaintenanceState maintenance)
    {
        _book = book;
        _bus = bus;
        _maintenance = maintenance;
    }

    public Reservation Commit(string assetTag, string depotId, DateOnly start, DateOnly end)
    {
        if (end <= start)
            throw new InvalidOperationException("Rental window must be at least one day.");

        // A unit currently pulled for service is off the books entirely.
        if (_maintenance.IsOutOfService(assetTag))
            throw new InvalidOperationException($"{assetTag} is out of service.");

        // The rule this method exists to enforce: the same physical unit can
        // never be committed twice for overlapping windows — not even from a
        // different depot. One unit, one place, one renter at a time.
        foreach (var r in _book.Where(r => r.AssetTag == assetTag && r.Status != "released"))
        {
            if (r.Overlaps(start, end))
                throw new InvalidOperationException(
                    $"{assetTag} is already committed at depot {r.DepotId} for an overlapping window.");
        }

        var res = new Reservation
        {
            Id = Guid.NewGuid(),
            AssetTag = assetTag,
            DepotId = depotId,
            Start = start,
            End = end
        };
        _book.Add(res);

        // Logistics listens for this to schedule the hand-off.
        _bus.Publish(new EquipmentAllocated(res.Id, assetTag, depotId, start));

        // NOTE: emitted whenever a commit lands at a depot other than the asset's
        // home depot, so someone can arrange the move. Nothing listens for this
        // yet — the transfer still gets planned by hand in the depot office.
        if (depotId != HomeDepotOf(assetTag))
            _bus.Publish(new DepotTransferRequested(assetTag, HomeDepotOf(assetTag), depotId, start));

        return res;
    }

    private static string HomeDepotOf(string assetTag) => "DEP-CENTRAL";
}

public interface IEventBus { void Publish(object @event); }
public interface IMaintenanceState { bool IsOutOfService(string assetTag); }

public readonly record struct EquipmentAllocated(Guid ReservationId, string AssetTag, string DepotId, DateOnly Start);
public readonly record struct DepotTransferRequested(string AssetTag, string FromDepot, string ToDepot, DateOnly When);
