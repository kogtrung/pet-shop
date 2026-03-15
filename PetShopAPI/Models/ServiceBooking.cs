using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class ServiceBooking
{
    [Key]
    public int Id { get; set; }

    [MaxLength(50)]
    public string? BookingCode { get; set; } // Mã đặt lịch: SVC-YYYYMMDD-XXXX
    
    // Nguồn tạo lịch: App / POS / Khác
    [MaxLength(32)]
    public string? Source { get; set; } = "App";

    // Liên kết với User
    public string CustomerId { get; set; } = default!;
    [ForeignKey("CustomerId")]
    public ApplicationUser Customer { get; set; } = default!;
    
    // Thông tin đặt lịch
    public string CustomerName { get; set; } = default!;
    public string CustomerEmail { get; set; } = default!;
    public string CustomerPhone { get; set; } = default!;
    
    // Thời gian booking
    public DateTime StartTime { get; set; } // Thời gian bắt đầu
    public DateTime EndTime { get; set; } // Thời gian kết thúc (tự tính từ tổng thời lượng)
    public int TotalDurationMinutes { get; set; } // Tổng thời lượng (phút) = tổng của tất cả BookingItems
    
    // Thông tin thú cưng
    [MaxLength(100)]
    public string? PetName { get; set; }
    [MaxLength(50)]
    public string? PetType { get; set; } // Chó, Mèo, Khác
    [MaxLength(100)]
    public string? PetBreed { get; set; }
    public int? PetAge { get; set; } // Tuổi tính bằng tháng
    public decimal? PetWeight { get; set; } // Cân nặng (kg)
    
    // Tổng giá của booking (tổng của tất cả BookingItems)
    public decimal TotalPrice { get; set; }
    
    // Trạng thái đặt lịch (tự động tính từ BookingItems)
    [MaxLength(32)]
    public string Status { get; set; } = "Pending"; 
    // Pending = Chưa phân công
    // Assigned = Đã phân công (một số items đã có staff)
    // Confirmed = Tất cả items đã được staff xác nhận
    // InProgress = Đang thực hiện (ít nhất 1 item đang làm)
    // Completed = Hoàn thành (tất cả items đã Completed)
    // Cancelled = Đã hủy
    // Rejected = Bị từ chối (tất cả items bị reject)
    
    // Trạng thái thanh toán
    [MaxLength(32)]
    public string PaymentStatus { get; set; } = "Unpaid"; // Unpaid, Paid
    
    // Lý do hủy (nếu bị hủy bởi User/Admin)
    public string? CancelReason { get; set; }
    
    // Ghi chú chung của booking
    public string? Note { get; set; }
    public string? InternalNote { get; set; }
    
    // Navigation property - Danh sách các dịch vụ trong booking
    public ICollection<BookingItem> BookingItems { get; set; } = new List<BookingItem>();
    
    // Email reminder
    public bool ReminderSent { get; set; } = false;
    
    // Thời gian tạo và cập nhật
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? UpdatedAt { get; set; }
}