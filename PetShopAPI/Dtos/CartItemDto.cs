namespace PetShopAPI.Dtos;

public class CartItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? ProductSlug { get; set; }
    public decimal ProductPrice { get; set; }
    public decimal? ProductSalePrice { get; set; }
    public string? ProductImageUrl { get; set; }
    public int Quantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}