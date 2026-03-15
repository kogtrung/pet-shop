using Microsoft.AspNetCore.Identity;

namespace PetShopAPI.Models;

public class ApplicationUser : IdentityUser
{
    public CustomerProfile? Profile { get; set; }

    /// <summary>
    /// Cho phép Admin đánh dấu nhân viên dịch vụ đang trực trong ca làm việc.
    /// Chỉ những nhân viên đang hoạt động mới được hiển thị cho khách và được phân công.
    /// </summary>
    public bool IsServiceStaffOnDuty { get; set; } = false;
}
