using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using PetShopAPI.Data;
using PetShopAPI.Models;
using PetShopAPI.Dtos;
using PetShopAPI.Services; // Added import for IGeminiService
using PetShopAPI.Helpers;
using System.Text.Json;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.ApiExplorer;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatController> _logger;
    private readonly IMemoryCache _cache;
    private readonly IGeminiService _geminiService; // Added GeminiService
    private readonly ChatContextService _chatContextService; // Added ChatContextService
    private readonly IApiDescriptionGroupCollectionProvider _apiExplorer; // Added API Explorer

    public ChatController(AppDbContext context, IConfiguration configuration, HttpClient httpClient, ILogger<ChatController> logger, IMemoryCache cache, IGeminiService geminiService, ChatContextService chatContextService, IApiDescriptionGroupCollectionProvider apiExplorer) // Updated constructor
    {
        _context = context;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
        _cache = cache;
        _geminiService = geminiService; // Initialize GeminiService
        _chatContextService = chatContextService; // Initialize ChatContextService
        _apiExplorer = apiExplorer; // Initialize API Explorer
    }

    // Test endpoint to verify API key
    [HttpGet("test")]
    public IActionResult TestApiKey()
    {
        var apiKey = _configuration["ApiKeys:Gemini"];
        return Ok(new { 
            HasApiKey = !string.IsNullOrEmpty(apiKey),
            ApiKeyLength = apiKey?.Length,
            ApiKeyPreview = apiKey != null && apiKey.Length > 10 ? apiKey.Substring(0, 10) + "..." : apiKey
        });
    }

    [HttpPost("chat")]
    public async Task<ActionResult<ChatResponseDto>> Chat([FromBody] ChatQueryDto queryDto)
    {
        try
        {
            _logger.LogInformation("Chat endpoint called with query: {Query}", queryDto.Query);

            // Determine the current session ID
            Guid currentSessionId;
            if (queryDto.SessionId.HasValue)
            {
                currentSessionId = queryDto.SessionId.Value;
            }
            else
            {
                // Create a new conversation session
                var newSession = new ConversationSession
                {
                    UserId = null, // We can set this when user is authenticated
                    CreatedAt = DateTimeHelper.GetVietnamTime()
                };
                
                _context.ConversationSessions.Add(newSession);
                await _context.SaveChangesAsync();
                currentSessionId = newSession.Id;
            }

            var prompt = queryDto.Query;
            // Lấy Client URL (phải đảm bảo nó không null)
            string clientUrl = queryDto.ClientBaseUrl ?? "http://localhost:5173"; // Lấy từ config nếu cần

            // Get all messages in this conversation session
            var conversationMessages = await _context.ChatMessages
                .Where(m => m.ConversationSessionId == currentSessionId)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            // --- BẮT ĐẦU LẤY DANH SÁCH API GET (TRỪ AUTH) ---
            var availableGetEndpoints = new List<string>();

            foreach (var group in _apiExplorer.ApiDescriptionGroups.Items)
            {
                foreach (var apiDesc in group.Items)
                {
                    // Chỉ lấy GET và loại trừ nếu đường dẫn chứa "Auth" (không phân biệt hoa thường)
                    if (apiDesc.HttpMethod?.Equals("GET", StringComparison.OrdinalIgnoreCase) == true &&
                        apiDesc.RelativePath != null &&
                        !apiDesc.RelativePath.Contains("Auth", StringComparison.OrdinalIgnoreCase)) 
                    {
                        // Lấy đường dẫn tương đối sau "api/"
                        string relativePath = apiDesc.RelativePath;
                        if (relativePath.StartsWith("api/", StringComparison.OrdinalIgnoreCase))
                        {
                             relativePath = relativePath.Substring(4);
                        }
                         // Bỏ tham số query string nếu có
                         int queryIndex = relativePath.IndexOf('?');
                         if (queryIndex > 0) {
                             relativePath = relativePath.Substring(0, queryIndex);
                         }

                        // Thêm vào danh sách (chỉ thêm nếu chưa có)
                        if (!availableGetEndpoints.Contains(relativePath)) 
                        {
                             availableGetEndpoints.Add(relativePath);
                        }
                    }
                }
            }
            // Format danh sách thành chuỗi
            string apiListString = availableGetEndpoints.Any() 
                ? "- " + string.Join("\n- ", availableGetEndpoints.OrderBy(p => p))
                : "Không có API GET công khai nào.";
            // --- KẾT THÚC LẤY DANH SÁCH API GET ---

            // Tạo PROMPT HỆ THỐNG MỚI (bao gồm danh sách API)
            var systemContextMessage = new ChatMessage
            {
                Role = "user", 
                Content = $@"
---HƯỚNG DẪN HỆ THỐNG--- Bạn là trợ lý AI hữu ích của PetShop. URL gốc của trang web là: {clientUrl}. Luôn dùng URL này để tạo link đầy đủ (ví dụ: /bai-viet/slug -> {clientUrl}/page/slug).

BẠN CÓ THỂ GỌI CÁC API GET SAU ĐÂY BẰNG TOOL call_get_api (chỉ cần cung cấp đường dẫn sau 'api/'): {apiListString}

HÃY SỬ DỤNG TOOL call_get_api VỚI CÁC ĐƯỜNG DẪN TRÊN khi cần lấy danh sách hoặc tìm kiếm. Để lấy chi tiết 1 sản phẩm đã biết ID, hãy dùng tool get_product_context. Để tóm tắt bài viết đã biết slug, hãy dùng tool get_article_content_by_slug. Đừng trả lời 'tôi không biết' nếu bạn có thể dùng tool để lấy thông tin. ---KẾT THÚC HƯỚNG DẪN--- " };

                // Chèn vào đầu history (như cũ)
                conversationMessages.Insert(0, systemContextMessage); 
            
            // Save the user's message
            var userMessage = new ChatMessage
            {
                ConversationSessionId = currentSessionId,
                Role = "user",
                Content = queryDto.Query,
                Timestamp = DateTimeHelper.GetVietnamTime()
            };
            
            _context.ChatMessages.Add(userMessage);
            await _context.SaveChangesAsync();
            conversationMessages.Add(userMessage); // Thêm vào lịch sử để gửi đi

            // Process the query with Google Gemini AI using conversation history and function calling
            var finalResponse = await ProcessQueryWithGeminiAndTools(prompt, conversationMessages, queryDto.ClientBaseUrl);
            
            string finalText = finalResponse ?? "Xin lỗi, đã có lỗi xảy ra.";

            // --- BẮT ĐẦU SỬA LỖI LINK HỎNG ---
            finalText = PrependClientBaseUrl(finalText, clientUrl); // Áp dụng cho KẾT QUẢ CUỐI CÙNG
            // --- KẾT THÚC SỬA LỖI ---

            // Lưu tin nhắn cuối cùng của AI vào DB (dùng finalText đã xử lý)
            var assistantMessage = new ChatMessage
            {
                ConversationSessionId = currentSessionId,
                Role = "assistant", // Hoặc "model" tùy bạn định nghĩa
                Content = finalText, // Dùng nội dung đã xử lý link
                Timestamp = DateTimeHelper.GetVietnamTime()
            };
            _context.ChatMessages.Add(assistantMessage);
            await _context.SaveChangesAsync();

            var responseDto = new ChatResponseDto
            {
                Response = finalText, // Trả về nội dung đã xử lý link
                SessionId = currentSessionId,
                MessageId = assistantMessage.Id
            };

            return Ok(responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            return StatusCode(500, new ChatResponseDto { Response = "Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn." });
        }
    }

    // Helper method to prepend client base URL to relative links
    private string PrependClientBaseUrl(string content, string clientBaseUrl)
    {
        if (string.IsNullOrEmpty(clientBaseUrl) || string.IsNullOrEmpty(content))
            return content;

        // Định nghĩa các quy tắc thay thế
        // Ví dụ: "/bai-viet/slug-abc" -> "http://localhost:5173/page/slug-abc"
        // Ví dụ: "/san-pham/slug-xyz" -> "http://localhost:5173/product/slug-xyz"
        // Ví dụ: "/images/hinh-anh.jpg" -> "http://localhost:5173/images/hinh-anh.jpg"

        // Sử dụng Replace cho các chuỗi JSON. Dùng \" để đảm bảo chỉ thay thế giá trị trong chuỗi.
        string result = content.Replace("\"/bai-viet/", $"\"{clientBaseUrl}/page/");
        result = result.Replace("\"/san-pham/", $"\"{clientBaseUrl}/product/");
        result = result.Replace("\"/images/", $"\"{clientBaseUrl}/images/");

        return result;
    }

    // Updated method to handle function calling loop with client base URL
    private async Task<string> ProcessQueryWithGeminiAndTools(string prompt, List<ChatMessage> conversationMessages, string? clientBaseUrl)
    {
        try
        {
            // Maximum number of function calling iterations to prevent infinite loops
            const int maxIterations = 5;
            var iterations = 0;
            
            // Work with a copy of the conversation messages
            var messages = new List<ChatMessage>(conversationMessages);

            while (iterations < maxIterations)
            {
                iterations++;
                
                // Call Gemini with the current conversation history
                var geminiResponse = await _geminiService.GenerateTextFromHistoryAsync(
                    prompt, 
                    messages
                );

                // If we got text back, that's our final response
                if (!string.IsNullOrEmpty(geminiResponse.Text))
                {
                    return geminiResponse.Text;
                }

                // If we got a function call, execute it
                if (geminiResponse.FunctionCall.HasValue)
                {
                    var functionCall = geminiResponse.FunctionCall.Value;
                    
                    // Add the function call to the conversation history
                    messages.Add(new ChatMessage
                    {
                        Role = "model",
                        Content = functionCall.GetRawText(),
                        Timestamp = DateTimeHelper.GetVietnamTime()
                    });

                    // Execute the function call
                    var functionResult = await ExecuteToolCallAsync(functionCall, clientBaseUrl);
                    
                    // Add the function result to the conversation history
                    messages.Add(new ChatMessage
                    {
                        Role = "function",
                        Content = functionResult,
                        Timestamp = DateTimeHelper.GetVietnamTime()
                    });

                    // Continue the loop to send the function result back to Gemini
                    prompt = "Here is the result of the function call: " + functionResult;
                }
                else
                {
                    // If we get here, something unexpected happened
                    return "Xin lỗi, hệ thống AI của tôi đang gặp trục trặc kỹ thuật. Vui lòng thử lại sau.";
                }
            }

            // If we've exceeded the maximum iterations, return an error
            return "Xin lỗi, hệ thống AI của tôi đang gặp trục trặc kỹ thuật. Vui lòng thử lại sau.";
        }
        catch (Exception ex)
        {
            // --- BẮT ĐẦU THÊM LOG CHI TIẾT ---
            _logger.LogError(ex, "Error occurred during ProcessQueryWithGeminiAndTools. Prompt: {Prompt}, History Count: {HistoryCount}", prompt, conversationMessages.Count);
            // --- KẾT THÚC THÊM LOG CHI TIẾT ---
            // Vẫn trả về thông báo lỗi chung cho người dùng cuối
            return "Xin lỗi, hệ thống AI của tôi đang gặp trục trặc kỹ thuật. Vui lòng thử lại sau.";
        }
    }

    // Execute a tool call with client base URL
    private async Task<string> ExecuteToolCallAsync(JsonElement functionCall, string? clientBaseUrl)
    {
        try
        {
            if (!functionCall.TryGetProperty("name", out var nameElement))
            {
                return "Error: Function call missing name property";
            }

            var functionName = nameElement.GetString();
            _logger.LogInformation("Executing tool call: {FunctionName}", functionName);

            // Create a ChatToolService instance
            var chatToolService = new ChatToolService(_chatContextService);
            
            // Execute the tool call with client base URL
            var result = await chatToolService.ExecuteToolCallAsync(functionCall, clientBaseUrl);
            _logger.LogInformation("Tool call result: {Result}", result);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing tool call");
            return $"Error executing tool call: {ex.Message}";
        }
    }

    [HttpGet("feedback")]
    public async Task<ActionResult<IEnumerable<FeedbackReportDto>>> GetFeedbackReport()
    {
        var feedbacks = await _context.ChatFeedbacks
            .Include(f => f.ChatMessage) // Lấy thông tin tin nhắn AI
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        var report = new List<FeedbackReportDto>();

        foreach (var f in feedbacks)
        {
            // Tìm câu hỏi của người dùng (tin nhắn ngay trước tin nhắn của AI trong cùng 1 session)
            var userQuery = await _context.ChatMessages
                .Where(m => m.ConversationSessionId == f.ChatMessage.ConversationSessionId && m.Timestamp < f.ChatMessage.Timestamp && m.Role == "user")
                .OrderByDescending(m => m.Timestamp)
                .FirstOrDefaultAsync();

            report.Add(new FeedbackReportDto
            {
                FeedbackId = f.Id,
                IsHelpful = f.IsHelpful,
                FeedbackCreatedAt = f.CreatedAt,
                ChatMessageId = f.ChatMessageId,
                AiResponse = f.ChatMessage.Content,
                MessageTimestamp = f.ChatMessage.Timestamp,
                UserQuery = userQuery?.Content ?? "[Không tìm thấy câu hỏi gốc]"
            });
        }

        // Bạn có thể lọc chỉ lấy các feedback tiêu cực nếu muốn
        // var negativeFeedback = report.Where(r => !r.IsHelpful).ToList();

        return Ok(report);
    }

    [HttpPost("feedback")]
    public async Task<IActionResult> SubmitFeedback([FromBody] ChatFeedbackDto feedbackDto)
    {
        // Kiểm tra xem tin nhắn có tồn tại không (tùy chọn nhưng nên có)
        var messageExists = await _context.ChatMessages.AnyAsync(m => m.Id == feedbackDto.ChatMessageId);
        if (!messageExists)
        {
            return NotFound("Message not found.");
        }

        var feedback = new ChatFeedback
        {
            ChatMessageId = feedbackDto.ChatMessageId,
            IsHelpful = feedbackDto.IsHelpful,
            CreatedAt = DateTimeHelper.GetVietnamTime()
        };

        // Kiểm tra trùng lặp (tùy chọn: 1 người chỉ feedback 1 lần)
        var existingFeedback = await _context.ChatFeedbacks
            .FirstOrDefaultAsync(f => f.ChatMessageId == feedbackDto.ChatMessageId);

        if (existingFeedback != null)
        {
            existingFeedback.IsHelpful = feedbackDto.IsHelpful; // Cập nhật
            _context.ChatFeedbacks.Update(existingFeedback);
        }
        else
        {
            _context.ChatFeedbacks.Add(feedback); // Tạo mới
        }

        await _context.SaveChangesAsync();
        return Ok();
    }
}