using PetShopAPI.Models;

namespace PetShopAPI.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true);
    Task SendAccountConfirmationEmailAsync(ApplicationUser user, string confirmationToken);
    Task SendBookingConfirmationEmailAsync(ServiceBooking booking);
    Task SendBookingCancellationEmailAsync(ServiceBooking booking);
    Task SendOrderConfirmationEmailAsync(Order order);
    Task SendOrderStatusUpdateEmailAsync(Order order, string newStatus);
    Task SendOrderCancellationEmailAsync(Order order, string reason, bool isApproved);
    Task SendBookingReminderEmailAsync(ServiceBooking booking);
    Task SendServicePaymentConfirmationEmailAsync(ServiceBooking booking);
    Task SendBookingRejectionEmailAsync(ServiceBooking booking, string reason);
}

