using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Product
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(160)] public string Name { get; set; } = default!;
    [MaxLength(180)] public string Slug { get; set; } = default!;
    [MaxLength(64)] public string? Sku { get; set; }
    public int? BrandId { get; set; }
    public Brand? Brand { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    
    // Promotion fields
    public decimal? SalePrice { get; set; }
    public DateTime? SaleStartDate { get; set; }
    public DateTime? SaleEndDate { get; set; }
    
    public bool IsFeatured { get; set; }
    public bool IsService { get; set; } = false; // Thêm cờ IsService
    public bool IsActive { get; set; } = true; // Sản phẩm có đang hiển thị không
    public int SoldCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }

    public Inventory Inventory { get; set; } = default!;
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

    public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public ICollection<ProductAttribute> ProductAttributes { get; set; } = new List<ProductAttribute>();

    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}