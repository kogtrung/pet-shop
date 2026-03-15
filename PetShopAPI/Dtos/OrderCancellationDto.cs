using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class OrderCancellationDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string? OrderCode { get; set; }
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime RequestedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }
    public string? ProcessorName { get; set; }
    public string? AdminNote { get; set; }
    public OrderDto? Order { get; set; }
}

public class CreateOrderCancellationDto
{
    [Required]
    public int OrderId { get; set; }
    
    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class ProcessOrderCancellationDto
{
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = default!; // Approved or Rejected
    
    [MaxLength(500)]
    public string? AdminNote { get; set; }
}

