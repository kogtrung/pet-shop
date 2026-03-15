using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class PromotionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = default!;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = default!;
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public int? MaxUsageCount { get; set; }
    public int UsedCount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public string? ApplicableUserId { get; set; }
}

public class CreatePromotionDto
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = default!;
    
    [MaxLength(200)]
    public string? Description { get; set; }
    
    [Required]
    public string DiscountType { get; set; } = "Percentage";
    
    [Required]
    public decimal DiscountValue { get; set; }
    
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public int? MaxUsageCount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ApplicableUserId { get; set; }
}

public class ValidatePromotionDto
{
    [Required]
    public string Code { get; set; } = default!;
    
    public decimal OrderAmount { get; set; }
    public string? UserId { get; set; }
    public List<int>? ProductIds { get; set; }
}

public class PromotionValidationResultDto
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public PromotionDto? Promotion { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
}

