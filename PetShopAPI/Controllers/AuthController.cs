using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using PetShopAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Services;


namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController>? _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager, 
        RoleManager<IdentityRole> roleManager, 
        IConfiguration config, 
        AppDbContext db,
        IEmailService emailService,
        ILogger<AuthController>? logger = null)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _config = config;
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Username,
            Email = dto.Email,
            EmailConfirmed = false // Require email confirmation
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // ✅ Gán role mặc định User cho tài khoản mới
        if (!await _roleManager.RoleExistsAsync("User"))
            await _roleManager.CreateAsync(new IdentityRole("User"));

        await _userManager.AddToRoleAsync(user, "User");

        // ✅ Tự động tạo CustomerProfile cho user mới
        var profile = new CustomerProfile
        {
            UserId = user.Id,
            FullName = dto.Username, // Mặc định dùng username làm fullname
            Phone = dto.Phone ?? "",
            Address = ""
        };
        _db.CustomerProfiles.Add(profile);
        await _db.SaveChangesAsync();

        // ✅ Gửi email xác nhận
        try
        {
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            // Encode token to base64 for URL safety
            var tokenBytes = System.Text.Encoding.UTF8.GetBytes(token);
            var encodedToken = Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
            var frontendUrl = _config["EmailSettings:FrontendUrl"] ?? "http://localhost:5173";
            var confirmationLink = $"{frontendUrl}/verify-email?email={Uri.EscapeDataString(user.Email!)}&token={encodedToken}";
            await _emailService.SendAccountConfirmationEmailAsync(user, confirmationLink);
        }
        catch (Exception ex)
        {
            // Log error but don't fail registration
            // Email can be resent later
        }

        return Ok(new { message = "User registered successfully. Please check your email to confirm your account." });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        try
        {
            // Find user by email
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                return BadRequest(new { message = "Invalid email" });

            // Check if already confirmed - return success instead of error
            if (user.EmailConfirmed)
                return Ok(new { message = "Email already verified" });

            // Decode base64 token
            var token = dto.Token.Replace("-", "+").Replace("_", "/");
            // Add padding if needed
            switch (token.Length % 4)
            {
                case 2: token += "=="; break;
                case 3: token += "="; break;
            }
            var tokenBytes = Convert.FromBase64String(token);
            var decodedToken = System.Text.Encoding.UTF8.GetString(tokenBytes);
            
            // Reload user from database to avoid concurrency issues
            var userId = user.Id;
            user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return BadRequest(new { message = "User not found" });
            
            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            
            if (result.Succeeded)
                return Ok(new { message = "Email verified successfully" });
            
            // Handle specific errors
            var errorMessages = result.Errors.Select(e => e.Description).ToList();
            return BadRequest(new { message = "Email verification failed", errors = errorMessages });
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Invalid token format" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error verifying email for {Email}", dto.Email);
            return BadRequest(new { message = $"Error verifying email: {ex.Message}" });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByNameAsync(dto.Username);
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized("Invalid username or password");

        // Check if email is confirmed
        if (!user.EmailConfirmed)
        {
            return Unauthorized(new { 
                message = "Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn để tìm link xác nhận.",
                requiresEmailConfirmation = true 
            });
        }

        var token = await GenerateJwtToken(user);
        return Ok(new { token });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("create-staff")]
    public async Task<IActionResult> CreateStaff([FromBody] RegisterDto dto)
    {
        var user = new ApplicationUser { UserName = dto.Username, Email = dto.Email, EmailConfirmed = true };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);

        // tạo role SaleStaff nếu chưa có
        if (!await _roleManager.RoleExistsAsync("SaleStaff"))
            await _roleManager.CreateAsync(new IdentityRole("SaleStaff"));

        await _userManager.AddToRoleAsync(user, "SaleStaff");
        return Ok("SaleStaff account created successfully");
    }
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var username = User.Identity?.Name;
        var roles = User.FindAll(System.Security.Claims.ClaimTypes.Role)
                        .Select(r => r.Value);

        return Ok(new
        {
            User = username,
            Roles = roles
        });
    }
    private async Task<string> GenerateJwtToken(ApplicationUser user)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName!)
        };

        // thêm role nếu có
        var roles = await _userManager.GetRolesAsync(user);
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpireMinutes"]!)),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record RegisterDto(string Username, string Email, string Password, string? Phone);
public record LoginDto(string Username, string Password);
public record VerifyEmailDto(string Email, string Token);
