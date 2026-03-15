using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PetShopAPI.Models;
using PetShopAPI.Dtos;

namespace PetShopAPI.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;
    private readonly string _apiKey;
    private readonly string _defaultModel = "models/gemini-2.0-flash";

    public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _apiKey = _configuration["ApiKeys:Gemini"] ?? string.Empty;
    }

    // Implement hàm GenerateTextAsync (dùng cho prompt đơn giản)
    public async Task<string> GenerateTextAsync(string prompt, string? modelName = null)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var model = modelName ?? _defaultModel;
        var url = $"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={_apiKey}";

        var request = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 1024
            }
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(url, content);

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();

            // Parse the response
            using var jsonDoc = JsonDocument.Parse(responseContent);
            var root = jsonDoc.RootElement;

            if (root.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                if (firstCandidate.TryGetProperty("content", out var contentElement) &&
                    contentElement.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0)
                {
                    var firstPart = parts[0];
                    if (firstPart.TryGetProperty("text", out var textElement))
                    {
                        return textElement.GetString() ?? "No response content.";
                    }
                }
            }

            return "No valid response from AI.";
        }
        else
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            // --- BẮT ĐẦU THÊM LOG CHI TIẾT ---
            _logger.LogError("Gemini API request failed. Status Code: {StatusCode}, URL: {Url}, Error Content: {ErrorContent}", 
                             response.StatusCode, url, errorContent);
            // --- KẾT THÚC THÊM LOG CHI TIẾT ---
            throw new HttpRequestException($"Gemini API error: {response.StatusCode} - {errorContent}");
        }
    }

    // Implement hàm GenerateTextFromHistoryAsync (dùng cho chatbot với function calling)
    public async Task<GeminiResponseDto> GenerateTextFromHistoryAsync(string newPrompt, IEnumerable<ChatMessage> history, string? modelName = null)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("Gemini API key is not configured.");
            }

            var model = modelName ?? _defaultModel;
            var url = $"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={_apiKey}";

            // Build conversation history context
            var historyContents = new List<object>();
            
            foreach (var message in history)
            {
                historyContents.Add(new
                {
                    role = message.Role,
                    parts = new[] { new { text = message.Content } }
                });
            }

            // Add the new user message
            historyContents.Add(new
            {
                role = "user",
                parts = new[] { new { text = newPrompt } }
            });

            // Get tool definitions from the centralized location
            var toolsJson = GeminiToolDefinitions.GetToolDefinitions();
            var tools = JsonSerializer.Deserialize<object>(toolsJson);

            var request = new
            {
                contents = historyContents,
                tools = tools,
                generationConfig = new
                {
                    temperature = 0.7,
                    maxOutputTokens = 1024
                }
            };

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();

                // Parse the response
                using var jsonDoc = JsonDocument.Parse(responseContent);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];
                    if (firstCandidate.TryGetProperty("content", out var contentElement) &&
                        contentElement.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0)
                    {
                        var firstPart = parts[0];
                        
                        // Check if it's a function call
                        if (firstPart.TryGetProperty("functionCall", out var functionCallElement))
                        {
                            return new GeminiResponseDto
                            {
                                FunctionCall = functionCallElement
                            };
                        }
                        // Check if it's text
                        else if (firstPart.TryGetProperty("text", out var textElement))
                        {
                            return new GeminiResponseDto
                            {
                                Text = textElement.GetString() ?? "No response content."
                            };
                        }
                    }
                }

                return new GeminiResponseDto
                {
                    Text = "No valid response from AI."
                };
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                // --- BẮT ĐẦU THÊM LOG CHI TIẾT ---
                _logger.LogError("Gemini API request failed. Status Code: {StatusCode}, URL: {Url}, Error Content: {ErrorContent}", 
                                 response.StatusCode, url, errorContent);
                // --- KẾT THÚC THÊM LOG CHI TIẾT ---
                throw new HttpRequestException($"Gemini API error: {response.StatusCode} - {errorContent}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in GeminiService.GenerateTextFromHistoryAsync. Model: {Model}", modelName ?? _defaultModel);
            throw; // Ném lại lỗi
        }
    }
}