using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PetShopAPI.Data;
using PetShopAPI.Models;

namespace PetShopAPI.Services;

public class MoMoService : IPaymentGatewayService
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MoMoService> _logger;
    private readonly MoMoSettings _settings;

    public MoMoService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IOptions<MoMoSettings> momoOptions,
        ILogger<MoMoService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _settings = momoOptions.Value;
    }

    public async Task<PaymentRequestResult> CreatePaymentRequestAsync(Order order)
    {
        if (order == null) throw new ArgumentNullException(nameof(order));

        var client = _httpClientFactory.CreateClient();

        // MoMo yêu cầu orderId và requestId là duy nhất
        var orderId = order.Id.ToString();
        var requestId = Guid.NewGuid().ToString("N");
        var amount = ((int)order.Total).ToString(); // MoMo dùng số nguyên VNĐ
        var orderInfo = $"Thanh toan don hang {order.OrderCode ?? order.Id.ToString()}";
        
        // QUAN TRỌNG: extraData phải là string rỗng, không được null
        var extraData = string.Empty;
        const string requestType = "captureWallet";

        // QUAN TRỌNG: orderInfo trong rawHash PHẢI được URL encode (dấu cách -> %20)
        // Nhưng trong payload gửi sang MoMo thì orderInfo giữ nguyên (không encode)
        // ipnUrl và redirectUrl KHÔNG encode trong rawHash
        var encodedOrderInfo = Uri.EscapeDataString(orderInfo);
        
        // Đảm bảo extraData không null
        if (extraData == null) extraData = string.Empty;

        // Chuỗi raw hash theo tài liệu MoMo - CHỈ orderInfo được URL encode
        // Thứ tự: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
        var rawHash =
            $"accessKey={_settings.AccessKey}" +
            $"&amount={amount}" +
            $"&extraData={extraData ?? string.Empty}" +
            $"&ipnUrl={_settings.IpnUrl}" +
            $"&orderId={orderId}" +
            $"&orderInfo={encodedOrderInfo}" +
            $"&partnerCode={_settings.PartnerCode}" +
            $"&redirectUrl={_settings.RedirectUrl}" +
            $"&requestId={requestId}" +
            $"&requestType={requestType}";

        // Log rawHash để debug - in ra cả console và logger
        Console.WriteLine("========================================");
        Console.WriteLine($"MoMo rawHash for order {order.Id}:");
        Console.WriteLine(rawHash);
        Console.WriteLine($"MoMo SecretKey: {_settings.SecretKey}");
        Console.WriteLine($"MoMo SecretKey length: {_settings.SecretKey?.Length ?? 0}");
        Console.WriteLine("========================================");
        
        _logger.LogInformation("MoMo rawHash for order {OrderId}: {RawHash}", order.Id, rawHash);
        _logger.LogInformation("MoMo SecretKey length: {Length}", _settings.SecretKey?.Length ?? 0);

        var signature = ComputeHmacSha256(rawHash, _settings.SecretKey);
        
        // Log signature để debug - in ra cả console và logger
        Console.WriteLine($"MoMo signature for order {order.Id}: {signature}");
        Console.WriteLine("========================================");
        
        _logger.LogInformation("MoMo signature for order {OrderId}: {Signature}", order.Id, signature);

        var payload = new
        {
            partnerCode = _settings.PartnerCode,
            partnerName = "MoMo",
            storeId = "PetShop",
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl = _settings.RedirectUrl,
            ipnUrl = _settings.IpnUrl,
            lang = "vi",
            requestType,
            extraData = extraData ?? string.Empty,
            signature
        };

        _logger.LogInformation("Creating MoMo payment for order {OrderId} with payload {@Payload}", order.Id, payload);

        using var response = await client.PostAsJsonAsync(_settings.Endpoint, payload);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MoMo create payment failed: {StatusCode} - {Body}", response.StatusCode, json);
            throw new InvalidOperationException($"MoMo create payment failed: {(int)response.StatusCode} - {json}");
        }

        // MoMo response format (simplified)
        var data = System.Text.Json.JsonDocument.Parse(json).RootElement;
        var resultCode = data.GetProperty("resultCode").GetInt32();
        var payUrl = data.GetProperty("payUrl").GetString() ?? string.Empty;
        var momoOrderId = data.GetProperty("orderId").GetString() ?? orderId;

        if (resultCode != 0 || string.IsNullOrEmpty(payUrl))
        {
            _logger.LogError("MoMo returned non-success resultCode {ResultCode}: {Body}", resultCode, json);
            throw new InvalidOperationException($"MoMo create payment failed, resultCode={resultCode} - {json}");
        }

        // Lưu transaction
        var transaction = new PaymentTransaction
        {
            OrderId = order.Id,
            TransactionId = momoOrderId,
            Gateway = "MoMo",
            PaymentMethod = "MOMO",
            Amount = order.Total,
            Status = "Pending",
            GatewayResponse = json,
            CreatedAt = DateTime.UtcNow
        };

        _db.PaymentTransactions.Add(transaction);
        await _db.SaveChangesAsync();

        return new PaymentRequestResult
        {
            PaymentUrl = payUrl,
            TransactionId = transaction.TransactionId
        };
    }

    public async Task<PaymentResult> ProcessPaymentCallbackAsync(IDictionary<string, string> callbackData)
    {
        // Trong giai đoạn đầu, ta chỉ kiểm tra resultCode và cập nhật trạng thái,
        // phần verify chữ ký có thể bổ sung chi tiết hơn sau nếu cần.
        if (!callbackData.TryGetValue("orderId", out var orderIdStr) ||
            !int.TryParse(orderIdStr, out var orderId))
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = "Invalid orderId in callback"
            };
        }

        callbackData.TryGetValue("resultCode", out var resultCodeStr);
        var success = resultCodeStr == "0";

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null)
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = $"Order {orderId} not found"
            };
        }

        // Tìm transaction tương ứng
        var transaction = await _db.PaymentTransactions
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(t => t.OrderId == orderId && t.Gateway == "MoMo");

        var now = DateTime.UtcNow;

        if (transaction != null)
        {
            transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
            transaction.CompletedAt = now;
            transaction.Status = success ? "Success" : "Failed";
            if (!success)
            {
                callbackData.TryGetValue("message", out var message);
                transaction.FailureReason = message;
            }
        }

        if (success)
        {
            order.PaymentStatus = "Paid";
            order.Status = "Confirmed";
        }

        await _db.SaveChangesAsync();

        return new PaymentResult
        {
            Success = success,
            TransactionId = transaction?.TransactionId,
            OrderId = order.Id,
            ErrorMessage = success ? null : "Payment failed"
        };
    }

    private static string ComputeHmacSha256(string rawData, string secretKey)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawData));
        var builder = new StringBuilder(hashBytes.Length * 2);
        foreach (var b in hashBytes)
        {
            builder.Append(b.ToString("x2"));
        }
        return builder.ToString();
    }
}


