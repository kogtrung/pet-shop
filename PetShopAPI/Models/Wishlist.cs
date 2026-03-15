using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class Wishlist
{
    [Key, Column(Order = 0)]
    public string UserId { get; set; } = default!;
    
    [Key, Column(Order = 1)]
    public int ProductId { get; set; }
    
    [ForeignKey("UserId")]
    public ApplicationUser User { get; set; } = default!;
    
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = default!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}