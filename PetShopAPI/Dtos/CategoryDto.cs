using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class CategoryDto
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    [Required]
    [MaxLength(160)]
    public string Slug { get; set; } = default!;
    
    public bool IsActive { get; set; }
    public int? ParentId { get; set; }
    public string? ParentName { get; set; }
    public bool ShowInMenu { get; set; } = true;
    public int MenuOrder { get; set; }
    
    [MaxLength(64)]
    public string? Icon { get; set; }

    // để API tree
    public List<CategoryDto>? Children { get; set; }
    public int ProductCount { get; set; }
}

public class CreateCategoryDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = default!;
    
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    public bool IsActive { get; set; } = true;
    public int? ParentId { get; set; }
    public int MenuOrder { get; set; } = 0;
    public bool ShowInMenu { get; set; } = true;
    
    [MaxLength(64)]
    public string? Icon { get; set; }
}

public class UpdateCategoryDto
{
    [MaxLength(128)]
    public string? Name { get; set; }
    
    [MaxLength(160)]
    public string? Slug { get; set; }
    
    public bool? IsActive { get; set; }
    public int? ParentId { get; set; }
    public int? MenuOrder { get; set; }
    public bool? ShowInMenu { get; set; }
    
    [MaxLength(64)]
    public string? Icon { get; set; }
}
