using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PageController : ControllerBase
{
    private readonly AppDbContext _db;

    public PageController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/page
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PageDto>>> GetAll([FromQuery] bool? isPublished)
    {
        var query = _db.Pages.AsQueryable();

        if (isPublished.HasValue)
        {
            // Explicit filter from client
            query = query.Where(p => p.IsPublished == isPublished.Value);
        }
        else if (!User.IsInRole("Admin"))
        {
            // Default: only published for non-admin users
            query = query.Where(p => p.IsPublished);
        }

        var pages = await query.ToListAsync();

        var result = pages.Select(p => new PageDto
        {
            Id = p.Id,
            Title = p.Title,
            Slug = p.Slug,
            Content = p.Content,
            Tag = p.Tag,
            ImageUrl = p.ImageUrl,
            IsPublished = p.IsPublished
        });

        return Ok(result);
    }

    // GET: api/page/{id}
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<PageDto>> GetById(int id)
    {
        var page = await _db.Pages.FindAsync(id);

        if (page == null)
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        // Non-admin users can only see published pages
        if (!page.IsPublished && !User.IsInRole("Admin"))
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        return new PageDto
        {
            Id = page.Id,
            Title = page.Title,
            Slug = page.Slug,
            Content = page.Content,
            Tag = page.Tag,
            ImageUrl = page.ImageUrl,
            IsPublished = page.IsPublished
        };
    }

    // GET: api/page/slug/{slug}
    [AllowAnonymous]
    [HttpGet("slug/{slug}")]
    public async Task<ActionResult<PageDto>> GetBySlug(string slug)
    {
        var page = await _db.Pages.FirstOrDefaultAsync(p => p.Slug == slug);

        if (page == null)
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        // Non-admin users can only see published pages
        if (!page.IsPublished && !User.IsInRole("Admin"))
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        return new PageDto
        {
            Id = page.Id,
            Title = page.Title,
            Slug = page.Slug,
            Content = page.Content,
            Tag = page.Tag,
            ImageUrl = page.ImageUrl,
            IsPublished = page.IsPublished
        };
    }

    // POST: api/page
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreatePageDto dto)
    {
        // Auto-generate slug if not provided
        string slug = dto.Slug;
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = PetShopAPI.Services.SlugGenerator.GenerateSlug(dto.Title);
        }

        // Ensure slug is unique
        string originalSlug = slug;
        int counter = 1;
        while (await _db.Pages.AnyAsync(p => p.Slug == slug))
        {
            slug = $"{originalSlug}-{counter}";
            counter++;
        }

        var page = new Page
        {
            Title = dto.Title,
            Slug = slug,
            Content = dto.Content,
            Tag = dto.Tag,
            ImageUrl = dto.ImageUrl,
            IsPublished = dto.IsPublished
        };

        _db.Pages.Add(page);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = page.Id }, new { id = page.Id });
    }

    // PUT: api/page/{id}
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdatePageDto dto)
    {
        var page = await _db.Pages.FindAsync(id);

        if (page == null)
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        // Check slug uniqueness if changing
        if (dto.Slug != null && dto.Slug != page.Slug)
        {
            if (await _db.Pages.AnyAsync(p => p.Slug == dto.Slug && p.Id != id))
                return BadRequest(new { error = "Slug already exists", code = "DUPLICATE_SLUG" });
        }

        if (dto.Title != null) page.Title = dto.Title;
        if (dto.Slug != null) page.Slug = dto.Slug;
        if (dto.Content != null) page.Content = dto.Content;
        if (dto.Tag != null) page.Tag = dto.Tag;
        if (dto.ImageUrl != null) page.ImageUrl = dto.ImageUrl;
        if (dto.IsPublished.HasValue) page.IsPublished = dto.IsPublished.Value;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/page/{id}
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var page = await _db.Pages.FindAsync(id);

        if (page == null)
            return NotFound(new { error = "Page not found", code = "PAGE_NOT_FOUND" });

        _db.Pages.Remove(page);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/page/upload-image
    [Authorize(Roles = "Admin")]
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        try
        {
            // Validate file
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "File is required", code = "FILE_REQUIRED" });

            // Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { error = "File size exceeds 5MB limit", code = "FILE_TOO_LARGE" });

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(new { error = "Invalid file type. Only JPG, PNG, GIF, WEBP allowed", code = "INVALID_FILE_TYPE" });

            // Generate unique filename
            var extension = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine("wwwroot", "uploads", "pages", fileName);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var imageUrl = $"/uploads/pages/{fileName}";

            return Ok(new { imageUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }
}
