using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Helpers;
using System.Security.Claims;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly AppDbContext _db;

    public CartController(AppDbContext db)
    {
        _db = db;
    }

    // Helper method to check if a product is currently on sale
    private bool IsProductOnSale(Product product)
    {
        // Check if product has a sale price
        if (!product.SalePrice.HasValue || product.SalePrice <= 0)
            return false;

        // Check if product has sale dates
        if (!product.SaleStartDate.HasValue || !product.SaleEndDate.HasValue)
            return false;

        // Check if current date is within sale period
        var now = DateTimeHelper.GetVietnamTime();
        return now >= product.SaleStartDate.Value && now <= product.SaleEndDate.Value;
    }

    // GET: api/cart
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CartItemDto>>> GetCartItems()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
        }

        var cartItems = await _db.CartItems
            .Include(ci => ci.Product)
            .ThenInclude(p => p.Images)
            .Include(ci => ci.Product)
            .ThenInclude(p => p.ProductCategories)
            .Include(ci => ci.Product)
            .ThenInclude(p => p.Brand)
            .Where(ci => ci.UserId == userId)
            .ToListAsync();

        var now = DateTimeHelper.GetVietnamTime();
        var result = cartItems.Select(ci => {
            var product = ci.Product;
            var productCategoryIds = product.ProductCategories.Select(pc => pc.CategoryId).ToList();
            
            // Get applicable promotions
            var applicablePromotions = _db.Promotions
                .Where(pr => pr.IsActive 
                    && now >= pr.StartDate 
                    && now <= pr.EndDate
                    && (!pr.MaxUsageCount.HasValue || pr.UsedCount < pr.MaxUsageCount.Value))
                .ToList();

            // Calculate best promotion
            decimal? finalPrice = null;
            if (applicablePromotions.Any())
            {
                var productPrice = product.SalePrice ?? product.Price;
                var bestDiscount = 0m;

                foreach (var promo in applicablePromotions)
                {
                    decimal discount = 0;
                    if (promo.DiscountType == "Percentage")
                    {
                        discount = productPrice * (promo.DiscountValue / 100);
                        if (promo.MaxDiscountAmount.HasValue && discount > promo.MaxDiscountAmount.Value)
                        {
                            discount = promo.MaxDiscountAmount.Value;
                        }
                    }
                    else if (promo.DiscountType == "FixedAmount")
                    {
                        discount = promo.DiscountValue;
                        if (discount > productPrice)
                        {
                            discount = productPrice;
                        }
                    }

                    if (discount > bestDiscount)
                    {
                        bestDiscount = discount;
                    }
                }

                if (bestDiscount > 0)
                {
                    finalPrice = productPrice - bestDiscount;
                }
            }

            // Use final price from promotion, or sale price, or regular price
            var displayPrice = finalPrice ?? (IsProductOnSale(product) ? product.SalePrice : null) ?? product.Price;

            return new CartItemDto
        {
            Id = ci.Id,
            ProductId = ci.ProductId,
            ProductName = ci.Product.Name,
            ProductSlug = ci.Product.Slug,
            ProductPrice = ci.Product.Price,
                ProductSalePrice = displayPrice,
            ProductImageUrl = ci.Product.Images
                .Where(i => i.IsPrimary)
                .Select(i => i.Url)
                .FirstOrDefault() ?? ci.Product.Images
                .OrderBy(i => i.SortOrder)
                .Select(i => i.Url)
                .FirstOrDefault(),
            Quantity = ci.Quantity,
            CreatedAt = ci.CreatedAt,
            UpdatedAt = ci.UpdatedAt
            };
        }).ToList();

        return Ok(result);
    }

    // POST: api/cart
    [HttpPost]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
        }

        // Check if product exists
        var product = await _db.Products.FindAsync(dto.ProductId);
        if (product == null)
        {
            return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });
        }

        // Check if item already exists in cart
        var existingItem = await _db.CartItems
            .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.ProductId == dto.ProductId);

        if (existingItem != null)
        {
            // Update quantity
            existingItem.Quantity += dto.Quantity;
            existingItem.UpdatedAt = DateTimeHelper.GetVietnamTime();
        }
        else
        {
            // Add new item
            var cartItem = new CartItem
            {
                UserId = userId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                CreatedAt = DateTimeHelper.GetVietnamTime(),
                UpdatedAt = DateTimeHelper.GetVietnamTime()
            };
            _db.CartItems.Add(cartItem);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Item added to cart successfully" });
    }

    // PUT: api/cart/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCartItem(int id, [FromBody] UpdateCartDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
        }

        var cartItem = await _db.CartItems
            .FirstOrDefaultAsync(ci => ci.Id == id && ci.UserId == userId);

        if (cartItem == null)
        {
            return NotFound(new { error = "Cart item not found", code = "CART_ITEM_NOT_FOUND" });
        }

        cartItem.Quantity = dto.Quantity;
        cartItem.UpdatedAt = DateTimeHelper.GetVietnamTime();

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cart item updated successfully" });
    }

    // DELETE: api/cart/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveFromCart(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
        }

        var cartItem = await _db.CartItems
            .FirstOrDefaultAsync(ci => ci.Id == id && ci.UserId == userId);

        if (cartItem == null)
        {
            return NotFound(new { error = "Cart item not found", code = "CART_ITEM_NOT_FOUND" });
        }

        _db.CartItems.Remove(cartItem);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Item removed from cart successfully" });
    }

    // DELETE: api/cart
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
        }

        var cartItems = await _db.CartItems
            .Where(ci => ci.UserId == userId)
            .ToListAsync();

        _db.CartItems.RemoveRange(cartItems);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Cart cleared successfully" });
    }
}

public class AddToCartDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class UpdateCartDto
{
    public int Quantity { get; set; }
}