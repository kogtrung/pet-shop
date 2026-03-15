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
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/review/product/{productId}
    [AllowAnonymous]
    [HttpGet("product/{productId}")]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetByProduct(
        int productId,
        [FromQuery] int? rating,
        [FromQuery] string? sortBy)
    {
        var query = _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Media)
            .Where(r => r.ProductId == productId);

        if (rating.HasValue)
            query = query.Where(r => r.Rating == rating.Value);

        query = sortBy?.ToLower() switch
        {
            "rating" => query.OrderByDescending(r => r.Rating),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };

        var reviews = await query.ToListAsync();

        var result = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            ProductId = r.ProductId,
            UserId = r.UserId,
            UserName = r.User?.UserName,
            UserEmail = r.User?.Email,
            Rating = r.Rating,
            Content = r.Content,
            CreatedAt = r.CreatedAt,
            Media = r.Media.Select(m => new ReviewMediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                FilePath = m.FilePath,
                ContentType = m.ContentType,
                FileSize = m.FileSize,
                CreatedAt = m.CreatedAt
            }).ToList()
        });

        return Ok(result);
    }

    // GET: api/review/{id}
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<ReviewDto>> GetById(int id)
    {
        var review = await _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Product)
            .Include(r => r.Media)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
            return NotFound(new { error = "Review not found", code = "REVIEW_NOT_FOUND" });

        return new ReviewDto
        {
            Id = review.Id,
            ProductId = review.ProductId,
            ProductName = review.Product?.Name,
            UserId = review.UserId,
            UserName = review.User?.UserName,
            UserEmail = review.User?.Email,
            Rating = review.Rating,
            Content = review.Content,
            CreatedAt = review.CreatedAt,
            Media = review.Media.Select(m => new ReviewMediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                FilePath = m.FilePath,
                ContentType = m.ContentType,
                FileSize = m.FileSize,
                CreatedAt = m.CreatedAt
            }).ToList()
        };
    }

    // POST: api/review
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateReviewDto dto)
    {
        // Get current user ID (assuming from claims)
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Check if product exists
        if (!await _db.Products.AnyAsync(p => p.Id == dto.ProductId))
            return BadRequest(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        // Check if user has purchased this product (has an order with this product)
        var hasPurchased = await _db.OrderItems
            .Include(oi => oi.Order)
            .AnyAsync(oi => oi.ProductId == dto.ProductId && 
                          oi.Order.CustomerId == userId && 
                          oi.Order.Status != "Cancelled");
        
        if (!hasPurchased)
            return BadRequest(new { error = "You can only review products you have purchased", code = "NOT_PURCHASED" });

        // Optional: Check if user already reviewed this product
        if (await _db.Reviews.AnyAsync(r => r.ProductId == dto.ProductId && r.UserId == userId))
            return BadRequest(new { error = "You have already reviewed this product", code = "DUPLICATE_REVIEW" });

        var review = new Review
        {
            ProductId = dto.ProductId,
            UserId = userId,
            Rating = dto.Rating,
            Content = dto.Content,
            CreatedAt = DateTimeHelper.GetVietnamTime()
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = review.Id }, new { id = review.Id });
    }

    // PUT: api/review/{id}
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateReviewDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var review = await _db.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { error = "Review not found", code = "REVIEW_NOT_FOUND" });

        // Only allow user to update their own review or admin
        if (review.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        if (dto.Rating.HasValue) review.Rating = dto.Rating.Value;
        if (dto.Content != null) review.Content = dto.Content;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/review/{id}
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var review = await _db.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { error = "Review not found", code = "REVIEW_NOT_FOUND" });

        // Only allow user to delete their own review or admin
        if (review.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/review - Get all reviews (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetAll(
        [FromQuery] int? productId,
        [FromQuery] int? rating,
        [FromQuery] string? sortBy)
    {
        var query = _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Product)
            .Include(r => r.Media)
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(r => r.ProductId == productId.Value);

        if (rating.HasValue)
            query = query.Where(r => r.Rating == rating.Value);

        query = sortBy?.ToLower() switch
        {
            "rating" => query.OrderByDescending(r => r.Rating),
            "date" => query.OrderByDescending(r => r.CreatedAt),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };

        var reviews = await query.ToListAsync();

        var result = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            ProductId = r.ProductId,
            ProductName = r.Product?.Name,
            UserId = r.UserId,
            UserName = r.User?.UserName,
            UserEmail = r.User?.Email,
            Rating = r.Rating,
            Content = r.Content,
            CreatedAt = r.CreatedAt,
            Media = r.Media.Select(m => new ReviewMediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                FilePath = m.FilePath,
                ContentType = m.ContentType,
                FileSize = m.FileSize,
                CreatedAt = m.CreatedAt
            }).ToList()
        });

        return Ok(result);
    }

    // GET: api/review/my-reviews - Get current user's reviews
    [Authorize]
    [HttpGet("my-reviews")]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetMyReviews()
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUserId))
            return Unauthorized();

        var reviews = await _db.Reviews
            .Include(r => r.Product)
            .Include(r => r.User)
            .Include(r => r.Media)
            .Where(r => r.UserId == currentUserId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            ProductId = r.ProductId,
            ProductName = r.Product?.Name,
            UserId = r.UserId,
            UserName = r.User?.UserName,
            UserEmail = r.User?.Email,
            Rating = r.Rating,
            Content = r.Content,
            CreatedAt = r.CreatedAt,
            Media = r.Media.Select(m => new ReviewMediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                FilePath = m.FilePath,
                ContentType = m.ContentType,
                FileSize = m.FileSize,
                CreatedAt = m.CreatedAt
            }).ToList()
        });

        return Ok(result);
    }

    // GET: api/review/user/{userId}
    [Authorize]
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetByUser(string userId)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        // Only allow users to see their own reviews or admin
        if (currentUserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        var reviews = await _db.Reviews
            .Include(r => r.Product)
            .Include(r => r.User)
            .Include(r => r.Media)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            ProductId = r.ProductId,
            ProductName = r.Product?.Name,
            UserId = r.UserId,
            UserName = r.User?.UserName,
            UserEmail = r.User?.Email,
            Rating = r.Rating,
            Content = r.Content,
            CreatedAt = r.CreatedAt,
            Media = r.Media.Select(m => new ReviewMediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                FilePath = m.FilePath,
                ContentType = m.ContentType,
                FileSize = m.FileSize,
                CreatedAt = m.CreatedAt
            }).ToList()
        });

        return Ok(result);
    }
}