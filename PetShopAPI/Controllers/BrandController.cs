using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Services;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BrandController : ControllerBase
{
    private readonly AppDbContext _db;
    public BrandController(AppDbContext db) => _db = db;

    // GET: api/brand
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BrandDto>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Brands.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.Name.Contains(search));

        var brands = await query
            .Include(b => b.Products)
            .OrderBy(b => b.Name)
            .ToListAsync();

        var result = brands.Select(b => new BrandDto
        {
            Id = b.Id,
            Name = b.Name,
            Slug = b.Slug,
            LogoUrl = b.LogoUrl,
            ProductCount = b.Products.Count
        });

        return Ok(result);
    }

    // GET: api/brand/5
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<BrandDto>> GetById(int id)
    {
        var b = await _db.Brands
            .Include(b => b.Products)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (b == null)
            return NotFound(new { error = "Brand not found", code = "BRAND_NOT_FOUND" });

        return new BrandDto
        {
            Id = b.Id,
            Name = b.Name,
            Slug = b.Slug,
            LogoUrl = b.LogoUrl,
            ProductCount = b.Products.Count
        };
    }

    // POST: api/brand
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateBrandDto dto)
    {
        // Tạo slug tự động nếu không được cung cấp
        if (string.IsNullOrWhiteSpace(dto.Slug))
        {
            dto.Slug = SlugGenerator.GenerateSlug(dto.Name);
        }
        
        // Check if slug already exists
        if (await _db.Brands.AnyAsync(b => b.Slug == dto.Slug))
            return BadRequest(new { error = "Slug already exists", code = "DUPLICATE_SLUG" });

        var b = new Brand
        {
            Name = dto.Name,
            Slug = dto.Slug,
            LogoUrl = dto.LogoUrl
        };  
        _db.Brands.Add(b);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = b.Id }, new { id = b.Id });
    }

    // PUT: api/brand/5
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateBrandDto dto)
    {
        var b = await _db.Brands.FindAsync(id);
        if (b == null)
            return NotFound(new { error = "Brand not found", code = "BRAND_NOT_FOUND" });

        // Check slug uniqueness if changing
        if (dto.Slug != null && dto.Slug != b.Slug)
        {
            if (await _db.Brands.AnyAsync(br => br.Slug == dto.Slug && br.Id != id))
                return BadRequest(new { error = "Slug already exists", code = "DUPLICATE_SLUG" });
        }

        if (dto.Name != null) b.Name = dto.Name;
        if (dto.Slug != null) b.Slug = dto.Slug;
        if (dto.LogoUrl != null) b.LogoUrl = dto.LogoUrl;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/brand/5
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var b = await _db.Brands
            .Include(br => br.Products)
            .FirstOrDefaultAsync(br => br.Id == id);

        if (b == null)
            return NotFound(new { error = "Brand not found", code = "BRAND_NOT_FOUND" });

        if (b.Products.Any())
            return Conflict(new { error = "Cannot delete brand with existing products", code = "BRAND_HAS_PRODUCTS" });

        _db.Brands.Remove(b);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}