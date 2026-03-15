using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class ProductAttribute
{
    public int ProductId { get; set; }
    public int AttributeValueId { get; set; }
    
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = default!;
    
    [ForeignKey("AttributeValueId")]
    public AttributeValue AttributeValue { get; set; } = default!;

    public decimal? NumericValue { get; set; }
    public string? TextValue { get; set; }
}