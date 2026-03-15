using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class AttributeDefinition
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(64)]  public string Name { get; set; } = default!;   // Thương hiệu, Hương vị, Trọng lượng...
    [MaxLength(64)]  public string Code { get; set; } = default!;   // brand, flavor, weight...
    [MaxLength(16)]  public string DataType { get; set; } = "text"; // text|number|bool|range
    public bool IsFilterable { get; set; } = true;

    public ICollection<AttributeValue> Values { get; set; } = new List<AttributeValue>();
    public ICollection<CategoryAttribute> CategoryAttributes { get; set; } = new List<CategoryAttribute>();
}