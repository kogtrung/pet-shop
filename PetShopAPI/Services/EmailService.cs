using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using PetShopAPI.Models;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace PetShopAPI.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _emailSettings;
    private readonly EmailTemplateService _templateService;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<EmailSettings> emailSettings,
        EmailTemplateService templateService,
        ILogger<EmailService> logger)
    {
        _emailSettings = emailSettings.Value;
        _templateService = templateService;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder();
            if (isHtml)
            {
                bodyBuilder.HtmlBody = body;
            }
            else
            {
                bodyBuilder.TextBody = body;
            }
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_emailSettings.SmtpUsername, _emailSettings.SmtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Email sent successfully to {toEmail}: {subject}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {toEmail}: {subject}");
            // Don't throw exception to avoid breaking the main flow
            // In production, you might want to log to a queue for retry
        }
    }

    public async Task SendAccountConfirmationEmailAsync(ApplicationUser user, string confirmationLink)
    {
        if (string.IsNullOrEmpty(user.Email))
        {
            _logger.LogWarning($"Cannot send confirmation email: User {user.Id} has no email");
            return;
        }

        var body = _templateService.GetAccountConfirmationTemplate(user, confirmationLink);
        var subject = "Xác nhận tài khoản Petivo";

        await SendEmailAsync(user.Email, subject, body);
    }

    public async Task SendBookingConfirmationEmailAsync(ServiceBooking booking)
    {
        if (booking.Customer == null || string.IsNullOrEmpty(booking.Customer.Email))
        {
            _logger.LogWarning($"Cannot send booking confirmation: Booking {booking.Id} has no customer email");
            return;
        }

        var body = _templateService.GetBookingConfirmationTemplate(booking);
        var subject = $"Xác nhận đặt lịch dịch vụ - {booking.BookingCode ?? $"#{booking.Id}"}";

        await SendEmailAsync(booking.Customer.Email, subject, body);
    }

    public async Task SendBookingCancellationEmailAsync(ServiceBooking booking)
    {
        if (booking.Customer == null || string.IsNullOrEmpty(booking.Customer.Email))
        {
            _logger.LogWarning($"Cannot send booking cancellation: Booking {booking.Id} has no customer email");
            return;
        }

        var body = _templateService.GetBookingCancellationTemplate(booking);
        var subject = $"Hủy lịch hẹn dịch vụ - {booking.BookingCode ?? $"#{booking.Id}"}";

        await SendEmailAsync(booking.Customer.Email, subject, body);
    }

    public async Task SendOrderConfirmationEmailAsync(Order order)
    {
        if (order.Customer == null || string.IsNullOrEmpty(order.Customer.Email))
        {
            _logger.LogWarning($"Cannot send order confirmation: Order {order.Id} has no customer email");
            return;
        }

        var body = _templateService.GetOrderConfirmationTemplate(order);
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var subject = $"Xác nhận đơn hàng - {orderCode}";

        await SendEmailAsync(order.Customer.Email, subject, body);
    }

    public async Task SendOrderStatusUpdateEmailAsync(Order order, string newStatus)
    {
        if (order.Customer == null || string.IsNullOrEmpty(order.Customer.Email))
        {
            _logger.LogWarning($"Cannot send order status update: Order {order.Id} has no customer email");
            return;
        }

        var body = _templateService.GetOrderStatusUpdateTemplate(order, newStatus);
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var subject = $"Cập nhật đơn hàng - {orderCode}";

        await SendEmailAsync(order.Customer.Email, subject, body);
    }

    public async Task SendOrderCancellationEmailAsync(Order order, string reason, bool isApproved)
    {
        if (order.Customer == null || string.IsNullOrEmpty(order.Customer.Email))
        {
            _logger.LogWarning($"Cannot send order cancellation email: Order {order.Id} has no customer email");
            return;
        }

        var body = _templateService.GetOrderCancellationTemplate(order, reason, isApproved);
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var subject = $"Hủy đơn hàng - {orderCode}";

        await SendEmailAsync(order.Customer.Email, subject, body);
    }

    public async Task SendServicePaymentConfirmationEmailAsync(ServiceBooking booking)
    {
        if (booking.Customer == null || string.IsNullOrEmpty(booking.Customer.Email))
        {
            _logger.LogWarning($"Cannot send service payment confirmation: Booking {booking.Id} has no customer email");
            return;
        }

        var body = _templateService.GetServicePaymentConfirmationTemplate(booking);
        var subject = $"Xác nhận thanh toán dịch vụ - {booking.BookingCode ?? $"#{booking.Id}"}";

        await SendEmailAsync(booking.Customer.Email, subject, body);
    }

    public async Task SendBookingRejectionEmailAsync(ServiceBooking booking, string reason)
    {
        if (booking.Customer == null || string.IsNullOrEmpty(booking.Customer.Email))
        {
            _logger.LogWarning($"Cannot send booking rejection: Booking {booking.Id} has no customer email");
            return;
        }

        var body = _templateService.GetBookingRejectionTemplate(booking, reason);
        var subject = $"Lịch hẹn bị từ chối - {booking.BookingCode ?? $"#{booking.Id}"}";

        await SendEmailAsync(booking.Customer.Email, subject, body);
    }

    public async Task SendBookingReminderEmailAsync(ServiceBooking booking)
    {
        if (booking.Customer == null || string.IsNullOrEmpty(booking.Customer.Email))
        {
            _logger.LogWarning($"Cannot send booking reminder: Booking {booking.Id} has no customer email");
            return;
        }

        var body = _templateService.GetBookingReminderTemplate(booking);
        var subject = $"Nhắc nhở lịch hẹn - {booking.BookingCode ?? $"#{booking.Id}"}";

        await SendEmailAsync(booking.Customer.Email, subject, body);
    }
}

