using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class ProductImage
{
    [Key]
    public int Id { get; set; }
    
    public int ProductId { get; set; }
    public Product Product { get; set; } = default!;
    public string Url { get; set; } = default!;
    [MaxLength(32)] public string MediaType { get; set; } = "image"; // image/video
    public int SortOrder { get; set; } = 0;
    public bool IsPrimary { get; set; } = false;
}