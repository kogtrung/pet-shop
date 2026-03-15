using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class OrderReturnDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string? OrderCode { get; set; } // Mã đơn hàng: ORD-YYYYMMDD-XXXX hoặc POS-YYYYMMDD-XXXX
    public string Reason { get; set; } = default!;
    public string ReturnType { get; set; } = default!;
    public string Status { get; set; } = default!;
    public string? RequestedBy { get; set; }
    public string? ReturnLocation { get; set; }
    public string? Condition { get; set; }
    public bool ReturnToSupplier { get; set; }
    public int? SupplierId { get; set; }
    public List<OrderReturnItemDto> Items { get; set; } = new();
    public List<OrderReturnExchangeItemDto> ExchangeItems { get; set; } = new();
    public decimal? RefundAmount { get; set; }
    public string? RefundMethod { get; set; }
    public string? StaffNotes { get; set; }
    public string? ProcessedByUserId { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderReturnItemDto
{
    public int Id { get; set; }
    public int OrderItemId { get; set; }
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public string? Condition { get; set; }
    public string? ProductName { get; set; }
}

public class OrderReturnExchangeItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class CreateOrderReturnDto
{
    [Required]
    public int OrderId { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = default!;
    
    [Required]
    public string ReturnType { get; set; } = "Return"; // Return, Exchange, SupplierReturn
    
    [MaxLength(20)]
    public string? RequestedBy { get; set; } // Customer, Staff, Warehouse
    
    [MaxLength(20)]
    public string? ReturnLocation { get; set; } // Store, Online, Warehouse
    
    [MaxLength(20)]
    public string? Condition { get; set; } // New, Damaged, Expired, WrongItem, Defective
    
    public bool ReturnToSupplier { get; set; } = false;
    
    public int? SupplierId { get; set; }
    
    [Required]
    public List<CreateOrderReturnItemDto> Items { get; set; } = new();
    
    public List<CreateOrderReturnExchangeItemDto>? ExchangeItems { get; set; }
}

public class CreateOrderReturnItemDto
{
    [Required]
    public int OrderItemId { get; set; }
    
    [Required]
    public int Quantity { get; set; }
    
    [MaxLength(500)]
    public string? Reason { get; set; }
    
    [MaxLength(20)]
    public string? Condition { get; set; } // New, Damaged, Expired, WrongItem, Defective
}

public class CreateOrderReturnExchangeItemDto
{
    [Required]
    public int ProductId { get; set; }
    
    [Required]
    public int Quantity { get; set; }
}

public class UpdateOrderReturnStatusDto
{
    [Required]
    public string Status { get; set; } = default!;
    
    [MaxLength(1000)]
    public string? StaffNotes { get; set; }
    
    public decimal? RefundAmount { get; set; }
    public string? RefundMethod { get; set; }
}

