using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

/// <summary>
/// BookingItem - Đại diện cho một dịch vụ trong một booking
/// Một booking có thể có nhiều BookingItem (nhiều dịch vụ)
/// </summary>
public class BookingItem
{
    [Key]
    public int Id { get; set; }

    public int ServiceBookingId { get; set; }
    [ForeignKey("ServiceBookingId")]
    public ServiceBooking ServiceBooking { get; set; } = default!;

    public int ServiceId { get; set; }
    [ForeignKey("ServiceId")]
    public Service Service { get; set; } = default!;

    public int? ServicePackageId { get; set; }
    [ForeignKey("ServicePackageId")]
    public ServicePackage? ServicePackage { get; set; }

    // Giá tại thời điểm đặt lịch
    public decimal PriceAtBooking { get; set; }
    public decimal? PackagePrice { get; set; }

    // Thời lượng của dịch vụ này (phút)
    public int DurationMinutes { get; set; }

    // Thứ tự thực hiện dịch vụ (1, 2, 3...)
    public int OrderIndex { get; set; } = 1;

    // Nhân viên được phân công cho dịch vụ này
    public string? AssignedStaffId { get; set; }
    [ForeignKey("AssignedStaffId")]
    public ApplicationUser? AssignedStaff { get; set; }
    public string? AssignedStaffName { get; set; }

    // Trạng thái của từng item
    [MaxLength(32)]
    public string Status { get; set; } = "Pending"; // Pending/Assigned/Confirmed/InProgress/Completed/Rejected/Cancelled

    // Ghi chú cho dịch vụ này
    public string? Note { get; set; }
    public string? InternalNote { get; set; }

    // Thời gian thực hiện (nếu khác với booking chính)
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Thời gian tạo và cập nhật
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? UpdatedAt { get; set; }
}

