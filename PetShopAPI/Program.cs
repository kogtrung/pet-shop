using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PetShopAPI.Data;
using PetShopAPI.Helpers;
using PetShopAPI.Models;
using PetShopAPI.Services; 
using System.Collections.Generic;
using System.Text;


EnvLoader.LoadFromDefaultLocations();
var builder = WebApplication.CreateBuilder(args);

//JWT
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

// Đăng ký DbContext (SQL Server)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme; // <-- DÒNG QUAN TRỌNG NHẤT
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

// -------------------------------------------------------------------
// PHẦN ĐĂNG KÝ DỊCH VỤ (DI) ĐÃ SỬA LỖI
// -------------------------------------------------------------------

// 1. Đăng ký HttpClient (cần cho ChatContextService)
// (Chỉ gọi 1 lần)
builder.Services.AddHttpClient();

// 2. Đăng ký MemoryCache (cần cho ChatContextService)
// (Chỉ gọi 1 lần)
builder.Services.AddMemoryCache();

// 3. Đăng ký service context có sẵn (dùng cách mới, tự động inject IConfiguration)
builder.Services.AddScoped<ChatContextService>();

// 4. Đăng ký service THỰC THI tool mới
builder.Services.AddScoped<IChatToolService, ChatToolService>();

// 5. Đăng ký service Gemini chính (đã được nâng cấp, sẽ inject IChatToolService)
// (Chỉ gọi 1 lần)
builder.Services.AddScoped<IGeminiService, GeminiService>();

// 6. Đăng ký OrderCodeGenerator để tạo mã đơn hàng
builder.Services.AddScoped<OrderCodeGenerator>();

// 7. Đăng ký Email Services
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<EmailTemplateService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// 7.1 Đăng ký MoMo payment gateway
builder.Services.Configure<MoMoSettings>(builder.Configuration.GetSection("MoMo"));
builder.Services.AddScoped<IPaymentGatewayService, MoMoService>();

// 8. Đăng ký Background Service cho Email Reminders
builder.Services.AddHostedService<BookingReminderService>();

// 8.1 Đăng ký Background Service tự động hủy đơn hàng online hết hạn thanh toán
builder.Services.AddHostedService<OrderPaymentCleanupService>();

// 9. Đăng ký API Explorer cho ChatController
builder.Services.AddEndpointsApiExplorer();

// -------------------------------------------------------------------
// KẾT THÚC PHẦN SỬA LỖI
// -------------------------------------------------------------------


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PetShop API",
        Version = "v1",
        Description = "An API for PetShop management"
    });

    // Cấu hình Security Scheme cho JWT
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// CORS (cho FE React gọi API)
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("FE", p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithOrigins("http://localhost:3000", "http://localhost:5173"));
});

var app = builder.Build();
var rewriteOptions = new RewriteOptions()
    .AddRedirect("^(?!api/)(.*)/$", "$1"); // Exclude API routes from trailing slash removal

app.UseRewriter(rewriteOptions);

// Serve static files (for uploaded media)
app.UseStaticFiles();

// Seed Admin khi khởi động app
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

    async Task EnsureRoleAsync(string roleName)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
    {
            await roleManager.CreateAsync(new IdentityRole(roleName));
    }
    }

    async Task EnsureUserAsync(string email, string username, string password, string roleName)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
    {
            user = new ApplicationUser
        {
                UserName = username,
                Email = email,
            EmailConfirmed = true
        };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                Console.WriteLine($"⚠️ Failed to create default user {email}: " +
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                return;
            }
        }

        if (!await userManager.IsInRoleAsync(user, roleName))
        {
            await userManager.AddToRoleAsync(user, roleName);
        }
    }

    // Ensure roles
    await EnsureRoleAsync("Admin");
    await EnsureRoleAsync("ServiceStaff"); // Đổi tên từ ServiceManager
    await EnsureRoleAsync("SaleStaff"); // Đổi tên từ Staff
    await EnsureRoleAsync("User"); // Đảm bảo role User tồn tại

    // Seed default accounts
    await EnsureUserAsync("admin@petshop.com", "admin", "Admin@123", "Admin");
    await EnsureUserAsync("sale.staff@petshop.com", "sale.staff", "Sale@123", "SaleStaff");

    Console.WriteLine("✅ Seeded default roles and users (Admin, ServiceStaff, SaleStaff)");
}

// Swagger
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "PetShop API V1");
    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();
app.UseCors("FE");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
