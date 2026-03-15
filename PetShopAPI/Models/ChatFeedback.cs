using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class ChatFeedback
{
    [Key]
    public int Id { get; set; }

    public int ChatMessageId { get; set; } // Khóa ngoại
    public virtual ChatMessage ChatMessage { get; set; } // Navigation property

    public bool IsHelpful { get; set; } // true = 👍, false = 👎
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}