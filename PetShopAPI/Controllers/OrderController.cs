using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Services;
using PetShopAPI.Helpers;
using System.Security.Claims;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly OrderCodeGenerator _codeGenerator;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrderController> _logger;
    
    public OrderController(
        AppDbContext db, 
        OrderCodeGenerator codeGenerator,
        IEmailService emailService,
        ILogger<OrderController> logger)
    {
        _db = db;
        _codeGenerator = codeGenerator;
        _emailService = emailService;
        _logger = logger;
    }

    // GET: api/order
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .Include(o => o.Customer)
            .ThenInclude(c => c!.Profile) // Customer may be null, but EF Core handles this
            .AsQueryable();

        // Search by order ID, customer phone, or customer name
        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(o => 
                o.Id.ToString().Contains(search) ||
                (o.ShippingAddress != null && o.ShippingAddress.ToLower().Contains(searchLower)) ||
                (o.Customer != null && o.Customer.Profile != null && 
                 ((o.Customer.Profile.Phone != null && o.Customer.Profile.Phone.Contains(search)) ||
                  (o.Customer.Profile.FullName != null && o.Customer.Profile.FullName.ToLower().Contains(searchLower)))) ||
                (o.Customer != null && o.Customer.Email != null && o.Customer.Email.ToLower().Contains(searchLower))
            );
        }

        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();

        // Create DTOs to avoid circular references
        var orderDtos = orders.Select(o => {
            // Lấy tên khách hàng từ Customer Profile hoặc từ ShippingAddress
            string? customerName = null;
            if (o.CustomerId != null && o.Customer?.Profile != null)
            {
                customerName = o.Customer.Profile.FullName;
            }
            else if (o.ShippingAddress != null && o.ShippingAddress.Contains("Tại cửa hàng -"))
            {
                // Parse tên từ "Tại cửa hàng - {Tên} - {SĐT}"
                var parts = o.ShippingAddress.Split(" - ");
                if (parts.Length >= 2)
                {
                    customerName = parts[1];
                }
            }

            return new OrderDto
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                CustomerId = o.CustomerId,
                CustomerName = customerName,
                CustomerEmail = o.Customer?.Email,
                Status = o.Status,
                PaymentMethod = o.PaymentMethod,
                PaymentStatus = o.PaymentStatus,
                ShippingAddress = o.ShippingAddress,
                ShippingMethod = o.ShippingMethod,
                CreatedAt = o.CreatedAt,
                DeliveryDate = o.DeliveryDate,
                Total = o.Total,
                PromotionCode = o.PromotionCode,
                DiscountAmount = o.DiscountAmount,
                SubTotal = o.SubTotal,
                ShippingFee = o.ShippingFee,
                Items = o.Items.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    OrderId = i.OrderId,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name,
                    ProductSku = i.Product?.Sku,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.LineTotal
                }).ToList()
            };
        }).ToList();

        return Ok(orderDtos);
    }
    
    // API cho người dùng xem lịch sử đơn hàng CỦA HỌ
    [Authorize(Roles = "User,Admin,SaleStaff")] // User, Admin và Staff đều có thể xem lịch sử của mình
    [HttpGet("my-history")]
    public async Task<IActionResult> GetMyOrderHistory()
    {
        // Lấy userId của người dùng đang đăng nhập từ token
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);

        var orders = await _db.Orders
            .Include(o => o.Items) // Include order items for product count
            .Where(o => o.CustomerId != null && o.CustomerId == userId) // Chỉ lấy đơn hàng của user này (không bao gồm khách vãng lai)
            .ToListAsync();

        // Create DTOs to avoid circular references
        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            OrderCode = o.OrderCode,
            CustomerId = o.CustomerId,
            Status = o.Status,
            PaymentMethod = o.PaymentMethod,
            PaymentStatus = o.PaymentStatus,
            ShippingAddress = o.ShippingAddress,
            ShippingMethod = o.ShippingMethod,
            CreatedAt = o.CreatedAt,
            DeliveryDate = o.DeliveryDate,
            SubTotal = o.SubTotal,
            PromotionCode = o.PromotionCode,
            DiscountAmount = o.DiscountAmount,
            ShippingFee = o.ShippingFee,
            Total = o.Total,
            Items = o.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                OrderId = i.OrderId, // Don't include the Order navigation property to avoid circular reference
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                ProductSku = i.Product?.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        }).ToList();

        return Ok(orderDtos);
    }

    // GET: api/order/5
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var o = await _db.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .Include(o => o.Customer)
            .ThenInclude(c => c!.Profile) // Customer may be null, but EF Core handles this
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o == null) return NotFound();

        // Lấy tên khách hàng từ Customer Profile hoặc từ ShippingAddress
        string? customerName = null;
        if (o.CustomerId != null && o.Customer?.Profile != null)
        {
            customerName = o.Customer.Profile.FullName;
        }
        else if (o.ShippingAddress != null && o.ShippingAddress.Contains("Tại cửa hàng -"))
        {
            // Parse tên từ "Tại cửa hàng - {Tên} - {SĐT}"
            var parts = o.ShippingAddress.Split(" - ");
            if (parts.Length >= 2)
            {
                customerName = parts[1];
            }
        }

        // Create DTO to avoid circular references
        return new OrderDto
        {
            Id = o.Id,
            OrderCode = o.OrderCode,
            CustomerId = o.CustomerId,
            CustomerName = customerName,
            CustomerEmail = o.Customer?.Email,
            Status = o.Status,
            PaymentMethod = o.PaymentMethod,
            PaymentStatus = o.PaymentStatus,
            ShippingAddress = o.ShippingAddress,
            ShippingMethod = o.ShippingMethod,
            CreatedAt = o.CreatedAt,
            DeliveryDate = o.DeliveryDate,
            SubTotal = o.SubTotal,
            PromotionCode = o.PromotionCode,
            DiscountAmount = o.DiscountAmount,
            ShippingFee = o.ShippingFee,
            Total = o.Total,
            Items = o.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                OrderId = i.OrderId,
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                ProductSku = i.Product?.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        };
    }

    // GET: api/order/my/{id} - Allow users to view their own order details
    [Authorize(Roles = "User,Admin,SaleStaff")]
    [HttpGet("my/{id}")]
    public async Task<ActionResult<OrderDto>> GetMyOrderById(int id)
    {
        // Get userId from JWT token
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // Find order and ensure it belongs to the current user
        var o = await _db.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.CustomerId != null && o.CustomerId == userId);

        if (o == null) return NotFound(new { message = "Order not found or you don't have permission to view it" });

        return new OrderDto
        {
            Id = o.Id,
            OrderCode = o.OrderCode,
            CustomerId = o.CustomerId,
            Status = o.Status,
            PaymentMethod = o.PaymentMethod,
            PaymentStatus = o.PaymentStatus,
            ShippingAddress = o.ShippingAddress,
            ShippingMethod = o.ShippingMethod,
            CreatedAt = o.CreatedAt,
            DeliveryDate = o.DeliveryDate,
            SubTotal = o.SubTotal,
            PromotionCode = o.PromotionCode,
            DiscountAmount = o.DiscountAmount,
            ShippingFee = o.ShippingFee,
            Total = o.Total,
            Items = o.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                OrderId = i.OrderId,
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                ProductSku = i.Product?.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        };
    }

    // POST: api/order
    [Authorize(Roles = "User,Admin,SaleStaff")] // Cho phép User, Admin và Staff tạo đơn hàng
    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderDto dto)
    {
        // ✅ Lấy userId một cách an toàn từ token
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Validate that products exist and have sufficient stock (with row locking)
            foreach (var item in dto.Items)
            {
                var product = await _db.Products
                    .Include(p => p.Inventory)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                
                if (product == null)
                {
                    return BadRequest(new { message = $"Product with ID {item.ProductId} not found" });
                }
                
                // Check if there's sufficient inventory
                if (product.Inventory.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Insufficient stock for product {product.Name}. Available: {product.Inventory.Quantity}, Requested: {item.Quantity}" });
                }
            }

            // Calculate subtotal
            var subTotal = dto.Items.Sum(i => i.UnitPrice * i.Quantity);
            decimal discountAmount = 0;
            string? promotionCode = null;
            
            // Validate and apply promotion if provided
            if (!string.IsNullOrWhiteSpace(dto.PromotionCode))
            {
                var promotion = await _db.Promotions
                    .FirstOrDefaultAsync(p => p.Code.ToUpper() == dto.PromotionCode.ToUpper());
                
                if (promotion != null && promotion.IsActive)
                {
                    var now = DateTimeHelper.GetVietnamTime();
                    if (now >= promotion.StartDate && now <= promotion.EndDate)
                    {
                        if (!promotion.MaxUsageCount.HasValue || promotion.UsedCount < promotion.MaxUsageCount.Value)
                        {
                            if (!promotion.MinOrderAmount.HasValue || subTotal >= promotion.MinOrderAmount.Value)
                            {
                                // Check user applicability
                                if (string.IsNullOrEmpty(promotion.ApplicableUserId) || promotion.ApplicableUserId == userId)
                                {
                                    // Promotion applies to all products
                                    bool isApplicable = true;
                                    
                                    if (isApplicable)
                                    {
                                        // Calculate discount
                                        if (promotion.DiscountType == "Percentage")
                                        {
                                            discountAmount = subTotal * (promotion.DiscountValue / 100);
                                            if (promotion.MaxDiscountAmount.HasValue && discountAmount > promotion.MaxDiscountAmount.Value)
                                            {
                                                discountAmount = promotion.MaxDiscountAmount.Value;
                                            }
                                        }
                                        else if (promotion.DiscountType == "FixedAmount")
                                        {
                                            discountAmount = promotion.DiscountValue;
                                            if (discountAmount > subTotal)
                                            {
                                                discountAmount = subTotal;
                                            }
                                        }
                                        
                                        promotionCode = promotion.Code;
                                        promotion.UsedCount++;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Generate order code
            var orderCode = await _codeGenerator.GenerateOrderCodeAsync();

            // Calculate shipping fee
            var shippingFee = dto.ShippingFee;
            
            // Calculate total: subtotal - discount + shipping fee
            var total = subTotal - discountAmount + shippingFee;

            // Determine payment status and order status based on payment method
            // COD/CASH: Status = "Pending" (ready for staff), PaymentStatus = "Unpaid"
            // Online payment (MOMO, VNPAY, CREDIT_CARD, BANK_TRANSFER): 
            //   Status = "AwaitingPayment" (not visible to staff until paid)
            //   PaymentStatus = "Unpaid"
            //   After payment success → Status = "Pending", PaymentStatus = "Paid"
            var paymentStatus = "Unpaid";
            var isOnlinePayment = dto.PaymentMethod == "MOMO" || dto.PaymentMethod == "VNPAY" 
                || dto.PaymentMethod == "CREDIT_CARD" || dto.PaymentMethod == "BANK_TRANSFER";
            var orderStatus = isOnlinePayment ? "AwaitingPayment" : "Pending";

            // Create the order first
            var order = new Order
            {
                OrderCode = orderCode,
                CustomerId = userId,
                Status = orderStatus,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = paymentStatus,
                ShippingAddress = dto.ShippingAddress,
                ShippingMethod = dto.ShippingMethod,
                CreatedAt = DateTimeHelper.GetVietnamTime(),
                DeliveryDate = null,
                SubTotal = subTotal,
                DiscountAmount = discountAmount > 0 ? discountAmount : null,
                PromotionCode = promotionCode,
                ShippingFee = shippingFee,
                Total = total,
                Items = dto.Items.Select(i => new OrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity
                }).ToList()
            };

            _db.Orders.Add(order);
            await _db.SaveChangesAsync();
            
            // Update inventory quantities after order is created successfully
            foreach (var item in dto.Items)
            {
                // Reload product with inventory to get latest values
                var product = await _db.Products
                    .Include(p => p.Inventory)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    
                if (product != null)
                {
                    product.Inventory.Quantity -= item.Quantity;
                    product.SoldCount += item.Quantity;
                }
            }
            
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            // Load customer and items for email
            await _db.Entry(order).Reference(o => o.Customer).LoadAsync();
            await _db.Entry(order).Collection(o => o.Items).LoadAsync();
            foreach (var item in order.Items)
            {
                await _db.Entry(item).Reference(i => i.Product).LoadAsync();
            }

            // Send confirmation email only for COD/CASH orders (paid immediately)
            // For online payments, email will be sent after payment is confirmed
            if (order.Customer != null && !string.IsNullOrEmpty(order.Customer.Email) &&
                (dto.PaymentMethod == "COD" || dto.PaymentMethod == "CASH"))
            {
                try
                {
                    await _emailService.SendOrderConfirmationEmailAsync(order);
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send order confirmation email for order {OrderId}", order.Id);
                    // Don't fail the order creation if email fails
                }
            }

            return Ok(new
            {
                message = "Order created successfully",
                orderId = order.Id,
                total = order.Total
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the order", error = ex.Message });
        }
    }

    // POST: api/order/pos
    // Tạo đơn hàng tại cửa hàng (POS) - cho phép khách vãng lai (customerId null)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost("pos")]
    public async Task<IActionResult> CreatePOSOrder(CreatePOSOrderDto dto)
    {
        // Staff phải đăng nhập, nhưng customerId có thể null (khách vãng lai)
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Validate customerId nếu có
            if (!string.IsNullOrEmpty(dto.CustomerId))
            {
                var customerExists = await _db.Users.AnyAsync(u => u.Id == dto.CustomerId);
                if (!customerExists)
                {
                    return BadRequest(new { message = $"Customer with ID {dto.CustomerId} not found" });
                }
            }

            // Validate that products exist and have sufficient stock
            foreach (var item in dto.Items)
            {
                var product = await _db.Products
                    .Include(p => p.Inventory)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                
                if (product == null)
                {
                    return BadRequest(new { message = $"Product with ID {item.ProductId} not found" });
                }
                
                // Check if there's sufficient inventory
                if (product.Inventory.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Insufficient stock for product {product.Name}. Available: {product.Inventory.Quantity}, Requested: {item.Quantity}" });
                }
            }

            // Calculate subtotal
            var subTotal = dto.Items.Sum(i => i.UnitPrice * i.Quantity);
            decimal discountAmount = 0;
            string? promotionCode = null;
            
            // Validate and apply promotion if provided
            if (!string.IsNullOrWhiteSpace(dto.PromotionCode))
            {
                var promotion = await _db.Promotions
                    .FirstOrDefaultAsync(p => p.Code.ToUpper() == dto.PromotionCode.ToUpper());
                
                if (promotion != null && promotion.IsActive)
                {
                    var now = DateTimeHelper.GetVietnamTime();
                    if (now >= promotion.StartDate && now <= promotion.EndDate)
                    {
                        if (!promotion.MaxUsageCount.HasValue || promotion.UsedCount < promotion.MaxUsageCount.Value)
                        {
                            if (!promotion.MinOrderAmount.HasValue || subTotal >= promotion.MinOrderAmount.Value)
                            {
                                // Calculate discount
                                if (promotion.DiscountType == "Percentage")
                                {
                                    discountAmount = subTotal * (promotion.DiscountValue / 100);
                                    if (promotion.MaxDiscountAmount.HasValue && discountAmount > promotion.MaxDiscountAmount.Value)
                                    {
                                        discountAmount = promotion.MaxDiscountAmount.Value;
                                    }
                                }
                                else if (promotion.DiscountType == "FixedAmount")
                                {
                                    discountAmount = promotion.DiscountValue;
                                    if (discountAmount > subTotal)
                                    {
                                        discountAmount = subTotal;
                                    }
                                }
                                
                                promotionCode = promotion.Code;
                                promotion.UsedCount++;
                            }
                        }
                    }
                }
            }
            
            var total = subTotal - discountAmount;

            // Generate POS order code
            var orderCode = await _codeGenerator.GeneratePOSCodeAsync();

            // Create the order for POS - status Completed, PaymentStatus Paid
            var order = new Order
            {
                OrderCode = orderCode,
                CustomerId = string.IsNullOrWhiteSpace(dto.CustomerId) ? null : dto.CustomerId, // Null cho khách vãng lai
                Status = "Completed", // Đơn tại shop luôn Completed
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = "Paid", // Đã thanh toán tại quầy
                ShippingAddress = $"Tại cửa hàng - {dto.CustomerName} - {dto.CustomerPhone ?? ""}",
                CreatedAt = DateTimeHelper.GetVietnamTime(),
                DeliveryDate = DateTimeHelper.GetVietnamTime(), // Giao ngay tại cửa hàng
                SubTotal = subTotal,
                DiscountAmount = discountAmount > 0 ? discountAmount : null,
                PromotionCode = promotionCode,
                Total = total,
                Items = dto.Items.Select(i => new OrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity
                }).ToList()
            };

            _db.Orders.Add(order);
            await _db.SaveChangesAsync();
            
            // Update inventory quantities after order is created successfully
            foreach (var item in dto.Items)
            {
                var product = await _db.Products
                    .Include(p => p.Inventory)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    
                if (product != null)
                {
                    product.Inventory.Quantity -= item.Quantity;
                    product.SoldCount += item.Quantity;
                }
            }
            
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            // Load order with items for response
            var createdOrder = await _db.Orders
                .Include(o => o.Customer)
                    .ThenInclude(c => c!.Profile)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == order.Id);

            // Send confirmation email for POS order (only if customer has email)
            if (createdOrder?.Customer != null && !string.IsNullOrEmpty(createdOrder.Customer.Email))
            {
                try
                {
                    await _emailService.SendOrderConfirmationEmailAsync(createdOrder);
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send POS order confirmation email for order {OrderId}", order.Id);
                    // Don't fail the order creation if email fails
                }
            }

            var orderDto = new OrderDto
            {
                Id = createdOrder!.Id,
                OrderCode = createdOrder.OrderCode,
                CustomerId = createdOrder.CustomerId,
                Status = createdOrder.Status,
                PaymentMethod = createdOrder.PaymentMethod,
                PaymentStatus = createdOrder.PaymentStatus,
                ShippingAddress = createdOrder.ShippingAddress,
                CreatedAt = createdOrder.CreatedAt,
                DeliveryDate = createdOrder.DeliveryDate,
                SubTotal = createdOrder.SubTotal,
                PromotionCode = createdOrder.PromotionCode,
                DiscountAmount = createdOrder.DiscountAmount,
                Total = createdOrder.Total,
                Items = createdOrder.Items.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    OrderId = i.OrderId,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name,
                    ProductSku = i.Product?.Sku,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.LineTotal
                }).ToList()
            };

            return Ok(new
            {
                message = "POS order created successfully",
                data = orderDto
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the POS order", error = ex.Message });
        }
    }

    // PUT: api/order/5
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, OrderDto dto)
    {
        var o = await _db.Orders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();

        var oldStatus = o.Status;
        o.Status = dto.Status;
        o.PaymentMethod = dto.PaymentMethod;
        o.PaymentStatus = dto.PaymentStatus;
        o.ShippingAddress = dto.ShippingAddress;
        o.DeliveryDate = dto.DeliveryDate;

        // Auto-update payment status for COD orders when completed
        if (dto.Status == "Completed" && 
            (o.PaymentMethod == "COD" || o.PaymentMethod == "CASH") &&
            o.PaymentStatus != "Paid")
        {
            o.PaymentStatus = "Paid";
        }

        // Cập nhật items (simple approach: remove + add lại)
        _db.OrderItems.RemoveRange(o.Items);
        o.Items = dto.Items.Select(i => new OrderItem
        {
            ProductId = i.ProductId,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            LineTotal = i.UnitPrice * i.Quantity
        }).ToList();

        // Recalculate total including shipping fee
        o.Total = o.Items.Sum(i => i.LineTotal) - (o.DiscountAmount ?? 0) + o.ShippingFee;

        await _db.SaveChangesAsync();

        // Send email only for Completed or Cancelled status
        if (oldStatus != dto.Status && (dto.Status == "Completed" || dto.Status == "Cancelled"))
        {
            // Load customer and items for email
            await _db.Entry(o).Reference(order => order.Customer).LoadAsync();
            await _db.Entry(o).Collection(order => order.Items).LoadAsync();
            foreach (var item in o.Items)
            {
                await _db.Entry(item).Reference(i => i.Product).LoadAsync();
            }

            if (o.Customer != null && !string.IsNullOrEmpty(o.Customer.Email))
            {
                try
                {
                    await _emailService.SendOrderStatusUpdateEmailAsync(o, dto.Status);
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send order status update email for order {OrderId}", o.Id);
                    // Don't fail the update if email fails
                }
            }
        }

        return NoContent();
    }

    // PUT: api/order/5/status - Update order status only
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var order = await _db.Orders
            .Include(o => o.Customer)
            .ThenInclude(c => c.Profile)
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(x => x.Id == id);
        
        if (order == null) return NotFound();

        var oldStatus = order.Status;
        order.Status = dto.Status;
        
        // Cập nhật các trường khác nếu có
        if (!string.IsNullOrEmpty(dto.PaymentStatus))
        {
            order.PaymentStatus = dto.PaymentStatus;
        }
        
        // Auto-update payment status for COD orders when completed
        // Chỉ set Paid khi đơn chuyển sang Completed và là COD/CASH
        if (dto.Status == "Completed" && 
            (order.PaymentMethod == "COD" || order.PaymentMethod == "CASH") &&
            order.PaymentStatus != "Paid")
        {
            order.PaymentStatus = "Paid";
        }
        
        // Đối với đơn online (MOMO, VNPAY, CREDIT_CARD, BANK_TRANSFER):
        // PaymentStatus chỉ được cập nhật khi thanh toán thành công (từ callback)
        // Không tự động set Paid khi Completed
        
        if (dto.DeliveryDate.HasValue)
        {
            order.DeliveryDate = dto.DeliveryDate;
        }

        await _db.SaveChangesAsync();

        // Send email only for Completed or Cancelled status
        if (oldStatus != dto.Status && (dto.Status == "Completed" || dto.Status == "Cancelled") && order.Customer != null && !string.IsNullOrEmpty(order.Customer.Email))
        {
            try
            {
                await _emailService.SendOrderStatusUpdateEmailAsync(order, dto.Status);
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning(emailEx, "Failed to send order status update email for order {OrderId}", order.Id);
                // Don't fail the update if email fails
            }
        }

        return NoContent();
    }

    // PUT: api/order/5/payment-status - Update payment status (for payment gateway callbacks)
    [Authorize(Roles = "User,Admin,SaleStaff")]
    [HttpPut("{id}/payment-status")]
    public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
    {
        var order = await _db.Orders
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);
        
        if (order == null) return NotFound();

        // Get userId from JWT token
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        
        // Check if user owns this order or is admin/staff
        if (order.CustomerId != userId && !User.IsInRole("Admin") && !User.IsInRole("SaleStaff"))
        {
            return Forbid();
        }

        order.PaymentStatus = dto.PaymentStatus;
        
        // Optionally store transaction ID if provided
        // Note: You may need to add a TransactionId field to Order model if needed

        await _db.SaveChangesAsync();

        // Send confirmation email when payment is successful (for online payments)
        if (dto.PaymentStatus == "Paid" && order.Customer != null && !string.IsNullOrEmpty(order.Customer.Email))
        {
            try
            {
                // Send order confirmation email (not status update) when payment is confirmed
                await _emailService.SendOrderConfirmationEmailAsync(order);
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning(emailEx, "Failed to send payment confirmation email for order {OrderId}", order.Id);
            }
        }

        return Ok(new { message = "Payment status updated successfully" });
    }

    // DELETE: api/order/5
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var o = await _db.Orders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();

        _db.OrderItems.RemoveRange(o.Items);
        _db.Orders.Remove(o);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT: api/order/5/cancel - Cancel an order (User or Admin)
    [Authorize]
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        // Get userId from JWT token
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // Find order and ensure it belongs to the current user or user is admin
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        // Check if user can cancel this order (own order or admin)
        var userIsAdmin = User.IsInRole("Admin");
        if (order.CustomerId == null || (order.CustomerId != userId && !userIsAdmin))
        {
            return Forbid();
        }

        // Check if order can be cancelled based on status
        var status = order.Status.ToUpper();
        if (status == "SHIPPING" || status == "DELIVERED" || status == "COMPLETED" || status == "CANCELLED")
        {
            return BadRequest(new { 
                message = "Cannot cancel order that has been shipped or completed",
                code = "INVALID_ORDER_STATUS"
            });
        }

        // Update order status to Cancelled
        order.Status = "Cancelled";
        await _db.SaveChangesAsync();

        return Ok(new { 
            id = order.Id, 
            status = order.Status, 
            message = "Order cancelled successfully" 
        });
    }
}