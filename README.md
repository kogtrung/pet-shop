<div align="center">

# 🐾 PetShop Platform
### Hệ Thống Quản Lý Cửa Hàng Thú Cưng Đa Nền Tảng

[![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://microsoft.com/sql-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **PetShop Platform** là giải pháp phần mềm One-Stop-Shop (Tất cả trong một) dành cho các trung tâm thú cưng, spa, và phòng khám thú y. Khai thác sức mạnh của hệ sinh thái phần mềm hiện đại **.NET 9** (Backend) và **React 19** (Frontend), tích hợp **Trí Tuệ Nhân Tạo (AI)** và cổng thanh toán nội địa uy tín.

</div>

---

## 📑 Mục Lục
- [🌟 Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🛠️ Công Nghệ Sử Dụng (Tech Stack)](#️-công-nghệ-sử-dụng-tech-stack)
- [🏗️ Kiến Trúc Hệ Thống & Module Chức Năng](#️-kiến-trúc-hệ-thống--module-chức-năng)
- [🎭 Trải Nghiệm Người Dùng (Phân Quyền RBAC)](#-trải-nghiệm-người-dùng-phân-quyền-rbac)
- [🧰 Yêu Cầu Cài Đặt (Prerequisites)](#-yêu-cầu-cài-đặt-prerequisites)
- [🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Local](#-hướng-dẫn-cài-đặt--chạy-môi-trường-local)
- [🔐 Biến Môi Trường (Environment Setup)](#-biến-môi-trường-environment-setup)
- [📸 Thư Viện Giao Diện (Screenshots)](#-thư-viện-giao-diện-screenshots)
- [🤝 Đóng Góp (Contributing)](#-đóng-góp-contributing)

---

## 🌟 Tính Năng Nổi Bật

| Cấu Phần | Đặc Điểm Cốt Lõi |
| :--- | :--- |
| **🛍️ Cửa Hàng E-Commerce** | Quản lý sản phẩm đa hệ, giỏ hàng, tích hợp lọc & tìm kiếm thông minh, tính trực tiếp phí gửi hàng/khuyến mãi. |
| **🗓️ Hệ Thống Booking Dịch Vụ** | Đặt lịch **Spa/Chăm sóc**, theo dõi "Walk-In Booking" tại quầy, tự động phân công nhân sự theo ca trực, tích điểm. |
| **💳 Thanh Toán Trực Tuyến** | Tích hợp sâu **Ví điện tử MoMo**, webhook an toàn, xử lý tự động hoàn trả (refund) / huỷ lệnh thanh toán (Timeout 15 mins). |
| **🔄 Xử Lý Đơn Hàng Thông Minh** | Quy trình Hủy/Đổi/Trả đơn tiêu chuẩn, đối soát công nợ, in biên lai/hóa đơn tự động ngay trên trình duyệt. |
| **🤖 Trợ Lý Ảo Chatbot AI** | Tích hợp **Google Gemini AI SDK**, học dữ liệu chuyên khảo thú y, đưa ra lời khuyên chăm sóc thú cưng 24/7. |
| **📧 Giao Tiếp Đa Kênh** | Automated Email Marketing qua **MailKit (SMTP)** thông báo xác thực, hoá đơn, khôi phục mật khẩu. |
| **📊 Quản Trị Trung Tâm (Dashboard)**| Báo cáo doanh thu thời gian thực, bảng điều khiển với Micro-interactions chống lag (Silent Refresh Polling). |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

Hệ thống được tối ưu hóa cho hiệu năng cao, mở rộng linh hoạt, chia thành 2 sub-repositories chính.

### 💻 Backend (Thư mục `PetShopAPI/`)
- Môi trường: `.NET 9 SDK` & `ASP.NET Core Web API`
- Cơ sở dữ liệu: `SQL Server 2022+` & `Entity Framework Core 9`
- Phân quyền: `ASP.NET Identity` kết hợp `JSON Web Tokens (JWT)` Auth.
- API Documentation: `Swagger / OpenAPI`
- Tích hợp nội dung ngoài: `Google.GenerativeAI (Gemini NLP)`, `MoMo Payment Gateway SDK`, `MailKit / MimeKit`

### 🎨 Frontend (Thư mục `petshop-client/`)
- Môi trường: `NodeJS` với Engine `Vite` cực nhanh
- Framework: `React 19` (Functional Components & Hooks nguyên bản)
- Giao diện (UI/UX): `Tailwind CSS 3.4`, `Heroicons`, `Framer Motion` (Animation)
- Mạng / Tương tác API: `Axios` (Interceptors config), `React Router 7`
- Quản trị nội dung text (CMS): `TinyMCE React` Editor

---

## 🏗️ Kiến Trúc Hệ Thống & Module Chức Năng

PetShop sử dụng kiến trúc **Client-Server độc lập**, trao đổi bằng **RESTful API Endpoint**. Phân chia các domain cụ thể:

1. **Product Catalog Module:** Lưu trữ Categories, Brands, Reviews.
2. **Order Management System (OMS):** Lifecycle đơn hàng, tạo Invoice, Yêu cầu Trả hàng (Returns), Background Tasks (Hủy đơn quá hạn thanh toán).
3. **Staff Shift & Availability:** Quản lý ca trực, kiểm tra trạng thái **Bận/Rảnh** của nhân sự để tránh trùng lặp Booking.
4. **CRM & Activity Tracking:** Audit logs, đánh giá sản phẩm, quản lý tệp khách hàng.

---

## 🎭 Trải Nghiệm Người Dùng (Phân Quyền RBAC)

| Vai trò | Phân quyền truy cập |
| :--- | :--- |
| **👤 Khách Viếng Thăm** | Xem danh mục sản phẩm, theo dõi bài viết, trò chuyện AI Chatbot tư vấn, Đăng ký/đăng nhập. |
| **🧑‍💻 Khách Hàng (User)** | Quản lý profile, đặt hàng/lịch hẹn, theo dõi trạng thái, thanh toán MoMo, Đổi trả hàng hóa, tích lũy điểm thẻ. |
| **👨‍💼 Nhân Viên Bán Hàng** | Truy cập POS Sale, Walk-In Booking, xử lý đơn hàng/hóa đơn, tạo phiếu đổi trả, kiểm tra tồn kho. |
| **🛠️ Phụ Tá Dịch Vụ** | Dashboard theo dõi phân công lịch chăm sóc, cập nhật trạng thái "Hoàn thành" công việc, xem lịch làm việc. |
| **👑 Quản Trị Viên (Admin)** | Toàn quyền kiểm soát hệ thống, CRUD Users, Dashboard báo cáo tài chính, thiết lập Master Data (Khuyến mãi, Banner, Dịch vụ). |

---

## 🧰 Yêu Cầu Cài Đặt (Prerequisites)

Hãy đảm bảo thiết bị của bạn đã cài đặt các thành phần nền tảng:

- `Git` bản mới nhất.
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/) hoặc [20.x LTS](https://nodejs.org/)
- [SQL Server Developer/Express](https://www.microsoft.com/sql-server/sql-server-downloads) & SSMS / Azure Data Studio.
- IDE tuỳ chọn: `Visual Studio 2022` hoặc `Visual Studio Code`.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

Clone dự án với Git:
```bash
git clone https://github.com/kogtrung/pet-shop.git
cd pet-shop
```

### 1️⃣ Khởi Chạy Backend API
Mở cửa sổ terminal, điều hướng đến phân vùng `PetShopAPI`:

```bash
cd PetShopAPI

# 1. Cài đặt các packages/dependencies
dotnet restore

# 2. Sinh lịch sử Migration Data
dotnet ef migrations add InitialBaseline

# 3. Áp dụng Model vào CSDL SQL Server
dotnet ef database update

# 4. Khởi chạy Server (Mặc định Port 5200)
dotnet run
```
👉 Truy cập **Swagger API Testing Docs**: `http://localhost:5200/swagger`

### 2️⃣ Khởi Chạy Frontend Client
Mở cửa sổ terminal phân vùng `petshop-client`:

```bash
cd petshop-client

# 1. Cài đặt Node Modules (Lần đầu)
npm install

# 2. Chạy môi trường Development với Vite
npm run dev
```
👉 Truy cập **PetShop Web Application**: `http://localhost:5173`

---

## 🔐 Biến Môi Trường (Environment Setup)

Hệ thống thiết lập thông qua tệp `.env` để bảo đảm tuân thủ chu trình phát triển (GitIgnore).

**Tệp `PetShopAPI/.env` (Tạo mới):**
```env
# 🐘 SQL Server Connection String
ConnectionStrings__Default=Server=localhost;Database=PetShopDb;Trusted_Connection=True;TrustServerCertificate=True;

# 🔑 Thiết lập Bảo mật Authenticator
Jwt__Key=CHUOI_KY_TU_RAT_BAO_MAT_TREN_32_KY_TU__API_PETSHOP
Jwt__Issuer=PetShopAPI
Jwt__Audience=PetShopClient

# 📡 Cloud API Keys (Lấy tại Dev Console)
ApiKeys__Gemini=YOUR_GOOGLE_GEMINI_API_KEY
MoMo__PartnerCode=MOMO
MoMo__AccessKey=YOUR_MOMO_ACCESS_KEY
MoMo__SecretKey=YOUR_MOMO_SECRET_KEY

# 📨 SMTP Email Service (Cấu hình Gmail App Password)
EmailSettings__SmtpUsername=admin_petshop@gmail.com
EmailSettings__SmtpPassword=xxxxxxxxxxxx
```

**Tệp `petshop-client/.env` (Tạo mới):**
```env
VITE_API_BASE_URL=http://localhost:5200
```

---

## 🤝 Đóng Góp (Contributing)

Đội ngũ chúng tôi rất sẵn sàng đón nhận những đóng góp, vá lỗi đến từ thành viên tổ chức open-source.

1. Khởi tạo một bản `Fork` lưu trữ.
2. Thiết lập nhánh chức năng độc lập: `git checkout -b feature/AdvancedCart`.
3. Lưu bản commit hoàn chỉnh: `git commit -m 'feat: Add Advanced Cart Calculation'`.
4. Gửi mã lên hệ thống lưu trữ Github: `git push origin feature/AdvancedCart`.
5. Thiết lập **Pull Request** cho quản trị viên xem xét. 

---
<div align="center">
  <i>Được thiết kế cho thế giới diệu kỳ của thú cưng ❤️ Developed by PetShop Team</i>
</div>
