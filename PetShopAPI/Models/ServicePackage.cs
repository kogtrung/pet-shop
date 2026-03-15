using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class ServicePackage
{
    [Key]
    public int Id { get; set; }
    
    public int ServiceId { get; set; }
    [ForeignKey("ServiceId")]
    public Service Service { get; set; } = default!;
    [MaxLength(64)] public string Name { get; set; } = default!; // Thường/VIP/VVIP
    public decimal Price { get; set; } // Giá cho 1 lượt dịch vụ
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int? DurationMinutes { get; set; }
    
    // Remove this line - it's causing the issue
    // public ICollection<ServiceBooking> Bookings { get; set; } = new List<ServiceBooking>();
}