using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetShopAPI.Models;

public class ChatMessage
{
    [Key]
    public int Id { get; set; }
    
    public Guid ConversationSessionId { get; set; }
    
    [Required]
    public string Role { get; set; } = string.Empty; // "user" or "assistant"
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("ConversationSessionId")]
    public ConversationSession ConversationSession { get; set; } = default!;
}