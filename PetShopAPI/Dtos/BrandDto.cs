using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class BrandDto
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    [Required]
    [MaxLength(160)]
    public string Slug { get; set; } = default!;
    
    [MaxLength(2048)]
    public string? LogoUrl { get; set; }
    
    public int ProductCount { get; set; }
}

public class CreateBrandDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    [MaxLength(2048)]
    public string? LogoUrl { get; set; }
}

public class UpdateBrandDto
{
    [MaxLength(128)]
    public string? Name { get; set; }
    
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    [MaxLength(2048)]
    public string? LogoUrl { get; set; }
}
