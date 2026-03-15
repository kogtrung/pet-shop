using Microsoft.Extensions.Options;
using PetShopAPI.Models;
using System.Linq;

namespace PetShopAPI.Services;

public class EmailTemplateService
{
    private readonly EmailSettings _emailSettings;

    public EmailTemplateService(IOptions<EmailSettings> emailSettings)
    {
        _emailSettings = emailSettings.Value;
    }

    public string GetAccountConfirmationTemplate(ApplicationUser user, string confirmationLink)
    {
        var userName = user.Profile?.FullName ?? user.UserName ?? "Bạn";
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Chào mừng đến với Petivo!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{userName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Petivo</strong> - Nơi chăm sóc thú cưng tốt nhất!</p>
            <p>Để hoàn tất đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:</p>
            <div style=""text-align: center;"">
                <a href=""{confirmationLink}"" class=""button"">Xác nhận Email</a>
            </div>
            <p>Hoặc copy và dán link sau vào trình duyệt:</p>
            <p style=""word-break: break-all; color: #667eea;"">{confirmationLink}</p>
            <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
            <p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetBookingConfirmationTemplate(ServiceBooking booking)
    {
        var customerName = booking.Customer?.Profile?.FullName ?? booking.Customer?.UserName ?? "Quý khách";
        var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
        var startTime = booking.StartTime.ToString("dd/MM/yyyy HH:mm");
        var totalPrice = booking.TotalPrice.ToString("N0");
        
        var servicesList = "";
        if (booking.BookingItems != null && booking.BookingItems.Any())
        {
            var groupedServices = booking.BookingItems
                .GroupBy(item => item.Service?.Name ?? "Dịch vụ")
                .ToList();
            
            foreach (var group in groupedServices)
            {
                servicesList += $"<li><strong>{group.Key}</strong><ul>";
                foreach (var item in group)
                {
                    servicesList += $"<li>{item.ServicePackage?.Name ?? "Gói cơ bản"} - {item.PriceAtBooking:N0}₫</li>";
                }
                servicesList += "</ul></li>";
            }
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Đặt lịch thành công!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã đặt lịch dịch vụ tại <strong>Petivo</strong>!</p>
            
            <div class=""info-box"">
                <h3>Thông tin lịch hẹn:</h3>
                <p><strong>Mã đặt lịch:</strong> {bookingCode}</p>
                <p><strong>Thời gian:</strong> {startTime}</p>
                <p><strong>Thú cưng:</strong> {booking.PetName ?? "—"}</p>
                <p><strong>Dịch vụ:</strong></p>
                <ul>{servicesList}</ul>
                <p><strong>Tổng tiền:</strong> {totalPrice}₫</p>
            </div>
            
            <p>Vui lòng đến đúng giờ hẹn. Chúng tôi sẽ gửi email nhắc nhở 2 giờ trước giờ hẹn.</p>
            <p>Nếu có thay đổi, vui lòng liên hệ với chúng tôi sớm nhất có thể.</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetBookingCancellationTemplate(ServiceBooking booking)
    {
        var customerName = booking.Customer?.Profile?.FullName ?? booking.Customer?.UserName ?? "Quý khách";
        var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
        var startTime = booking.StartTime.ToString("dd/MM/yyyy HH:mm");

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f5576c; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Lịch hẹn đã được hủy</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Lịch hẹn của bạn tại <strong>Petivo</strong> đã được hủy thành công.</p>
            
            <div class=""info-box"">
                <h3>Thông tin lịch hẹn đã hủy:</h3>
                <p><strong>Mã đặt lịch:</strong> {bookingCode}</p>
                <p><strong>Thời gian:</strong> {startTime}</p>
                <p><strong>Thú cưng:</strong> {booking.PetName ?? "—"}</p>
            </div>
            
            <p>Nếu bạn muốn đặt lịch mới, vui lòng truy cập website của chúng tôi.</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ của Petivo!</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetOrderConfirmationTemplate(Order order)
    {
        // Check if it's a POS order (OrderCode starts with POS-)
        var isPOSOrder = order.OrderCode?.StartsWith("POS-") ?? false;
        
        if (isPOSOrder)
        {
            return GetPOSOrderConfirmationTemplate(order);
        }
        else
        {
            return GetOnlineOrderConfirmationTemplate(order);
        }
    }

    private string GetOnlineOrderConfirmationTemplate(Order order)
    {
        var customerName = order.Customer?.Profile?.FullName ?? order.Customer?.UserName ?? "Quý khách";
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var orderDate = order.CreatedAt.ToString("dd/MM/yyyy HH:mm");
        var subTotal = order.SubTotal.ToString("N0");
        var totalPrice = order.Total.ToString("N0");
        var paymentMethod = GetPaymentMethodText(order.PaymentMethod);
        var shippingAddress = order.ShippingAddress ?? "Chưa có địa chỉ";
        var shippingMethod = shippingAddress.Contains("Tại cửa hàng") ? "Nhận tại cửa hàng" : "Giao hàng tận nơi";

        var itemsList = "";
        if (order.Items != null && order.Items.Any())
        {
            foreach (var item in order.Items)
            {
                itemsList += $"<li>{item.Product?.Name ?? "Sản phẩm"} x{item.Quantity} - {item.UnitPrice:N0}₫</li>";
            }
        }

        var promotionInfo = "";
        if (!string.IsNullOrEmpty(order.PromotionCode) && order.DiscountAmount.HasValue && order.DiscountAmount.Value > 0)
        {
            promotionInfo = $@"
                <p><strong>Mã giảm giá:</strong> {order.PromotionCode}</p>
                <p><strong>Giảm giá:</strong> -{order.DiscountAmount.Value:N0}₫</p>";
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Đặt hàng online thành công!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã đặt hàng tại <strong>Petivo</strong>!</p>
            
            <div class=""info-box"">
                <h3>Thông tin đơn hàng:</h3>
                <p><strong>Mã đơn hàng:</strong> {orderCode}</p>
                <p><strong>Ngày đặt:</strong> {orderDate}</p>
                <p><strong>Sản phẩm:</strong></p>
                <ul>{itemsList}</ul>
                <p><strong>Tạm tính:</strong> {subTotal}₫</p>
                {promotionInfo}
                <p><strong>Tổng tiền:</strong> {totalPrice}₫</p>
                <p><strong>Phương thức thanh toán:</strong> {paymentMethod}</p>
                <p><strong>Hình thức vận chuyển:</strong> {shippingMethod}</p>
                <p><strong>Địa chỉ giao hàng:</strong> {shippingAddress}</p>
                <p><strong>Trạng thái:</strong> {GetOrderStatusText(order.Status)}</p>
            </div>
            
            <p>Chúng tôi sẽ xử lý đơn hàng của bạn trong thời gian sớm nhất.</p>
            <p>Bạn sẽ nhận được email cập nhật khi trạng thái đơn hàng thay đổi.</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    private string GetPOSOrderConfirmationTemplate(Order order)
    {
        var customerName = order.Customer?.Profile?.FullName ?? order.Customer?.UserName ?? "Quý khách";
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var orderDate = order.CreatedAt.ToString("dd/MM/yyyy HH:mm");
        var subTotal = order.SubTotal.ToString("N0");
        var totalPrice = order.Total.ToString("N0");
        var paymentMethod = GetPaymentMethodText(order.PaymentMethod);

        var itemsList = "";
        if (order.Items != null && order.Items.Any())
        {
            foreach (var item in order.Items)
            {
                itemsList += $"<li>{item.Product?.Name ?? "Sản phẩm"} x{item.Quantity} - {item.UnitPrice:N0}₫</li>";
            }
        }

        var promotionInfo = "";
        if (!string.IsNullOrEmpty(order.PromotionCode) && order.DiscountAmount.HasValue && order.DiscountAmount.Value > 0)
        {
            promotionInfo = $@"
                <p><strong>Mã giảm giá:</strong> {order.PromotionCode}</p>
                <p><strong>Giảm giá:</strong> -{order.DiscountAmount.Value:N0}₫</p>";
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #10b981; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Mua hàng tại cửa hàng thành công!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã mua sắm tại <strong>Petivo</strong>!</p>
            
            <div class=""info-box"">
                <h3>Thông tin đơn hàng:</h3>
                <p><strong>Mã đơn hàng:</strong> {orderCode}</p>
                <p><strong>Ngày mua:</strong> {orderDate}</p>
                <p><strong>Sản phẩm:</strong></p>
                <ul>{itemsList}</ul>
                <p><strong>Tạm tính:</strong> {subTotal}₫</p>
                {promotionInfo}
                <p><strong>Tổng tiền:</strong> {totalPrice}₫</p>
                <p><strong>Phương thức thanh toán:</strong> {paymentMethod}</p>
                <p><strong>Hình thức:</strong> Mua tại cửa hàng</p>
                <p><strong>Trạng thái:</strong> {GetOrderStatusText(order.Status)}</p>
            </div>
            
            <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của Petivo!</p>
            <p>Hẹn gặp lại bạn lần sau!</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetOrderStatusUpdateTemplate(Order order, string newStatus)
    {
        var customerName = order.Customer?.Profile?.FullName ?? order.Customer?.UserName ?? "Quý khách";
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var statusText = GetOrderStatusText(newStatus);
        var statusColor = newStatus == "Completed" ? "#10b981" : "#ef4444";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .status-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid {statusColor}; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Cập nhật đơn hàng</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Đơn hàng của bạn tại <strong>Petivo</strong> đã được cập nhật trạng thái.</p>
            
            <div class=""status-box"">
                <h3>Thông tin đơn hàng:</h3>
                <p><strong>Mã đơn hàng:</strong> {orderCode}</p>
                <p><strong>Trạng thái mới:</strong> <span style=""color: {statusColor}; font-weight: bold;"">{statusText}</span></p>
            </div>
            
            {(newStatus == "Completed" ? "<p>Đơn hàng của bạn đã được hoàn thành. Cảm ơn bạn đã mua sắm tại Petivo!</p>" : "<p>Đơn hàng của bạn đã bị hủy. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>")}
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetOrderCancellationTemplate(Order order, string reason, bool isApproved)
    {
        var customerName = order.Customer?.Profile?.FullName ?? order.Customer?.UserName ?? "Quý khách";
        var orderCode = order.OrderCode ?? $"#{order.Id}";
        var orderDate = order.CreatedAt.ToString("dd/MM/yyyy HH:mm");
        var totalPrice = order.Total.ToString("N0");
        var statusColor = isApproved ? "#ef4444" : "#f59e0b";
        var statusText = isApproved ? "Đã được duyệt hủy" : "Đang chờ xử lý";

        var itemsList = "";
        if (order.Items != null && order.Items.Any())
        {
            foreach (var item in order.Items)
            {
                itemsList += $"<li>{item.Product?.Name ?? "Sản phẩm"} x{item.Quantity} - {item.UnitPrice:N0}₫</li>";
            }
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid {statusColor}; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Yêu cầu hủy đơn hàng</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Yêu cầu hủy đơn hàng của bạn tại <strong>Petivo</strong> đã được xử lý.</p>
            
            <div class=""info-box"">
                <h3>Thông tin đơn hàng:</h3>
                <p><strong>Mã đơn hàng:</strong> {orderCode}</p>
                <p><strong>Ngày đặt:</strong> {orderDate}</p>
                <p><strong>Sản phẩm:</strong></p>
                <ul>{itemsList}</ul>
                <p><strong>Tổng tiền:</strong> {totalPrice}₫</p>
                <p><strong>Trạng thái:</strong> <span style=""color: {statusColor}; font-weight: bold;"">{statusText}</span></p>
                <p><strong>Lý do hủy:</strong> {reason}</p>
            </div>
            
            {(isApproved ? "<p>Yêu cầu hủy đơn hàng của bạn đã được duyệt. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>" : "<p>Yêu cầu hủy đơn hàng của bạn đang được xem xét. Chúng tôi sẽ thông báo kết quả sớm nhất có thể.</p>")}
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetBookingReminderTemplate(ServiceBooking booking)
    {
        var customerName = booking.Customer?.Profile?.FullName ?? booking.Customer?.UserName ?? "Quý khách";
        var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
        var startTime = booking.StartTime.ToString("dd/MM/yyyy HH:mm");
        var petName = booking.PetName ?? "thú cưng của bạn";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .reminder-box {{ background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>⏰ Nhắc nhở lịch hẹn</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Đây là email nhắc nhở từ <strong>Petivo</strong>.</p>
            
            <div class=""reminder-box"">
                <h3>Lịch hẹn của bạn sẽ bắt đầu sau 2 giờ:</h3>
                <p><strong>Mã đặt lịch:</strong> {bookingCode}</p>
                <p><strong>Thời gian:</strong> {startTime}</p>
                <p><strong>Thú cưng:</strong> {petName}</p>
            </div>
            
            <p>Vui lòng chuẩn bị và đến đúng giờ hẹn. Nếu có thay đổi, vui lòng liên hệ với chúng tôi sớm nhất có thể.</p>
            <p>Chúng tôi rất mong được phục vụ bạn và {petName}!</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetServicePaymentConfirmationTemplate(ServiceBooking booking)
    {
        var customerName = booking.Customer?.Profile?.FullName ?? booking.Customer?.UserName ?? "Quý khách";
        var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
        var paymentDate = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        var totalPrice = booking.TotalPrice.ToString("N0");
        
        var servicesList = "";
        if (booking.BookingItems != null && booking.BookingItems.Any())
        {
            var groupedServices = booking.BookingItems
                .GroupBy(item => item.Service?.Name ?? "Dịch vụ")
                .ToList();
            
            foreach (var group in groupedServices)
            {
                servicesList += $"<li><strong>{group.Key}</strong><ul>";
                foreach (var item in group)
                {
                    servicesList += $"<li>{item.ServicePackage?.Name ?? "Gói cơ bản"} - {item.PriceAtBooking:N0}₫</li>";
                }
                servicesList += "</ul></li>";
            }
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #10b981; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Thanh toán dịch vụ thành công!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ tại <strong>Petivo</strong>!</p>
            
            <div class=""info-box"">
                <h3>Thông tin thanh toán:</h3>
                <p><strong>Mã lịch hẹn:</strong> {bookingCode}</p>
                <p><strong>Ngày thanh toán:</strong> {paymentDate}</p>
                <p><strong>Dịch vụ đã sử dụng:</strong></p>
                <ul>{servicesList}</ul>
                <p><strong>Tổng tiền:</strong> {totalPrice}₫</p>
                <p><strong>Trạng thái:</strong> Đã thanh toán</p>
            </div>
            
            <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của Petivo!</p>
            <p>Hẹn gặp lại bạn lần sau!</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    public string GetBookingRejectionTemplate(ServiceBooking booking, string reason)
    {
        var customerName = booking.Customer?.Profile?.FullName ?? booking.Customer?.UserName ?? "Quý khách";
        var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
        var startTime = booking.StartTime.ToString("dd/MM/yyyy HH:mm");
        var petName = booking.PetName ?? "thú cưng của bạn";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ef4444; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Lịch hẹn bị từ chối</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Rất tiếc, lịch hẹn của bạn tại <strong>Petivo</strong> đã bị từ chối.</p>
            
            <div class=""info-box"">
                <h3>Thông tin lịch hẹn:</h3>
                <p><strong>Mã đặt lịch:</strong> {bookingCode}</p>
                <p><strong>Thời gian:</strong> {startTime}</p>
                <p><strong>Thú cưng:</strong> {petName}</p>
                <p><strong>Lý do từ chối:</strong> {reason}</p>
            </div>
            
            <p>Nếu bạn có thắc mắc hoặc muốn đặt lịch mới, vui lòng liên hệ với chúng tôi.</p>
            <p>Chúng tôi rất mong được phục vụ bạn trong tương lai!</p>
        </div>
        <div class=""footer"">
            <p>Trân trọng,<br>Đội ngũ Petivo</p>
        </div>
    </div>
</body>
</html>";
    }

    private string GetPaymentMethodText(string paymentMethod)
    {
        return paymentMethod switch
        {
            "COD" => "Thanh toán khi nhận hàng",
            "VNPay" => "VNPay",
            "MoMo" => "MoMo",
            "CREDIT_CARD" => "Thẻ tín dụng",
            "DEBIT_CARD" => "Thẻ ghi nợ",
            "BANK_TRANSFER" => "Chuyển khoản ngân hàng",
            "CASH" => "Tiền mặt",
            "QR" => "QR Code",
            _ => paymentMethod
        };
    }

    private string GetOrderStatusText(string status)
    {
        return status switch
        {
            "Pending" => "Chờ xử lý",
            "Processing" => "Đang xử lý",
            "Completed" => "Hoàn thành",
            "Cancelled" => "Đã hủy",
            "Delivered" => "Đã giao",
            _ => status
        };
    }
}

