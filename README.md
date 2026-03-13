# 🐾 PetShop Platform - Hệ Thống Quản Lý Cửa Hàng Thú Cưng

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)

> **PetShop Platform** là giải pháp toàn diện cho việc quản lý và vận hành cửa hàng thú cưng, kết hợp sức mạnh của **ASP.NET Core 8 Web API** và giao diện hiện đại **React + Vite**. Hệ thống cung cấp trải nghiệm mua sắm mượt mà cho khách hàng và công cụ quản trị mạnh mẽ cho đội ngũ vận hành.

---

## 🧭 Mục Lục

- [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Kiến Trúc Hệ Thống](#️-kiến-trúc-hệ-thống)
- [🧰 Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [⚙️ Cài Đặt & Cấu Hình](#️-cài-đặt--cấu-hình)
- [🚀 Hướng Dẫn Khởi Chạy](#-hướng-dẫn-khởi-chạy)
- [🧪 Quy Trình Phát Triển](#-quy-trình-phát-triển)
- [🔐 Phân Quyền & Bảo Mật](#-phân-quyền--bảo-mật)
- [📦 Module Nghiệp Vụ](#-module-nghiệp-vụ)
- [📚 Tài Liệu Tham Khảo](#-tài-liệu-tham-khảo)
- [🤝 Đóng Góp](#-đóng-góp)

---

## ✨ Tính Năng Nổi Bật

| Tính Năng | Mô Tả |
| :--- | :--- |
| **🛒 E-commerce** | Catalog sản phẩm, giỏ hàng, đặt hàng, quản lý đơn hàng. |
| **📅 Booking Dịch Vụ** | Đặt lịch spa/chăm sóc thú cưng, quản lý slot, tính giá tự động. |
| **💬 AI Chatbot** | Trợ lý ảo (tích hợp **Gemini AI**) tư vấn sản phẩm và chăm sóc thú cưng. |
| **💳 Thanh Toán** | Tích hợp cổng thanh toán **MoMo** an toàn, tiện lợi. |
| **📧 Email Service** | Gửi email xác nhận đơn hàng, thông báo, newsletter tự động. |
| **👤 Quản Lý User** | Phân quyền chi tiết (Admin, Staff, User), hồ sơ cá nhân, lịch sử mua hàng. |
| **⭐ Tương Tác** | Đánh giá sản phẩm, Yêu thích (Wishlist), Bình luận. |
| **📝 CMS** | Quản lý nội dung trang tĩnh, bài viết tin tức. |

---

## 🛠️ Tech Stack

### Backend (`PetShopAPI`)
- **Framework:** [.NET 8](https://dotnet.microsoft.com/) (ASP.NET Core Web API)
- **Database:** [SQL Server](https://www.microsoft.com/sql-server) + [Entity Framework Core 8](https://learn.microsoft.com/ef/core/)
- **Authentication:** JWT (JSON Web Tokens) + ASP.NET Core Identity
- **AI Integration:** [Google Generative AI SDK](https://ai.google.dev/) (Gemini)
- **Email:** MailKit / MimeKit
- **Payment:** MoMo Payment Gateway Integration
- **Documentation:** Swagger / OpenAPI

### Frontend (`petshop-client`)
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** JavaScript (ES Modules)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + PostCSS
- **UI Components:** Headless UI / Heroicons
- **State/Routing:** React Router DOM v7
- **HTTP Client:** Axios
- **Editor:** TinyMCE React (cho CMS)
- **Animations:** Framer Motion

---

## 🏗️ Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Client-Server** tách biệt:

1.  **Client (Frontend):** SPA (Single Page Application) viết bằng React, giao tiếp với Server qua RESTful API.
2.  **Server (Backend):** Web API xử lý nghiệp vụ, xác thực, và tương tác với Database/Services bên thứ 3.
3.  **Database:** SQL Server lưu trữ dữ liệu quan hệ.
4.  **External Services:**
    *   **Google Gemini:** Xử lý NLP cho Chatbot.
    *   **MoMo:** Xử lý giao dịch thanh toán.
    *   **SMTP Server (Gmail):** Gửi email thông báo.

---

## 🧰 Yêu Cầu Hệ Thống

Trước khi cài đặt, đảm bảo máy bạn đã có:

*   **Runtime:** [.NET SDK 8.0+](https://dotnet.microsoft.com/download)
*   **Runtime:** [Node.js 18+](https://nodejs.org/) (Khuyến nghị bản LTS)
*   **Database:** [SQL Server 2019+](https://www.microsoft.com/sql-server/sql-server-downloads) (Express hoặc Developer)
*   **Tools:** [Git](https://git-scm.com/), VS Code hoặc Visual Studio 2022.

---

## ⚙️ Cài Đặt & Cấu Hình

### 1. Clone Dự Án

```bash
git clone https://github.com/username/PetShop.git
cd PetShop
```

### 2. Cấu Hình Backend (`PetShopAPI`)

Dự án sử dụng cơ chế nạp biến môi trường từ file `.env` để bảo mật.

1.  Tạo file `.env` tại thư mục gốc `PetShop/` hoặc `PetShop/PetShopAPI/`.
2.  Copy nội dung từ `.env.example` và điền giá trị thật của bạn:

```env
# Database
ConnectionStrings__Default=Server=localhost;Database=PetShopDbb;Trusted_Connection=True;TrustServerCertificate=True;

# JWT (Bắt buộc thay đổi key này)
Jwt__Key=YOUR_VERY_SECURE_SECRET_KEY_MIN_32_CHARS
Jwt__Issuer=PetShopAPI
Jwt__Audience=PetShopClient

# API Keys & Services
ApiKeys__Gemini=YOUR_GEMINI_API_KEY
MoMo__PartnerCode=MOMO
MoMo__AccessKey=YOUR_MOMO_ACCESS_KEY
MoMo__SecretKey=YOUR_MOMO_SECRET_KEY

# Email (SMTP)
EmailSettings__SmtpUsername=your_email@gmail.com
EmailSettings__SmtpPassword=your_app_password
```

### 3. Cấu Hình Frontend (`petshop-client`)

1.  Di chuyển vào thư mục frontend: `cd petshop-client`
2.  Tạo file `.env` từ `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5200
```

---

## 🚀 Hướng Dẫn Khởi Chạy

### Bước 1: Khởi Chạy Database & Backend

```bash
cd PetShopAPI

# Khôi phục các thư viện
dotnet restore

# Tạo migration baseline local (khi repo không lưu migration cũ)
dotnet ef migrations add InitialBaseline

# Cập nhật Database
dotnet ef database update

# Chạy ứng dụng
dotnet run
```

*   **API URL:** `http://localhost:5200`
*   **Swagger Docs:** `http://localhost:5200/swagger`

### Bước 2: Khởi Chạy Frontend

Mở một terminal mới:

```bash
cd petshop-client

# Cài đặt thư viện (chỉ cần lần đầu)
npm install

# Chạy server phát triển
npm run dev
```

*   **Web URL:** `http://localhost:5173`

---

## 🧪 Quy Trình Phát Triển

Để đảm bảo chất lượng code và tránh lỗi:

1.  **Backend:**
    *   Khi thay đổi Model (`Models/`), hãy tạo Migration mới: `dotnet ef migrations add <TenMigration>`.
    *   Cập nhật Database: `dotnet ef database update`.
    *   Cập nhật DTO và Controller tương ứng.
2.  **Frontend:**
    *   Kiểm tra `VITE_API_BASE_URL` trỏ đúng port backend.
    *   Sử dụng Tailwind CSS cho styling.
3.  **Documentation:**
    *   Cập nhật file `API_SPECIFICATION.md` nếu có thay đổi về Endpoint API.

---

## 🔐 Phân Quyền & Bảo Mật

Hệ thống sử dụng **Role-Based Access Control (RBAC)**:

*   **Anonymous (Khách):** Xem sản phẩm, bài viết, chat với AI.
*   **User (Thành viên):** Đặt hàng, đặt lịch, quản lý hồ sơ, đánh giá, wishlist.
*   **Staff (Nhân viên):** Xử lý đơn hàng, quản lý kho, quản lý booking.
*   **Admin (Quản trị):** Toàn quyền hệ thống (User, CMS, Cấu hình).

**Lưu ý bảo mật:**
*   File `appsettings.json` không chứa secrets (chỉ có placeholder).
*   Không commit file `.env` chứa key thật lên Git.

---

## 📦 Module Nghiệp Vụ

Chi tiết các module chính trong hệ thống:

*   **🛍️ Catalog:** Quản lý Sản phẩm (Product), Thương hiệu (Brand), Danh mục (Category), Thuộc tính (Attributes).
*   **📦 Inventory:** Quản lý tồn kho, nhập/xuất kho, cảnh báo sắp hết hàng.
*   **🧾 Order:** Quy trình đặt hàng, thanh toán, trạng thái đơn hàng, hoàn/hủy đơn.
*   **📅 Service Booking:** Quản lý dịch vụ (Spa, Hotel), gói dịch vụ, lịch hẹn.
*   **⭐ Engagement:** Đánh giá (Review), Yêu thích (Wishlist), Phản hồi.
*   **📰 Marketing:** Bản tin (Newsletter), Khuyến mãi (Promotion).
*   **🤖 AI Support:** Chatbot tư vấn ngữ cảnh, gợi ý sản phẩm.

---

## 📚 Tài Liệu Tham Khảo

*   📖 [**API Specification**](./PetShopAPI/API_SPECIFICATION.md): Tài liệu chi tiết về các Endpoints, Request/Response mẫu.
*   📁 Mã nguồn frontend: `petshop-client/`.

---

## 🤝 Đóng Góp

Mọi đóng góp đều được hoan nghênh! Vui lòng thực hiện theo các bước:

1.  Fork dự án.
2.  Tạo branch tính năng (`git checkout -b feature/AmazingFeature`).
3.  Commit thay đổi (`git commit -m 'Add some AmazingFeature'`).
4.  Push lên branch (`git push origin feature/AmazingFeature`).
5.  Tạo Pull Request.

---
