using System.Text.Json;
using System.Threading.Tasks;

namespace PetShopAPI.Services;

/// <summary>
/// Interface for the service that executes tool calls from the AI model.
/// </summary>
public interface IChatToolService
{
    /// <summary>
    /// Executes a tool call requested by the AI model.
    /// </summary>
    /// <param name="functionCall">The function call object from the AI model</param>
    /// <param name="clientBaseUrl">The client base URL for link generation</param>
    /// <returns>The result of the tool execution as a string</returns>
    Task<string> ExecuteToolCallAsync(JsonElement functionCall, string? clientBaseUrl);
}