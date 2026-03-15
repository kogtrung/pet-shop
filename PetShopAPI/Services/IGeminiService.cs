using PetShopAPI.Models;
using PetShopAPI.Dtos;
using System.Text.Json;

namespace PetShopAPI.Services;

public interface IGeminiService
{
    Task<string> GenerateTextAsync(string prompt, string? modelName = null);
    Task<GeminiResponseDto> GenerateTextFromHistoryAsync(string newPrompt, IEnumerable<ChatMessage> history, string? modelName = null);
}