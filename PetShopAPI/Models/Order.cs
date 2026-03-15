using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Order
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(50)]
    public string? OrderCode { get; set; } // Mã đơn hàng: ORD-YYYYMMDD-XXXX hoặc POS-YYYYMMDD-XXXX
    
    public string? CustomerId { get; set; } // Nullable cho khách vãng lai
    public ApplicationUser? Customer { get; set; }
    [MaxLength(32)] public string Status { get; set; } = "Pending";
    [MaxLength(32)] public string PaymentMethod { get; set; } = "COD"; // COD/VNPay/MoMo...
    [MaxLength(32)] public string PaymentStatus { get; set; } = "Unpaid";
    public string? ShippingAddress { get; set; }
    [MaxLength(32)] public string? ShippingMethod { get; set; } // standard, express, same-day, free
    public DateTime CreatedAt { get; set; } = DateTime.Now; // Will be set explicitly in controller
    public DateTime? DeliveryDate { get; set; }
    public decimal Total { get; set; }
    
    // Promotion fields
    public string? PromotionCode { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal SubTotal { get; set; } // Tổng tiền trước khi giảm giá
    public decimal ShippingFee { get; set; } = 0; // Phí vận chuyển

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<OrderReturn> Returns { get; set; } = new List<OrderReturn>();
    public ICollection<OrderCancellation> Cancellations { get; set; } = new List<OrderCancellation>();
}