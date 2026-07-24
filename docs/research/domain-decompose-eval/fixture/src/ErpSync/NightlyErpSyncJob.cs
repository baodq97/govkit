namespace RentField.ErpSync;

// Nightly pull from the legacy ERP over its SOAP endpoint. The ERP is old,
// unstable, and we cannot ask its vendor to change anything. Its data shapes are
// awkward and shift without warning, so nothing outside this class is allowed to
// see them: this job translates the raw ERP payloads into our own clean asset and
// cost records before anything else touches them. If the ERP breaks its format,
// the damage stops here and nowhere else needs to change.
public sealed class NightlyErpSyncJob
{
    private readonly ILegacyErpSoap _erp;
    private readonly IAssetWriter _assets;

    public NightlyErpSyncJob(ILegacyErpSoap erp, IAssetWriter assets)
    {
        _erp = erp;
        _assets = assets;
    }

    public void Run()
    {
        foreach (var raw in _erp.DownloadAssetDump())
        {
            // Defensive translation from the ERP's shifting fields into ours.
            var clean = new AssetRecord
            {
                Tag = raw.TryGet("ASSET_NO") ?? raw.TryGet("assetNo") ?? "UNKNOWN",
                Category = MapCategory(raw.TryGet("CLASS_CD"))
            };
            _assets.Upsert(clean);
        }
    }

    private static string MapCategory(string? erpClass) => erpClass switch
    {
        "EXC" => "excavator",
        "GEN" => "generator",
        _ => "other"
    };
}

public interface ILegacyErpSoap { IEnumerable<ErpRow> DownloadAssetDump(); }
public interface IAssetWriter { void Upsert(AssetRecord record); }

public sealed class ErpRow
{
    private readonly Dictionary<string, string> _fields = new();
    public string? TryGet(string key) => _fields.TryGetValue(key, out var v) ? v : null;
}

public sealed class AssetRecord { public string Tag = ""; public string Category = ""; }
