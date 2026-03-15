using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Models;
using PetShopAPI.Helpers;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public UserController(UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    // GET: api/user/search?query=...
    // Tìm kiếm khách hàng theo email, số điện thoại, tên (cho Staff)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<object>>> SearchCustomers([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new List<object>());
        }

        var searchTerm = query.Trim().ToLower();
        
        // Tìm kiếm trong ApplicationUser và CustomerProfile
        var users = await _userManager.Users
            .Include(u => u.Profile)
            .Where(u => 
                (u.Email != null && u.Email.ToLower().Contains(searchTerm)) ||
                (u.UserName != null && u.UserName.ToLower().Contains(searchTerm)) ||
                (u.Profile != null && u.Profile.Phone != null && u.Profile.Phone.Contains(searchTerm)) ||
                (u.Profile != null && u.Profile.FullName != null && u.Profile.FullName.ToLower().Contains(searchTerm))
            )
            .Take(20)
            .ToListAsync();

        var result = new List<object>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            // Chỉ trả về user có role User (khách hàng)
            if (roles.Contains("User") && !roles.Contains("Admin") && !roles.Contains("SaleStaff") && !roles.Contains("ServiceStaff"))
            {
                result.Add(new
                {
                    id = user.Id,
                    username = user.UserName,
                    email = user.Email,
                    fullName = user.Profile?.FullName,
                    phone = user.Profile?.Phone,
                    address = user.Profile?.Address
                });
            }
        }

        return Ok(result);
    }

    // GET: api/user
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var users = await _userManager.Users
            .Include(u => u.Profile)
            .ToListAsync();
        
        var result = new List<object>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new
            {
                id = user.Id,
                username = user.UserName,
                email = user.Email,
                fullName = user.Profile?.FullName,
                role = roles.FirstOrDefault() ?? "User",
                roles = roles.ToList(),
                createdAt = DateTimeHelper.GetVietnamTime().ToString("yyyy-MM-ddTHH:mm:ss")
            });
        }

        return Ok(result);
    }

    // PUT: api/user/{id}/role
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateUserRoleDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        var currentRoles = await _userManager.GetRolesAsync(user);
        var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
        
        if (!removeResult.Succeeded)
            return BadRequest(new { error = "Failed to remove existing roles", code = "ROLE_UPDATE_FAILED" });

        var addResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!addResult.Succeeded)
            return BadRequest(new { error = "Failed to add new role", code = "ROLE_UPDATE_FAILED" });

        return Ok(new { message = "User role updated successfully" });
    }

    // DELETE: api/user/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (id == currentUserId)
            return BadRequest(new { error = "Cannot delete your own account", code = "CANNOT_DELETE_SELF" });

        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found", code = "USER_NOT_FOUND" });

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { error = "Failed to delete user", code = "DELETE_FAILED" });

        return Ok(new { message = "User deleted successfully" });
    }
}

public class UpdateUserRoleDto
{
    public string Role { get; set; } = default!;
}

