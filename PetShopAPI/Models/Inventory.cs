using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class Inventory
{
    [Key]
    public int ProductId { get; set; }
    
    [ForeignKey("ProductId")]
    public Product? Product { get; set; } 
    
    public int Quantity { get; set; }
    public int? ReorderLevel { get; set; }
}