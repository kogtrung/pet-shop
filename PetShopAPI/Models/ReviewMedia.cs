using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class ReviewMedia
{
    [Key]
    public int Id { get; set; }
    
    public int ReviewId { get; set; }
    public Review Review { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public string FilePath { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}