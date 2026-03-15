using Microsoft.EntityFrameworkCore;
using PetShopAPI.Data;
using PetShopAPI.Helpers;

namespace PetShopAPI.Services;

public class OrderCodeGenerator
{
    private readonly AppDbContext _db;

    public OrderCodeGenerator(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Generate order code with format: ORD-YYYYMMDD-XXXX
    /// </summary>
    public async Task<string> GenerateOrderCodeAsync()
    {
        return await GenerateCodeAsync("ORD");
    }

    /// <summary>
    /// Generate POS order code with format: POS-YYYYMMDD-XXXX
    /// </summary>
    public async Task<string> GeneratePOSCodeAsync()
    {
        return await GenerateCodeAsync("POS");
    }

    /// <summary>
    /// Generate service booking code with format: SVC-YYYYMMDD-XXXX
    /// </summary>
    public async Task<string> GenerateServiceBookingCodeAsync()
    {
        return await GenerateCodeAsync("SVC");
    }

    private async Task<string> GenerateCodeAsync(string prefix)
    {
        // Use Vietnam time instead of UTC to ensure correct date in order code
        var today = DateTimeHelper.GetVietnamTime().Date;
        var dateStr = today.ToString("yyyyMMdd");
        
        // Get the last order/booking code for today with this specific prefix
        string? lastCode = null;
        
        if (prefix == "ORD" || prefix == "POS")
        {
            // For orders, check only the specific prefix (ORD or POS)
            lastCode = await _db.Orders
                .Where(o => o.OrderCode != null && 
                           o.OrderCode.StartsWith($"{prefix}-") &&
                           o.OrderCode.Contains($"-{dateStr}-"))
                .OrderByDescending(o => o.OrderCode)
                .Select(o => o.OrderCode)
                .FirstOrDefaultAsync();
        }
        else if (prefix == "SVC")
        {
            lastCode = await _db.ServiceBookings
                .Where(sb => sb.BookingCode != null && 
                            sb.BookingCode.StartsWith("SVC-") &&
                            sb.BookingCode.Contains($"-{dateStr}-"))
                .OrderByDescending(sb => sb.BookingCode)
                .Select(sb => sb.BookingCode)
                .FirstOrDefaultAsync();
        }

        int sequenceNumber = 1;
        
        if (!string.IsNullOrEmpty(lastCode))
        {
            // Extract sequence number from last code
            // Format: PREFIX-YYYYMMDD-XXXX
            var parts = lastCode.Split('-');
            if (parts.Length == 3 && parts[2].Length == 4)
            {
                if (int.TryParse(parts[2], out int lastSequence))
                {
                    sequenceNumber = lastSequence + 1;
                }
            }
        }

        // Format sequence number as 4-digit string (0001, 0002, etc.)
        var sequenceStr = sequenceNumber.ToString("D4");
        
        return $"{prefix}-{dateStr}-{sequenceStr}";
    }
}

