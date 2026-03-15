using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using PetShopAPI.Dtos;

namespace PetShopAPI.Services;

public class ChatContextService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ChatContextService> _logger;
    private readonly string _apiBaseUrl;

    public ChatContextService(HttpClient httpClient, IMemoryCache cache, ILogger<ChatContextService> logger, IConfiguration configuration)
{
    _httpClient = httpClient;
    _cache = cache;
    _logger = logger;
    // Lấy URL từ file appsettings.json
    _apiBaseUrl = configuration["ApiBaseUrl"] ?? throw new InvalidOperationException("ApiBaseUrl is not configured.");
}

    public string GetApiBaseUrl()
    {
        return _apiBaseUrl;
    }

    // Helper method to prepend client base URL to relative links
    private string PrependClientBaseUrl(string content, string? clientBaseUrl)
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

    // Updated method: Get general context with client base URL
    public async Task<string> GetGeneralContextAsync(string? clientBaseUrl)
    {
        try
        {
            // Get category tree (cached for 30 minutes)
            var categoryTreeTask = _cache.GetOrCreateAsync("category_tree", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                // Dùng hàm GetFromApiAsync đã có và truyền clientBaseUrl
                return await GetFromApiAsync("category/tree?includeInactive=false", clientBaseUrl);
            });

            // Get services (cached for 30 minutes)
            var servicesTask = _cache.GetOrCreateAsync("services", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                return await GetFromApiAsync("service", clientBaseUrl);
            });

            // THÊM MỚI: Lấy Brands
            var brandsTask = _cache.GetOrCreateAsync("brands", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                return await GetFromApiAsync("brand", clientBaseUrl);
            });

            await Task.WhenAll(categoryTreeTask, servicesTask, brandsTask);

            var context = $@"
**Cấu trúc danh mục sản phẩm (JSON):**
{categoryTreeTask.Result}

**Dịch vụ của cửa hàng (JSON):**
{servicesTask.Result}

**Các thương hiệu (JSON):** {brandsTask.Result} 
";
            // Không cần gọi PrependClientBaseUrl ở đây vì GetFromApiAsync đã xử lý
            return context;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting general context");
            return "Không thể tải bối cảnh chung.";
        }
    }

    // Updated method: Get product context with client base URL
    public async Task<string> GetProductContextAsync(int productId, string? clientBaseUrl)
    {
        try
        {
            // Get product details
            var product = await GetProductByIdAsync(productId);
            if (product == null) return "";

            // Get inventory info
            var inventory = await GetInventoryByProductIdAsync(productId);

            // Get top 3 reviews
            var reviews = await GetTopReviewsByProductIdAsync(productId, 3);

            // Get brand info if available
            string brandInfo = "";
            if (product.BrandId.HasValue)
            {
                var brand = await GetBrandByIdAsync(product.BrandId.Value);
                if (brand != null)
                {
                    brandInfo = $"Thương hiệu: {brand.Name}\n";
                }
            }

            // Format inventory status
            string inventoryStatus = "Tình trạng: Hết hàng";
            if (inventory != null)
            {
                inventoryStatus = inventory.Quantity > 0 
                    ? $"Tình trạng: Còn {inventory.Quantity} sản phẩm" 
                    : "Tình trạng: Hết hàng";
            }

            // Format reviews
            var reviewsText = "Đánh giá:";
            if (reviews.Any())
            {
                foreach (var review in reviews)
                {
                    reviewsText += $"\n- {review.Rating} sao: {review.Content?.Substring(0, Math.Min(100, review.Content?.Length ?? 0)) ?? "Không có nội dung"}";
                }
            }
            else
            {
                reviewsText += "\n- Chưa có đánh giá nào";
            }

            var context = $@"
**Thông tin chi tiết sản phẩm:**
- Tên sản phẩm: {product.Name}
- Giá: {product.Price.ToString("N0")} VNĐ
- {inventoryStatus}
- {brandInfo}
{reviewsText}
";

            return PrependClientBaseUrl(context, clientBaseUrl); // Áp dụng helper
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product context for product {ProductId}", productId);
            return "";
        }
    }

    // Updated method: Generic API call for GET requests with client base URL
    public async Task<string> GetFromApiAsync(string endpointPath, string? clientBaseUrl)
    {
        try
        {
            // Security check: Prevent access to sensitive endpoints
            var lowerEndpoint = endpointPath.ToLower();
            if (lowerEndpoint.Contains("profile") || 
                lowerEndpoint.Contains("user") || 
                lowerEndpoint.Contains("account") || 
                lowerEndpoint.Contains("cart") ||
                lowerEndpoint.Contains("wishlist") ||
                lowerEndpoint.Contains("order"))
            {
                return "Lỗi: Không được phép truy cập endpoint này vì chứa thông tin cá nhân.";
            }

            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/{endpointPath.TrimStart('/')}");
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                // Áp dụng helper tại đây
                return PrependClientBaseUrl(content, clientBaseUrl); 
            }
            else
            {
                _logger.LogWarning("API call failed. Endpoint: {Endpoint}, Status: {StatusCode}, Response: {Response}", 
                                   endpointPath, response.StatusCode, content);
                return $"Lỗi khi gọi API: {response.StatusCode}. Chi tiết: {content}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling generic API endpoint: {Endpoint}", endpointPath);
            return $"Lỗi hệ thống khi gọi API: {ex.Message}";
        }
    }

    // Updated method: Get full content of an article by slug with client base URL
    public async Task<string> GetArticleContentBySlugAsync(string slug, string? clientBaseUrl)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/page/slug/{Uri.EscapeDataString(slug)}");
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return PrependClientBaseUrl(content, clientBaseUrl); // Áp dụng helper
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return "Không tìm thấy bài viết với slug được cung cấp.";
            }
            else
            {
                _logger.LogError("Error getting article content: {StatusCode}", response.StatusCode);
                return "Có lỗi xảy ra khi lấy nội dung bài viết.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting article content for slug: {Slug}", slug);
            return "Có lỗi xảy ra khi lấy nội dung bài viết.";
        }
    }

    private async Task<string> GetCategoryTreeAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/category/tree?includeInactive=false");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var categories = JsonSerializer.Deserialize<List<CategoryDto>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (categories != null)
                {
                    return FormatCategoryTree(categories, 0);
                }
            }
            return "Không thể tải danh mục sản phẩm";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching category tree");
            return "Không thể tải danh mục sản phẩm";
        }
    }

    private string FormatCategoryTree(List<CategoryDto> categories, int level)
    {
        var result = "";
        var indent = new string(' ', level * 2);
        
        foreach (var category in categories)
        {
            result += $"{indent}- {category.Name}\n";
            if (category.Children != null && category.Children.Any())
            {
                result += FormatCategoryTree(category.Children, level + 1);
            }
        }
        
        return result;
    }

    private async Task<string> GetServicesAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/service");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var services = JsonSerializer.Deserialize<List<ServiceDto>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (services != null)
                {
                    var result = "";
                    foreach (var service in services)
                    {
                        result += $"- {service.Name}: {service.Description ?? "Không có mô tả"}\n";
                        if (service.Packages != null && service.Packages.Any())
                        {
                            foreach (var package in service.Packages)
                            {
                                result += $"  + {package.Name}: {package.Price.ToString("N0")} VNĐ/lượt\n";
                            }
                        }
                    }
                    return result;
                }
            }
            return "Không thể tải thông tin dịch vụ";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching services");
            return "Không thể tải thông tin dịch vụ";
        }
    }

    private async Task<ProductDto?> GetProductByIdAsync(int productId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/product/{productId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<ProductDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product {ProductId}", productId);
            return null;
        }
    }

    private async Task<InventoryDto?> GetInventoryByProductIdAsync(int productId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/inventory/{productId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<InventoryDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory for product {ProductId}", productId);
            return null;
        }
    }

    private async Task<List<ReviewDto>> GetTopReviewsByProductIdAsync(int productId, int count)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/review/product/{productId}?sortBy=rating");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var reviews = JsonSerializer.Deserialize<List<ReviewDto>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return reviews?.Take(count).ToList() ?? new List<ReviewDto>();
            }
            return new List<ReviewDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching reviews for product {ProductId}", productId);
            return new List<ReviewDto>();
        }
    }

    private async Task<BrandDto?> GetBrandByIdAsync(int brandId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/brand/{brandId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<BrandDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching brand {BrandId}", brandId);
            return null;
        }
    }
}