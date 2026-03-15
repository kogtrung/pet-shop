using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class PageDto
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = default!;
    
    [Required]
    [MaxLength(160)]
    public string Slug { get; set; } = default!;
    
    public string Content { get; set; } = string.Empty;
    public string? Tag { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsPublished { get; set; }
}

public class CreatePageDto
{
    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = default!;
    
    // Slug is optional when creating; backend will auto-generate if missing
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    public string Content { get; set; } = string.Empty;
    public string? Tag { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class UpdatePageDto
{
    [MaxLength(160)]
    public string? Title { get; set; }
    
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    public string? Content { get; set; }
    public string? Tag { get; set; }
    public string? ImageUrl { get; set; }
    public bool? IsPublished { get; set; }
}
