using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Helpers;
using System.Security.Claims;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewMediaController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewMediaController(AppDbContext db)
    {
        _db = db;
    }

    // POST: api/reviewmedia
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ReviewMediaDto>> Create([FromForm] CreateReviewMediaDto dto)
    {
        try
        {
            // Validate file
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { error = "File is required", code = "FILE_REQUIRED" });

            // Validate file size (max 5MB)
            if (dto.File.Length > 5 * 1024 * 1024)
                return BadRequest(new { error = "File size exceeds 5MB limit", code = "FILE_TOO_LARGE" });

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "video/mp4" };
            if (!allowedTypes.Contains(dto.File.ContentType))
                return BadRequest(new { error = "Invalid file type. Only JPG, PNG, GIF, MP4 allowed", code = "INVALID_FILE_TYPE" });

            // Generate unique filename
            var extension = Path.GetExtension(dto.File.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine("wwwroot", "uploads", "reviews", fileName);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.File.CopyToAsync(stream);
            }

            // Create media record
            var reviewMedia = new ReviewMedia
            {
                ReviewId = dto.ReviewId,
                FileName = fileName,
                FilePath = $"/uploads/reviews/{fileName}",
                ContentType = dto.File.ContentType,
                FileSize = dto.File.Length,
                CreatedAt = DateTimeHelper.GetVietnamTime()
            };

            _db.ReviewMedias.Add(reviewMedia);
            await _db.SaveChangesAsync();

            // Return media DTO
            var mediaDto = new ReviewMediaDto
            {
                Id = reviewMedia.Id,
                FileName = reviewMedia.FileName,
                FilePath = reviewMedia.FilePath,
                ContentType = reviewMedia.ContentType,
                FileSize = reviewMedia.FileSize,
                CreatedAt = reviewMedia.CreatedAt
            };

            return Ok(mediaDto);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }

    // GET: api/reviewmedia/review/{reviewId}
    [AllowAnonymous]
    [HttpGet("review/{reviewId}")]
    public async Task<ActionResult<IEnumerable<ReviewMediaDto>>> GetMediaByReview(int reviewId)
    {
        var media = await _db.ReviewMedias
            .Where(m => m.ReviewId == reviewId)
            .ToListAsync();

        var mediaDtos = media.Select(m => new ReviewMediaDto
        {
            Id = m.Id,
            FileName = m.FileName,
            FilePath = m.FilePath,
            ContentType = m.ContentType,
            FileSize = m.FileSize,
            CreatedAt = m.CreatedAt
        });

        return Ok(mediaDtos);
    }
}