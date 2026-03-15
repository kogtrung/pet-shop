using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Page
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(160)] public string Title { get; set; } = default!;
    [MaxLength(160)] public string Slug { get; set; } = default!;
    public string Content { get; set; } = string.Empty;
    public string? Tag { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsPublished { get; set; } = true;
}