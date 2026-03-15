using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Promotion
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = default!;
    
    [MaxLength(200)]
    public string? Description { get; set; }
    
    // Loại giảm giá: Percentage (%), FixedAmount (số tiền cố định)
    [Required]
    [MaxLength(20)]
    public string DiscountType { get; set; } = "Percentage"; // Percentage, FixedAmount
    
    // Giá trị giảm giá
    [Required]
    public decimal DiscountValue { get; set; }
    
    // Giá trị tối đa được giảm (cho Percentage)
    public decimal? MaxDiscountAmount { get; set; }
    
    // Đơn hàng tối thiểu để áp dụng
    public decimal? MinOrderAmount { get; set; }
    
    // Số lần sử dụng tối đa
    public int? MaxUsageCount { get; set; }
    
    // Số lần đã sử dụng
    public int UsedCount { get; set; } = 0;
    
    // Ngày bắt đầu
    public DateTime StartDate { get; set; }
    
    // Ngày kết thúc
    public DateTime EndDate { get; set; }
    
    // Có đang active không
    public bool IsActive { get; set; } = true;
    
    // Chỉ áp dụng cho user cụ thể (null = áp dụng cho tất cả)
    public string? ApplicableUserId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

