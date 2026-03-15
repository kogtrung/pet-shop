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
public class NewsletterController : ControllerBase
{
    private readonly AppDbContext _db;

    public NewsletterController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/newsletter/subscribers
    [Authorize(Roles = "Admin")]
    [HttpGet("subscribers")]
    public async Task<ActionResult<IEnumerable<NewsletterSubscriberDto>>> GetAll([FromQuery] bool? isConfirmed)
    {
        var query = _db.NewsletterSubscribers.AsQueryable();

        if (isConfirmed.HasValue)
            query = query.Where(n => n.IsConfirmed == isConfirmed.Value);

        var subscribers = await query
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var result = subscribers.Select(n => new NewsletterSubscriberDto
        {
            Id = n.Id,
            Email = n.Email,
            IsConfirmed = n.IsConfirmed,
            CreatedAt = n.CreatedAt
        });

        return Ok(result);
    }

    // POST: api/newsletter/subscribe
    [AllowAnonymous]
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(SubscribeNewsletterDto dto)
    {
        // Check if already subscribed
        if (await _db.NewsletterSubscribers.AnyAsync(n => n.Email == dto.Email))
            return BadRequest(new { error = "Email already subscribed", code = "DUPLICATE_SUBSCRIPTION" });

        var subscriber = new NewsletterSubscriber
        {
            Email = dto.Email,
            IsConfirmed = false,
            CreatedAt = DateTimeHelper.GetVietnamTime()
        };

        _db.NewsletterSubscribers.Add(subscriber);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = subscriber.Id,
            email = subscriber.Email,
            message = "Subscription successful. Please check your email to confirm."
        });
    }

    // PUT: api/newsletter/confirm/{id}
    [AllowAnonymous]
    [HttpPut("confirm/{id}")]
    public async Task<IActionResult> Confirm(int id, [FromQuery] string? token)
    {
        var subscriber = await _db.NewsletterSubscribers.FindAsync(id);

        if (subscriber == null)
            return NotFound(new { error = "Subscriber not found", code = "SUBSCRIBER_NOT_FOUND" });

        // TODO: Validate token if implemented
        subscriber.IsConfirmed = true;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = subscriber.Id,
            email = subscriber.Email,
            isConfirmed = subscriber.IsConfirmed,
            message = "Subscription confirmed successfully"
        });
    }

    // DELETE: api/newsletter/unsubscribe
    [AllowAnonymous]
    [HttpDelete("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string email)
    {
        var subscriber = await _db.NewsletterSubscribers
            .FirstOrDefaultAsync(n => n.Email == email);

        if (subscriber == null)
            return NotFound(new { error = "Email not found", code = "EMAIL_NOT_FOUND" });

        _db.NewsletterSubscribers.Remove(subscriber);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Successfully unsubscribed", email });
    }
}
