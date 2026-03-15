using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class ConversationSession
{
    [Key]
    public Guid Id { get; set; }
    
    public string? UserId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}