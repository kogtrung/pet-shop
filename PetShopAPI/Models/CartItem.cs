using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class CartItem
{
    [Key]
    public int Id { get; set; }
    
    public string UserId { get; set; } = default!;
    public ApplicationUser User { get; set; } = default!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = default!;
    public int Quantity { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}