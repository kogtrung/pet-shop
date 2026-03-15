using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;
using PetShopAPI.Models;
using PetShopAPI.Services;
using PetShopAPI.Helpers;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IGeminiService _geminiService; // Added GeminiService

    public ProductController(AppDbContext db, IGeminiService geminiService) // Updated constructor
    {
        _db = db;
        _geminiService = geminiService; // Initialize GeminiService
    }

    // GET: api/product
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll(
        [FromQuery] int? brandId,
        [FromQuery] int? categoryId,
        [FromQuery] bool? isFeatured,
        [FromQuery] bool? isService,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? search,
        [FromQuery] bool? isActive) // null = xem tất cả, true = chỉ active, false = chỉ inactive
    {
        var query = _db.Products
            .Include(p => p.Brand)
            .Include(p => p.Inventory)
            .Include(p => p.Images)
            .Include(p => p.ProductCategories)
            .Include(p => p.Reviews)
            .AsQueryable();

        // Filter by IsActive
        // - If isActive is provided (true/false), filter accordingly
        // - If isActive is not provided (null), default to true for public access (only show active products)
        // - Admin should use /admin/all endpoint to see all products
        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }
        else
        {
            // Default behavior: only show active products if not specified (for public access)
            query = query.Where(p => p.IsActive == true);
        }

        // Filters
        if (brandId.HasValue)
            query = query.Where(p => p.BrandId == brandId.Value);

        // Add category filter - include child categories
        if (categoryId.HasValue)
        {
            // Get all descendant category IDs including the selected category
            var categoryIds = await GetCategoryAndDescendants(categoryId.Value);
            query = query.Where(p => p.ProductCategories.Any(pc => categoryIds.Contains(pc.CategoryId)));
        }

        if (isFeatured.HasValue)
            query = query.Where(p => p.IsFeatured == isFeatured.Value);

        if (isService.HasValue)
            query = query.Where(p => p.IsService == isService.Value);

        if (minPrice.HasValue)
            query = query.Where(p => p.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(p => p.Price <= maxPrice.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));

        var products = await query.ToListAsync();
        var now = DateTimeHelper.GetVietnamTime();

        var result = products.Select(p => {
            return new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Sku = p.Sku,
            BrandId = p.BrandId,
            BrandName = p.Brand?.Name,
            Description = p.Description,
            Price = p.Price,
            // Promotion fields
            SalePrice = p.SalePrice,
            SaleStartDate = p.SaleStartDate,
            SaleEndDate = p.SaleEndDate,
            IsFeatured = p.IsFeatured,
            IsService = p.IsService,
            IsActive = p.IsActive,
            SoldCount = p.SoldCount,
            CreatedAt = p.CreatedAt,
            PublishedAt = p.PublishedAt,
            Quantity = p.Inventory?.Quantity ?? 0,
            ReorderLevel = p.Inventory?.ReorderLevel,
            Images = p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                Url = i.Url,
                MediaType = i.MediaType,
                SortOrder = i.SortOrder,
                IsPrimary = i.IsPrimary
            }).ToList(),
                CategoryIds = p.ProductCategories.Select(pc => pc.CategoryId).ToList(),
                AverageRating = p.Reviews.Any() ? p.Reviews.Average(r => (double)r.Rating) : null,
                ReviewCount = p.Reviews.Count
            };
        });

        return Ok(result);
    }

    // GET: api/product/admin/all - Get all products (including inactive) for admin
    // IMPORTANT: This route must be BEFORE [HttpGet("{id}")] to avoid route conflicts
    [Authorize(Roles = "Admin")]
    [HttpGet("admin/all")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAllForAdmin(
        [FromQuery] int? brandId,
        [FromQuery] int? categoryId,
        [FromQuery] bool? isFeatured,
        [FromQuery] bool? isService,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? search)
    {
        var query = _db.Products
            .Include(p => p.Brand)
            .Include(p => p.Inventory)
            .Include(p => p.Images)
            .Include(p => p.ProductCategories)
            .Include(p => p.Reviews)
            .AsQueryable();

        // No IsActive filter for admin - show all products

        // Filters
        if (brandId.HasValue)
            query = query.Where(p => p.BrandId == brandId.Value);

        if (categoryId.HasValue)
        {
            var categoryIds = await GetCategoryAndDescendants(categoryId.Value);
            query = query.Where(p => p.ProductCategories.Any(pc => categoryIds.Contains(pc.CategoryId)));
        }

        if (isFeatured.HasValue)
            query = query.Where(p => p.IsFeatured == isFeatured.Value);

        if (isService.HasValue)
            query = query.Where(p => p.IsService == isService.Value);

        if (minPrice.HasValue)
            query = query.Where(p => p.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(p => p.Price <= maxPrice.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));

        var products = await query.ToListAsync();

        var result = products.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Sku = p.Sku,
            BrandId = p.BrandId,
            BrandName = p.Brand?.Name,
            Description = p.Description,
            Price = p.Price,
            SalePrice = p.SalePrice,
            SaleStartDate = p.SaleStartDate,
            SaleEndDate = p.SaleEndDate,
            IsFeatured = p.IsFeatured,
            IsService = p.IsService,
            IsActive = p.IsActive,
            SoldCount = p.SoldCount,
            CreatedAt = p.CreatedAt,
            PublishedAt = p.PublishedAt,
            Quantity = p.Inventory?.Quantity ?? 0,
            ReorderLevel = p.Inventory?.ReorderLevel,
            Images = p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                Url = i.Url,
                MediaType = i.MediaType,
                SortOrder = i.SortOrder,
                IsPrimary = i.IsPrimary
            }).ToList(),
            CategoryIds = p.ProductCategories.Select(pc => pc.CategoryId).ToList(),
            AverageRating = p.Reviews.Any() ? p.Reviews.Average(r => (double)r.Rating) : null,
            ReviewCount = p.Reviews.Count
        });

        return Ok(result);
    }

    // Helper method to get category and all its descendants
    private async Task<List<int>> GetCategoryAndDescendants(int categoryId)
    {
        var result = new List<int> { categoryId };
        var children = await _db.Categories
            .Where(c => c.ParentId == categoryId)
            .Select(c => c.Id)
            .ToListAsync();

        foreach (var childId in children)
        {
            var descendants = await GetCategoryAndDescendants(childId);
            result.AddRange(descendants);
        }

        return result;
    }

    // GET: api/product/{id}
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var p = await _db.Products
            .Include(p => p.Brand)
            .Include(p => p.Inventory)
            .Include(p => p.Images)
            .Include(p => p.ProductCategories)
            .Include(p => p.Reviews)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (p == null) return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        return new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Sku = p.Sku,
            BrandId = p.BrandId,
            BrandName = p.Brand?.Name,
            Description = p.Description,
            Price = p.Price,
            // Promotion fields
            SalePrice = p.SalePrice,
            SaleStartDate = p.SaleStartDate,
            SaleEndDate = p.SaleEndDate,
            IsFeatured = p.IsFeatured,
            IsService = p.IsService,
            IsActive = p.IsActive,
            SoldCount = p.SoldCount,
            CreatedAt = p.CreatedAt,
            PublishedAt = p.PublishedAt,
            Quantity = p.Inventory?.Quantity ?? 0,
            ReorderLevel = p.Inventory?.ReorderLevel,
            Images = p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                Url = i.Url,
                MediaType = i.MediaType,
                SortOrder = i.SortOrder,
                IsPrimary = i.IsPrimary
            }).ToList(),
            CategoryIds = p.ProductCategories.Select(pc => pc.CategoryId).ToList(),
            AverageRating = p.Reviews.Any() ? p.Reviews.Average(r => (double)r.Rating) : null,
            ReviewCount = p.Reviews.Count
        };
    }

    // GET: api/product/recommendations
    [AllowAnonymous]
    [HttpGet("recommendations")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetRecommendations([FromQuery] Guid? sessionId)
    {
        List<Product> products;

        if (sessionId.HasValue)
        {
            // 1. Lấy lịch sử chat
            var chatHistory = await _db.ChatMessages
                .Where(m => m.ConversationSessionId == sessionId.Value)
                .OrderByDescending(m => m.Timestamp)
                .Take(10) // Lấy 10 tin nhắn gần nhất
                .OrderBy(m => m.Timestamp) // Sắp xếp lại
                .ToListAsync();

            if (chatHistory.Count > 1) // Cần ít nhất 2 tin nhắn để có ngữ cảnh
            {
                // 2. Tạo meta-prompt để hỏi AI
                var historyText = string.Join("\n", chatHistory.Select(m => $"{m.Role}: {m.Content}"));
                var metaPrompt = $@"
                    Dựa vào lịch sử trò chuyện sau, hãy xác định 3 chủ đề hoặc từ khóa chính mà người dùng quan tâm nhất để gợi ý sản phẩm thú cưng. 
                    Chỉ trả về 3 từ khóa, phân cách bằng dấu phẩy. Không giải thích gì thêm.
                    Ví dụ: thức ăn hạt, mèo con, trị nấm

                    Lịch sử:
                    {historyText}
                ";

                try
                {
                    // 3. Gọi Gemini để lấy từ khóa
                    var keywordString = await _geminiService.GenerateTextAsync(metaPrompt);
                    var keywords = keywordString.Split(',').Select(k => k.Trim().ToLower()).ToList();

                    // 4. Tìm sản phẩm dựa trên từ khóa
                    products = await _db.Products
                        .Where(p => p.PublishedAt.HasValue && p.PublishedAt.Value <= DateTimeHelper.GetVietnamTime())
                        .Where(p => keywords.Any(k => p.Name.ToLower().Contains(k) || p.Description.ToLower().Contains(k)))
                        .OrderByDescending(p => p.PublishedAt)
                        .Take(5)
                        .ToListAsync();

                    // Nếu không tìm thấy sản phẩm nào từ AI, quay về logic cũ
                    if (products.Count == 0)
                    {
                        products = await GetNewestProductsAsync(); // (Tách logic cũ ra hàm riêng)
                    }
                }
                catch (Exception ex)
                {
                    // Nếu có lỗi khi gọi AI, quay về logic cũ
                    Console.WriteLine($"Error calling AI service: {ex.Message}");
                    products = await GetNewestProductsAsync();
                }
            }
            else
            {
                // Không đủ lịch sử chat, dùng logic cũ
                products = await GetNewestProductsAsync();
            }
        }
        else
        {
            // Không có sessionId, dùng logic cũ
            products = await GetNewestProductsAsync();
        }

        // 5. Map DTO và trả về (logic này bạn đã có)
        var productDtos = products.Select(p => new ProductDto 
        { 
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Price = p.Price,
            ImageUrl = p.Images.OrderBy(i => i.SortOrder).FirstOrDefault() != null ? 
                      p.Images.OrderBy(i => i.SortOrder).First().Url : 
                      string.Empty // Lấy ảnh đầu tiên
        }).ToList();

        return Ok(productDtos);
    }

    // Tách logic cũ ra hàm riêng
    private async Task<List<Product>> GetNewestProductsAsync()
    {
        return await _db.Products
            .Where(p => p.PublishedAt.HasValue && p.PublishedAt.Value <= DateTime.UtcNow)
            .OrderByDescending(p => p.PublishedAt) 
            .Take(5)
            .ToListAsync();
    }

    // POST: api/product
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateProductDto dto)
    {
        // Tạo slug tự động nếu không được cung cấp
        if (string.IsNullOrWhiteSpace(dto.Slug))
        {
            dto.Slug = SlugGenerator.GenerateSlug(dto.Name);
        }

        var product = new Product
        {
            Name = dto.Name,
            Slug = dto.Slug,
            Sku = dto.Sku,
            BrandId = dto.BrandId,
            Description = dto.Description,
            Price = dto.Price,
            IsFeatured = dto.IsFeatured,
			// Tôn trọng giá trị IsService được gửi từ client (mặc định false)
			IsService = dto.IsService,
            IsActive = dto.IsActive, // Mặc định true
            PublishedAt = dto.PublishedAt,
            // Promotion fields
            SalePrice = dto.SalePrice,
            SaleStartDate = dto.SaleStartDate,
            SaleEndDate = dto.SaleEndDate,
            Inventory = new Inventory 
            { 
                Quantity = dto.Quantity,
                ReorderLevel = dto.ReorderLevel
            }
        };

        // Add images if provided
        if (dto.Images.Any())
        {
            foreach (var imgDto in dto.Images)
            {
                product.Images.Add(new ProductImage
                {
                    Url = imgDto.Url,
                    MediaType = imgDto.MediaType,
                    SortOrder = imgDto.SortOrder,
                    IsPrimary = imgDto.IsPrimary
                });
            }
        }

        // Add categories if provided
        if (dto.CategoryIds.Any())
        {
            foreach (var categoryId in dto.CategoryIds)
            {
                product.ProductCategories.Add(new ProductCategory
                {
                    CategoryId = categoryId
                });
            }
        }

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, new { id = product.Id });
    }

    // PUT: api/product/{id}/toggle-active
    // IMPORTANT: This route must be BEFORE [HttpPut("{id}")] to avoid route conflicts
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        try
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null) 
                return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

            product.IsActive = !product.IsActive;
            await _db.SaveChangesAsync();

            return Ok(new 
            { 
                message = product.IsActive ? "Sản phẩm đã được hiển thị" : "Sản phẩm đã được ẩn",
                isActive = product.IsActive
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "An error occurred while toggling product active status", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }

    // PUT: api/product/{id}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateProductDto dto)
    {
        var product = await _db.Products
            .Include(p => p.Inventory)
            .Include(p => p.ProductCategories) // Include categories for updates
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (product == null) return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        // Update only provided fields
        if (dto.Name != null) product.Name = dto.Name;
        if (dto.Slug != null) product.Slug = dto.Slug;
        if (dto.Sku != null) product.Sku = dto.Sku;
        if (dto.BrandId.HasValue) product.BrandId = dto.BrandId;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.Price.HasValue) product.Price = dto.Price.Value;
        if (dto.IsFeatured.HasValue) product.IsFeatured = dto.IsFeatured.Value;
		if (dto.IsService.HasValue) product.IsService = dto.IsService.Value; // Cập nhật IsService nếu được cung cấp trực tiếp
        if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value; // Cập nhật IsActive nếu được cung cấp
        if (dto.PublishedAt.HasValue) product.PublishedAt = dto.PublishedAt;
        
        // Promotion fields - always update, even if null
        product.SalePrice = dto.SalePrice;
        product.SaleStartDate = dto.SaleStartDate;
        product.SaleEndDate = dto.SaleEndDate;

        // Update inventory if provided
        if (dto.Quantity.HasValue)
        {
            if (product.Inventory == null)
            {
                product.Inventory = new Inventory { ProductId = product.Id };
                _db.Inventories.Add(product.Inventory);
            }
            product.Inventory.Quantity = dto.Quantity.Value;
        }
        
        if (dto.ReorderLevel.HasValue)
        {
            if (product.Inventory == null)
            {
                product.Inventory = new Inventory { ProductId = product.Id };
                _db.Inventories.Add(product.Inventory);
            }
            product.Inventory.ReorderLevel = dto.ReorderLevel;
        }

        // Update categories if provided
        if (dto.CategoryIds != null)
        {
            // Remove existing category associations
            product.ProductCategories.Clear();
            
            // Add new category associations
            foreach (var categoryId in dto.CategoryIds)
            {
                product.ProductCategories.Add(new ProductCategory
                {
                    ProductId = product.Id,
                    CategoryId = categoryId
                });
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Helper method to check if a category or any of its descendants is selected
    private async Task<bool> IsCategoryOrDescendantSelected(List<int> selectedCategoryIds, int targetCategoryId)
    {
        // Kiểm tra trực tiếp
        if (selectedCategoryIds.Contains(targetCategoryId))
            return true;

        // Kiểm tra danh mục con
        var childCategories = await _db.Categories
            .Where(c => c.ParentId == targetCategoryId)
            .Select(c => c.Id)
            .ToListAsync();

        foreach (var childId in childCategories)
        {
            if (selectedCategoryIds.Contains(childId))
                return true;
                
            // Đệ quy kiểm tra danh mục con của danh mục con
            var isDescendantSelected = await IsCategoryOrDescendantSelected(selectedCategoryIds, childId);
            if (isDescendantSelected)
                return true;
        }

        return false;
    }

    // DELETE: api/product/{id}
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var product = await _db.Products
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);
            
            if (product == null) 
                return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

            // Check if product is used in any orders
            var orderItemsCount = await _db.OrderItems
                .Where(oi => oi.ProductId == id)
                .CountAsync();

            if (orderItemsCount > 0)
            {
                return BadRequest(new 
                { 
                    error = $"Không thể xóa sản phẩm này vì đã có {orderItemsCount} đơn hàng sử dụng sản phẩm này. Vui lòng ẩn sản phẩm thay vì xóa để giữ lại lịch sử đơn hàng.",
                    code = "PRODUCT_IN_USE",
                    orderItemsCount = orderItemsCount
                });
            }

            // Check if product is in any cart
            var cartItemsCount = await _db.CartItems
                .Where(ci => ci.ProductId == id)
                .CountAsync();

            if (cartItemsCount > 0)
            {
                // Remove from carts first
                var cartItems = await _db.CartItems
                    .Where(ci => ci.ProductId == id)
                    .ToListAsync();
                _db.CartItems.RemoveRange(cartItems);
            }

            // Delete product images first
            if (product.Images != null && product.Images.Any())
            {
                _db.ProductImages.RemoveRange(product.Images);
            }

            // Delete product
        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
            
        return NoContent();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx && sqlEx.Number == 547)
        {
            // Foreign key constraint violation
            return BadRequest(new 
            { 
                error = "Không thể xóa sản phẩm này vì đã được sử dụng trong hệ thống (đơn hàng, giỏ hàng, v.v.). Vui lòng ẩn sản phẩm thay vì xóa.",
                code = "PRODUCT_IN_USE"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "An error occurred while deleting the product", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }

    // POST: api/product/{id}/publish (For Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> PublishProduct(int id)
    {
        try
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });
            }

            product.PublishedAt = DateTimeHelper.GetVietnamTime();

            await _db.SaveChangesAsync();

            return Ok(new { message = "Product published successfully", productId = id, publishedAt = product.PublishedAt });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error publishing product with id: {id}, Error: {ex}");
            return StatusCode(500, new { error = "An error occurred while publishing the product", code = "INTERNAL_ERROR" });
        }
    }

    // ========== PRODUCT IMAGE ENDPOINTS ==========

    // GET: api/product/{productId}/images
    [AllowAnonymous]
    [HttpGet("{productId}/images")]
    public async Task<ActionResult<IEnumerable<ProductImageDto>>> GetProductImages(int productId)
    {
        var product = await _db.Products.FindAsync(productId);
        if (product == null) return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        var images = await _db.ProductImages
            .Where(i => i.ProductId == productId)
            .OrderBy(i => i.SortOrder)
            .Select(i => new ProductImageDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                Url = i.Url,
                MediaType = i.MediaType,
                SortOrder = i.SortOrder,
                IsPrimary = i.IsPrimary
            })
            .ToListAsync();

        return Ok(images);
    }

    // POST: api/product/{productId}/images
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost("{productId}/images")]
    public async Task<IActionResult> AddProductImage(int productId, CreateProductImageDto dto)
    {
        var product = await _db.Products.FindAsync(productId);
        if (product == null) return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

        // If this is marked as primary, unset all other primary images
        if (dto.IsPrimary)
        {
            var existingPrimaryImages = await _db.ProductImages
                .Where(i => i.ProductId == productId && i.IsPrimary)
                .ToListAsync();
            
            foreach (var img in existingPrimaryImages)
            {
                img.IsPrimary = false;
            }
        }

        var image = new ProductImage
        {
            ProductId = productId,
            Url = dto.Url,
            MediaType = dto.MediaType,
            SortOrder = dto.SortOrder,
            IsPrimary = dto.IsPrimary
        };

        _db.ProductImages.Add(image);
        await _db.SaveChangesAsync();

        var result = new ProductImageDto
        {
            Id = image.Id,
            ProductId = image.ProductId,
            Url = image.Url,
            MediaType = image.MediaType,
            SortOrder = image.SortOrder,
            IsPrimary = image.IsPrimary
        };

        return CreatedAtAction(nameof(GetProductImages), new { productId }, result);
    }

    // PUT: api/product/{productId}/images/{imageId}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{productId}/images/{imageId}")]
    public async Task<IActionResult> UpdateProductImage(int productId, int imageId, UpdateProductImageDto dto)
    {
        var image = await _db.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId);
            
        if (image == null) return NotFound(new { error = "Image not found", code = "IMAGE_NOT_FOUND" });

        // Update only provided fields
        if (dto.Url != null) image.Url = dto.Url;
        if (dto.MediaType != null) image.MediaType = dto.MediaType;
        if (dto.SortOrder.HasValue) image.SortOrder = dto.SortOrder.Value;
        
        if (dto.IsPrimary.HasValue && dto.IsPrimary.Value)
        {
            // Unset all other primary images for this product
            var existingPrimaryImages = await _db.ProductImages
                .Where(i => i.ProductId == productId && i.Id != imageId && i.IsPrimary)
                .ToListAsync();
            
            foreach (var img in existingPrimaryImages)
            {
                img.IsPrimary = false;
            }
            
            image.IsPrimary = true;
        }
        else if (dto.IsPrimary.HasValue)
        {
            image.IsPrimary = dto.IsPrimary.Value;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/product/{productId}/images/{imageId}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpDelete("{productId}/images/{imageId}")]
    public async Task<IActionResult> DeleteProductImage(int productId, int imageId)
    {
        var image = await _db.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId);
            
        if (image == null) return NotFound(new { error = "Image not found", code = "IMAGE_NOT_FOUND" });

        _db.ProductImages.Remove(image);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/product/{productId}/images/{imageId}/set-primary
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{productId}/images/{imageId}/set-primary")]
    public async Task<IActionResult> SetPrimaryImage(int productId, int imageId)
    {
        var image = await _db.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId);
            
        if (image == null) return NotFound(new { error = "Image not found", code = "IMAGE_NOT_FOUND" });

        // Unset all other primary images
        var existingPrimaryImages = await _db.ProductImages
            .Where(i => i.ProductId == productId && i.Id != imageId && i.IsPrimary)
            .ToListAsync();
        
        foreach (var img in existingPrimaryImages)
        {
            img.IsPrimary = false;
        }

        image.IsPrimary = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Primary image updated successfully", imageId });
    }

    // POST: api/product/{productId}/images/upload
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost("{productId}/images/upload")]
    public async Task<IActionResult> UploadProductImage(int productId, [FromForm] IFormFile file, [FromForm] bool isPrimary = false, [FromForm] int sortOrder = 0)
    {
        try
        {
            var product = await _db.Products.FindAsync(productId);
            if (product == null) return NotFound(new { error = "Product not found", code = "PRODUCT_NOT_FOUND" });

            // Validate file
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "File is required", code = "FILE_REQUIRED" });

            // Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { error = "File size exceeds 5MB limit", code = "FILE_TOO_LARGE" });

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(new { error = "Invalid file type. Only JPG, PNG, GIF, WEBP allowed", code = "INVALID_FILE_TYPE" });

            // Generate unique filename
            var extension = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine("wwwroot", "uploads", "products", fileName);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // If this is marked as primary, unset all other primary images
            if (isPrimary)
            {
                var existingPrimaryImages = await _db.ProductImages
                    .Where(i => i.ProductId == productId && i.IsPrimary)
                    .ToListAsync();
                
                foreach (var img in existingPrimaryImages)
                {
                    img.IsPrimary = false;
                }
            }

            // Create image record
            var imageUrl = $"/uploads/products/{fileName}";
            var image = new ProductImage
            {
                ProductId = productId,
                Url = imageUrl,
                MediaType = "image",
                SortOrder = sortOrder,
                IsPrimary = isPrimary
            };

            _db.ProductImages.Add(image);
            await _db.SaveChangesAsync();

            var result = new ProductImageDto
            {
                Id = image.Id,
                ProductId = image.ProductId,
                Url = image.Url,
                MediaType = image.MediaType,
                SortOrder = image.SortOrder,
                IsPrimary = image.IsPrimary
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }

    // GET: api/product/{id}/sales-today - Get product sales statistics for today
    [AllowAnonymous]
    [HttpGet("{id}/sales-today")]
    public async Task<ActionResult<object>> GetProductSalesToday(int id)
    {
        try
        {
            var today = DateTimeHelper.GetVietnamTime().Date;
            var tomorrow = today.AddDays(1);

            var salesToday = await _db.OrderItems
                .Where(oi => oi.ProductId == id &&
                             oi.Order.CreatedAt >= today &&
                             oi.Order.CreatedAt < tomorrow &&
                             (oi.Order.Status == "Delivered" || oi.Order.Status == "Completed"))
                .GroupBy(oi => oi.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    QuantitySold = g.Sum(oi => oi.Quantity),
                    TotalRevenue = g.Sum(oi => oi.LineTotal)
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                productId = id,
                quantitySold = salesToday?.QuantitySold ?? 0,
                totalRevenue = salesToday?.TotalRevenue ?? 0
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", code = "INTERNAL_ERROR", details = ex.Message });
        }
    }
}
