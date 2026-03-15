namespace PetShopAPI.Dtos;

public class FeedbackReportDto
{
    public int FeedbackId { get; set; }
    public bool IsHelpful { get; set; }
    public DateTime FeedbackCreatedAt { get; set; }
    public int ChatMessageId { get; set; }
    public string AiResponse { get; set; } = string.Empty;
    public string UserQuery { get; set; } = string.Empty; // Câu hỏi của người dùng
    public DateTime MessageTimestamp { get; set; }
}