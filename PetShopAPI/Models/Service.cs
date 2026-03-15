using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Models;

public class Service
{
    [Key]
    public int Id { get; set; }
    
    [MaxLength(128)] public string Name { get; set; } = default!;
    public string? Description { get; set; }
    [MaxLength(32)] public string PriceType { get; set; } = "PerDay"; // PerDay/Fixed/PerHour
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<ServicePackage> Packages { get; set; } = new List<ServicePackage>();
}