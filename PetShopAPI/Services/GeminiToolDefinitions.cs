using System.Text.Json;

namespace PetShopAPI.Services;

/// <summary>
/// Defines the tools that can be called by the Gemini AI model.
/// </summary>
public static class GeminiToolDefinitions
{
    /// <summary>
    /// Gets the tool definitions for the Gemini AI model.
    /// </summary>
    /// <returns>JSON representation of the tool definitions</returns>
    public static string GetToolDefinitions()
    {
        var tools = new
        {
            function_declarations = new object[]
            {
                new
                {
                    name = "get_general_context",
                    description = "Lấy thông tin chung về cửa hàng, bao gồm danh sách danh mục sản phẩm và các dịch vụ đang cung cấp (như spa, grooming, khách sạn thú cưng).",
                    parameters = new
                    {
                        type = "object",
                        properties = new { },
                        required = new string[] { }
                    }
                },
                new
                {
                    name = "get_product_context",
                    description = "Lấy thông tin chi tiết của một sản phẩm cụ thể (như giá, tồn kho, đánh giá) bằng ID sản phẩm.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            productId = new
                            {
                                type = "integer",
                                description = "ID của sản phẩm cần xem"
                            }
                        },
                        required = new[] { "productId" }
                    }
                },
                new
                {
                    name = "get_article_content_by_slug",
                    // SỬA LẠI MÔ TẢ NÀY:
                    description = "BẮT BUỘC DÙNG tool này khi người dùng yêu cầu 'tóm tắt' hoặc 'cho biết nội dung' của một bài viết cụ thể. Tool này sẽ trả về TOÀN BỘ NỘI DUNG VĂN BẢN của bài viết.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            slug = new 
                            { 
                                type = "string", 
                                description = "Slug của bài viết (ví dụ: 'cach-tam-cho-meo')" 
                            }
                        },
                        required = new[] { "slug" }
                    }
                },
                new
                {
                    name = "call_get_api",
                    // SỬA LẠI MÔ TẢ NÀY:
                    description = "Công cụ chung để GỌI API GET. Dùng để TÌM KIẾM (ví dụ: 'page?search=meo') hoặc LẤY DANH SÁCH (ví dụ: 'brand', 'product'). Tool này chỉ trả về danh sách tóm tắt (JSON). KHÔNG DÙNG tool này để tóm tắt bài viết. Để tóm tắt, hãy dùng 'get_article_content_by_slug'.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            endpointPath = new
                            {
                                type = "string",
                                description = "Đường dẫn API để gọi, nằm sau '/api/'. Ví dụ: 'product', 'product/category/5', 'brand', 'page', 'product?search=pate'"
                            }
                        },
                        required = new[] { "endpointPath" }
                    }
                }
            }
        };

        return JsonSerializer.Serialize(tools, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }
}