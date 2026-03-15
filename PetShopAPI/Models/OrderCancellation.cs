using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class OrderCancellation
{
    [Key]
    public int Id { get; set; }
    
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    
    public string? CustomerId { get; set; }
    public ApplicationUser? Customer { get; set; }
    
    [MaxLength(500)]
    public string? Reason { get; set; }
    
    [MaxLength(32)]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    
    public DateTime RequestedAt { get; set; } = DateTime.Now;
    public DateTime? ProcessedAt { get; set; }
    
    public string? ProcessedBy { get; set; } // Admin/Staff ID who processed
    public ApplicationUser? Processor { get; set; }
    
    [MaxLength(500)]
    public string? AdminNote { get; set; }
}

