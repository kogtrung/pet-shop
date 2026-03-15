using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class OrderDto
{
    public int Id { get; set; }
    public string? OrderCode { get; set; } // Mã đơn hàng: ORD-YYYYMMDD-XXXX hoặc POS-YYYYMMDD-XXXX
    public string? CustomerId { get; set; } // Nullable cho khách vãng lai
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    
    [MaxLength(32)] public string Status { get; set; } = "Pending";
    [MaxLength(32)] public string PaymentMethod { get; set; } = "COD"; // COD/VNPay/MoMo...
    [MaxLength(32)] public string PaymentStatus { get; set; } = "Unpaid";
    public string? ShippingAddress { get; set; }
    [MaxLength(32)] public string? ShippingMethod { get; set; } // standard, express, same-day, free
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveryDate { get; set; }
    public decimal Total { get; set; }
    public string? PromotionCode { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal ShippingFee { get; set; } = 0;
    public List<OrderItemDto> Items { get; set; } = new();
}

public class CreateOrderDto
{
    // CustomerId is NOT required here - it will be extracted from JWT token
    // in the controller method
    
    [Required]
    [MaxLength(32)]
    public string PaymentMethod { get; set; } = "COD";
    
    [MaxLength(500)]
    public string? ShippingAddress { get; set; }
    
    [MaxLength(32)]
    public string? ShippingMethod { get; set; } // standard, express, same-day, free
    
    public string? PromotionCode { get; set; }
    
    public decimal ShippingFee { get; set; } = 0; // Phí vận chuyển
    
    [Required]
    [MinLength(1, ErrorMessage = "Order must contain at least one item")]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreatePOSOrderDto
{
    // CustomerId có thể null cho khách vãng lai
    public string? CustomerId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string CustomerName { get; set; } = default!;
    
    [MaxLength(20)]
    public string? CustomerPhone { get; set; }
    
    [Required]
    [MaxLength(32)]
    public string PaymentMethod { get; set; } = "COD";
    
    [Required]
    [MinLength(1, ErrorMessage = "Order must contain at least one item")]
    public List<CreateOrderItemDto> Items { get; set; } = new();
    
    public string? PromotionCode { get; set; }
}

public class UpdateOrderStatusDto
{
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = default!;
    
    [MaxLength(32)]
    public string? PaymentStatus { get; set; }
    
    public DateTime? DeliveryDate { get; set; }
    
    [MaxLength(500)]
    public string? Note { get; set; }
}

public class UpdatePaymentStatusDto
{
    [Required]
    [MaxLength(32)]
    public string PaymentStatus { get; set; } = default!;
    
    [MaxLength(100)]
    public string? TransactionId { get; set; }
}