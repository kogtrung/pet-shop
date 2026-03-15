# 📘 PetShop API Specification

**Version:** 2.1  
**Base URL:** `/api`  
**Tech Stack:** ASP.NET Core 8, Entity Framework Core, SQL Server  
**Auth:** JWT Bearer

---

## 🎯 Mục tiêu tài liệu

Đây là tài liệu đặc tả API duy nhất cho PetShop, dùng làm chuẩn cho:
- 🧭 Endpoint contract (route, quyền, hành vi)
- 🏗️ Phạm vi triển khai module
- 🛡️ Quy ước lỗi, bảo mật và vận hành

---

## 🌐 Tổng quan API

- Tổng endpoint đã triển khai: **72+**
- Nhóm nghiệp vụ: Catalog, Inventory, Order, Review, Wishlist, Service Booking, Newsletter, CMS, Profile, Chatbot
- Vai trò hệ thống: `Admin`, `SaleStaff`, `ServiceStaff`, `User`, `Anonymous`

---

## 🔐 Xác thực và phân quyền

### JWT Bearer

```http
Authorization: Bearer <access_token>
```

### Ma trận quyền truy cập

| Nhóm API | Anonymous | User | Admin/Staff | Admin |
|---|---|---|---|---|
| Product / Brand / Category / Page (đọc) | ✅ | ✅ | ✅ | ✅ |
| Wishlist / Review / Profile / My Booking | ❌ | ✅ | ✅ | ✅ |
| Inventory / Order / Service Booking Management | ❌ | ❌ | ✅ | ✅ |
| CMS/Product/Brand/Category (ghi) | ❌ | ❌ | ✅ | ✅ |
| Xóa tài nguyên nhạy cảm | ❌ | ❌ | ⚠️ | ✅ |

---

## 📬 Chuẩn response và lỗi

### Success status

- `200 OK` — truy vấn/cập nhật thành công
- `201 Created` — tạo mới thành công
- `204 No Content` — xóa thành công

### Error status

- `400 Bad Request` — đầu vào không hợp lệ
- `401 Unauthorized` — thiếu hoặc sai token
- `403 Forbidden` — không đủ quyền
- `404 Not Found` — không tìm thấy tài nguyên
- `409 Conflict` — xung đột nghiệp vụ
- `500 Internal Server Error` — lỗi hệ thống

Ví dụ:

```json
{
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}
```

---

## 🧩 Danh mục endpoint theo module

### 🛍️ Product (`/api/product`)

- `GET /api/product`
- `GET /api/product/{id}`
- `POST /api/product`
- `PUT /api/product/{id}`
- `DELETE /api/product/{id}`
- `GET /api/product/{productId}/images`
- `POST /api/product/{productId}/images`
- `PUT /api/product/{productId}/images/{imageId}`
- `DELETE /api/product/{productId}/images/{imageId}`
- `PUT /api/product/{productId}/images/{imageId}/set-primary`

Điểm nổi bật:
- Tìm kiếm/lọc theo thương hiệu, giá, featured
- Quản lý media image/video (`MediaType`)
- Liên kết category + inventory

### 🏷️ Brand (`/api/brand`)

- `GET /api/brand`
- `GET /api/brand/{id}`
- `POST /api/brand`
- `PUT /api/brand/{id}`
- `DELETE /api/brand/{id}`

Điểm nổi bật:
- Validate slug
- Chặn xóa khi còn sản phẩm liên quan

### 🗂️ Category (`/api/category`)

- `GET /api/category`
- `GET /api/category/tree`
- `GET /api/category/{id}`
- `POST /api/category`
- `PUT /api/category/{id}`
- `DELETE /api/category/{id}`

Điểm nổi bật:
- Cấu trúc cây cha-con
- Trạng thái active/inactive

### 📦 Inventory (`/api/inventory`)

- `GET /api/inventory/{productId}`
- `PUT /api/inventory/{productId}`
- `POST /api/inventory/{productId}/adjust`
- `GET /api/inventory/low-stock`

Điểm nổi bật:
- Theo dõi tồn kho + reorder level
- Điều chỉnh tồn có lý do

### 🧾 Order (`/api/order`)

- `GET /api/order`
- `GET /api/order/my-history`
- `GET /api/order/{id}`
- `POST /api/order`
- `PUT /api/order/{id}`
- `DELETE /api/order/{id}`

Điểm nổi bật:
- Lịch sử đơn theo user
- Theo dõi trạng thái đơn và thanh toán

### ⭐ Review (`/api/review`)

- `GET /api/review/product/{productId}`
- `GET /api/review/{id}`
- `POST /api/review`
- `PUT /api/review/{id}`
- `DELETE /api/review/{id}`
- `GET /api/review/user/{userId}`

Điểm nổi bật:
- Đánh giá 1-5 sao
- Chống review trùng
- Ownership check khi sửa/xóa

### 💖 Wishlist (`/api/wishlist`)

- `GET /api/wishlist`
- `POST /api/wishlist`
- `DELETE /api/wishlist/{productId}`
- `DELETE /api/wishlist/clear`

### 🐶 Service (`/api/service`)

- `GET /api/service`
- `GET /api/service/{id}`
- `POST /api/service`
- `PUT /api/service/{id}`
- `DELETE /api/service/{id}`
- `POST /api/service/{serviceId}/packages`
- `PUT /api/service/packages/{packageId}`
- `DELETE /api/service/packages/{packageId}`

Điểm nổi bật:
- Quản lý dịch vụ + gói dịch vụ
- Hỗ trợ giá `PerDay`, `Fixed`, `PerHour`

### 📅 Service Booking (`/api/servicebooking`)

- `GET /api/servicebooking`
- `GET /api/servicebooking/{id}`
- `GET /api/servicebooking/my-bookings`
- `POST /api/servicebooking`
- `PUT /api/servicebooking/{id}/status`
- `DELETE /api/servicebooking/{id}`

Điểm nổi bật:
- Validate lịch đặt
- Tính giá tự động
- Trạng thái: `Pending`, `Confirmed`, `Cancelled`, `Completed`

### 📨 Newsletter (`/api/newsletter`)

- `GET /api/newsletter/subscribers`
- `POST /api/newsletter/subscribe`
- `PUT /api/newsletter/confirm/{id}`
- `DELETE /api/newsletter/unsubscribe`

### 📄 Page CMS (`/api/page`)

- `GET /api/page`
- `GET /api/page/{id}`
- `GET /api/page/slug/{slug}`
- `POST /api/page`
- `PUT /api/page/{id}`
- `DELETE /api/page/{id}`

### 👤 Profile (`/api/profile`)

- `GET /api/profile`
- `GET /api/profile/{userId}`
- `POST /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/{userId}`
- `DELETE /api/profile`

### 🤖 Chat (`/api/chat`)

- `POST /api/chat`

Điểm nổi bật:
- Hỏi đáp sản phẩm/chăm sóc thú cưng bằng AI
- Public endpoint

---

## 🧱 DTO và phạm vi triển khai

Các nhóm DTO đã có đầy đủ CRUD:
- Product, ProductImage
- Brand, Category
- Inventory
- Order, OrderItem
- Review, Wishlist
- Service, ServicePackage, ServiceBooking
- Page, NewsletterSubscriber
- CustomerProfile, Chat

Nguyên tắc:
- Tách DTO `Create`, `Update`, `Response`
- Dùng Data Annotations cho validate
- Không expose trực tiếp entity nội bộ

---

## 📏 Ràng buộc nghiệp vụ quan trọng

- Slug unique cho Brand/Category/Page/Product
- Chặn xóa khi còn dữ liệu phụ thuộc
- Ownership check cho Review/Wishlist/Booking/Profile
- Chống duplicate cho Wishlist/Newsletter/Review
- Tính toán nghiệp vụ cho Order total và Booking total

---

## 🛡️ Bảo mật và vận hành

- JWT + RBAC cho endpoint cần xác thực
- Validate input ở tầng DTO
- Không lưu secrets trong appsettings
- Secrets inject qua `.env` hoặc environment variables

---

## ✅ Trạng thái triển khai

**API Implementation Status:** **COMPLETE**

- 12+ controllers
- 30+ DTO
- 72+ endpoints
- Bao phủ toàn bộ domain e-commerce và dịch vụ hiện có

---

## 🚀 Nâng cấp đề xuất

- Pagination chuẩn hóa cho toàn bộ list endpoints
- Upload media thực tế cho ảnh/video
- Caching bằng Redis cho truy vấn nóng
- Structured logging
- Mở rộng test coverage
