using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PetShopAPI.Models;

namespace PetShopAPI.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Product Management
    public DbSet<Brand> Brands { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductImage> ProductImages { get; set; }
    public DbSet<ProductCategory> ProductCategories { get; set; }
    public DbSet<ProductAttribute> ProductAttributes { get; set; }
    public DbSet<Inventory> Inventories { get; set; }

    // Order Management
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<OrderReturn> OrderReturns { get; set; }
    public DbSet<OrderReturnItem> OrderReturnItems { get; set; }
    public DbSet<OrderReturnExchangeItem> OrderReturnExchangeItems { get; set; }
    public DbSet<OrderCancellation> OrderCancellations { get; set; }
    
    // Promotion
    public DbSet<Promotion> Promotions { get; set; }

    // Customer Features
    public DbSet<Review> Reviews { get; set; }
    public DbSet<ReviewMedia> ReviewMedias { get; set; }
    public DbSet<Wishlist> Wishlists { get; set; }
    public DbSet<CartItem> CartItems { get; set; }
    public DbSet<CustomerProfile> CustomerProfiles { get; set; }

    // CMS
    public DbSet<Page> Pages { get; set; }

    // Service Booking
    public DbSet<Service> Services { get; set; }
    public DbSet<ServicePackage> ServicePackages { get; set; }
    public DbSet<ServiceBooking> ServiceBookings { get; set; }
    public DbSet<BookingItem> BookingItems { get; set; }
    public DbSet<ServiceStaffAssignment> ServiceStaffAssignments { get; set; }

    // Newsletter
    public DbSet<NewsletterSubscriber> NewsletterSubscribers { get; set; }

    // Email
    public DbSet<EmailLog> EmailLogs { get; set; }

    // Banner
    public DbSet<Banner> Banners { get; set; }

    // Payments
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; }

    // Chatbot
    public DbSet<ConversationSession> ConversationSessions { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<ChatFeedback> ChatFeedbacks { get; set; } // Add this line

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Product - Category many-to-many
        builder.Entity<ProductCategory>()
            .HasKey(pc => new { pc.ProductId, pc.CategoryId });

        builder.Entity<ProductCategory>()
            .HasOne(pc => pc.Product)
            .WithMany(p => p.ProductCategories)
            .HasForeignKey(pc => pc.ProductId);

        builder.Entity<ProductCategory>()
            .HasOne(pc => pc.Category)
            .WithMany(c => c.ProductCategories)
            .HasForeignKey(pc => pc.CategoryId);

        // Product - Attribute many-to-many
        builder.Entity<ProductAttribute>()
            .HasKey(pa => new { pa.ProductId, pa.AttributeValueId });

        builder.Entity<ProductAttribute>()
            .HasOne(pa => pa.Product)
            .WithMany(p => p.ProductAttributes)
            .HasForeignKey(pa => pa.ProductId);

        builder.Entity<ProductAttribute>()
            .HasOne(pa => pa.AttributeValue)
            .WithMany(av => av.ProductAttributes)
            .HasForeignKey(pa => pa.AttributeValueId);

        // Product - Image one-to-many
        builder.Entity<ProductImage>()
            .HasOne(pi => pi.Product)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.ProductId);

        // Product - Inventory one-to-one
        builder.Entity<Inventory>()
            .HasOne(i => i.Product)
            .WithOne(p => p.Inventory)
            .HasForeignKey<Inventory>(i => i.ProductId);

        // Order - OrderItem one-to-many
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId);

        // Product - OrderItem one-to-many
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany() // No navigation property back to OrderItem from Product
            .HasForeignKey(oi => oi.ProductId);

        // Review - Product many-to-one
        builder.Entity<Review>()
            .HasOne(r => r.Product)
            .WithMany(p => p.Reviews)
            .HasForeignKey(r => r.ProductId);

        // Review - User many-to-one
        builder.Entity<Review>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.NoAction);

        // ReviewMedia - Review many-to-one
        builder.Entity<ReviewMedia>()
            .HasOne(rm => rm.Review)
            .WithMany(r => r.Media)
            .HasForeignKey(rm => rm.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Set table name for ReviewMedia
        builder.Entity<ReviewMedia>()
            .ToTable("ReviewMedia");

        // Wishlist - Product many-to-one
        builder.Entity<Wishlist>()
            .HasKey(w => new { w.UserId, w.ProductId });

        builder.Entity<Wishlist>()
            .HasOne(w => w.Product)
            .WithMany(p => p.Wishlists)
            .HasForeignKey(w => w.ProductId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<Wishlist>()
            .HasOne(w => w.User)
            .WithMany()
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.NoAction);

        // ServicePackage - Service many-to-one
        builder.Entity<ServicePackage>()
            .HasOne(sp => sp.Service)
            .WithMany(s => s.Packages)
            .HasForeignKey(sp => sp.ServiceId);

        // ServiceBooking - Customer many-to-one
        builder.Entity<ServiceBooking>()
            .HasOne(sb => sb.Customer)
            .WithMany()
            .HasForeignKey(sb => sb.CustomerId)
            .OnDelete(DeleteBehavior.NoAction);

        // BookingItem - ServiceBooking many-to-one
        builder.Entity<BookingItem>()
            .HasOne(bi => bi.ServiceBooking)
            .WithMany(sb => sb.BookingItems)
            .HasForeignKey(bi => bi.ServiceBookingId)
            .OnDelete(DeleteBehavior.Cascade);

        // BookingItem - Service many-to-one
        builder.Entity<BookingItem>()
            .HasOne(bi => bi.Service)
            .WithMany()
            .HasForeignKey(bi => bi.ServiceId)
            .OnDelete(DeleteBehavior.NoAction);

        // BookingItem - ServicePackage many-to-one
        builder.Entity<BookingItem>()
            .HasOne(bi => bi.ServicePackage)
            .WithMany()
            .HasForeignKey(bi => bi.ServicePackageId)
            .OnDelete(DeleteBehavior.NoAction);

        // BookingItem - AssignedStaff many-to-one
        builder.Entity<BookingItem>()
            .HasOne(bi => bi.AssignedStaff)
            .WithMany()
            .HasForeignKey(bi => bi.AssignedStaffId)
            .OnDelete(DeleteBehavior.NoAction);

        // ServiceStaffAssignment - Service many-to-one
        builder.Entity<ServiceStaffAssignment>()
            .HasOne(ssa => ssa.Service)
            .WithMany()
            .HasForeignKey(ssa => ssa.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // ServiceStaffAssignment - Staff many-to-one
        builder.Entity<ServiceStaffAssignment>()
            .HasOne(ssa => ssa.Staff)
            .WithMany()
            .HasForeignKey(ssa => ssa.StaffId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: Mỗi nhân viên chỉ được phân công một lần cho một dịch vụ
        builder.Entity<ServiceStaffAssignment>()
            .HasIndex(ssa => new { ssa.ServiceId, ssa.StaffId })
            .IsUnique();

        // ChatMessage - ConversationSession many-to-one
        builder.Entity<ChatMessage>()
            .HasOne(cm => cm.ConversationSession)
            .WithMany(cs => cs.Messages)
            .HasForeignKey(cm => cm.ConversationSessionId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Configure decimal precision for ServiceBooking and BookingItem
        builder.Entity<ServiceBooking>()
            .Property(sb => sb.TotalPrice)
            .HasPrecision(18, 2);
            
        builder.Entity<BookingItem>()
            .Property(bi => bi.PriceAtBooking)
            .HasPrecision(18, 2);
            
        builder.Entity<BookingItem>()
            .Property(bi => bi.PackagePrice)
            .HasPrecision(18, 2);
            
        // OrderReturn relationships
        builder.Entity<OrderReturn>()
            .HasOne(or => or.Order)
            .WithMany(o => o.Returns)
            .HasForeignKey(or => or.OrderId)
            .OnDelete(DeleteBehavior.NoAction);
            
        builder.Entity<OrderReturnItem>()
            .HasOne(ori => ori.OrderReturn)
            .WithMany(or => or.Items)
            .HasForeignKey(ori => ori.OrderReturnId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<OrderReturnItem>()
            .HasOne(ori => ori.OrderItem)
            .WithMany()
            .HasForeignKey(ori => ori.OrderItemId)
            .OnDelete(DeleteBehavior.NoAction);
            
        builder.Entity<OrderReturnExchangeItem>()
            .HasOne(orie => orie.OrderReturn)
            .WithMany(or => or.ExchangeItems)
            .HasForeignKey(orie => orie.OrderReturnId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<OrderReturnExchangeItem>()
            .HasOne(orie => orie.Product)
            .WithMany()
            .HasForeignKey(orie => orie.ProductId)
            .OnDelete(DeleteBehavior.NoAction);
            
        // Configure decimal precision for OrderReturn
        builder.Entity<OrderReturn>()
            .Property(or => or.RefundAmount)
            .HasPrecision(18, 2);
            
        builder.Entity<OrderReturnExchangeItem>()
            .Property(orie => orie.UnitPrice)
            .HasPrecision(18, 2);
            
        // OrderCancellation relationships
        builder.Entity<OrderCancellation>()
            .HasOne(oc => oc.Order)
            .WithMany(o => o.Cancellations)
            .HasForeignKey(oc => oc.OrderId)
            .OnDelete(DeleteBehavior.NoAction);
            
        builder.Entity<OrderCancellation>()
            .HasOne(oc => oc.Customer)
            .WithMany()
            .HasForeignKey(oc => oc.CustomerId)
            .OnDelete(DeleteBehavior.NoAction);
            
        builder.Entity<OrderCancellation>()
            .HasOne(oc => oc.Processor)
            .WithMany()
            .HasForeignKey(oc => oc.ProcessedBy)
            .OnDelete(DeleteBehavior.NoAction);
    }
}