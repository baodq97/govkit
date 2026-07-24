namespace RentField.Catalog;

// Reference lists: the equipment category tree, the depot/location records, and
// the free-form tags used across the platform. Pure lookups — add, rename,
// retire. No behaviour beyond storage and retrieval, no rules to enforce.
public sealed class Equipment { public string Tag { get; set; } = ""; public string Category { get; set; } = ""; }
public sealed class Category { public string Code { get; set; } = ""; public string? ParentCode { get; set; } }
public sealed class Depot { public string Id { get; set; } = ""; public string City { get; set; } = ""; }
public sealed class Tag { public string Name { get; set; } = ""; }

public sealed class CatalogService
{
    private readonly List<Category> _categories = new();
    private readonly List<Depot> _depots = new();
    private readonly List<Tag> _tags = new();

    public void AddCategory(string code, string? parent) => _categories.Add(new Category { Code = code, ParentCode = parent });
    public void RenameCategory(string code, string newCode) => _categories.Single(c => c.Code == code).Code = newCode;
    public void RemoveCategory(string code) => _categories.RemoveAll(c => c.Code == code);

    public void AddDepot(string id, string city) => _depots.Add(new Depot { Id = id, City = city });
    public void AddTag(string name) => _tags.Add(new Tag { Name = name });

    public IReadOnlyList<Category> AllCategories() => _categories;
    public IReadOnlyList<Depot> AllDepots() => _depots;
    public IReadOnlyList<Tag> AllTags() => _tags;
}
