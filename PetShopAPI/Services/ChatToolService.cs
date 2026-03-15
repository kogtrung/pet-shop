using System.Text.Json;
using System.Threading.Tasks;

namespace PetShopAPI.Services;

/// <summary>
/// Service that executes tool calls requested by the AI model.
/// </summary>
public class ChatToolService : IChatToolService
{
    private readonly ChatContextService _chatContextService;

    public ChatToolService(ChatContextService chatContextService)
    {
        _chatContextService = chatContextService;
    }

    /// <summary>
    /// Executes a tool call requested by the AI model.
    /// </summary>
    /// <param name="functionCall">The function call object from the AI model</param>
    /// <param name="clientBaseUrl">The client base URL for link generation</param>
    /// <returns>The result of the tool execution as a string</returns>
    public async Task<string> ExecuteToolCallAsync(JsonElement functionCall, string? clientBaseUrl)
    {
        if (!functionCall.TryGetProperty("name", out var nameElement))
        {
            return "Error: Function call missing name property";
        }

        var functionName = nameElement.GetString();

        switch (functionName)
        {
            case "get_general_context":
                return await ExecuteGetGeneralContextAsync(clientBaseUrl);

            case "get_product_context":
                return await ExecuteGetProductContextAsync(functionCall, clientBaseUrl);

            case "get_article_content_by_slug":
                return await ExecuteGetArticleContentBySlugAsync(functionCall, clientBaseUrl);

            case "call_get_api":
                return await ExecuteCallGetApiAsync(functionCall, clientBaseUrl);

            default:
                return $"Error: Unknown function '{functionName}'";
        }
    }

    private async Task<string> ExecuteGetGeneralContextAsync(string? clientBaseUrl)
    {
        try
        {
            var context = await _chatContextService.GetGeneralContextAsync(clientBaseUrl);
            return string.IsNullOrEmpty(context) ? "No general context available" : context;
        }
        catch (Exception ex)
        {
            return $"Error getting general context: {ex.Message}";
        }
    }

    private async Task<string> ExecuteGetProductContextAsync(JsonElement functionCall, string? clientBaseUrl)
    {
        try
        {
            if (!functionCall.TryGetProperty("args", out var argsElement) ||
                !argsElement.TryGetProperty("productId", out var productIdElement))
            {
                return "Error: Missing productId argument";
            }

            if (!int.TryParse(productIdElement.ToString(), out var productId))
            {
                return "Error: Invalid productId argument";
            }

            var context = await _chatContextService.GetProductContextAsync(productId, clientBaseUrl);
            return string.IsNullOrEmpty(context) ? $"No product context found for product ID {productId}" : context;
        }
        catch (Exception ex)
        {
            return $"Error getting product context: {ex.Message}";
        }
    }

    private async Task<string> ExecuteGetArticleContentBySlugAsync(JsonElement functionCall, string? clientBaseUrl)
    {
        try
        {
            if (!functionCall.TryGetProperty("args", out var argsElement) ||
                !argsElement.TryGetProperty("slug", out var slugElement))
            {
                return "Error: Missing slug argument";
            }

            var slug = slugElement.GetString();
            if (string.IsNullOrEmpty(slug))
            {
                return "Error: Empty slug argument";
            }

            var result = await _chatContextService.GetArticleContentBySlugAsync(slug, clientBaseUrl);
            return result;
        }
        catch (Exception ex)
        {
            return $"Error getting article content: {ex.Message}";
        }
    }

    private async Task<string> ExecuteCallGetApiAsync(JsonElement functionCall, string? clientBaseUrl)
    {
        try
        {
            if (!functionCall.TryGetProperty("args", out var argsElement) ||
                !argsElement.TryGetProperty("endpointPath", out var endpointPathElement))
            {
                return "Error: Missing endpointPath argument";
            }

            var endpointPath = endpointPathElement.GetString();
            if (string.IsNullOrEmpty(endpointPath))
            {
                return "Error: Empty endpointPath argument";
            }

            // Security check: Prevent access to sensitive endpoints
            var lowerEndpoint = endpointPath.ToLower();
            if (lowerEndpoint.Contains("profile") || 
                lowerEndpoint.Contains("user") || 
                lowerEndpoint.Contains("account") || 
                lowerEndpoint.Contains("cart") ||
                lowerEndpoint.Contains("wishlist") ||
                lowerEndpoint.Contains("order"))
            {
                return "Lỗi: Không được phép gọi endpoint này hoặc đường dẫn chứa thông tin cá nhân.";
            }

            var result = await _chatContextService.GetFromApiAsync(endpointPath, clientBaseUrl);
            return result;
        }
        catch (Exception ex)
        {
            return $"Error calling API: {ex.Message}";
        }
    }
}