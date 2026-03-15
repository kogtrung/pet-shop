using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Brand
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(128)] public string Name { get; set; } = default!;
    [MaxLength(160)] public string Slug { get; set; } = default!;
    public string? LogoUrl { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}