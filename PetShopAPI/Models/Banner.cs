using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Banner
{
    [Key]
    public int Id { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }

    [MaxLength(500)]
    public string? Caption { get; set; }

    [MaxLength(100)]
    public string? ButtonText { get; set; }

    [MaxLength(500)]
    public string ImageUrl { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? LinkUrl { get; set; }
    
    public int DisplayOrder { get; set; } = 0;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? UpdatedAt { get; set; }
}

