using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ReviewMediaDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = default!;
    public string FilePath { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReviewDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string UserId { get; set; } = default!;
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Content { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Media files associated with this review
    public ICollection<ReviewMediaDto> Media { get; set; } = new List<ReviewMediaDto>();
}

public class CreateReviewDto
{
    [Required]
    public int ProductId { get; set; }
    
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Content { get; set; }
}

public class UpdateReviewDto
{
    [Range(1, 5)]
    public int? Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Content { get; set; }
}