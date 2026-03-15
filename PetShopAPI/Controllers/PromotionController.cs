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
public class PromotionController : ControllerBase
{
    private readonly AppDbContext _db;

    public PromotionController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/promotion
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PromotionDto>>> GetAll()
    {
        var promotions = await _db.Promotions
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var result = promotions.Select(p => new PromotionDto
        {
            Id = p.Id,
            Code = p.Code,
            Description = p.Description,
            DiscountType = p.DiscountType,
            DiscountValue = p.DiscountValue,
            MaxDiscountAmount = p.MaxDiscountAmount,
            MinOrderAmount = p.MinOrderAmount,
            MaxUsageCount = p.MaxUsageCount,
            UsedCount = p.UsedCount,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            IsActive = p.IsActive,
            ApplicableUserId = p.ApplicableUserId
        });

        return Ok(result);
    }

    // GET: api/promotion/{id}
    [Authorize(Roles = "Admin")]
    [HttpGet("{id}")]
    public async Task<ActionResult<PromotionDto>> GetById(int id)
    {
        var promotion = await _db.Promotions
            .FirstOrDefaultAsync(p => p.Id == id);
        if (promotion == null) return NotFound();

        return new PromotionDto
        {
            Id = promotion.Id,
            Code = promotion.Code,
            Description = promotion.Description,
            DiscountType = promotion.DiscountType,
            DiscountValue = promotion.DiscountValue,
            MaxDiscountAmount = promotion.MaxDiscountAmount,
            MinOrderAmount = promotion.MinOrderAmount,
            MaxUsageCount = promotion.MaxUsageCount,
            UsedCount = promotion.UsedCount,
            StartDate = promotion.StartDate,
            EndDate = promotion.EndDate,
            IsActive = promotion.IsActive,
            ApplicableUserId = promotion.ApplicableUserId
        };
    }

    // POST: api/promotion/validate
    [AllowAnonymous]
    [HttpPost("validate")]
    public async Task<ActionResult<PromotionValidationResultDto>> ValidatePromotion(ValidatePromotionDto dto)
    {
        var promotion = await _db.Promotions
            .FirstOrDefaultAsync(p => p.Code.ToUpper() == dto.Code.ToUpper());

        if (promotion == null)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Mã giảm giá không tồn tại"
            });
        }

        // Check if promotion is active
        if (!promotion.IsActive)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Mã giảm giá đã bị vô hiệu hóa"
            });
        }

        // Check date validity
        var now = DateTimeHelper.GetVietnamTime();
        if (now < promotion.StartDate || now > promotion.EndDate)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Mã giảm giá không còn hiệu lực"
            });
        }

        // Check usage limit
        if (promotion.MaxUsageCount.HasValue && promotion.UsedCount >= promotion.MaxUsageCount.Value)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Mã giảm giá đã hết lượt sử dụng"
            });
        }

        // Check minimum order amount
        if (promotion.MinOrderAmount.HasValue && dto.OrderAmount < promotion.MinOrderAmount.Value)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = $"Đơn hàng tối thiểu {promotion.MinOrderAmount.Value:N0} ₫ để áp dụng mã này"
            });
        }

        // Check user applicability
        if (!string.IsNullOrEmpty(promotion.ApplicableUserId) && dto.UserId != promotion.ApplicableUserId)
        {
            return Ok(new PromotionValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Mã giảm giá không áp dụng cho tài khoản này"
            });
        }


        // Calculate discount
        decimal discountAmount = 0;
        if (promotion.DiscountType == "Percentage")
        {
            discountAmount = dto.OrderAmount * (promotion.DiscountValue / 100);
            if (promotion.MaxDiscountAmount.HasValue && discountAmount > promotion.MaxDiscountAmount.Value)
            {
                discountAmount = promotion.MaxDiscountAmount.Value;
            }
        }
        else if (promotion.DiscountType == "FixedAmount")
        {
            discountAmount = promotion.DiscountValue;
            if (discountAmount > dto.OrderAmount)
            {
                discountAmount = dto.OrderAmount;
            }
        }

        var finalAmount = dto.OrderAmount - discountAmount;

        return Ok(new PromotionValidationResultDto
        {
            IsValid = true,
            Promotion = new PromotionDto
            {
                Id = promotion.Id,
                Code = promotion.Code,
                Description = promotion.Description,
                DiscountType = promotion.DiscountType,
                DiscountValue = promotion.DiscountValue,
                MaxDiscountAmount = promotion.MaxDiscountAmount,
                MinOrderAmount = promotion.MinOrderAmount,
                MaxUsageCount = promotion.MaxUsageCount,
                UsedCount = promotion.UsedCount,
                StartDate = promotion.StartDate,
                EndDate = promotion.EndDate,
                IsActive = promotion.IsActive,
            ApplicableUserId = promotion.ApplicableUserId
            },
            DiscountAmount = discountAmount,
            FinalAmount = finalAmount
        });
    }

    // POST: api/promotion
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreatePromotionDto dto)
    {
        // Check if code already exists
        var existing = await _db.Promotions
            .FirstOrDefaultAsync(p => p.Code.ToUpper() == dto.Code.ToUpper());
        
        if (existing != null)
        {
            return BadRequest(new { error = "Mã giảm giá đã tồn tại" });
        }

        var promotion = new Promotion
        {
            Code = dto.Code,
            Description = dto.Description,
            DiscountType = dto.DiscountType,
            DiscountValue = dto.DiscountValue,
            MaxDiscountAmount = dto.MaxDiscountAmount,
            MinOrderAmount = dto.MinOrderAmount,
            MaxUsageCount = dto.MaxUsageCount,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive,
            ApplicableUserId = dto.ApplicableUserId
        };

        _db.Promotions.Add(promotion);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = promotion.Id }, new { id = promotion.Id });
    }

    // PUT: api/promotion/{id}
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreatePromotionDto dto)
    {
        var promotion = await _db.Promotions
            .FirstOrDefaultAsync(p => p.Id == id);
        if (promotion == null) return NotFound();

        // Check if code already exists (excluding current)
        var existing = await _db.Promotions
            .FirstOrDefaultAsync(p => p.Code.ToUpper() == dto.Code.ToUpper() && p.Id != id);
        
        if (existing != null)
        {
            return BadRequest(new { error = "Mã giảm giá đã tồn tại" });
        }

        promotion.Code = dto.Code;
        promotion.Description = dto.Description;
        promotion.DiscountType = dto.DiscountType;
        promotion.DiscountValue = dto.DiscountValue;
        promotion.MaxDiscountAmount = dto.MaxDiscountAmount;
        promotion.MinOrderAmount = dto.MinOrderAmount;
        promotion.MaxUsageCount = dto.MaxUsageCount;
        promotion.StartDate = dto.StartDate;
        promotion.EndDate = dto.EndDate;
        promotion.IsActive = dto.IsActive;
        promotion.ApplicableUserId = dto.ApplicableUserId;
        promotion.UpdatedAt = DateTimeHelper.GetVietnamTime();

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/promotion/{id}
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var promotion = await _db.Promotions.FindAsync(id);
        if (promotion == null) return NotFound();

        _db.Promotions.Remove(promotion);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

