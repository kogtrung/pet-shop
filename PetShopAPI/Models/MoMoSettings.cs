namespace PetShopAPI.Models;

public class MoMoSettings
{
    public string PartnerCode { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    // RedirectUrl là tên field MoMo dùng trong chữ ký, nhưng để tương thích với config cũ
    // ta vẫn giữ ReturnUrl và map sang RedirectUrl
    public string ReturnUrl { get; set; } = string.Empty;
    public string RedirectUrl => ReturnUrl;
    public string IpnUrl { get; set; } = string.Empty;
}


