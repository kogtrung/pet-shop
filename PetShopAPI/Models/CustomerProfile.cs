using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class CustomerProfile
{
    [Key]
    public string UserId { get; set; } = default!;
    public ApplicationUser User { get; set; } = default!;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
}