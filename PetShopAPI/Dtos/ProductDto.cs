using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ProductDto
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = default!;
    
    [Required]
    [MaxLength(180)]
    public string Slug { get; set; } = default!;
    
    [MaxLength(64)]
    public string? Sku { get; set; }
    
    public int? BrandId { get; set; }
    public string? BrandName { get; set; }
    
    public string? Description { get; set; }
    
    [Required]
    public decimal Price { get; set; }
    
    // Promotion fields
    public decimal? SalePrice { get; set; }
    public DateTime? SaleStartDate { get; set; }
    public DateTime? SaleEndDate { get; set; }
    
    public bool IsFeatured { get; set; }
    public bool IsService { get; set; } = false; // Thêm cờ IsService
    public bool IsActive { get; set; } = true; // Sản phẩm có đang hiển thị không
    public int SoldCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    
    // Inventory
    public int Quantity { get; set; }
    public int? ReorderLevel { get; set; }
    
    // Images
    public List<ProductImageDto> Images { get; set; } = new();
    
    // Categories
    public List<int> CategoryIds { get; set; } = new();
    
    // Image URL for recommendations
    public string ImageUrl { get; set; } = string.Empty;
    
    // Review statistics
    public double? AverageRating { get; set; }
    public int ReviewCount { get; set; }
}

public class CreateProductDto
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = default!;
    
    [MaxLength(180)]
    public string? Slug { get; set; }
    
    [MaxLength(64)]
    public string? Sku { get; set; }
    
    public int? BrandId { get; set; }
    public string? Description { get; set; }
    
    [Required]
    public decimal Price { get; set; }
    
    // Promotion fields
    public decimal? SalePrice { get; set; }
    public DateTime? SaleStartDate { get; set; }
    public DateTime? SaleEndDate { get; set; }
    
    public bool IsFeatured { get; set; }
    public bool IsService { get; set; } = false; // Thêm cờ IsService
    public bool IsActive { get; set; } = true; // Sản phẩm có đang hiển thị không
    public DateTime? PublishedAt { get; set; }
    
    // Inventory
    public int Quantity { get; set; } = 0;
    public int? ReorderLevel { get; set; }
    
    // Images
    public List<CreateProductImageDto> Images { get; set; } = new();
    
    // Categories
    public List<int> CategoryIds { get; set; } = new();
}

public class UpdateProductDto
{
    [MaxLength(160)]
    public string? Name { get; set; }
    
    [MaxLength(180)]
    public string? Slug { get; set; }
    
    [MaxLength(64)]
    public string? Sku { get; set; }
    
    public int? BrandId { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    
    // Promotion fields
    public decimal? SalePrice { get; set; }
    public DateTime? SaleStartDate { get; set; }
    public DateTime? SaleEndDate { get; set; }
    
    public bool? IsFeatured { get; set; }
    public bool? IsService { get; set; } // Thêm cờ IsService
    public bool? IsActive { get; set; } // Sản phẩm có đang hiển thị không
    public DateTime? PublishedAt { get; set; }
    
    // Inventory
    public int? Quantity { get; set; }
    public int? ReorderLevel { get; set; }
    
    // Category support for updates
    public List<int>? CategoryIds { get; set; }
}