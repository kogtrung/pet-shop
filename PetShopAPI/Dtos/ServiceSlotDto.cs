namespace PetShopAPI.Dtos;

public class ServiceSlotDto
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsAvailable { get; set; }
    public int Capacity { get; set; }
    public int AvailableCount { get; set; }
    public int BookedCount { get; set; }
}


