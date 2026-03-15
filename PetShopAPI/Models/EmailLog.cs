using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class EmailLog
{
    [Key]
    public int Id { get; set; }
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string EmailType { get; set; } = string.Empty; // AccountConfirmation, BookingConfirmation, etc.
    public bool IsSent { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? SentAt { get; set; }
}

