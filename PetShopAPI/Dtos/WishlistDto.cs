using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class WishlistDto
{
    public string UserId { get; set; } = default!;
    public int ProductId { get; set; }
    public ProductDto? Product { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AddToWishlistDto
{
    [Required]
    public int ProductId { get; set; }
}
