using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // All authenticated users (User, Staff, Admin) can access their own profile
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    // GET: api/profile
    // All authenticated users can view their own profile
    [HttpGet]
    public async Task<ActionResult<CustomerProfileDto>> GetMyProfile()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var profile = await _db.CustomerProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound(new { error = "Profile not found", code = "PROFILE_NOT_FOUND" });

        // Lấy roles của user từ UserManager
        var user = await _userManager.FindByIdAsync(userId);
        var roles = user != null ? await _userManager.GetRolesAsync(user) : new List<string>();

        return new CustomerProfileDto
        {
            UserId = profile.UserId,
            Username = profile.User?.UserName,
            Email = profile.User?.Email,
            FullName = profile.FullName,
            Phone = profile.Phone,
            Address = profile.Address,
            Roles = roles.ToList()
        };
    }

    // GET: api/profile/{userId}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet("{userId}")]
    public async Task<ActionResult<CustomerProfileDto>> GetByUserId(string userId)
    {
        var profile = await _db.CustomerProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound(new { error = "Profile not found", code = "PROFILE_NOT_FOUND" });

        // Lấy roles của user từ UserManager
        var user = await _userManager.FindByIdAsync(userId);
        var roles = user != null ? await _userManager.GetRolesAsync(user) : new List<string>();

        return new CustomerProfileDto
        {
            UserId = profile.UserId,
            Username = profile.User?.UserName,
            Email = profile.User?.Email,
            FullName = profile.FullName,
            Phone = profile.Phone,
            Address = profile.Address,
            Roles = roles.ToList()
        };
    }

    // POST: api/profile
    // All authenticated users can create their own profile
    [HttpPost]
    public async Task<IActionResult> CreateProfile(CreateCustomerProfileDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Check if profile already exists
        if (await _db.CustomerProfiles.AnyAsync(p => p.UserId == userId))
            return BadRequest(new { error = "Profile already exists", code = "DUPLICATE_PROFILE" });

        var profile = new CustomerProfile
        {
            UserId = userId,
            FullName = dto.FullName,
            Phone = dto.Phone,
            Address = dto.Address
        };

        _db.CustomerProfiles.Add(profile);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Profile created successfully" });
    }

    // PUT: api/profile
    // All authenticated users can update their own profile
    [HttpPut]
    public async Task<IActionResult> UpdateMyProfile(UpdateCustomerProfileDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var profile = await _db.CustomerProfiles.FindAsync(userId);

        if (profile == null)
            return NotFound(new { error = "Profile not found", code = "PROFILE_NOT_FOUND" });

        // Update profile fields - chỉ update nếu có giá trị (không null và không rỗng)
        if (!string.IsNullOrWhiteSpace(dto.FullName)) 
            profile.FullName = dto.FullName.Trim();
        else if (dto.FullName == string.Empty) 
            profile.FullName = null; // Cho phép xóa FullName
        
        if (!string.IsNullOrWhiteSpace(dto.Phone)) 
            profile.Phone = dto.Phone.Trim();
        else if (dto.Phone == string.Empty) 
            profile.Phone = null; // Cho phép xóa Phone
        
        if (!string.IsNullOrWhiteSpace(dto.Address)) 
            profile.Address = dto.Address.Trim();
        else if (dto.Address == string.Empty) 
            profile.Address = null; // Cho phép xóa Address

        // Update email if provided
        if (!string.IsNullOrEmpty(dto.Email))
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null && user.Email != dto.Email)
            {
                // Check if email is already taken by another user
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    return BadRequest(new { error = "Email already in use", code = "EMAIL_IN_USE" });
                }

                user.Email = dto.Email;
                user.NormalizedEmail = dto.Email.ToUpper();
                var result = await _userManager.UpdateAsync(user);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { error = "Failed to update email", errors = result.Errors });
                }
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/profile/{userId}
    [Authorize(Roles = "Admin")]
    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateProfile(string userId, UpdateCustomerProfileDto dto)
    {
        var profile = await _db.CustomerProfiles.FindAsync(userId);

        if (profile == null)
            return NotFound(new { error = "Profile not found", code = "PROFILE_NOT_FOUND" });

        // Update profile fields - chỉ update nếu có giá trị (không null và không rỗng)
        if (!string.IsNullOrWhiteSpace(dto.FullName)) 
            profile.FullName = dto.FullName.Trim();
        else if (dto.FullName == string.Empty) 
            profile.FullName = null; // Cho phép xóa FullName
        
        if (!string.IsNullOrWhiteSpace(dto.Phone)) 
            profile.Phone = dto.Phone.Trim();
        else if (dto.Phone == string.Empty) 
            profile.Phone = null; // Cho phép xóa Phone
        
        if (!string.IsNullOrWhiteSpace(dto.Address)) 
            profile.Address = dto.Address.Trim();
        else if (dto.Address == string.Empty) 
            profile.Address = null; // Cho phép xóa Address

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/profile
    // All authenticated users can delete their own profile
    [HttpDelete]
    public async Task<IActionResult> DeleteMyProfile()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var profile = await _db.CustomerProfiles.FindAsync(userId);

        if (profile == null)
            return NotFound(new { error = "Profile not found", code = "PROFILE_NOT_FOUND" });

        _db.CustomerProfiles.Remove(profile);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
