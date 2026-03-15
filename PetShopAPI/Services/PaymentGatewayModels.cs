using PetShopAPI.Models;

namespace PetShopAPI.Services;

public class PaymentRequestResult
{
    public string PaymentUrl { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
}

public class PaymentResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? TransactionId { get; set; }
    public int? OrderId { get; set; }
}

public enum PaymentStatus
{
    Pending,
    Success,
    Failed
}

public interface IPaymentGatewayService
{
    /// <summary>
    /// Tạo yêu cầu thanh toán cho 1 đơn hàng đã tồn tại.
    /// </summary>
    Task<PaymentRequestResult> CreatePaymentRequestAsync(Order order);

    /// <summary>
    /// Xử lý callback từ gateway (IPN hoặc redirect).
    /// </summary>
    Task<PaymentResult> ProcessPaymentCallbackAsync(IDictionary<string, string> callbackData);
}


