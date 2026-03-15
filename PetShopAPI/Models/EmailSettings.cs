namespace PetShopAPI.Models;

public class EmailSettings
{
    public string SmtpServer { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "noreply@petshop.com";
    public string FromName { get; set; } = "Petivo";
    public bool EnableSsl { get; set; } = true;
    public string FrontendUrl { get; set; } = "http://localhost:5173";
}

