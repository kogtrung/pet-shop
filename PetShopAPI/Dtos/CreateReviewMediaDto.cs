using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PetShopAPI.Dtos;

public class CreateReviewMediaDto
{
    [Required]
    public int ReviewId { get; set; }
    
    [Required]
    public IFormFile File { get; set; } = default!;
}