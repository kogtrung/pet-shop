using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class PaymentTransaction
{
    [Key]
    public int Id { get; set; }

    public int? OrderId { get; set; }
    public Order? Order { get; set; }

    [MaxLength(100)]
    public string TransactionId { get; set; } = default!; // Transaction/order ID từ gateway

    [MaxLength(32)]
    public string Gateway { get; set; } = "MoMo"; // VNPay, MoMo, etc.

    [MaxLength(32)]
    public string PaymentMethod { get; set; } = "MOMO"; // VNPAY, MOMO, CREDIT_CARD, BANK_TRANSFER

    public decimal Amount { get; set; }

    [MaxLength(32)]
    public string Status { get; set; } = "Pending"; // Pending, Success, Failed, Cancelled

    public string? GatewayResponse { get; set; } // JSON response từ gateway

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public string? FailureReason { get; set; }
}


