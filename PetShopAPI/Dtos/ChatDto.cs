using System.ComponentModel.DataAnnotations;

namespace PetShopAPI.Dtos;

public class ChatQueryDto
{
    [Required]
    public string Query { get; set; } = string.Empty;
    
    public Guid? SessionId { get; set; }
    public string? ClientBaseUrl { get; set; } // <-- THÊM DÒNG NÀY
}

public class ChatResponseDto
{
    public string Response { get; set; } = string.Empty;
    public Guid SessionId { get; set; }
    public int MessageId { get; set; } // Add this property
}