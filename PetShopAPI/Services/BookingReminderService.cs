using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PetShopAPI.Data;
using PetShopAPI.Models;

namespace PetShopAPI.Services;

public class BookingReminderService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BookingReminderService> _logger;

    public BookingReminderService(
        IServiceProvider serviceProvider,
        ILogger<BookingReminderService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndSendRemindersAsync();
                
                // Check every 30 minutes
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BookingReminderService");
                // Wait 5 minutes before retrying on error
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }

    private async Task CheckAndSendRemindersAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.Now;
        var reminderTime = now.AddHours(2);
        
        // Find bookings that start in approximately 2 hours (within 15 minutes window)
        // and haven't been reminded yet
        var bookings = await dbContext.ServiceBookings
            .Include(b => b.Customer)
                .ThenInclude(c => c.Profile)
            .Include(b => b.BookingItems)
                .ThenInclude(item => item.Service)
            .Include(b => b.BookingItems)
                .ThenInclude(item => item.ServicePackage)
            .Where(b => 
                b.StartTime >= reminderTime.AddMinutes(-15) 
                && b.StartTime <= reminderTime.AddMinutes(15)
                && b.Status != "Cancelled"
                && !b.ReminderSent
                && b.Customer != null
                && !string.IsNullOrEmpty(b.Customer.Email))
            .ToListAsync();

        foreach (var booking in bookings)
        {
            try
            {
                await emailService.SendBookingReminderEmailAsync(booking);
                booking.ReminderSent = true;
                _logger.LogInformation($"Sent reminder email for booking {booking.Id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send reminder email for booking {booking.Id}");
                // Continue with other bookings even if one fails
            }
        }

        if (bookings.Any())
        {
            await dbContext.SaveChangesAsync();
            _logger.LogInformation($"Processed {bookings.Count} booking reminders");
        }
    }
}

