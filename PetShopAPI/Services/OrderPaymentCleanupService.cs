using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PetShopAPI.Data;

namespace PetShopAPI.Services;

/// <summary>
/// Background service tự động hủy các đơn hàng online thanh toán treo (AwaitingPayment)
/// sau 15 phút không nhận được callback thanh toán thành công.
/// Khi hủy sẽ hoàn lại tồn kho cho các sản phẩm trong đơn.
/// </summary>
public class OrderPaymentCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderPaymentCleanupService> _logger;
    private static readonly TimeSpan PaymentTimeout = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);

    public OrderPaymentCleanupService(
        IServiceProvider serviceProvider,
        ILogger<OrderPaymentCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Đợi 1 phút sau khi khởi động để tránh xung đột DB
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CancelExpiredOrdersAsync();
                await Task.Delay(CheckInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OrderPaymentCleanupService");
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            }
        }
    }

    private async Task CancelExpiredOrdersAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoffTime = DateTime.Now.AddMinutes(-PaymentTimeout.TotalMinutes);

        // Tìm các đơn hàng AwaitingPayment tạo trước thời điểm cutoff
        var expiredOrders = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p!.Inventory)
            .Where(o => o.Status == "AwaitingPayment" && o.CreatedAt <= cutoffTime)
            .ToListAsync();

        if (!expiredOrders.Any()) return;

        foreach (var order in expiredOrders)
        {
            // Hoàn lại tồn kho
            foreach (var item in order.Items)
            {
                if (item.Product?.Inventory != null)
                {
                    item.Product.Inventory.Quantity += item.Quantity;
                    item.Product.SoldCount = Math.Max(0, item.Product.SoldCount - item.Quantity);
                }
            }

            order.Status = "Cancelled";
            order.PaymentStatus = "Expired";

            _logger.LogInformation(
                "Auto-cancelled expired order {OrderId} (OrderCode: {OrderCode}). " +
                "Created at {CreatedAt}, exceeded {Timeout} minutes.",
                order.Id, order.OrderCode, order.CreatedAt, PaymentTimeout.TotalMinutes);
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("Auto-cancelled {Count} expired AwaitingPayment orders", expiredOrders.Count);
    }
}
