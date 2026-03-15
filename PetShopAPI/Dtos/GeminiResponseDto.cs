using System.Text.Json;

namespace PetShopAPI.Dtos;

public class GeminiResponseDto
{
    public string? Text { get; set; }
    public JsonElement? FunctionCall { get; set; }
}