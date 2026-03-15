using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Helpers;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServiceController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public ServiceController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    // GET: api/service
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetAll()
    {
        var services = await _db.Services
            .Include(s => s.Packages)
            .Where(s => s.IsActive) // Chỉ lấy services đang active
            .ToListAsync();

        var result = services.Select(s => new ServiceDto
        {
            Id = s.Id,
            Name = s.Name,
            Description = s.Description,
            PriceType = s.PriceType,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            Packages = s.Packages
                .Where(p => p.IsActive) // Chỉ lấy packages đang active
                .Select(p => new ServicePackageDto
            {
                Id = p.Id,
                ServiceId = p.ServiceId,
                Name = p.Name,
                Price = p.Price,
                    Description = p.Description,
                    IsActive = p.IsActive,
                    DurationMinutes = p.DurationMinutes
            }).ToList()
        });

        return Ok(result);
    }

    // GET: api/service/{id}
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<ServiceDto>> GetById(int id)
    {
        var service = await _db.Services
            .Include(s => s.Packages)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { error = "Service not found", code = "SERVICE_NOT_FOUND" });

        if (!service.IsActive)
            return NotFound(new { error = "Service is not available", code = "SERVICE_INACTIVE" });

        return new ServiceDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            PriceType = service.PriceType,
            IsActive = service.IsActive,
            CreatedAt = service.CreatedAt,
            UpdatedAt = service.UpdatedAt,
            Packages = service.Packages
                .Where(p => p.IsActive) // Chỉ lấy packages đang active
                .Select(p => new ServicePackageDto
            {
                Id = p.Id,
                ServiceId = p.ServiceId,
                Name = p.Name,
                Price = p.Price,
                    Description = p.Description,
                    IsActive = p.IsActive,
                    DurationMinutes = p.DurationMinutes
            }).ToList()
        };
    }

    // POST: api/service
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateServiceDto dto)
    {
        var service = new Service
        {
            Name = dto.Name,
            Description = dto.Description,
            PriceType = dto.PriceType,
            IsActive = dto.IsActive
        };

        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = service.Id }, new { id = service.Id });
    }

    // PUT: api/service/{id}
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateServiceDto dto)
    {
        var service = await _db.Services.FindAsync(id);

        if (service == null)
            return NotFound(new { error = "Service not found", code = "SERVICE_NOT_FOUND" });

        if (dto.Name != null) service.Name = dto.Name;
        if (dto.Description != null) service.Description = dto.Description;
        if (dto.PriceType != null) service.PriceType = dto.PriceType;
        if (dto.IsActive.HasValue) service.IsActive = dto.IsActive.Value;
        service.UpdatedAt = DateTimeHelper.GetVietnamTime();

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/service/{id}
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var service = await _db.Services
            .Include(s => s.Packages)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
            return NotFound(new { error = "Service not found", code = "SERVICE_NOT_FOUND" });

        if (service.Packages.Any())
            return Conflict(new { error = "Cannot delete service with existing packages", code = "SERVICE_HAS_PACKAGES" });

        _db.Services.Remove(service);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ========== SERVICE PACKAGE ENDPOINTS ==========

    // POST: api/service/{serviceId}/packages
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPost("{serviceId}/packages")]
    public async Task<IActionResult> CreatePackage(int serviceId, CreateServicePackageDto dto)
    {
        var service = await _db.Services.FindAsync(serviceId);
        if (service == null)
            return NotFound(new { error = "Service not found", code = "SERVICE_NOT_FOUND" });

        var package = new ServicePackage
        {
            ServiceId = serviceId,
            Name = dto.Name,
            Price = dto.Price,
            Description = dto.Description,
            IsActive = dto.IsActive,
            DurationMinutes = dto.DurationMinutes
        };

        _db.ServicePackages.Add(package);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = serviceId }, new { id = package.Id });
    }

    // PUT: api/service/packages/{packageId}
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPut("packages/{packageId}")]
    public async Task<IActionResult> UpdatePackage(int packageId, UpdateServicePackageDto dto)
    {
        var package = await _db.ServicePackages.FindAsync(packageId);

        if (package == null)
            return NotFound(new { error = "Service package not found", code = "PACKAGE_NOT_FOUND" });

        if (dto.Name != null) package.Name = dto.Name;
        if (dto.Price.HasValue) package.Price = dto.Price.Value;
        if (dto.Description != null) package.Description = dto.Description;
        if (dto.IsActive.HasValue) package.IsActive = dto.IsActive.Value;
        if (dto.DurationMinutes.HasValue) package.DurationMinutes = dto.DurationMinutes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/service/packages/{packageId}
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpDelete("packages/{packageId}")]
    public async Task<IActionResult> DeletePackage(int packageId)
    {
        var package = await _db.ServicePackages
            .FirstOrDefaultAsync(p => p.Id == packageId);

        if (package == null)
            return NotFound(new { error = "Service package not found", code = "PACKAGE_NOT_FOUND" });

        _db.ServicePackages.Remove(package);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ========== SERVICE STAFF ASSIGNMENT ENDPOINTS ==========

    // GET: api/service/{serviceId}/staff
    // Lấy danh sách nhân viên được phân công cho dịch vụ
    [Authorize]
    [HttpGet("{serviceId}/staff")]
    public async Task<ActionResult<IEnumerable<ServiceStaffAssignmentDto>>> GetServiceStaff(int serviceId)
    {
        var assignments = await _db.ServiceStaffAssignments
            .Include(ssa => ssa.Service)
            .Include(ssa => ssa.Staff)
            .Where(ssa => ssa.ServiceId == serviceId && ssa.IsActive)
            .ToListAsync();

        var result = assignments.Select(ssa => new ServiceStaffAssignmentDto
        {
            Id = ssa.Id,
            ServiceId = ssa.ServiceId,
            ServiceName = ssa.Service.Name,
            StaffId = ssa.StaffId,
            StaffName = ssa.Staff.UserName,
            StaffEmail = ssa.Staff.Email,
            Note = ssa.Note,
            IsActive = ssa.IsActive,
            CreatedAt = ssa.CreatedAt,
            UpdatedAt = ssa.UpdatedAt
        });

        return Ok(result);
    }

    // GET: api/service/staff/{staffId}/services
    // Lấy danh sách dịch vụ mà nhân viên được phân công
    [Authorize]
    [HttpGet("staff/{staffId}/services")]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetStaffServices(string staffId)
    {
        var assignments = await _db.ServiceStaffAssignments
            .Include(ssa => ssa.Service)
            .ThenInclude(s => s.Packages)
            .Where(ssa => ssa.StaffId == staffId && ssa.IsActive)
            .ToListAsync();

        var result = assignments.Select(ssa => new ServiceDto
        {
            Id = ssa.Service.Id,
            Name = ssa.Service.Name,
            Description = ssa.Service.Description,
            PriceType = ssa.Service.PriceType,
            IsActive = ssa.Service.IsActive,
            CreatedAt = ssa.Service.CreatedAt,
            UpdatedAt = ssa.Service.UpdatedAt,
            Packages = ssa.Service.Packages
                .Where(p => p.IsActive)
                .Select(p => new ServicePackageDto
                {
                    Id = p.Id,
                    ServiceId = p.ServiceId,
                    Name = p.Name,
                    Price = p.Price,
                    Description = p.Description,
                    IsActive = p.IsActive,
                    DurationMinutes = p.DurationMinutes
                }).ToList()
        });

        return Ok(result);
    }

    // POST: api/service/{serviceId}/staff
    // Phân công nhân viên cho dịch vụ (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpPost("{serviceId}/staff")]
    public async Task<IActionResult> AssignStaff(int serviceId, CreateServiceStaffAssignmentDto dto)
    {
        var service = await _db.Services.FindAsync(serviceId);
        if (service == null)
            return NotFound(new { error = "Service not found", code = "SERVICE_NOT_FOUND" });

        var staff = await _userManager.FindByIdAsync(dto.StaffId);
        if (staff == null)
            return NotFound(new { error = "Staff not found", code = "STAFF_NOT_FOUND" });

        // Kiểm tra xem nhân viên có role ServiceStaff không
        var roles = await _userManager.GetRolesAsync(staff);
        if (!roles.Contains("ServiceStaff"))
            return BadRequest(new { error = "User is not a ServiceStaff", code = "INVALID_ROLE" });

        // Kiểm tra xem đã phân công chưa
        var existing = await _db.ServiceStaffAssignments
            .FirstOrDefaultAsync(ssa => ssa.ServiceId == serviceId && ssa.StaffId == dto.StaffId);

        if (existing != null)
        {
            // Nếu đã tồn tại nhưng inactive, kích hoạt lại
            if (!existing.IsActive)
            {
                existing.IsActive = true;
                existing.Note = dto.Note;
                existing.UpdatedAt = DateTimeHelper.GetVietnamTime();
                await _db.SaveChangesAsync();
                return Ok(new { id = existing.Id, message = "Assignment reactivated" });
            }
            return Conflict(new { error = "Staff already assigned to this service", code = "DUPLICATE_ASSIGNMENT" });
        }

        var assignment = new ServiceStaffAssignment
        {
            ServiceId = serviceId,
            StaffId = dto.StaffId,
            Note = dto.Note,
            IsActive = true,
            CreatedAt = DateTimeHelper.GetVietnamTime()
        };

        _db.ServiceStaffAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetServiceStaff), new { serviceId }, new { id = assignment.Id });
    }

    // PUT: api/service/staff-assignments/{assignmentId}
    // Cập nhật phân công nhân viên (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpPut("staff-assignments/{assignmentId}")]
    public async Task<IActionResult> UpdateAssignment(int assignmentId, UpdateServiceStaffAssignmentDto dto)
    {
        var assignment = await _db.ServiceStaffAssignments.FindAsync(assignmentId);
        if (assignment == null)
            return NotFound(new { error = "Assignment not found", code = "ASSIGNMENT_NOT_FOUND" });

        if (dto.Note != null) assignment.Note = dto.Note;
        if (dto.IsActive.HasValue) assignment.IsActive = dto.IsActive.Value;
        assignment.UpdatedAt = DateTimeHelper.GetVietnamTime();

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/service/staff-assignments/{assignmentId}
    // Xóa phân công nhân viên (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpDelete("staff-assignments/{assignmentId}")]
    public async Task<IActionResult> RemoveAssignment(int assignmentId)
    {
        var assignment = await _db.ServiceStaffAssignments.FindAsync(assignmentId);
        if (assignment == null)
            return NotFound(new { error = "Assignment not found", code = "ASSIGNMENT_NOT_FOUND" });

        _db.ServiceStaffAssignments.Remove(assignment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
