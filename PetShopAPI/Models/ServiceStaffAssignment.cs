using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

/// <summary>
/// Bảng liên kết giữa Service và ServiceStaff
/// Admin phân công nhân viên cho từng dịch vụ
/// </summary>
public class ServiceStaffAssignment
{
    [Key]
    public int Id { get; set; }

    public int ServiceId { get; set; }
    [ForeignKey("ServiceId")]
    public Service Service { get; set; } = default!;

    public string StaffId { get; set; } = default!;
    [ForeignKey("StaffId")]
    public ApplicationUser Staff { get; set; } = default!;

    // Ghi chú về chuyên môn của nhân viên với dịch vụ này
    public string? Note { get; set; }

    // Trạng thái: Active/Inactive
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

