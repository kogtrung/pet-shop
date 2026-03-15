using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class AttributeValue
{
    [Key]
    public int Id { get; set; }
    
    public int AttributeDefinitionId { get; set; }
    public AttributeDefinition AttributeDefinition { get; set; } = default!;

    [MaxLength(128)] public string Value { get; set; } = default!;
    [MaxLength(64)]  public string? Code { get; set; } // royal-canin, chicken, 1kg...

    public ICollection<ProductAttribute> ProductAttributes { get; set; } = new List<ProductAttribute>();
}