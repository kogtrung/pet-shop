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
public class CategoryController : ControllerBase
{
    private readonly AppDbContext _db;
    public CategoryController(AppDbContext db) => _db = db;

    // GET: api/category
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll([FromQuery] bool? includeInactive)
    {
        var query = _db.Categories.AsQueryable();

        if (includeInactive != true)
            query = query.Where(c => c.IsActive);

        var cats = await query
            .Include(c => c.ProductCategories)
            .OrderBy(c => c.MenuOrder)
            .ToListAsync();

        return Ok(cats.Select(c => new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Slug = c.Slug,
            IsActive = c.IsActive,
            ParentId = c.ParentId,
            ShowInMenu = c.ShowInMenu,
            MenuOrder = c.MenuOrder,
            Icon = c.Icon,
            ProductCount = c.ProductCategories.Count
        }));
    }

    // GET: api/category/tree
    [AllowAnonymous]
    [HttpGet("tree")]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetTree([FromQuery] bool? includeInactive)
    {
        var query = _db.Categories
            .Where(c => c.ParentId == null);

        if (includeInactive != true)
            query = query.Where(c => c.IsActive && c.ShowInMenu);

        var cats = await query
            .Include(c => c.Children)
            .ThenInclude(ch => ch.ProductCategories)
            .Include(c => c.ProductCategories)
            .OrderBy(c => c.MenuOrder)
            .ToListAsync();

        return Ok(cats.Select(c => MapToDto(c, includeInactive != true)));
    }

    private CategoryDto MapToDto(Category c, bool onlyActive = true)
    {
        var children = c.Children?.AsEnumerable() ?? Enumerable.Empty<Category>();

        if (onlyActive)
            children = children.Where(ch => ch.IsActive && ch.ShowInMenu);

        return new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Slug = c.Slug,
            IsActive = c.IsActive,
            ParentId = c.ParentId,
            ShowInMenu = c.ShowInMenu,
            MenuOrder = c.MenuOrder,
            Icon = c.Icon,
            ProductCount = c.ProductCategories?.Count ?? 0,
            Children = children
                .OrderBy(ch => ch.MenuOrder)
                .Select(ch => MapToDto(ch, onlyActive))
                .ToList()
        };
    }

    // GET: api/category/5
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetById(int id)
    {
        var c = await _db.Categories
            .Include(c => c.Parent)
            .Include(c => c.ProductCategories)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null)
            return NotFound(new { error = "Category not found", code = "CATEGORY_NOT_FOUND" });

        return new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Slug = c.Slug,
            IsActive = c.IsActive,
            ParentId = c.ParentId,
            ParentName = c.Parent?.Name,
            ShowInMenu = c.ShowInMenu,
            MenuOrder = c.MenuOrder,
            Icon = c.Icon,
            ProductCount = c.ProductCategories.Count
        };
    }

    // POST: api/category
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryDto dto)
    {
        // Tạo slug tự động nếu không được cung cấp
        if (string.IsNullOrWhiteSpace(dto.Slug))
        {
            dto.Slug = SlugGenerator.GenerateSlug(dto.Name);
        }
        
        // Check if slug already exists
        if (await _db.Categories.AnyAsync(c => c.Slug == dto.Slug))
            return BadRequest(new { error = "Slug already exists", code = "DUPLICATE_SLUG" });

        // Validate parent exists if specified
        if (dto.ParentId.HasValue && !await _db.Categories.AnyAsync(c => c.Id == dto.ParentId.Value))
            return BadRequest(new { error = "Parent category does not exist", code = "INVALID_PARENT" });

        var c = new Category
        {
            Name = dto.Name,
            Slug = dto.Slug,
            IsActive = dto.IsActive,
            ParentId = dto.ParentId,
            ShowInMenu = dto.ShowInMenu,
            MenuOrder = dto.MenuOrder,
            Icon = dto.Icon
        };

        _db.Categories.Add(c);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = c.Id }, new { id = c.Id });
    }

    // PUT: api/category/5
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateCategoryDto dto)
    {
        var c = await _db.Categories.FindAsync(id);
        if (c == null)
            return NotFound(new { error = "Category not found", code = "CATEGORY_NOT_FOUND" });

        // Check slug uniqueness if changing
        if (dto.Slug != null && dto.Slug != c.Slug)
        {
            if (await _db.Categories.AnyAsync(cat => cat.Slug == dto.Slug && cat.Id != id))
                return BadRequest(new { error = "Slug already exists", code = "DUPLICATE_SLUG" });
        }

        // Validate parent exists if changing
        if (dto.ParentId.HasValue && !await _db.Categories.AnyAsync(cat => cat.Id == dto.ParentId.Value))
            return BadRequest(new { error = "Parent category does not exist", code = "INVALID_PARENT" });

        if (dto.Name != null) c.Name = dto.Name;
        if (dto.Slug != null) c.Slug = dto.Slug;
        if (dto.IsActive.HasValue) c.IsActive = dto.IsActive.Value;
        if (dto.ParentId.HasValue) c.ParentId = dto.ParentId;
        if (dto.ShowInMenu.HasValue) c.ShowInMenu = dto.ShowInMenu.Value;
        if (dto.MenuOrder.HasValue) c.MenuOrder = dto.MenuOrder.Value;
        if (dto.Icon != null) c.Icon = dto.Icon;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/category/5
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var c = await _db.Categories
            .Include(cat => cat.Children)
            .Include(cat => cat.ProductCategories)
            .FirstOrDefaultAsync(cat => cat.Id == id);

        if (c == null)
            return NotFound(new { error = "Category not found", code = "CATEGORY_NOT_FOUND" });

        if (c.Children.Any() || c.ProductCategories.Any())
            return Conflict(new { error = "Cannot delete category with products or sub-categories", code = "CATEGORY_HAS_DEPENDENCIES" });

        _db.Categories.Remove(c);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
