using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class CustomerProfileDto
{
    public string UserId { get; set; } = default!;
    public string? Username { get; set; }
    public string? Email { get; set; }
    
    [MaxLength(200)]
    public string? FullName { get; set; }
    
    [MaxLength(20)]
    public string? Phone { get; set; }
    
    [MaxLength(500)]
    public string? Address { get; set; }
    
    // Danh sách roles của user
    public List<string>? Roles { get; set; }
}

public class CreateCustomerProfileDto
{
    [MaxLength(200)]
    public string? FullName { get; set; }
    
    [MaxLength(20)]
    public string? Phone { get; set; }
    
    [MaxLength(500)]
    public string? Address { get; set; }
}

public class UpdateCustomerProfileDto
{
    [EmailAddress]
    [MaxLength(256)]
    public string? Email { get; set; }
    
    [MaxLength(200)]
    public string? FullName { get; set; }
    
    [MaxLength(20)]
    public string? Phone { get; set; }
    
    [MaxLength(500)]
    public string? Address { get; set; }
}
