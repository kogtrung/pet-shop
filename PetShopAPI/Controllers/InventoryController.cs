using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using PetShopAPI.Data;
using PetShopAPI.Dtos;

namespace PetShopAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/inventory/{productId}
    [AllowAnonymous] // Changed from [Authorize(Roles = "Admin,Staff")]
    [HttpGet("{productId}")]
    public async Task<ActionResult<InventoryDto>> GetByProductId(int productId)
    {
        var inventory = await _db.Inventories
            .Include(i => i.Product)
            .FirstOrDefaultAsync(i => i.ProductId == productId);

        if (inventory == null)
            return NotFound(new { error = "Inventory not found", code = "INVENTORY_NOT_FOUND" });

        return new InventoryDto
        {
            ProductId = inventory.ProductId,
            ProductName = inventory.Product?.Name,
            ProductSku = inventory.Product?.Sku,
            Quantity = inventory.Quantity,
            ReorderLevel = inventory.ReorderLevel,
            NeedsReorder = inventory.ReorderLevel.HasValue && inventory.Quantity <= inventory.ReorderLevel.Value
        };
    }

    // PUT: api/inventory/{productId}
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPut("{productId}")]
    public async Task<IActionResult> Update(int productId, UpdateInventoryDto dto)
    {
        var inventory = await _db.Inventories.FindAsync(productId);

        if (inventory == null)
            return NotFound(new { error = "Inventory not found", code = "INVENTORY_NOT_FOUND" });

        inventory.Quantity = dto.Quantity;
        inventory.ReorderLevel = dto.ReorderLevel;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/inventory/{productId}/adjust
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpPost("{productId}/adjust")]
    public async Task<ActionResult> AdjustInventory(int productId, AdjustInventoryDto dto)
    {
        var inventory = await _db.Inventories.FindAsync(productId);

        if (inventory == null)
            return NotFound(new { error = "Inventory not found", code = "INVENTORY_NOT_FOUND" });

        var previousQuantity = inventory.Quantity;
        inventory.Quantity += dto.Adjustment;

        if (inventory.Quantity < 0)
            return BadRequest(new { error = "Insufficient inventory", code = "INSUFFICIENT_INVENTORY" });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            productId,
            previousQuantity,
            adjustment = dto.Adjustment,
            newQuantity = inventory.Quantity,
            reorderLevel = inventory.ReorderLevel
        });
    }

    // GET: api/inventory/low-stock
    [Authorize(Roles = "Admin,SaleStaff")]
    [HttpGet("low-stock")]
    public async Task<ActionResult<IEnumerable<InventoryDto>>> GetLowStock()
    {
        var lowStockItems = await _db.Inventories
            .Include(i => i.Product)
            .Where(i => i.ReorderLevel.HasValue && i.Quantity <= i.ReorderLevel.Value)
            .ToListAsync();

        var result = lowStockItems.Select(i => new InventoryDto
        {
            ProductId = i.ProductId,
            ProductName = i.Product?.Name,
            ProductSku = i.Product?.Sku,
            Quantity = i.Quantity,
            ReorderLevel = i.ReorderLevel,
            NeedsReorder = true
        });

        return Ok(result);
    }
}