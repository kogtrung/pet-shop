using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class CategoryAttribute
{
    [Key]
    public int Id { get; set; }
    
    public int CategoryId { get; set; }
    public Category Category { get; set; } = default!;
    public int AttributeDefinitionId { get; set; }
    public AttributeDefinition AttributeDefinition { get; set; } = default!;
    public int SortOrder { get; set; } = 0;
    public bool IsVisible { get; set; } = true;
}