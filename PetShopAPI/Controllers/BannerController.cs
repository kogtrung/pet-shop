using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Models;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BannerController : ControllerBase
{
    private readonly AppDbContext _db;

    public BannerController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/banner/active
    [AllowAnonymous]
    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<object>>> GetActiveBanners()
    {
        var banners = await _db.Banners
            .Where(b => b.IsActive)
            .OrderBy(b => b.DisplayOrder)
            .ThenBy(b => b.Id)
            .Select(b => new
            {
                id = b.Id,
                title = b.Title,
                caption = b.Caption,
                buttonText = b.ButtonText,
                imageUrl = b.ImageUrl,
                linkUrl = b.LinkUrl,
                displayOrder = b.DisplayOrder
            })
            .ToListAsync();

        return Ok(banners);
    }

    // GET: api/banner
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var banners = await _db.Banners
            .OrderBy(b => b.DisplayOrder)
            .ThenBy(b => b.Id)
            .Select(b => new
            {
                id = b.Id,
                title = b.Title,
                caption = b.Caption,
                buttonText = b.ButtonText,
                imageUrl = b.ImageUrl,
                linkUrl = b.LinkUrl,
                displayOrder = b.DisplayOrder,
                isActive = b.IsActive,
                createdAt = b.CreatedAt,
                updatedAt = b.UpdatedAt
            })
            .ToListAsync();

        return Ok(banners);
    }

    // POST: api/banner
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBannerDto dto)
    {
        var banner = new Banner
        {
            Title = dto.Title,
            Caption = dto.Caption,
            ButtonText = dto.ButtonText,
            ImageUrl = dto.ImageUrl,
            LinkUrl = dto.LinkUrl,
            DisplayOrder = dto.DisplayOrder ?? 0,
            IsActive = dto.IsActive ?? true,
            CreatedAt = DateTime.Now
        };

        _db.Banners.Add(banner);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = banner.Id }, new { id = banner.Id });
    }

    // PUT: api/banner/{id}
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBannerDto dto)
    {
        var banner = await _db.Banners.FindAsync(id);
        if (banner == null)
            return NotFound(new { error = "Banner not found" });

        if (dto.Title != null) banner.Title = dto.Title;
        if (dto.Caption != null) banner.Caption = dto.Caption;
        if (dto.ButtonText != null) banner.ButtonText = dto.ButtonText;
        if (dto.ImageUrl != null) banner.ImageUrl = dto.ImageUrl;
        if (dto.LinkUrl != null) banner.LinkUrl = dto.LinkUrl;
        if (dto.DisplayOrder.HasValue) banner.DisplayOrder = dto.DisplayOrder.Value;
        if (dto.IsActive.HasValue) banner.IsActive = dto.IsActive.Value;
        banner.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/banner/{id}
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var banner = await _db.Banners.FindAsync(id);
        if (banner == null)
            return NotFound(new { error = "Banner not found" });

        _db.Banners.Remove(banner);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/banner/order
    [Authorize(Roles = "Admin")]
    [HttpPut("order")]
    public async Task<IActionResult> UpdateOrder([FromBody] UpdateBannerOrderDto dto)
    {
        if (dto.BannerOrders == null || !dto.BannerOrders.Any())
            return BadRequest(new { error = "BannerOrders is required" });

        foreach (var order in dto.BannerOrders)
        {
            var banner = await _db.Banners.FindAsync(order.Id);
            if (banner != null)
            {
                banner.DisplayOrder = order.DisplayOrder;
                banner.UpdatedAt = DateTime.Now;
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateBannerDto(string? Title, string? Caption, string? ButtonText, string ImageUrl, string? LinkUrl, int? DisplayOrder, bool? IsActive);
public record UpdateBannerDto(string? Title, string? Caption, string? ButtonText, string? ImageUrl, string? LinkUrl, int? DisplayOrder, bool? IsActive);
public record UpdateBannerOrderDto(List<BannerOrderItem> BannerOrders);
public record BannerOrderItem(int Id, int DisplayOrder);

