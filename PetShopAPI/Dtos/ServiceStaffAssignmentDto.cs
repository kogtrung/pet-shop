using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ServiceStaffAssignmentDto
{
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = default!;
    public string StaffId { get; set; } = default!;
    public string? StaffName { get; set; }
    public string? StaffEmail { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateServiceStaffAssignmentDto
{
    [Required]
    public int ServiceId { get; set; }
    
    [Required]
    public string StaffId { get; set; } = default!;
    
    public string? Note { get; set; }
}

public class UpdateServiceStaffAssignmentDto
{
    public string? Note { get; set; }
    public bool? IsActive { get; set; }
}

