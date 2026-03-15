using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class BookingItemDto
{
    public int Id { get; set; }
    public int ServiceBookingId { get; set; }
    
    // Thông tin dịch vụ
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = default!;
    public int? ServicePackageId { get; set; }
    public string? ServicePackageName { get; set; }
    public decimal? ServicePackagePrice { get; set; }
    
    // Giá và thời lượng
    public decimal PriceAtBooking { get; set; }
    public decimal? PackagePrice { get; set; }
    public int DurationMinutes { get; set; }
    public int OrderIndex { get; set; }
    
    // Nhân viên phụ trách
    public string? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
    
    // Trạng thái
    public string Status { get; set; } = "Pending";
    
    // Ghi chú
    public string? Note { get; set; }
    public string? InternalNote { get; set; }
    
    // Thời gian thực hiện
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    
    // Thời gian tạo và cập nhật
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateBookingItemDto
{
    [Required]
    public int ServiceId { get; set; }
    
    public int? ServicePackageId { get; set; }

    public List<int>? ServicePackageIds { get; set; }
    
    public string? Note { get; set; }
    
    public string? AssignedStaffId { get; set; }
}

public class UpdateBookingItemStatusDto
{
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = default!;
    
    public string? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
    public string? InternalNote { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}

