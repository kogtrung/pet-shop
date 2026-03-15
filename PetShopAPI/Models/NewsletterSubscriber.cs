using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class NewsletterSubscriber
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(256)] public string Email { get; set; } = default!;
    public bool IsConfirmed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}