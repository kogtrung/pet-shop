using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class WalkInBookingDto
{
    [Required]
    public string CustomerName { get; set; } = string.Empty;
    
    [Required]
    [Phone]
    public string CustomerPhone { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string CustomerEmail { get; set; } = string.Empty;
    
    [Required]
    public string PetName { get; set; } = string.Empty;
    
    public string? PetType { get; set; }
    public string? PetBreed { get; set; }
    public int? PetAge { get; set; }
    public decimal? PetWeight { get; set; }
    
    public string? Note { get; set; }
    
    [Required]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dịch vụ")]
    public List<WalkInServiceItemDto> ServiceItems { get; set; } = new();
}

public class WalkInServiceItemDto
{
    [Required]
    public int ServiceId { get; set; }
    
    public int? ServicePackageId { get; set; }
    
    public string? Note { get; set; }
}

