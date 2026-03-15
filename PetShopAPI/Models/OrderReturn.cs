using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class OrderReturn
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int OrderId { get; set; }
    public Order Order { get; set; } = default!;
    
    // Lý do đổi trả chính
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = default!;
    
    // Loại: Return (trả hàng), Exchange (đổi hàng), SupplierReturn (trả nhà cung cấp)
    [Required]
    [MaxLength(20)]
    public string ReturnType { get; set; } = "Return"; // Return, Exchange, SupplierReturn
    
    // Trạng thái: Pending, Approved, Rejected, Processing, Completed, Cancelled
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";
    
    // Người yêu cầu: Customer, Staff, Warehouse
    [MaxLength(20)]
    public string? RequestedBy { get; set; } // Customer, Staff, Warehouse
    
    // Nơi trả hàng: Store (tại cửa hàng), Online (trực tuyến), Warehouse (kho)
    [MaxLength(20)]
    public string? ReturnLocation { get; set; } // Store, Online, Warehouse
    
    // Tình trạng hàng: New (mới, nguyên vẹn), Damaged (hỏng), Expired (hết hạn), WrongItem (sai hàng)
    [MaxLength(20)]
    public string? Condition { get; set; } // New, Damaged, Expired, WrongItem, Defective
    
    // Có trả về nhà cung cấp không
    public bool ReturnToSupplier { get; set; } = false;
    
    // ID nhà cung cấp (nếu trả về nhà cung cấp)
    public int? SupplierId { get; set; }
    
    // Sản phẩm cần đổi trả
    public ICollection<OrderReturnItem> Items { get; set; } = new List<OrderReturnItem>();
    
    // Sản phẩm đổi (nếu là Exchange)
    public ICollection<OrderReturnExchangeItem> ExchangeItems { get; set; } = new List<OrderReturnExchangeItem>();
    
    // Số tiền hoàn lại (nếu là Return)
    public decimal? RefundAmount { get; set; }
    
    // Phương thức hoàn tiền
    [MaxLength(50)]
    public string? RefundMethod { get; set; }
    
    // Ghi chú từ staff
    [MaxLength(1000)]
    public string? StaffNotes { get; set; }
    
    // Người xử lý
    public string? ProcessedByUserId { get; set; }
    public DateTime? ProcessedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.Now; // Will be set explicitly in controller
    public DateTime? UpdatedAt { get; set; }
}

public class OrderReturnItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int OrderReturnId { get; set; }
    public OrderReturn OrderReturn { get; set; } = default!;
    
    [Required]
    public int OrderItemId { get; set; }
    public OrderItem OrderItem { get; set; } = default!;
    
    [Required]
    public int Quantity { get; set; }
    
    [MaxLength(500)]
    public string? Reason { get; set; }
    
    // Tình trạng sản phẩm: New, Damaged, Expired, WrongItem, Defective
    [MaxLength(20)]
    public string? Condition { get; set; }
}

public class OrderReturnExchangeItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int OrderReturnId { get; set; }
    public OrderReturn OrderReturn { get; set; } = default!;
    
    [Required]
    public int ProductId { get; set; }
    public Product Product { get; set; } = default!;
    
    [Required]
    public int Quantity { get; set; }
    
    [Required]
    public decimal UnitPrice { get; set; }
}

