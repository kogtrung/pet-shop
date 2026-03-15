using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Services;
using System.Security.Claims;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderCancellationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    
    public OrderCancellationController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    // POST: api/OrderCancellation - User requests cancellation
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<OrderCancellationDto>> RequestCancellation([FromBody] CreateOrderCancellationDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var order = await _db.Orders
            .Include(o => o.Cancellations)
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId);
            
        if (order == null)
            return NotFound(new { error = "Order not found" });

        // Check if user owns this order
        if (order.CustomerId != userId && !User.IsInRole("Admin"))
            return Forbid();

        // Check if order can be cancelled (only Pending or Processing)
        var statusUpper = order.Status.ToUpper();
        if (!new[] { "PENDING", "PROCESSING" }.Contains(statusUpper))
        {
            return BadRequest(new { 
                error = "Chỉ có thể yêu cầu hủy đơn hàng khi trạng thái là 'Chờ xử lý' hoặc 'Đang xử lý'",
                code = "INVALID_STATUS"
            });
        }

        // Check if there's already a pending cancellation request
        var existingRequest = await _db.OrderCancellations
            .FirstOrDefaultAsync(oc => oc.OrderId == dto.OrderId && oc.Status == "Pending");
            
        if (existingRequest != null)
        {
            return BadRequest(new { 
                error = "Đã có yêu cầu hủy đơn hàng đang chờ xử lý",
                code = "DUPLICATE_REQUEST"
            });
        }

        var cancellation = new OrderCancellation
        {
            OrderId = dto.OrderId,
            CustomerId = userId,
            Reason = dto.Reason,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };

        _db.OrderCancellations.Add(cancellation);
        await _db.SaveChangesAsync();

        var result = await _db.OrderCancellations
            .Include(oc => oc.Order)
            .Include(oc => oc.Customer)
            .ThenInclude(c => c!.Profile)
            .FirstOrDefaultAsync(oc => oc.Id == cancellation.Id);

        return Ok(MapToDto(result!));
    }

    // GET: api/OrderCancellation - Get all cancellation requests (Admin only)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderCancellationDto>>> GetAll([FromQuery] string? status)
    {
        var query = _db.OrderCancellations
            .Include(oc => oc.Order)
            .Include(oc => oc.Customer)
            .ThenInclude(c => c!.Profile)
            .Include(oc => oc.Processor)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(oc => oc.Status == status);
        }

        var cancellations = await query
            .OrderByDescending(oc => oc.RequestedAt)
            .ToListAsync();

        return Ok(cancellations.Select(MapToDto));
    }

    // GET: api/OrderCancellation/my-requests - Get user's own cancellation requests
    [Authorize]
    [HttpGet("my-requests")]
    public async Task<ActionResult<IEnumerable<OrderCancellationDto>>> GetMyRequests()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var cancellations = await _db.OrderCancellations
            .Include(oc => oc.Order)
            .Include(oc => oc.Processor)
            .Where(oc => oc.CustomerId == userId)
            .OrderByDescending(oc => oc.RequestedAt)
            .ToListAsync();

        return Ok(cancellations.Select(MapToDto));
    }

    // GET: api/OrderCancellation/{id} - Get cancellation request by ID
    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderCancellationDto>> GetById(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var cancellation = await _db.OrderCancellations
            .Include(oc => oc.Order)
            .ThenInclude(o => o!.Items)
            .ThenInclude(i => i.Product)
            .Include(oc => oc.Customer)
            .ThenInclude(c => c!.Profile)
            .Include(oc => oc.Processor)
            .FirstOrDefaultAsync(oc => oc.Id == id);

        if (cancellation == null)
            return NotFound();

        // Check if user can view this cancellation (own request or admin)
        if (cancellation.CustomerId != userId && !User.IsInRole("Admin") && !User.IsInRole("SaleStaff"))
            return Forbid();

        return Ok(MapToDto(cancellation));
    }

    // PUT: api/OrderCancellation/{id}/process - Process cancellation request (Admin only)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}/process")]
    public async Task<ActionResult<OrderCancellationDto>> ProcessRequest(int id, [FromBody] ProcessOrderCancellationDto dto)
    {
        var processorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(processorId))
            return Unauthorized();

        var cancellation = await _db.OrderCancellations
            .Include(oc => oc.Order)
            .FirstOrDefaultAsync(oc => oc.Id == id);

        if (cancellation == null)
            return NotFound();

        if (cancellation.Status != "Pending")
        {
            return BadRequest(new { error = "Yêu cầu hủy đơn hàng đã được xử lý" });
        }

        if (dto.Status != "Approved" && dto.Status != "Rejected")
        {
            return BadRequest(new { error = "Status must be 'Approved' or 'Rejected'" });
        }

        cancellation.Status = dto.Status;
        cancellation.ProcessedAt = DateTime.UtcNow;
        cancellation.ProcessedBy = processorId;
        cancellation.AdminNote = dto.AdminNote;

        // If approved, cancel the order
        if (dto.Status == "Approved")
        {
            var order = cancellation.Order;
            if (order != null)
            {
                order.Status = "Cancelled";
                
                // Restore inventory
                var orderItems = await _db.OrderItems
                    .Include(oi => oi.Product)
                    .ThenInclude(p => p.Inventory)
                    .Where(oi => oi.OrderId == order.Id)
                    .ToListAsync();

                foreach (var item in orderItems)
                {
                    if (item.Product?.Inventory != null)
                    {
                        item.Product.Inventory.Quantity += item.Quantity;
                    }
                }
            }
        }

        await _db.SaveChangesAsync();

        // Send cancellation email to customer
        var result = await _db.OrderCancellations
            .Include(oc => oc.Order)
                .ThenInclude(o => o!.Items)
                .ThenInclude(oi => oi.Product)
            .Include(oc => oc.Customer)
                .ThenInclude(c => c!.Profile)
            .Include(oc => oc.Processor)
            .FirstOrDefaultAsync(oc => oc.Id == id);

        if (result?.Order != null && result.Customer != null)
        {
            try
            {
                await _emailService.SendOrderCancellationEmailAsync(result.Order, dto.AdminNote ?? cancellation.Reason ?? "Không có lý do cụ thể", dto.Status == "Approved");
            }
            catch (Exception ex)
            {
                // Log error but don't fail the request
                // Email sending should not break the main flow
            }
        }

        return Ok(MapToDto(result!));
    }

    // DELETE: api/OrderCancellation/{id} - Delete cancellation request (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var cancellation = await _db.OrderCancellations.FindAsync(id);
        if (cancellation == null)
            return NotFound();

        _db.OrderCancellations.Remove(cancellation);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private OrderCancellationDto MapToDto(OrderCancellation cancellation)
    {
        return new OrderCancellationDto
        {
            Id = cancellation.Id,
            OrderId = cancellation.OrderId,
            OrderCode = cancellation.Order?.OrderCode,
            CustomerId = cancellation.CustomerId,
            CustomerName = cancellation.Customer?.Profile?.FullName ?? cancellation.Customer?.UserName,
            Reason = cancellation.Reason,
            Status = cancellation.Status,
            RequestedAt = cancellation.RequestedAt,
            ProcessedAt = cancellation.ProcessedAt,
            ProcessedBy = cancellation.ProcessedBy,
            ProcessorName = cancellation.Processor?.UserName,
            AdminNote = cancellation.AdminNote,
            Order = cancellation.Order != null ? new OrderDto
            {
                Id = cancellation.Order.Id,
                OrderCode = cancellation.Order.OrderCode,
                CustomerId = cancellation.Order.CustomerId,
                Status = cancellation.Order.Status,
                PaymentMethod = cancellation.Order.PaymentMethod,
                PaymentStatus = cancellation.Order.PaymentStatus,
                ShippingAddress = cancellation.Order.ShippingAddress,
                CreatedAt = cancellation.Order.CreatedAt,
                DeliveryDate = cancellation.Order.DeliveryDate,
                Total = cancellation.Order.Total,
                PromotionCode = cancellation.Order.PromotionCode,
                DiscountAmount = cancellation.Order.DiscountAmount,
                SubTotal = cancellation.Order.SubTotal
            } : null
        };
    }
}

