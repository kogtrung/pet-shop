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

        // MoMo yêu cầu orderId là duy nhất — dùng OrderCode + timestamp suffix để vừa dễ đọc vừa unique
        var orderCode = order.OrderCode ?? $"ORD{order.Id}";
        var momoOrderId = $"{orderCode}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var requestId = Guid.NewGuid().ToString();
        var amount = ((long)order.Total).ToString(); // MoMo dùng số nguyên VNĐ
        var orderInfo = $"Thanh toan don hang {orderCode}";
        
        var extraData = string.Empty;
        const string requestType = "payWithMethod"; // Theo mẫu MoMo GitHub

        // Chuỗi raw signature theo đúng tài liệu MoMo - KHÔNG encode orderInfo
        // Thứ tự alphabetical: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
        var rawSignature =
            $"accessKey={_settings.AccessKey}" +
            $"&amount={amount}" +
            $"&extraData={extraData}" +
            $"&ipnUrl={_settings.IpnUrl}" +
            $"&orderId={momoOrderId}" +
            $"&orderInfo={orderInfo}" +
            $"&partnerCode={_settings.PartnerCode}" +
            $"&redirectUrl={_settings.RedirectUrl}" +
            $"&requestId={requestId}" +
            $"&requestType={requestType}";

        // Log để debug (KHÔNG log SecretKey)
        _logger.LogInformation("MoMo rawSignature for order {OrderId}: {RawSignature}", order.Id, rawSignature);

        var signature = ComputeHmacSha256(rawSignature, _settings.SecretKey);
        
        _logger.LogInformation("MoMo signature for order {OrderId}: {Signature}", order.Id, signature);

        var payload = new
        {
            partnerCode = _settings.PartnerCode,
            partnerName = "MoMo Payment",
            storeId = "PetShop",
            requestId,
            amount,
            orderId = momoOrderId,
            orderInfo,
            redirectUrl = _settings.RedirectUrl,
            ipnUrl = _settings.IpnUrl,
            lang = "vi",
            requestType,
            extraData,
            orderGroupId = "",
            autoCapture = true,
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
        var responseOrderId = data.GetProperty("orderId").GetString() ?? momoOrderId;

        if (resultCode != 0 || string.IsNullOrEmpty(payUrl))
        {
            _logger.LogError("MoMo returned non-success resultCode {ResultCode}: {Body}", resultCode, json);
            throw new InvalidOperationException($"MoMo create payment failed, resultCode={resultCode} - {json}");
        }

        // Lưu transaction
        var transaction = new PaymentTransaction
        {
            OrderId = order.Id,
            TransactionId = responseOrderId,
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
        // orderId từ MoMo callback giờ là GUID (không phải database ID)
        if (!callbackData.TryGetValue("orderId", out var momoOrderId) || string.IsNullOrEmpty(momoOrderId))
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = "Invalid orderId in callback"
            };
        }

        callbackData.TryGetValue("resultCode", out var resultCodeStr);
        var success = resultCodeStr == "0";

        // Tìm transaction bằng TransactionId (chính là momoOrderId - GUID)
        var transaction = await _db.PaymentTransactions
            .FirstOrDefaultAsync(t => t.TransactionId == momoOrderId && t.Gateway == "MoMo");

        if (transaction == null || transaction.OrderId == null)
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = $"Transaction for MoMo orderId '{momoOrderId}' not found"
            };
        }

        // Tìm order thông qua transaction
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == transaction.OrderId);
        if (order == null)
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = $"Order {transaction.OrderId} not found"
            };
        }

        var now = DateTime.UtcNow;

        transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
        transaction.CompletedAt = now;
        transaction.Status = success ? "Success" : "Failed";
        if (!success)
        {
            callbackData.TryGetValue("message", out var message);
            transaction.FailureReason = message;
        }

        if (success)
        {
            // Thanh toán thành công → Đơn chuyển sang Pending (sẵn sàng cho staff xử lý)
            order.PaymentStatus = "Paid";
            order.Status = "Pending";
        }
        else
        {
            // Thanh toán thất bại → Đơn chuyển sang PaymentFailed
            order.PaymentStatus = "Unpaid";
            order.Status = "PaymentFailed";
        }

        await _db.SaveChangesAsync();

        return new PaymentResult
        {
            Success = success,
            TransactionId = transaction.TransactionId,
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


