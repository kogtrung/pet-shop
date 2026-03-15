using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class NewsletterSubscriberDto
{
    public int Id { get; set; }
    
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = default!;
    
    public bool IsConfirmed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SubscribeNewsletterDto
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = default!;
}
