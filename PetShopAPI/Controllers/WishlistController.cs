using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Helpers;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly AppDbContext _db;

    public WishlistController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/wishlist
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WishlistDto>>> GetUserWishlist()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var wishlistItems = await _db.Wishlists
            .Include(w => w.Product)
                .ThenInclude(p => p.Images)
            .Include(w => w.Product)
                .ThenInclude(p => p.Inventory)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        var result = wishlistItems.Select(w => new WishlistDto
        {
            UserId = w.UserId,
            ProductId = w.ProductId,
            Product = w.Product == null ? null : new ProductDto
            {
                Id = w.Product.Id,
                Name = w.Product.Name,
                Slug = w.Product.Slug,
                Price = w.Product.Price,
                // Add sale price fields
                SalePrice = w.Product.SalePrice,
                SaleStartDate = w.Product.SaleStartDate,
                SaleEndDate = w.Product.SaleEndDate,
                Quantity = w.Product.Inventory?.Quantity ?? 0,
                Images = w.Product.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Url = i.Url,
                    MediaType = i.MediaType,
                    IsPrimary = i.IsPrimary
                }).ToList()
            },
            CreatedAt = w.CreatedAt
        });

        return Ok(result);
    }

    // POST: api/wishlist
    [HttpPost]
    public async Task<IActionResult> AddToWishlist(AddToWishlistDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Check if product exists
        if (!await _db.Products.AnyAsync(p => p.Id == dto.ProductId))
            return BadRequest(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        // Check if already in wishlist
        if (await _db.Wishlists.AnyAsync(w => w.UserId == userId && w.ProductId == dto.ProductId))
            return BadRequest(new { error = "Product already in wishlist", code = "DUPLICATE_WISHLIST_ITEM" });

        var wishlistItem = new Wishlist
        {
            UserId = userId,
            ProductId = dto.ProductId,
            CreatedAt = DateTimeHelper.GetVietnamTime()
        };

        _db.Wishlists.Add(wishlistItem);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Product added to wishlist" });
    }

    // DELETE: api/wishlist/{productId}
    [HttpDelete("{productId}")]
    public async Task<IActionResult> RemoveFromWishlist(int productId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var wishlistItem = await _db.Wishlists
            .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

        if (wishlistItem == null)
            return NotFound(new { error = "Wishlist item not found", code = "WISHLIST_ITEM_NOT_FOUND" });

        _db.Wishlists.Remove(wishlistItem);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/wishlist/clear
    [HttpDelete("clear")]
    public async Task<IActionResult> ClearWishlist()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var wishlistItems = await _db.Wishlists
            .Where(w => w.UserId == userId)
            .ToListAsync();

        var count = wishlistItems.Count;
        _db.Wishlists.RemoveRange(wishlistItems);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Wishlist cleared successfully", deletedCount = count });
    }
}
