using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ProductImageDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    
    [Required]
    [MaxLength(2048)]
    public string Url { get; set; } = default!;
    
    [Required]
    [MaxLength(32)]
    public string MediaType { get; set; } = "image"; // image/video
    
    public int SortOrder { get; set; } = 0;
    public bool IsPrimary { get; set; } = false;
}

public class CreateProductImageDto
{
    [Required]
    [MaxLength(2048)]
    public string Url { get; set; } = default!;
    
    [Required]
    [MaxLength(32)]
    public string MediaType { get; set; } = "image"; // image/video
    
    public int SortOrder { get; set; } = 0;
    public bool IsPrimary { get; set; } = false;
}

public class UpdateProductImageDto
{
    [MaxLength(2048)]
    public string? Url { get; set; }
    
    [MaxLength(32)]
    public string? MediaType { get; set; }
    
    public int? SortOrder { get; set; }
    public bool? IsPrimary { get; set; }
}
