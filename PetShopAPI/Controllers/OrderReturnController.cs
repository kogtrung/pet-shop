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
[Authorize] // Cho phép tất cả user đã đăng nhập
public class OrderReturnController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrderReturnController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/orderreturn
    [HttpGet]
    [Authorize(Roles = "Admin,SaleStaff")] // Chỉ Admin và SaleStaff xem được tất cả
    public async Task<ActionResult<IEnumerable<OrderReturnDto>>> GetAll([FromQuery] string? status)
    {
        var query = _db.OrderReturns
            .Include(or => or.Order)
            .ThenInclude(o => o.Items)
            .ThenInclude(oi => oi.Product)
            .Include(or => or.Items)
            .ThenInclude(ori => ori.OrderItem)
            .ThenInclude(oi => oi.Product)
            .Include(or => or.ExchangeItems)
            .ThenInclude(orie => orie.Product)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(or => or.Status == status);
        }

        var returns = await query.OrderByDescending(or => or.CreatedAt).ToListAsync();

        var result = returns.Select(or => new OrderReturnDto
        {
            Id = or.Id,
            OrderId = or.OrderId,
            OrderCode = or.Order?.OrderCode,
            Reason = or.Reason,
            ReturnType = or.ReturnType,
            Status = or.Status,
            RequestedBy = or.RequestedBy,
            ReturnLocation = or.ReturnLocation,
            Condition = or.Condition,
            ReturnToSupplier = or.ReturnToSupplier,
            SupplierId = or.SupplierId,
            Items = or.Items.Select(ori => new OrderReturnItemDto
            {
                Id = ori.Id,
                OrderItemId = ori.OrderItemId,
                Quantity = ori.Quantity,
                Reason = ori.Reason,
                Condition = ori.Condition,
                ProductName = ori.OrderItem?.Product?.Name
            }).ToList(),
            ExchangeItems = or.ExchangeItems.Select(orie => new OrderReturnExchangeItemDto
            {
                Id = orie.Id,
                ProductId = orie.ProductId,
                ProductName = orie.Product?.Name,
                Quantity = orie.Quantity,
                UnitPrice = orie.UnitPrice
            }).ToList(),
            RefundAmount = or.RefundAmount,
            RefundMethod = or.RefundMethod,
            StaffNotes = or.StaffNotes,
            ProcessedByUserId = or.ProcessedByUserId,
            ProcessedAt = or.ProcessedAt,
            CreatedAt = or.CreatedAt
        });

        return Ok(result);
    }

    // GET: api/orderreturn/{id}
    [HttpGet("{id}")]
    [Authorize] // User chỉ xem được của mình, Admin/SaleStaff xem được tất cả
    public async Task<ActionResult<OrderReturnDto>> GetById(int id)
    {
        var orderReturn = await _db.OrderReturns
            .Include(or => or.Order)
            .ThenInclude(o => o.Items)
            .ThenInclude(oi => oi.Product)
            .Include(or => or.Items)
            .ThenInclude(ori => ori.OrderItem)
            .ThenInclude(oi => oi.Product)
            .Include(or => or.ExchangeItems)
            .ThenInclude(orie => orie.Product)
            .FirstOrDefaultAsync(or => or.Id == id);

        if (orderReturn == null) return NotFound();

        // Kiểm tra quyền: User chỉ xem được đổi trả của đơn hàng của mình
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var isAdminOrStaff = userRoles.Contains("Admin") || userRoles.Contains("SaleStaff");

        if (!isAdminOrStaff)
        {
            // Kiểm tra xem đơn hàng có thuộc về user này không
            var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderReturn.OrderId);
            if (order == null || order.CustomerId != userId)
            {
                return Forbid();
            }
        }

        return new OrderReturnDto
        {
            Id = orderReturn.Id,
            OrderId = orderReturn.OrderId,
            OrderCode = orderReturn.Order?.OrderCode,
            Reason = orderReturn.Reason,
            ReturnType = orderReturn.ReturnType,
            Status = orderReturn.Status,
            RequestedBy = orderReturn.RequestedBy,
            ReturnLocation = orderReturn.ReturnLocation,
            Condition = orderReturn.Condition,
            ReturnToSupplier = orderReturn.ReturnToSupplier,
            SupplierId = orderReturn.SupplierId,
            Items = orderReturn.Items.Select(ori => new OrderReturnItemDto
            {
                Id = ori.Id,
                OrderItemId = ori.OrderItemId,
                Quantity = ori.Quantity,
                Reason = ori.Reason,
                Condition = ori.Condition,
                ProductName = ori.OrderItem?.Product?.Name
            }).ToList(),
            ExchangeItems = orderReturn.ExchangeItems.Select(orie => new OrderReturnExchangeItemDto
            {
                Id = orie.Id,
                ProductId = orie.ProductId,
                ProductName = orie.Product?.Name,
                Quantity = orie.Quantity,
                UnitPrice = orie.UnitPrice
            }).ToList(),
            RefundAmount = orderReturn.RefundAmount,
            RefundMethod = orderReturn.RefundMethod,
            StaffNotes = orderReturn.StaffNotes,
            ProcessedByUserId = orderReturn.ProcessedByUserId,
            ProcessedAt = orderReturn.ProcessedAt,
            CreatedAt = orderReturn.CreatedAt
        };
    }

    // GET: api/orderreturn/order/{orderId}
    [HttpGet("order/{orderId}")]
    [Authorize] // User chỉ xem được của mình, Admin/SaleStaff xem được tất cả
    public async Task<ActionResult<IEnumerable<OrderReturnDto>>> GetByOrderId(int orderId)
    {
        // Kiểm tra quyền: User chỉ xem được đổi trả của đơn hàng của mình
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var isAdminOrStaff = userRoles.Contains("Admin") || userRoles.Contains("SaleStaff");

        if (!isAdminOrStaff)
        {
            // Kiểm tra xem đơn hàng có thuộc về user này không
            var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null || order.CustomerId != userId)
            {
                return Forbid();
            }
        }

        var returns = await _db.OrderReturns
            .Include(or => or.Items)
            .ThenInclude(ori => ori.OrderItem)
            .ThenInclude(oi => oi.Product)
            .Include(or => or.ExchangeItems)
            .ThenInclude(orie => orie.Product)
            .Where(or => or.OrderId == orderId)
            .OrderByDescending(or => or.CreatedAt)
            .ToListAsync();

        var result = returns.Select(or => new OrderReturnDto
        {
            Id = or.Id,
            OrderId = or.OrderId,
            OrderCode = or.Order?.OrderCode,
            Reason = or.Reason,
            ReturnType = or.ReturnType,
            Status = or.Status,
            RequestedBy = or.RequestedBy,
            ReturnLocation = or.ReturnLocation,
            Condition = or.Condition,
            ReturnToSupplier = or.ReturnToSupplier,
            SupplierId = or.SupplierId,
            Items = or.Items.Select(ori => new OrderReturnItemDto
            {
                Id = ori.Id,
                OrderItemId = ori.OrderItemId,
                Quantity = ori.Quantity,
                Reason = ori.Reason,
                Condition = ori.Condition,
                ProductName = ori.OrderItem?.Product?.Name
            }).ToList(),
            ExchangeItems = or.ExchangeItems.Select(orie => new OrderReturnExchangeItemDto
            {
                Id = orie.Id,
                ProductId = orie.ProductId,
                ProductName = orie.Product?.Name,
                Quantity = orie.Quantity,
                UnitPrice = orie.UnitPrice
            }).ToList(),
            RefundAmount = or.RefundAmount,
            RefundMethod = or.RefundMethod,
            StaffNotes = or.StaffNotes,
            ProcessedByUserId = or.ProcessedByUserId,
            ProcessedAt = or.ProcessedAt,
            CreatedAt = or.CreatedAt
        });

        return Ok(result);
    }

    // POST: api/orderreturn
    [HttpPost]
    [Authorize] // Cho phép User, Admin, SaleStaff tạo yêu cầu đổi trả
    public async Task<IActionResult> Create(CreateOrderReturnDto dto)
    {
        // Validate order exists
        var order = await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId);

        if (order == null)
        {
            return BadRequest(new { error = "Order not found" });
        }

        // Check if order already has a return request
        var existingReturn = await _db.OrderReturns
            .FirstOrDefaultAsync(or => or.OrderId == dto.OrderId);
        
        if (existingReturn != null)
        {
            return BadRequest(new { error = "Đơn hàng này đã có yêu cầu đổi trả. Mỗi đơn chỉ được yêu cầu đổi trả một lần." });
        }

        // Validate order items
        foreach (var item in dto.Items)
        {
            var orderItem = order.Items.FirstOrDefault(oi => oi.Id == item.OrderItemId);
            if (orderItem == null)
            {
                return BadRequest(new { error = $"Order item {item.OrderItemId} not found in order" });
            }
            if (item.Quantity > orderItem.Quantity)
            {
                return BadRequest(new { error = $"Return quantity ({item.Quantity}) cannot exceed order quantity ({orderItem.Quantity})" });
            }
        }

        // Get current user to determine RequestedBy if not provided
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var requestedBy = dto.RequestedBy;
        if (string.IsNullOrEmpty(requestedBy))
        {
            if (userRoles.Contains("Admin") || userRoles.Contains("SaleStaff"))
            {
                requestedBy = "Staff";
            }
            else if (userRoles.Contains("User"))
            {
                requestedBy = "Customer";
            }
        }

        // Create return
        var orderReturn = new OrderReturn
        {
            OrderId = dto.OrderId,
            Reason = dto.Reason,
            CreatedAt = DateTimeHelper.GetVietnamTime(),
            ReturnType = dto.ReturnType,
            Status = "Pending",
            RequestedBy = requestedBy,
            ReturnLocation = dto.ReturnLocation,
            Condition = dto.Condition,
            ReturnToSupplier = dto.ReturnToSupplier,
            SupplierId = dto.SupplierId,
            Items = dto.Items.Select(i => new OrderReturnItem
            {
                OrderItemId = i.OrderItemId,
                Quantity = i.Quantity,
                Reason = i.Reason,
                Condition = i.Condition
            }).ToList()
        };

        // Add exchange items if return type is Exchange
        if (dto.ReturnType == "Exchange" && dto.ExchangeItems != null && dto.ExchangeItems.Any())
        {
            foreach (var exchangeItem in dto.ExchangeItems)
            {
                var product = await _db.Products.FindAsync(exchangeItem.ProductId);
                if (product == null)
                {
                    return BadRequest(new { error = $"Product {exchangeItem.ProductId} not found" });
                }

                orderReturn.ExchangeItems.Add(new OrderReturnExchangeItem
                {
                    ProductId = exchangeItem.ProductId,
                    Quantity = exchangeItem.Quantity,
                    UnitPrice = product.SalePrice ?? product.Price
                });
            }
        }

        _db.OrderReturns.Add(orderReturn);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = orderReturn.Id }, new { id = orderReturn.Id });
    }

    // PUT: api/orderreturn/{id}/status
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,SaleStaff")] // Chỉ Admin và SaleStaff mới được cập nhật trạng thái
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderReturnStatusDto dto)
    {
        var orderReturn = await _db.OrderReturns
            .Include(or => or.Order)
            .ThenInclude(o => o.Items)
            .ThenInclude(oi => oi.Product)
            .ThenInclude(p => p.Inventory)
            .Include(or => or.Items)
            .ThenInclude(ori => ori.OrderItem)
            .FirstOrDefaultAsync(or => or.Id == id);

        if (orderReturn == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Update status
        orderReturn.Status = dto.Status;
        orderReturn.StaffNotes = dto.StaffNotes;
        orderReturn.RefundAmount = dto.RefundAmount;
        orderReturn.RefundMethod = dto.RefundMethod;

        // If approved and processing, update processed info
        if (dto.Status == "Approved" || dto.Status == "Processing" || dto.Status == "Completed")
        {
            orderReturn.ProcessedByUserId = userId;
            orderReturn.ProcessedAt = DateTimeHelper.GetVietnamTime();
        }

        // If completed, restore inventory for returned items
        if (dto.Status == "Completed" && orderReturn.ReturnType == "Return")
        {
            foreach (var returnItem in orderReturn.Items)
            {
                var orderItem = returnItem.OrderItem;
                if (orderItem?.Product?.Inventory != null)
                {
                    orderItem.Product.Inventory.Quantity += returnItem.Quantity;
                }
            }
        }

        orderReturn.UpdatedAt = DateTimeHelper.GetVietnamTime();
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/orderreturn/{id}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var orderReturn = await _db.OrderReturns.FindAsync(id);
        if (orderReturn == null) return NotFound();

        // Allow delete at any status for Admin/SaleStaff
        _db.OrderReturns.Remove(orderReturn);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

