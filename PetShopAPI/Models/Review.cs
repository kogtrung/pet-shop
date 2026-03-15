using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Review
{
    [Key]
    public int Id { get; set; }
    
    public int ProductId { get; set; }
    public Product Product { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public ApplicationUser User { get; set; } = default!;
    public int Rating { get; set; } // 1..5
    [MaxLength(1000)] public string? Content { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property for review media
    public ICollection<ReviewMedia> Media { get; set; } = new List<ReviewMedia>();
}