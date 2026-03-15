using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Services;
using PetShopAPI.Helpers;
using System.Security.Claims;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServiceBookingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<ServiceBookingController> _logger;
    private readonly OrderCodeGenerator _codeGenerator;
    private readonly IEmailService _emailService;
    private const int DefaultConcurrentCustomerSlots = 2;
    private const int WeekendConcurrentCustomerSlots = 3;
    private const int SlotIntervalMinutes = 30;
    private const int OpeningHour = 8;
    private const int ClosingHour = 20;
    private static readonly HashSet<string> BusyBookingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Pending",
        "Confirmed",
        "Assigned",
        "InProgress"
    };

    public ServiceBookingController(
        AppDbContext context, 
        UserManager<ApplicationUser> userManager,
        ILogger<ServiceBookingController> logger,
        OrderCodeGenerator codeGenerator,
        IEmailService emailService)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
        _codeGenerator = codeGenerator;
        _emailService = emailService;
    }

    // POST: api/servicebooking (Cho User)
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceBookingDto dto)
    {
        string userId = null;
        
        try
        {
            _logger.LogInformation("Received booking request: {@Dto}", dto);
            
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value.Errors.Count > 0)
                    .Select(x => new { Field = x.Key, Errors = x.Value.Errors.Select(e => e.ErrorMessage) })
                    .ToArray();
                
                _logger.LogWarning("ModelState validation failed: {@Errors}", errors);
                return BadRequest(new { error = "Validation failed", details = errors, code = "VALIDATION_FAILED" });
            }
            
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User not authenticated");
                return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
            }

            // Validate items
            if (dto.Items == null || dto.Items.Count == 0)
            {
                return BadRequest(new { error = "Phải chọn ít nhất 1 dịch vụ", code = "NO_ITEMS" });
            }

            var vietnamTime = DateTimeHelper.GetVietnamTime();
            var startTime = dto.StartTime;
            if (startTime.Kind == DateTimeKind.Unspecified)
            {
                // Assume it's already in Vietnam time
                startTime = DateTime.SpecifyKind(startTime, DateTimeKind.Local);
            }
            if (startTime <= vietnamTime)
            {
                return BadRequest(new { error = "Thời gian đặt lịch phải nằm trong tương lai", code = "START_TIME_IN_PAST" });
            }

            // Validate và load tất cả services và packages
            var serviceIds = dto.Items.Select(i => i.ServiceId).Distinct().ToList();
            var services = await _context.Services
                .Where(s => serviceIds.Contains(s.Id))
                .Include(s => s.Packages)
                .ToDictionaryAsync(s => s.Id, s => s);

            var packageIds = dto.Items
                .SelectMany(i => i.ServicePackageIds ?? Enumerable.Empty<int>())
                .Concat(dto.Items.Where(i => i.ServicePackageId.HasValue).Select(i => i.ServicePackageId!.Value))
                .Distinct()
                .ToList();
            var packages = packageIds.Any() 
                ? await _context.ServicePackages
                    .Where(p => packageIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, p => p)
                : new Dictionary<int, ServicePackage>();

            // Validate từng item và tính tổng
            int totalDurationMinutes = 0;
            decimal totalPrice = 0;
            var bookingItems = new List<BookingItem>();

            var orderIndex = 1;
            for (int i = 0; i < dto.Items.Count; i++)
            {
                var itemDto = dto.Items[i];

                if (!string.IsNullOrWhiteSpace(itemDto.AssignedStaffId))
                {
                    return BadRequest(new
                    {
                        error = "Khách hàng không thể tự chọn nhân viên khi đặt lịch",
                        code = "STAFF_SELECTION_NOT_ALLOWED"
                    });
                }
                
                if (!services.ContainsKey(itemDto.ServiceId))
                {
                    return BadRequest(new { error = $"Service với ID {itemDto.ServiceId} không tồn tại", code = "SERVICE_NOT_FOUND" });
                }

                var service = services[itemDto.ServiceId];
                if (!service.IsActive)
                {
                    return BadRequest(new { error = $"Service '{service.Name}' không khả dụng", code = "SERVICE_INACTIVE" });
                }

                var packageCandidateIds = new List<int>();
                if (itemDto.ServicePackageIds != null && itemDto.ServicePackageIds.Any())
                {
                    packageCandidateIds.AddRange(itemDto.ServicePackageIds.Where(id => id > 0));
                }
                if (itemDto.ServicePackageId.HasValue)
                {
                    packageCandidateIds.Add(itemDto.ServicePackageId.Value);
                }
                packageCandidateIds = packageCandidateIds.Distinct().ToList();

                var serviceHasPackages = service.Packages != null && service.Packages.Any();
                if (serviceHasPackages && !packageCandidateIds.Any())
                {
                    return BadRequest(new { error = $"Vui lòng chọn ít nhất 1 gói cho dịch vụ '{service.Name}'", code = "PACKAGE_REQUIRED" });
                }

                if (!packageCandidateIds.Any())
                {
                    var defaultDuration = service.Packages?.FirstOrDefault()?.DurationMinutes ?? 60;
                    totalDurationMinutes += defaultDuration;

                    var bookingItem = new BookingItem
                    {
                        ServiceId = service.Id,
                        ServicePackageId = null,
                        PriceAtBooking = 0,
                        PackagePrice = null,
                        DurationMinutes = defaultDuration,
                        OrderIndex = orderIndex++,
                        AssignedStaffId = null,
                        AssignedStaffName = null,
                        Status = "Pending",
                        Note = itemDto.Note,
                        CreatedAt = vietnamTime
                    };

                    bookingItems.Add(bookingItem);
                    continue;
                }

                foreach (var packageId in packageCandidateIds)
                {
                    if (!packages.ContainsKey(packageId))
                    {
                        return BadRequest(new { error = $"Service package với ID {packageId} không tồn tại", code = "PACKAGE_NOT_FOUND" });
                    }

                    var package = packages[packageId];
                    if (package.ServiceId != service.Id)
                    {
                        return BadRequest(new { error = $"Package không thuộc service '{service.Name}'", code = "PACKAGE_MISMATCH" });
                    }

                    var itemDuration = package.DurationMinutes ?? 60;
                    totalPrice += package.Price;
                    totalDurationMinutes += itemDuration;

                    var bookingItem = new BookingItem
                    {
                        ServiceId = service.Id,
                        ServicePackageId = package.Id,
                        PriceAtBooking = package.Price,
                        PackagePrice = package.Price,
                        DurationMinutes = itemDuration,
                        OrderIndex = orderIndex++,
                        AssignedStaffId = null,
                        AssignedStaffName = null,
                        Status = "Pending",
                        Note = itemDto.Note,
                        CreatedAt = vietnamTime
                    };

                    bookingItems.Add(bookingItem);
                }
            }

            // Tính EndTime
            var endTime = startTime.AddMinutes(totalDurationMinutes);

            // Generate booking code
            var bookingCode = await _codeGenerator.GenerateServiceBookingCodeAsync();

            // Tạo ServiceBooking
            var booking = new ServiceBooking
            {
                BookingCode = bookingCode,
                CustomerId = userId,
                CustomerName = dto.CustomerName,
                CustomerEmail = dto.CustomerEmail,
                CustomerPhone = dto.CustomerPhone,
                StartTime = startTime,
                EndTime = endTime,
                TotalDurationMinutes = totalDurationMinutes,
                TotalPrice = totalPrice,
                PetName = dto.PetName,
                PetType = dto.PetType,
                PetBreed = dto.PetBreed,
                PetAge = dto.PetAge,
                PetWeight = dto.PetWeight,
                Note = dto.Note,
                Status = "Pending",
                CreatedAt = vietnamTime,
                Source = "App" // Mặc định các booking tạo từ API này là từ ứng dụng FE
            };

            // Gán BookingItems vào Booking
            foreach (var item in bookingItems)
            {
                item.ServiceBookingId = booking.Id; // Sẽ được set sau khi SaveChanges
                booking.BookingItems.Add(item);
            }

            _context.ServiceBookings.Add(booking);
            
            try
            {
                _logger.LogInformation("Saving booking with {ItemCount} items to database...", bookingItems.Count);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✓ Service booking created successfully. BookingId: {BookingId}, Items: {ItemCount}", booking.Id, bookingItems.Count);
                
                // Load customer for email
                await _context.Entry(booking).Reference(b => b.Customer).LoadAsync();
                await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
                foreach (var item in booking.BookingItems)
                {
                    await _context.Entry(item).Reference(bi => bi.Service).LoadAsync();
                    await _context.Entry(item).Reference(bi => bi.ServicePackage).LoadAsync();
                }
                
                // Send confirmation email
                try
                {
                    await _emailService.SendBookingConfirmationEmailAsync(booking);
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send booking confirmation email for booking {BookingId}", booking.Id);
                    // Don't fail the booking creation if email fails
                }
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
            {
                var innerMsg = dbEx.InnerException?.Message ?? "No inner exception";
                _logger.LogError(dbEx, "✗ Database error while saving service booking. Error: {Error}, InnerException: {InnerException}", 
                    dbEx.Message, innerMsg);
                
                if (innerMsg.Contains("FOREIGN KEY") || innerMsg.Contains("foreign key"))
                {
                    return StatusCode(500, new 
                    { 
                        error = "Database constraint error. Please ensure all ServiceIds and ServicePackageIds are valid.", 
                        code = "FOREIGN_KEY_ERROR",
                        details = new { message = innerMsg }
                    });
                }
                
                return StatusCode(500, new 
                { 
                    error = "Database error while saving booking", 
                    code = "DATABASE_ERROR",
                    details = new { message = innerMsg }
                });
            }

            // Load lại để có đầy đủ thông tin
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
            
            // Map sang DTO
            var result = await MapToServiceBookingDto(booking);

            return CreatedAtAction(nameof(GetById), new { id = booking.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating service booking. DTO: {@Dto}, UserId: {UserId}", dto, userId);
            return StatusCode(500, new
            {
                error = "An error occurred while creating the service booking", 
                code = "INTERNAL_ERROR",
                details = new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace.Length))
                }
            });
        }
    }

    // GET: api/servicebooking/{id} (Cho User, Admin, ServiceStaff)
    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<ServiceBookingDto>> GetById(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            var isServiceStaff = User.IsInRole("ServiceStaff");
            var isSaleStaff = User.IsInRole("SaleStaff");

            // Truy vấn booking (không Include để tránh lỗi)
            var booking = await _context.ServiceBookings
                .FirstOrDefaultAsync(sb => sb.Id == id);

            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            // Kiểm tra quyền truy cập
            if (booking.CustomerId != userId && !isAdmin && !isSaleStaff)
            {
                // ServiceStaff chỉ xem được booking có ít nhất 1 item được phân công cho họ
                if (isServiceStaff)
                {
                    // Load BookingItems để kiểm tra
                    await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
                    
                    var hasAccess = booking.BookingItems.Any(bi => bi.AssignedStaffId == userId);
                    
                    if (!hasAccess)
                        return Forbid();
                }
                else
                {
                    return Forbid();
                }
            }

            // Map sang DTO
            var result = await MapToServiceBookingDto(booking);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting service booking by id: {Id}", id);
            return StatusCode(500, new { error = "An error occurred while retrieving the service booking", code = "INTERNAL_ERROR" });
        }
    }

    // GET: api/servicebooking/my-bookings (Cho User)
    [Authorize]
    [HttpGet("my-bookings")]
    public async Task<ActionResult<IEnumerable<ServiceBookingDto>>> GetMyBookings()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Truy vấn các booking của user hiện tại
            var bookings = await _context.ServiceBookings
                .Where(sb => sb.CustomerId == userId)
                .OrderByDescending(sb => sb.StartTime)
                .ToListAsync();

            // Map sang DTOs
            var result = new List<ServiceBookingDto>();
            foreach (var booking in bookings)
            {
                var dto = await MapToServiceBookingDto(booking);
                result.Add(dto);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting my service bookings");
            return StatusCode(500, new { error = "An error occurred while retrieving your service bookings", code = "INTERNAL_ERROR" });
        }
    }

    // GET: api/servicebooking (Cho Admin/ServiceStaff)
    [Authorize(Roles = "Admin,ServiceStaff,SaleStaff")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceBookingDto>>> GetAll(
        [FromQuery] string? customerId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? assignedStaffId,
        [FromQuery] int? serviceId,
        [FromQuery] int? servicePackageId)
    {
        try
        {
            _logger.LogInformation("Getting all service bookings with filters");

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            var isServiceStaff = User.IsInRole("ServiceStaff");

            // Kiểm tra xem table có tồn tại không
            if (!_context.ServiceBookings.Any())
            {
                _logger.LogInformation("No service bookings found in database");
                return Ok(new List<ServiceBookingDto>());
            }

            // Load bookings trước (không Include để tránh lỗi)
            var query = _context.ServiceBookings.AsQueryable();

            // ServiceStaff chỉ thấy lịch có ít nhất 1 item được phân công trực tiếp cho họ
            if (isServiceStaff && !isAdmin && !string.IsNullOrEmpty(currentUserId))
            {
                var bookingIds = await _context.BookingItems
                    .Where(bi => bi.AssignedStaffId == currentUserId)
                    .Select(bi => bi.ServiceBookingId)
                    .Distinct()
                    .ToListAsync();

                if (!bookingIds.Any())
                {
                    return Ok(new List<ServiceBookingDto>());
                }

                query = query.Where(sb => bookingIds.Contains(sb.Id));
            }

            // Áp dụng các bộ lọc
            if (!string.IsNullOrEmpty(customerId))
                query = query.Where(sb => sb.CustomerId == customerId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(sb => sb.Status == status);

            if (fromDate.HasValue)
                query = query.Where(sb => sb.StartTime >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(sb => sb.StartTime <= toDate.Value);

            // Filter theo staff - kiểm tra trong BookingItems
            if (!string.IsNullOrEmpty(assignedStaffId))
            {
                var bookingIdsWithStaff = await _context.BookingItems
                    .Where(bi => bi.AssignedStaffId == assignedStaffId)
                    .Select(bi => bi.ServiceBookingId)
                    .Distinct()
                    .ToListAsync();
                query = query.Where(sb => bookingIdsWithStaff.Contains(sb.Id));
            }

            // Filter theo service - kiểm tra trong BookingItems
            if (serviceId.HasValue)
            {
                var bookingIdsWithService = await _context.BookingItems
                    .Where(bi => bi.ServiceId == serviceId.Value)
                    .Select(bi => bi.ServiceBookingId)
                    .Distinct()
                    .ToListAsync();
                query = query.Where(sb => bookingIdsWithService.Contains(sb.Id));
            }

            // Filter theo package - kiểm tra trong BookingItems
            if (servicePackageId.HasValue)
            {
                var bookingIdsWithPackage = await _context.BookingItems
                    .Where(bi => bi.ServicePackageId == servicePackageId.Value)
                    .Select(bi => bi.ServiceBookingId)
                    .Distinct()
                    .ToListAsync();
                query = query.Where(sb => bookingIdsWithPackage.Contains(sb.Id));
            }

            _logger.LogInformation("Executing query to get bookings");
            var bookings = await query
                .OrderByDescending(sb => sb.StartTime)
                .ToListAsync();

            _logger.LogInformation("Found {Count} service bookings", bookings.Count);

            if (!bookings.Any())
            {
                _logger.LogInformation("No bookings match the filters");
                return Ok(new List<ServiceBookingDto>());
            }

            // Map sang DTOs sử dụng helper method
            var result = new List<ServiceBookingDto>();
            foreach (var booking in bookings)
            {
                try
                {
                    var dto = await MapToServiceBookingDto(booking);
                    result.Add(dto);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error mapping booking {BookingId} to DTO", booking.Id);
                    // Skip booking này nếu có lỗi
                }
            }

            _logger.LogInformation("Successfully mapped {Count} bookings to DTOs", result.Count);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all service bookings. Exception: {Message}, InnerException: {InnerException}, StackTrace: {StackTrace}", 
                ex.Message, ex.InnerException?.Message, ex.StackTrace);
            return StatusCode(500, new 
            { 
                error = "An error occurred while retrieving service bookings", 
                code = "INTERNAL_ERROR",
                details = new
                {
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                }
            });
        }
    }

    // GET: api/servicebooking/staff-availability
    [Authorize]
    [HttpGet("staff-availability")]
    public async Task<ActionResult<IEnumerable<ServiceStaffAvailabilityDto>>> GetStaffAvailability(
        [FromQuery] DateTime? startTime,
        [FromQuery] DateTime? endTime,
        [FromQuery] string? services,
        [FromQuery] bool onlyOnDuty = true)
    {
        var rangeStart = startTime?.ToLocalTime() ?? DateTimeHelper.GetVietnamTime();
        var normalizedEnd = endTime?.ToLocalTime() ?? rangeStart.AddHours(4);
        var rangeEnd = normalizedEnd <= rangeStart ? rangeStart.AddHours(1) : normalizedEnd;

        List<int>? serviceIdsFilter = null;
        if (!string.IsNullOrWhiteSpace(services))
        {
            serviceIdsFilter = services
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => int.TryParse(value, out var id) ? id : (int?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();
        }

        var staffIds = await GetServiceStaffIdsAsync(serviceIdsFilter);
        if (!staffIds.Any())
            return Ok(new List<ServiceStaffAvailabilityDto>());

        var availability = await BuildStaffAvailabilityAsync(staffIds, rangeStart, rangeEnd, onlyOnDuty);

        if (serviceIdsFilter?.Any() == true)
        {
            availability = availability
                .Where(a => a.AssignedServiceIds.Any(id => serviceIdsFilter.Contains(id)))
                .ToList();
        }

        return Ok(availability);
    }

    // GET: api/servicebooking/available-slots
    [Authorize]
    [HttpGet("available-slots")]
    public async Task<ActionResult<IEnumerable<ServiceSlotDto>>> GetAvailableSlots(
        [FromQuery] DateTime? date,
        [FromQuery] int durationMinutes = 60,
        [FromQuery] int? maxSlots = null)
        {
        if (!date.HasValue)
        {
            return BadRequest(new { error = "Date is required", code = "DATE_REQUIRED" });
        }

        var normalizedDate = NormalizeToVietnamTime(date.Value).Date;
        if (durationMinutes <= 0)
        {
            durationMinutes = SlotIntervalMinutes;
        }
        var slotCapacity = ResolveSlotCapacity(normalizedDate, maxSlots);

        var dayStart = normalizedDate.AddHours(OpeningHour);
        var dayEnd = normalizedDate.AddHours(ClosingHour);

        // Load bookings for the selected date
        var bookings = await _context.ServiceBookings
            .Include(b => b.BookingItems)
            .Where(b => b.StartTime.Date == normalizedDate)
            .Where(b => !string.IsNullOrEmpty(b.Status) && BusyBookingStatuses.Contains(b.Status))
            .ToListAsync();

        var bookingRanges = bookings
            .Select(b => GetBookingTimeRange(b))
                .ToList();

        var slots = new List<ServiceSlotDto>();
        for (var slotStart = dayStart; slotStart.AddMinutes(durationMinutes) <= dayEnd; slotStart = slotStart.AddMinutes(SlotIntervalMinutes))
        {
            var slotEnd = slotStart.AddMinutes(durationMinutes);
            var segmentCount = (int)Math.Ceiling(durationMinutes / (double)SlotIntervalMinutes);
            var isAvailable = true;
            var maxOverlap = 0;

            for (var segment = 0; segment < segmentCount; segment++)
            {
                var segmentStart = slotStart.AddMinutes(segment * SlotIntervalMinutes);
                var segmentEnd = segmentStart.AddMinutes(SlotIntervalMinutes);
                var overlap = bookingRanges.Count(range => range.Start < segmentEnd && range.End > segmentStart);
                if (overlap >= slotCapacity)
                {
                    isAvailable = false;
                    maxOverlap = slotCapacity;
                    break;
                }

                if (overlap > maxOverlap)
                {
                    maxOverlap = overlap;
                }
            }

            var availableCount = Math.Max(0, slotCapacity - maxOverlap);

            slots.Add(new ServiceSlotDto
            {
                StartTime = slotStart,
                EndTime = slotEnd,
                Capacity = slotCapacity,
                BookedCount = Math.Min(maxOverlap, slotCapacity),
                AvailableCount = availableCount,
                IsAvailable = availableCount > 0
            });
        }

        return Ok(slots);
    }

    // PUT: api/servicebooking/{id}/assign-staff (Admin)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}/assign-staff")]
    public async Task<IActionResult> AssignStaff(int id, [FromBody] AssignBookingStaffDto dto)
    {
        try
        {
            var booking = await _context.ServiceBookings
                .Include(b => b.BookingItems)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            if (booking.BookingItems == null || booking.BookingItems.Count == 0)
                return BadRequest(new { error = "Booking does not contain any services", code = "NO_BOOKING_ITEMS" });

            var now = DateTimeHelper.GetVietnamTime();

            if (string.IsNullOrWhiteSpace(dto.StaffId))
            {
                foreach (var item in booking.BookingItems)
                {
                    item.AssignedStaffId = null;
                    item.AssignedStaffName = null;
                    item.UpdatedAt = now;
                }

                booking.UpdatedAt = now;
                await _context.SaveChangesAsync();
                await UpdateBookingStatusFromItems(booking);

                var clearedResult = await MapToServiceBookingDto(booking);
                return Ok(clearedResult);
            }

            var staff = await _userManager.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == dto.StaffId);

            if (staff == null)
                return NotFound(new { error = "Staff not found", code = "STAFF_NOT_FOUND" });

            var slotStart = booking.StartTime;
            var totalMinutes = booking.TotalDurationMinutes > 0
                ? booking.TotalDurationMinutes
                : booking.BookingItems.Sum(bi => bi.DurationMinutes);
            var slotEnd = booking.EndTime > slotStart
                ? booking.EndTime
                : slotStart.AddMinutes(Math.Max(totalMinutes, 30));

            var isAvailable = await IsStaffAvailableForSlot(dto.StaffId, slotStart, slotEnd, null, booking.Id);
            if (!isAvailable)
            {
                return BadRequest(new { error = "Nhân viên này đã có lịch khác trong khung giờ này", code = "STAFF_BUSY" });
            }

            var staffName = staff.Profile?.FullName ?? staff.UserName ?? staff.Email ?? staff.Id;

            foreach (var item in booking.BookingItems)
            {
                item.AssignedStaffId = staff.Id;
                item.AssignedStaffName = staffName;
                item.UpdatedAt = now;
            }

            booking.UpdatedAt = now;
            if (booking.Status == "Pending")
            {
                booking.Status = "Assigned";
            }

            await _context.SaveChangesAsync();
            await UpdateBookingStatusFromItems(booking);

            var result = await MapToServiceBookingDto(booking);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning staff for booking {BookingId}", id);
            return StatusCode(500, new { error = "An error occurred while assigning staff", code = "INTERNAL_ERROR" });
        }
    }

    // GET: api/servicebooking/{bookingId}/available-staff
    [Authorize(Roles = "Admin")]
    [HttpGet("{bookingId}/available-staff")]
    public async Task<ActionResult<IEnumerable<ServiceStaffAvailabilityDto>>> GetAvailableStaffForBooking(int bookingId)
    {
        var booking = await _context.ServiceBookings
            .Include(b => b.BookingItems)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

        if (IsBookingCancelled(booking))
            return BadRequest(new { error = "Booking đã bị hủy, không thể phân công nhân viên", code = "BOOKING_LOCKED" });

        var serviceIds = booking.BookingItems.Select(bi => bi.ServiceId).Distinct().ToList();
        var staffIds = await GetServiceStaffIdsAsync(serviceIds);

        if (!staffIds.Any())
            return Ok(new List<ServiceStaffAvailabilityDto>());

        var endTime = booking.EndTime;
        if (endTime <= booking.StartTime)
        {
            var fallbackMinutes = booking.TotalDurationMinutes > 0
                ? booking.TotalDurationMinutes
                : booking.BookingItems.Sum(bi => bi.DurationMinutes);
            endTime = booking.StartTime.AddMinutes(Math.Max(fallbackMinutes, 30));
        }
        var availability = await BuildStaffAvailabilityAsync(staffIds, booking.StartTime, endTime, onDutyOnly: true);

        return Ok(availability);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("service-staff/{staffId}/on-duty")]
    public async Task<IActionResult> UpdateServiceStaffOnDuty(string staffId, [FromBody] UpdateStaffDutyStatusDto dto)
    {
        var staff = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == staffId);
        if (staff == null)
        {
            return NotFound(new { error = "Staff not found", code = "STAFF_NOT_FOUND" });
        }

        var roles = await _userManager.GetRolesAsync(staff);
        if (!roles.Contains("ServiceStaff"))
        {
            return BadRequest(new { error = "User is not a service staff", code = "NOT_SERVICE_STAFF" });
        }

            var serviceStaffRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "ServiceStaff");
            if (serviceStaffRole == null)
            {
                return BadRequest(new { error = "ServiceStaff role not configured", code = "ROLE_NOT_FOUND" });
            }

        if (!dto.IsOnDuty && staff.IsServiceStaffOnDuty)
        {
            var onDutyOthers = await _context.UserRoles
                .Where(ur => ur.RoleId == serviceStaffRole.Id)
                .Join(_userManager.Users, ur => ur.UserId, u => u.Id, (ur, u) => u)
                .CountAsync(u => u.IsServiceStaffOnDuty && u.Id != staff.Id);

            if (onDutyOthers < 2)
            {
                return BadRequest(new { error = "Cần tối thiểu 2 nhân viên đang trực trong ca", code = "MIN_ON_DUTY" });
            }
        }

        staff.IsServiceStaffOnDuty = dto.IsOnDuty;
        await _userManager.UpdateAsync(staff);

        return Ok(new
        {
            staffId = staff.Id,
            isOnDuty = staff.IsServiceStaffOnDuty
        });
    }

    // Helper method để map ServiceBooking sang DTO
    private async Task<ServiceBookingDto> MapToServiceBookingDto(ServiceBooking booking)
    {
        // Load BookingItems nếu chưa có
        if (!_context.Entry(booking).Collection(b => b.BookingItems).IsLoaded)
        {
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
        }

        // Load Services và Packages cho BookingItems
        var serviceIds = booking.BookingItems.Select(bi => bi.ServiceId).Distinct().ToList();
        var services = serviceIds.Any()
            ? await _context.Services
                .Where(s => serviceIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s)
            : new Dictionary<int, Service>();

        var packageIds = booking.BookingItems
            .Where(bi => bi.ServicePackageId.HasValue)
            .Select(bi => bi.ServicePackageId!.Value)
            .Distinct()
            .ToList();
        var packages = packageIds.Any()
            ? await _context.ServicePackages
                .Where(p => packageIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p)
            : new Dictionary<int, ServicePackage>();

        // Map BookingItems
        var bookingItemsDto = booking.BookingItems
            .OrderBy(bi => bi.OrderIndex)
            .Select(bi =>
            {
                services.TryGetValue(bi.ServiceId, out var service);
                ServicePackage? package = null;
                if (bi.ServicePackageId.HasValue)
                {
                    packages.TryGetValue(bi.ServicePackageId.Value, out package);
                }

                return new BookingItemDto
                {
                    Id = bi.Id,
                    ServiceBookingId = bi.ServiceBookingId,
                    ServiceId = bi.ServiceId,
                    ServiceName = service?.Name ?? "",
                    ServicePackageId = bi.ServicePackageId,
                    ServicePackageName = package?.Name,
                    ServicePackagePrice = package?.Price,
                    PriceAtBooking = bi.PriceAtBooking,
                    PackagePrice = bi.PackagePrice,
                    DurationMinutes = bi.DurationMinutes,
                    OrderIndex = bi.OrderIndex,
                    AssignedStaffId = bi.AssignedStaffId,
                    AssignedStaffName = bi.AssignedStaffName,
                    Status = bi.Status,
                    Note = bi.Note,
                    InternalNote = bi.InternalNote,
                    StartTime = bi.StartTime,
                    EndTime = bi.EndTime,
                    CreatedAt = bi.CreatedAt,
                    UpdatedAt = bi.UpdatedAt
                };
            })
            .ToList();

        return new ServiceBookingDto
        {
            Id = booking.Id,
            BookingCode = booking.BookingCode,
            Source = booking.Source,
            CustomerId = booking.CustomerId,
            CustomerName = booking.CustomerName,
            CustomerEmail = booking.CustomerEmail,
            CustomerPhone = booking.CustomerPhone,
            PetName = booking.PetName,
            PetType = booking.PetType,
            PetBreed = booking.PetBreed,
            PetAge = booking.PetAge,
            PetWeight = booking.PetWeight,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime,
            TotalDurationMinutes = booking.TotalDurationMinutes,
            TotalPrice = booking.TotalPrice,
            Status = booking.Status,
            PaymentStatus = booking.PaymentStatus,
            CancelReason = booking.CancelReason,
            Note = booking.Note,
            InternalNote = booking.InternalNote,
            BookingItems = bookingItemsDto,
            CreatedAt = booking.CreatedAt,
            UpdatedAt = booking.UpdatedAt
        };
    }

    // PUT: api/servicebooking/{id}/mark-paid - Mark booking as paid (SaleStaff)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}/mark-paid")]
    public async Task<IActionResult> MarkAsPaid(int id)
    {
        try
        {
            var booking = await _context.ServiceBookings
                .Include(b => b.Customer)
                .ThenInclude(c => c.Profile)
                .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
                .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.ServicePackage)
                .FirstOrDefaultAsync(b => b.Id == id);
            
            if (booking == null)
            {
                return NotFound(new { error = "Booking not found", code = "BOOKING_NOT_FOUND" });
            }

            if (booking.PaymentStatus == "Paid")
            {
                return BadRequest(new { error = "Booking đã được thanh toán", code = "ALREADY_PAID" });
            }

            booking.PaymentStatus = "Paid";
            booking.UpdatedAt = DateTimeHelper.GetVietnamTime();
            await _context.SaveChangesAsync();

            // Send payment confirmation email
            if (booking.Customer != null && !string.IsNullOrEmpty(booking.Customer.Email))
            {
                try
                {
                    await _emailService.SendServicePaymentConfirmationEmailAsync(booking);
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send service payment confirmation email for booking {BookingId}", booking.Id);
                    // Don't fail the payment if email fails
                }
            }

            return Ok(new { message = "Đã đánh dấu booking là đã thanh toán", bookingId = booking.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking booking as paid. BookingId: {BookingId}", id);
            return StatusCode(500, new { error = "An error occurred while marking booking as paid", code = "INTERNAL_ERROR" });
        }
    }

    // PUT: api/servicebooking/{id}/reject - Reject booking (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectBookingDto dto)
    {
        try
        {
            var booking = await _context.ServiceBookings
                .Include(b => b.Customer)
                .ThenInclude(c => c.Profile)
                .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
                .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.ServicePackage)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            if (booking.Status == "Rejected" || booking.Status == "Completed" || booking.Status == "Cancelled")
            {
                return BadRequest(new { error = "Booking cannot be rejected in its current state", code = "INVALID_STATUS" });
            }

            booking.Status = "Rejected";
            booking.CancelReason = dto.Reason ?? "Lịch hẹn bị từ chối bởi quản trị viên";
            booking.UpdatedAt = DateTimeHelper.GetVietnamTime();

            // Reject all booking items
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
            foreach (var item in booking.BookingItems)
            {
                item.Status = "Rejected";
                item.UpdatedAt = DateTimeHelper.GetVietnamTime();
            }

            await _context.SaveChangesAsync();

            // Send rejection email
            if (booking.Customer != null && !string.IsNullOrEmpty(booking.Customer.Email))
            {
                try
                {
                    await _emailService.SendBookingRejectionEmailAsync(booking, dto.Reason ?? "Lịch hẹn bị từ chối bởi quản trị viên");
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send booking rejection email for booking {BookingId}", booking.Id);
                    // Don't fail the rejection if email fails
                }
            }

            var result = await MapToServiceBookingDto(booking);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting service booking {BookingId}", id);
            return StatusCode(500, new { error = "An error occurred while rejecting the service booking", code = "INTERNAL_ERROR" });
        }
    }

    // DELETE: api/servicebooking/{id} (Admin only)
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var booking = await _context.ServiceBookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            _context.ServiceBookings.Remove(booking);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Service booking deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting service booking {BookingId}", id);
            return StatusCode(500, new { error = "An error occurred while deleting the service booking", code = "INTERNAL_ERROR" });
        }
    }

    // PUT: api/servicebooking/{id}/status (Cho Admin/ServiceStaff)
    // Cập nhật trạng thái booking (tự động tính từ BookingItems)
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateServiceBookingStatusDto dto)
    {
        try
        {
            var booking = await _context.ServiceBookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            // Load BookingItems
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();

            if (IsBookingCancelled(booking))
            {
                return BadRequest(new { error = "Booking đã bị hủy, không thể thay đổi trạng thái", code = "BOOKING_LOCKED" });
            }

            // Cập nhật InternalNote nếu có
            if (dto.InternalNote != null)
            {
                booking.InternalNote = dto.InternalNote;
            }

            // Cập nhật status (có thể được tính tự động từ BookingItems)
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                booking.Status = dto.Status;
            }
            else
            {
                // Tự động tính status từ BookingItems
                var allCompleted = booking.BookingItems.All(bi => bi.Status == "Completed");
                var allRejected = booking.BookingItems.All(bi => bi.Status == "Rejected");
                var anyInProgress = booking.BookingItems.Any(bi => bi.Status == "InProgress");
                var allConfirmed = booking.BookingItems.All(bi => bi.Status == "Confirmed" || bi.Status == "InProgress" || bi.Status == "Completed");
                var anyAssigned = booking.BookingItems.Any(bi => !string.IsNullOrEmpty(bi.AssignedStaffId));

                if (allCompleted)
                    booking.Status = "Completed";
                else if (allRejected)
                    booking.Status = "Rejected";
                else if (anyInProgress)
                    booking.Status = "InProgress";
                else if (allConfirmed)
                    booking.Status = "Confirmed";
                else if (anyAssigned)
                    booking.Status = "Assigned";
                else
                    booking.Status = "Pending";
            }

            booking.UpdatedAt = DateTimeHelper.GetVietnamTime();

            await _context.SaveChangesAsync();

            var result = await MapToServiceBookingDto(booking);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating service booking status for id: {Id}", id);
            return StatusCode(500, new { error = "An error occurred while updating the service booking status", code = "INTERNAL_ERROR" });
        }
    }

    // PUT: api/servicebooking/{id}/cancel (Cho User hủy lịch của chính mình)
    [Authorize]
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelServiceBookingDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User not authenticated", code = "UNAUTHORIZED" });
            }

            var booking = await _context.ServiceBookings.FindAsync(id);
            if (booking == null)
                return NotFound(new { error = "Service booking not found", code = "BOOKING_NOT_FOUND" });

            // Chỉ cho phép hủy booking của chính user
            if (booking.CustomerId != userId)
            {
                return Forbid();
            }

            // Không cho hủy nếu đã hoàn thành / đã hủy / bị từ chối
            var upperStatus = booking.Status.ToUpperInvariant();
            if (upperStatus is "COMPLETED" or "CANCELLED" or "REJECTED")
            {
                return BadRequest(new { error = "Booking cannot be cancelled in its current state", code = "INVALID_STATUS" });
            }

            // Không cho hủy nếu đã quá giờ hẹn (cho phép hủy trước 2 giờ)
            var now = DateTimeHelper.GetVietnamTime();
            if (booking.StartTime <= now.AddHours(2))
            {
                return BadRequest(new { error = "You can only cancel at least 2 hours before the appointment time", code = "TOO_LATE_TO_CANCEL" });
            }

            booking.Status = "Cancelled";
            booking.CancelReason = dto.Reason;
            booking.UpdatedAt = now;

            await _context.SaveChangesAsync();

            // Load customer and booking items for email
            await _context.Entry(booking).Reference(b => b.Customer).LoadAsync();
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
            foreach (var item in booking.BookingItems)
            {
                await _context.Entry(item).Reference(bi => bi.Service).LoadAsync();
                await _context.Entry(item).Reference(bi => bi.ServicePackage).LoadAsync();
            }

            // Send cancellation email
            try
            {
                await _emailService.SendBookingCancellationEmailAsync(booking);
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning(emailEx, "Failed to send booking cancellation email for booking {BookingId}", booking.Id);
                // Don't fail the cancellation if email fails
            }

            var result = await MapToServiceBookingDto(booking);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling service booking id: {Id}", id);
            return StatusCode(500, new { error = "An error occurred while cancelling the service booking", code = "INTERNAL_ERROR" });
        }
    }

    // PUT: api/servicebooking/items/{itemId}/status (Cho Admin/ServiceStaff)
    // Cập nhật trạng thái của một BookingItem cụ thể
    [Authorize(Roles = "Admin,ServiceStaff")]
    [HttpPut("items/{itemId}/status")]
    public async Task<IActionResult> UpdateBookingItemStatus(int itemId, [FromBody] UpdateBookingItemStatusDto dto)
    {
        try
        {
            var bookingItem = await _context.BookingItems
                .Include(bi => bi.ServiceBooking)
                .FirstOrDefaultAsync(bi => bi.Id == itemId);

            if (bookingItem == null)
                return NotFound(new { error = "Booking item not found", code = "BOOKING_ITEM_NOT_FOUND" });

            if (bookingItem.ServiceBooking != null && IsBookingCancelled(bookingItem.ServiceBooking))
            {
                return BadRequest(new { error = "Booking đã bị hủy, không thể thay đổi dịch vụ", code = "BOOKING_LOCKED" });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            var isServiceStaff = User.IsInRole("ServiceStaff");

            // ServiceStaff chỉ có thể cập nhật item được phân công cho họ
            if (isServiceStaff && !isAdmin)
            {
                if (bookingItem.AssignedStaffId != userId)
                {
                    // Kiểm tra xem staff có được phân công cho service này không
                    var isAssigned = await _context.ServiceStaffAssignments
                        .AnyAsync(ssa => ssa.ServiceId == bookingItem.ServiceId 
                            && ssa.StaffId == userId 
                            && ssa.IsActive);
                    
                    if (!isAssigned)
                        return Forbid();
                }

                // Không cho staff hủy hoặc từ chối
                var upperStatus = dto.Status.ToUpperInvariant();
                if (upperStatus is "CANCELLED" or "REJECTED")
                {
                    return BadRequest(new { error = "Staff cannot cancel or reject booking items", code = "FORBIDDEN_STATUS_FOR_STAFF" });
                }

                // Staff chỉ được phép đổi trạng thái và thêm ghi chú thực hiện (InternalNote bị khoá ở UI, nên bỏ qua ở API)
                bookingItem.Status = dto.Status;
                bookingItem.UpdatedAt = DateTimeHelper.GetVietnamTime();
                // Không cập nhật AssignedStaff, StartTime, EndTime từ phía staff để tránh đổi nhân viên/giờ hẹn
            }
            else
            {
                // Admin: được phép cập nhật đầy đủ
                bookingItem.Status = dto.Status;
                bookingItem.UpdatedAt = DateTimeHelper.GetVietnamTime();

                if (dto.AssignedStaffId != null)
                {
                    var trimmedStaffId = string.IsNullOrWhiteSpace(dto.AssignedStaffId)
                        ? null
                        : dto.AssignedStaffId.Trim();

                    if (trimmedStaffId == null)
                    {
                        bookingItem.AssignedStaffId = null;
                        bookingItem.AssignedStaffName = null;
                    }
                    else
                    {
                        var (slotStart, slotEnd) = GetBookingItemSlotRange(bookingItem);

                        var isAvailable = await IsStaffAvailableForSlot(trimmedStaffId, slotStart, slotEnd, bookingItem.Id, bookingItem.ServiceBookingId);
                        if (!isAvailable)
                        {
                            return BadRequest(new { error = "Nhân viên này đã có lịch khác trong khung giờ này", code = "STAFF_BUSY" });
                        }

                        bookingItem.AssignedStaffId = trimmedStaffId;
                    }
                }

                if (dto.AssignedStaffName != null)
                {
                    bookingItem.AssignedStaffName = string.IsNullOrWhiteSpace(dto.AssignedStaffName)
                        ? null
                        : dto.AssignedStaffName;
                }
                if (dto.InternalNote != null)
                {
                    bookingItem.InternalNote = dto.InternalNote;
                }
                if (dto.StartTime.HasValue)
                {
                    bookingItem.StartTime = dto.StartTime;
                }
                if (dto.EndTime.HasValue)
                {
                    bookingItem.EndTime = dto.EndTime;
                }
            }

            await _context.SaveChangesAsync();

            // Cập nhật status của booking cha nếu cần
            var booking = bookingItem.ServiceBooking;
            await UpdateBookingStatusFromItems(booking);

            // Load lại để map
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
            var result = await MapToServiceBookingDto(booking);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating booking item status for id: {ItemId}", itemId);
            return StatusCode(500, new { error = "An error occurred while updating the booking item status", code = "INTERNAL_ERROR" });
        }
    }

    private async Task<List<string>> GetServiceStaffIdsAsync(List<int>? filterServiceIds = null)
    {
        var serviceStaffRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "ServiceStaff");
        if (serviceStaffRole == null)
            return new List<string>();

        return await _context.UserRoles
            .Where(ur => ur.RoleId == serviceStaffRole.Id)
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync();
    }

    private static DateTime NormalizeToVietnamTime(DateTime dateTime)
    {
        return dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime.ToLocalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(dateTime, DateTimeKind.Local),
            _ => dateTime
        };
    }

    private int ResolveSlotCapacity(DateTime date, int? requestedCapacity = null)
    {
        if (requestedCapacity.HasValue)
        {
            var normalized = Math.Clamp(requestedCapacity.Value, 1, 10);
            return normalized;
        }

        var isWeekend = date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;
        return isWeekend ? WeekendConcurrentCustomerSlots : DefaultConcurrentCustomerSlots;
    }

    private (DateTime Start, DateTime End) GetBookingTimeRange(ServiceBooking booking)
    {
        var start = booking.StartTime;
        var end = booking.EndTime;

        if (end <= start)
        {
            var duration = booking.TotalDurationMinutes > 0
                ? booking.TotalDurationMinutes
                : booking.BookingItems?.Sum(bi => bi.DurationMinutes) ?? 0;

            if (duration <= 0)
            {
                duration = SlotIntervalMinutes;
            }

            end = start.AddMinutes(duration);
        }

        return (start, end);
    }

    private async Task<List<ServiceStaffAvailabilityDto>> BuildStaffAvailabilityAsync(List<string> staffIds, DateTime rangeStart, DateTime rangeEnd, bool onDutyOnly = false)
    {
        if (staffIds == null || staffIds.Count == 0)
            return new List<ServiceStaffAvailabilityDto>();

        var normalizedEnd = rangeEnd <= rangeStart ? rangeStart.AddHours(1) : rangeEnd;
        var paddedStart = rangeStart.AddHours(-12);
        var paddedEnd = normalizedEnd.AddHours(12);

        var staffUsersQuery = _userManager.Users
            .Include(u => u.Profile)
            .Where(u => staffIds.Contains(u.Id));

        if (onDutyOnly)
        {
            staffUsersQuery = staffUsersQuery.Where(u => u.IsServiceStaffOnDuty);
        }

        var staffUsers = await staffUsersQuery.ToListAsync();

        var assignments = await _context.ServiceStaffAssignments
            .Where(ssa => staffIds.Contains(ssa.StaffId))
            .ToListAsync();

        var busyStatuses = new[] { "Pending", "Confirmed", "Assigned", "InProgress" };

        var busyItemsQuery = _context.BookingItems
            .Include(bi => bi.ServiceBooking)
            .Include(bi => bi.Service)
            .Where(bi => bi.AssignedStaffId != null && staffIds.Contains(bi.AssignedStaffId))
            .Where(bi => bi.ServiceBooking != null)
            .Where(bi => bi.Status != null && busyStatuses.Contains(bi.Status));

        var busyItemsRaw = await busyItemsQuery.ToListAsync();

        var busyItems = busyItemsRaw
            .Where(bi =>
            {
                var bookingEnd = bi.ServiceBooking!.EndTime;
                if (bookingEnd <= bi.ServiceBooking.StartTime)
                {
                    bookingEnd = bi.ServiceBooking.StartTime.AddMinutes(Math.Max(bi.ServiceBooking.TotalDurationMinutes, bi.DurationMinutes));
                }

                return bi.ServiceBooking.StartTime < paddedEnd && paddedStart < bookingEnd;
            })
            .ToList();

        var result = new List<ServiceStaffAvailabilityDto>();

        foreach (var staff in staffUsers)
        {
            var staffBusySlots = busyItems
                .Where(bi => bi.AssignedStaffId == staff.Id)
                .Select(bi =>
                {
                    var (slotStart, slotEnd) = GetBookingItemSlotRange(bi);
                    return new StaffBusySlotDto
                    {
                        BookingId = bi.ServiceBookingId,
                        BookingItemId = bi.Id,
                        ServiceName = bi.Service?.Name,
                        PetName = bi.ServiceBooking?.PetName,
                        StartTime = slotStart,
                        EndTime = slotEnd,
                        Status = bi.Status ?? "Pending"
                    };
                })
                .OrderBy(slot => slot.StartTime)
                .ToList();

            var overlappingSlot = staffBusySlots.FirstOrDefault(slot =>
                slot.StartTime < normalizedEnd && rangeStart < slot.EndTime);

            var assignedServiceIds = assignments
                .Where(a => a.StaffId == staff.Id)
                .Select(a => a.ServiceId)
                .Distinct()
                .ToList();

            result.Add(new ServiceStaffAvailabilityDto
            {
                StaffId = staff.Id,
                FullName = staff.Profile?.FullName ?? staff.UserName ?? staff.Email ?? "Nhân viên",
                Email = staff.Email,
                Phone = staff.Profile?.Phone,
                IsOnDuty = staff.IsServiceStaffOnDuty,
                AssignedServiceIds = assignedServiceIds,
                BusySlots = staffBusySlots,
                IsBusyInRange = overlappingSlot != null,
                RangeStart = rangeStart,
                RangeEnd = normalizedEnd,
                NextAvailableTime = overlappingSlot?.EndTime
            });
        }

        return result;
    }

    private static bool IsBookingCancelled(ServiceBooking booking)
    {
        var status = booking.Status?.ToUpperInvariant();
        return status == "CANCELLED";
    }

    // Helper method để cập nhật status của booking từ các items
    private (DateTime SlotStart, DateTime SlotEnd) GetBookingItemSlotRange(BookingItem bookingItem)
    {
        var defaultStart = DateTimeHelper.GetVietnamTime();
        var slotStart = (bookingItem.StartTime?.ToLocalTime())
            ?? bookingItem.ServiceBooking?.StartTime 
            ?? defaultStart;

        var durationMinutes = bookingItem.DurationMinutes > 0
            ? bookingItem.DurationMinutes
            : bookingItem.ServiceBooking?.TotalDurationMinutes ?? 60;

        var slotEnd = bookingItem.EndTime?.ToLocalTime() ?? slotStart.AddMinutes(durationMinutes);

        if (slotEnd <= slotStart)
        {
            slotEnd = slotStart.AddMinutes(30);
        }

        return (slotStart, slotEnd);
    }

    private async Task UpdateBookingStatusFromItems(ServiceBooking booking)
    {
        await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();

        var allCompleted = booking.BookingItems.All(bi => bi.Status == "Completed");
        var allRejected = booking.BookingItems.All(bi => bi.Status == "Rejected");
        var anyInProgress = booking.BookingItems.Any(bi => bi.Status == "InProgress");
        var allConfirmed = booking.BookingItems.All(bi => bi.Status == "Confirmed" || bi.Status == "InProgress" || bi.Status == "Completed");
        var anyAssigned = booking.BookingItems.Any(bi => !string.IsNullOrEmpty(bi.AssignedStaffId));

        string newStatus;
        if (allCompleted)
            newStatus = "Completed";
        else if (allRejected)
            newStatus = "Rejected";
        else if (anyInProgress)
            newStatus = "InProgress";
        else if (allConfirmed)
            newStatus = "Confirmed";
        else if (anyAssigned)
            newStatus = "Assigned";
        else
            newStatus = "Pending";

        if (booking.Status != newStatus)
        {
            booking.Status = newStatus;
            booking.UpdatedAt = DateTimeHelper.GetVietnamTime();
            await _context.SaveChangesAsync();
        }
    }

    private async Task<bool> IsStaffAvailableForSlot(string staffId, DateTime slotStart, DateTime slotEnd, int? ignoreBookingItemId = null, int? ignoreServiceBookingId = null)
    {
        if (slotEnd <= slotStart)
        {
            slotEnd = slotStart.AddMinutes(30);
        }

        var busyStatuses = new[] { "Pending", "Confirmed", "Assigned", "InProgress" };

        var query = _context.BookingItems
            .Include(bi => bi.ServiceBooking)
            .Where(bi => bi.AssignedStaffId == staffId && bi.ServiceBooking != null)
            .Where(bi => bi.Status != null && busyStatuses.Contains(bi.Status));

        if (ignoreBookingItemId.HasValue)
        {
            query = query.Where(bi => bi.Id != ignoreBookingItemId.Value);
        }
        if (ignoreServiceBookingId.HasValue)
        {
            query = query.Where(bi => bi.ServiceBookingId != ignoreServiceBookingId.Value);
        }

        var busyItems = await query.ToListAsync();

        foreach (var busyItem in busyItems)
        {
            var (existingStart, existingEnd) = GetBookingItemSlotRange(busyItem);
            if (existingStart < slotEnd && slotStart < existingEnd)
            {
                return false;
            }
        }

        return true;
    }

    // POST: api/servicebooking/walk-in (SaleStaff tạo booking walk-in)
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost("walk-in")]
    public async Task<ActionResult<ServiceBookingDto>> CreateWalkInBooking([FromBody] WalkInBookingDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var vietnamTime = DateTimeHelper.GetVietnamTime();

            // Validate service items
            if (dto.ServiceItems == null || dto.ServiceItems.Count == 0)
            {
                return BadRequest(new { error = "Phải chọn ít nhất 1 dịch vụ", code = "NO_SERVICES" });
            }

            // Build booking items
            var bookingItems = new List<BookingItem>();
            decimal totalPrice = 0;
            int totalDurationMinutes = 0;

            for (int i = 0; i < dto.ServiceItems.Count; i++)
            {
                var serviceItemDto = dto.ServiceItems[i];
                var service = await _context.Services
                    .Include(s => s.Packages)
                    .FirstOrDefaultAsync(s => s.Id == serviceItemDto.ServiceId);

                if (service == null)
                {
                    return BadRequest(new { error = $"Service ID {serviceItemDto.ServiceId} not found", code = "SERVICE_NOT_FOUND" });
                }

                ServicePackage? package = null;
                if (serviceItemDto.ServicePackageId.HasValue)
                {
                    package = service.Packages?.FirstOrDefault(p => p.Id == serviceItemDto.ServicePackageId.Value);
                    if (package == null)
                    {
                        return BadRequest(new { error = $"Package ID {serviceItemDto.ServicePackageId.Value} not found", code = "PACKAGE_NOT_FOUND" });
                    }
                }

                // Nếu service có packages nhưng không chọn package, yêu cầu chọn
                var serviceHasPackages = service.Packages != null && service.Packages.Any();
                if (serviceHasPackages && package == null)
                {
                    return BadRequest(new { error = $"Vui lòng chọn ít nhất 1 gói cho dịch vụ '{service.Name}'", code = "PACKAGE_REQUIRED" });
                }

                // Nếu không có package, dùng giá mặc định (0) và duration mặc định
                var itemPrice = package?.Price ?? 0;
                var itemDuration = package?.DurationMinutes ?? 60;

                totalPrice += itemPrice;
                totalDurationMinutes += itemDuration;

                var bookingItem = new BookingItem
                {
                    ServiceId = service.Id,
                    ServicePackageId = package?.Id,
                    PriceAtBooking = itemPrice,
                    PackagePrice = package?.Price,
                    DurationMinutes = itemDuration,
                    Status = "Pending",
                    OrderIndex = i,
                    Note = serviceItemDto.Note,
                    CreatedAt = vietnamTime
                };

                bookingItems.Add(bookingItem);
            }

            // Calculate end time
            var startTime = vietnamTime;
            var endTime = startTime.AddMinutes(totalDurationMinutes);

            // Generate booking code
            var bookingCode = await _codeGenerator.GenerateServiceBookingCodeAsync();

            // Create ServiceBooking
            var booking = new ServiceBooking
            {
                BookingCode = bookingCode,
                CustomerId = userId,
                CustomerName = dto.CustomerName,
                CustomerEmail = dto.CustomerEmail,
                CustomerPhone = dto.CustomerPhone,
                StartTime = startTime,
                EndTime = endTime,
                TotalDurationMinutes = totalDurationMinutes,
                TotalPrice = totalPrice,
                PetName = dto.PetName,
                PetType = dto.PetType,
                PetBreed = dto.PetBreed,
                PetAge = dto.PetAge,
                PetWeight = dto.PetWeight,
                Note = dto.Note,
                Status = "Pending",
                Source = "Walk-in",
                CreatedAt = vietnamTime
            };

            foreach (var item in bookingItems)
            {
                booking.BookingItems.Add(item);
            }

            _context.ServiceBookings.Add(booking);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Walk-in booking created: {BookingId}, Items: {ItemCount}", booking.Id, bookingItems.Count);

            // Auto-assign staff nếu có người rảnh
            try
            {
                var assignedStaff = await FindAndAssignAvailableStaff(booking);
                if (assignedStaff != null)
                {
                    _logger.LogInformation("Walk-in booking {BookingId} auto-assigned to staff {StaffId}", booking.Id, assignedStaff.Id);
                }
                else
                {
                    _logger.LogWarning("No available staff for walk-in booking {BookingId}", booking.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error auto-assigning staff for walk-in booking {BookingId}", booking.Id);
                // Không block tạo booking nếu auto-assign thất bại
            }

            // Reload để lấy thông tin đầy đủ
            await _context.Entry(booking).Reference(b => b.Customer).LoadAsync();
            await _context.Entry(booking).Collection(b => b.BookingItems).LoadAsync();
            foreach (var item in booking.BookingItems)
            {
                await _context.Entry(item).Reference(bi => bi.Service).LoadAsync();
                await _context.Entry(item).Reference(bi => bi.ServicePackage).LoadAsync();
            }

            // Send confirmation email for walk-in booking
            try
            {
                await _emailService.SendBookingConfirmationEmailAsync(booking);
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning(emailEx, "Failed to send walk-in booking confirmation email for booking {BookingId}", booking.Id);
                // Don't fail the booking creation if email fails
            }

            var result = await MapToServiceBookingDto(booking);

            return CreatedAtAction(nameof(GetById), new { id = booking.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating walk-in booking");
            return StatusCode(500, new { error = "An error occurred while creating walk-in booking", code = "INTERNAL_ERROR" });
        }
    }

    // Helper: Tìm và gán nhân viên rảnh cho walk-in booking
    private async Task<ApplicationUser?> FindAndAssignAvailableStaff(ServiceBooking booking)
    {
        // Lấy danh sách service staff đang on-duty
        var serviceStaffRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "ServiceStaff");
        if (serviceStaffRole == null)
            return null;

        var onDutyStaff = await _context.UserRoles
            .Where(ur => ur.RoleId == serviceStaffRole.Id)
            .Join(_userManager.Users, ur => ur.UserId, u => u.Id, (ur, u) => u)
            .Where(u => u.IsServiceStaffOnDuty)
            .Include(u => u.Profile)
            .ToListAsync();

        if (!onDutyStaff.Any())
            return null;

        var slotStart = booking.StartTime;
        var slotEnd = booking.EndTime > slotStart 
            ? booking.EndTime 
            : slotStart.AddMinutes(Math.Max(booking.TotalDurationMinutes, 30));

        // Tính workload cho mỗi staff (số booking đang active)
        var staffWorkload = new Dictionary<string, int>();
        foreach (var staff in onDutyStaff)
        {
            var busyCount = await _context.BookingItems
                .Include(bi => bi.ServiceBooking)
                .Where(bi => bi.AssignedStaffId == staff.Id)
                .Where(bi => bi.ServiceBooking != null)
                .Where(bi => bi.Status != null && BusyBookingStatuses.Contains(bi.Status))
                .CountAsync();
            
            staffWorkload[staff.Id] = busyCount;
        }

        // Ưu tiên: staff rảnh nhất + không bận trong khung giờ này
        var availableStaff = new List<(ApplicationUser staff, int workload)>();
        foreach (var staff in onDutyStaff)
        {
            var isAvailable = await IsStaffAvailableForSlot(staff.Id, slotStart, slotEnd, null, booking.Id);
            if (isAvailable)
            {
                availableStaff.Add((staff, staffWorkload[staff.Id]));
            }
        }

        if (!availableStaff.Any())
            return null;

        // Chọn staff có workload thấp nhất
        var selectedStaff = availableStaff
            .OrderBy(x => x.workload)
            .ThenBy(x => Guid.NewGuid()) // Random nếu workload bằng nhau
            .First().staff;

        // Assign staff cho tất cả booking items
        var staffName = selectedStaff.Profile?.FullName ?? selectedStaff.UserName ?? selectedStaff.Email ?? selectedStaff.Id;
        var now = DateTimeHelper.GetVietnamTime();

        foreach (var item in booking.BookingItems)
        {
            item.AssignedStaffId = selectedStaff.Id;
            item.AssignedStaffName = staffName;
            item.Status = "Assigned";
            item.UpdatedAt = now;
        }

        booking.Status = "Assigned";
        booking.UpdatedAt = now;
        await _context.SaveChangesAsync();

        return selectedStaff;
    }
}