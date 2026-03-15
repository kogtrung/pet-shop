namespace PetShopAPI.Helpers;

public static class DateTimeHelper
{
    /// <summary>
    /// Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
    /// </summary>
    public static DateTime GetVietnamTime()
    {
        // Vietnam timezone is UTC+7
        // Try different timezone IDs for cross-platform compatibility
        TimeZoneInfo? vietnamTimeZone = null;
        
        // Windows timezone ID
        try
        {
            vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch
        {
            // Linux/Mac timezone ID
            try
            {
                vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
            }
            catch
            {
                // Fallback: manually add 7 hours to UTC
                return DateTime.UtcNow.AddHours(7);
            }
        }
        
        var utcNow = DateTime.UtcNow;
        return TimeZoneInfo.ConvertTimeFromUtc(utcNow, vietnamTimeZone);
    }

    /// <summary>
    /// Convert UTC time to Vietnam time (UTC+7)
    /// </summary>
    public static DateTime ToVietnamTime(DateTime utcTime)
    {
        TimeZoneInfo? vietnamTimeZone = null;
        
        try
        {
            vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch
        {
            try
            {
                vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
            }
            catch
            {
                // Fallback: manually add 7 hours
                return utcTime.AddHours(7);
            }
        }
        
        return TimeZoneInfo.ConvertTimeFromUtc(utcTime, vietnamTimeZone);
    }
}

