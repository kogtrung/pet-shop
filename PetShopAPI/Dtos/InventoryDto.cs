using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class InventoryDto
{
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? ProductSku { get; set; }
    public int Quantity { get; set; }
    public int? ReorderLevel { get; set; }
    public bool NeedsReorder { get; set; }
}

public class UpdateInventoryDto
{
    [Required]
    public int Quantity { get; set; }
    
    public int? ReorderLevel { get; set; }
}

public class AdjustInventoryDto
{
    [Required]
    public int Adjustment { get; set; }
    
    [MaxLength(100)]
    public string? Reason { get; set; }
    
    [MaxLength(500)]
    public string? Note { get; set; }
}
