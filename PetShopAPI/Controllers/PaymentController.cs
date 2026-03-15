using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Services;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPaymentGatewayService _paymentGatewayService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        AppDbContext db,
        IPaymentGatewayService paymentGatewayService,
        ILogger<PaymentController> logger)
    {
        _db = db;
        _paymentGatewayService = paymentGatewayService;
        _logger = logger;
    }

    public class CreateMoMoPaymentDto
    {
        public int OrderId { get; set; }
    }

    /// <summary>
    /// Tạo yêu cầu thanh toán MoMo cho 1 đơn hàng đã tồn tại.
    /// </summary>
    [Authorize(Roles = "User,Admin,SaleStaff")]
    [HttpPost("momo/create")]
    public async Task<IActionResult> CreateMoMoPayment([FromBody] CreateMoMoPaymentDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == dto.OrderId);
        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        // Nếu là user thường thì chỉ được tạo thanh toán cho đơn của mình
        if (order.CustomerId != userId && !User.IsInRole("Admin") && !User.IsInRole("SaleStaff"))
        {
            return Forbid();
        }

        if (order.Total <= 0)
        {
            return BadRequest(new { message = "Order total must be greater than zero" });
        }

        try
        {
            var result = await _paymentGatewayService.CreatePaymentRequestAsync(order);
            return Ok(new
            {
                paymentUrl = result.PaymentUrl,
                transactionId = result.TransactionId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create MoMo payment for order {OrderId}", dto.OrderId);
            return StatusCode(500, new { message = "Failed to create payment request", error = ex.Message });
        }
    }

    /// <summary>
    /// Endpoint để MoMo gọi IPN callback (server-to-server).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("callback/momo")]
    public async Task<IActionResult> MoMoCallback()
    {
        // Đọc toàn bộ form/json thành dictionary để pass xuống service
        var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (Request.HasFormContentType)
        {
            foreach (var kv in Request.Form)
            {
                data[kv.Key] = kv.Value.ToString();
            }
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                try
                {
                    var json = System.Text.Json.JsonDocument.Parse(body).RootElement;
                    foreach (var prop in json.EnumerateObject())
                    {
                        data[prop.Name] = prop.Value.ToString();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse MoMo callback body: {Body}", body);
                }
            }
        }

        var result = await _paymentGatewayService.ProcessPaymentCallbackAsync(data);

        // MoMo mong đợi HTTP 200 luôn, phần nội dung chỉ mang tính log
        return Ok(new
        {
            success = result.Success,
            orderId = result.OrderId,
            transactionId = result.TransactionId,
            message = result.Success ? "Payment processed" : result.ErrorMessage
        });
    }
}


