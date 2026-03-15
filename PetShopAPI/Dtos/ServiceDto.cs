using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ServiceDto
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    public string? Description { get; set; }
    
    [MaxLength(32)]
    public string PriceType { get; set; } = "PerDay"; // PerDay/Fixed/PerHour
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    public List<ServicePackageDto> Packages { get; set; } = new();
}

public class CreateServiceDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    public string? Description { get; set; }
    
    [MaxLength(32)]
    public string PriceType { get; set; } = "PerDay";
    public bool IsActive { get; set; } = true;
}

public class UpdateServiceDto
{
    [MaxLength(128)]
    public string? Name { get; set; }
    
    public string? Description { get; set; }
    
    [MaxLength(32)]
    public string? PriceType { get; set; }
    public bool? IsActive { get; set; }
}

public class ServicePackageDto
{
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public string? ServiceName { get; set; }
    
    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = default!;
    
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int? DurationMinutes { get; set; }
}

public class CreateServicePackageDto
{
    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = default!;
    
    [Required]
    public decimal Price { get; set; }
    
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int? DurationMinutes { get; set; }
}

public class UpdateServicePackageDto
{
    [MaxLength(64)]
    public string? Name { get; set; }
    
    public decimal? Price { get; set; }
    
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? DurationMinutes { get; set; }
}

public class ServiceBookingDto
{
    public int Id { get; set; }
    public string? BookingCode { get; set; } // Mã đặt lịch: SVC-YYYYMMDD-XXXX
    
    // Nguồn tạo lịch
    public string? Source { get; set; }

    // Thông tin khách hàng
    public string CustomerId { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public string CustomerEmail { get; set; } = default!;
    public string CustomerPhone { get; set; } = default!;
    
    // Thông tin thú cưng
    public string? PetName { get; set; }
    public string? PetType { get; set; }
    public string? PetBreed { get; set; }
    public int? PetAge { get; set; }
    public decimal? PetWeight { get; set; }
    
    // Thông tin đặt lịch
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int TotalDurationMinutes { get; set; }
    public decimal TotalPrice { get; set; }
    
    // Trạng thái
    public string Status { get; set; } = "Pending";
    
    // Trạng thái thanh toán
    public string PaymentStatus { get; set; } = "Unpaid";
    
    // Lý do hủy (nếu có)
    public string? CancelReason { get; set; }
    
    // Ghi chú
    public string? Note { get; set; }
    public string? InternalNote { get; set; }
    
    // Danh sách các dịch vụ trong booking
    public List<BookingItemDto> BookingItems { get; set; } = new List<BookingItemDto>();
    
    // Thời gian
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateServiceBookingDto
{
    [Required]
    public string CustomerName { get; set; } = default!;
    
    [Required]
    [EmailAddress]
    public string CustomerEmail { get; set; } = default!;
    
    [Required]
    public string CustomerPhone { get; set; } = default!;
    
    [Required]
    public DateTime StartTime { get; set; } // Thời gian bắt đầu
    
    // Thông tin thú cưng
    [Required]
    [MaxLength(100)]
    public string PetName { get; set; } = default!;
    [MaxLength(50)]
    public string? PetType { get; set; }
    [MaxLength(100)]
    public string? PetBreed { get; set; }
    public int? PetAge { get; set; }
    public decimal? PetWeight { get; set; }
    
    // Danh sách các dịch vụ muốn đặt (ít nhất 1 dịch vụ)
    [Required]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dịch vụ")]
    public List<CreateBookingItemDto> Items { get; set; } = new List<CreateBookingItemDto>();
    
    public string? Note { get; set; }
}

public class UpdateServiceBookingStatusDto
{
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = default!;
    public string? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
    public string? InternalNote { get; set; }
}

public class CancelServiceBookingDto
{
    [Required]
    [MaxLength(256)]
    public string Reason { get; set; } = default!;
}

public class AssignBookingStaffDto
{
    public string? StaffId { get; set; }
}

public class ServiceStaffAvailabilityDto
{
    public string StaffId { get; set; } = default!;
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool IsOnDuty { get; set; }
    public bool IsBusyInRange { get; set; }
    public DateTime RangeStart { get; set; }
    public DateTime RangeEnd { get; set; }
    public DateTime? NextAvailableTime { get; set; }
    public List<int> AssignedServiceIds { get; set; } = new();
    public List<StaffBusySlotDto> BusySlots { get; set; } = new();
}

public class StaffBusySlotDto
{
    public int BookingId { get; set; }
    public int BookingItemId { get; set; }
    public string? ServiceName { get; set; }
    public string? PetName { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = "Pending";
}

public class UpdateStaffDutyStatusDto
{
    public bool IsOnDuty { get; set; }
}