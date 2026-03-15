using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Category
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(128)] public string Name { get; set; } = default!;
    [MaxLength(160)] public string Slug { get; set; } = default!;
    public bool IsActive { get; set; } = true;

    public int? ParentId { get; set; }
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();

    public int MenuOrder { get; set; } = 0;
    public bool ShowInMenu { get; set; } = true;
    [MaxLength(64)] public string? Icon { get; set; }

    public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public ICollection<CategoryAttribute> CategoryAttributes { get; set; } = new List<CategoryAttribute>();
}