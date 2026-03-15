import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/account/ProfilePage';
import OrderHistoryPage from './pages/account/OrderHistoryPage';
import WishlistPage from './pages/account/WishlistPage';
import MyReviewsPage from './pages/account/MyReviewsPage';
import PageDetailPage from './pages/PageDetailPage';
import PageListPage from './pages/PageListPage';
import Chatbot from './components/chatbot/Chatbot'; // Added import for Chatbot

// Service pages
import ServiceListPage from './pages/ServiceListPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import MyBookingsPage from './pages/account/MyBookingsPage';
import BookingDetailPage from './pages/account/BookingDetailPage.jsx';
import ServiceBookingPage from './pages/ServiceBookingPage';

import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import ManageOrdersPage from './pages/admin/ManageOrdersPage';
import ManageOrderReturnsPage from './pages/admin/ManageOrderReturnsPage';
import ManageOrderCancellationsPage from './pages/admin/ManageOrderCancellationsPage';
import StaffOrderReturnsPage from './pages/staff/StaffOrderReturnsPage';
import ManageBookingsPage from './pages/admin/ManageBookingsPage';
import ManageProductsPage from './pages/admin/ManageProductsPage';
import ManageBrandsPage from './pages/admin/ManageBrandsPage';
import ManageCategoriesPage from './pages/admin/ManageCategoriesPage';
import ManagePagesPage from './pages/admin/ManagePagesPage';
import ManageReviewsPage from './pages/admin/ManageReviewsPage';
import ChatFeedbackPage from './pages/admin/ChatFeedbackPage';
import ManageServicesPage from './pages/admin/ManageServicesPage.jsx';
import ManageUsersPage from './pages/admin/ManageUsersPage.jsx';
import RevenuePage from './pages/admin/RevenuePage.jsx';
import PromotionsPage from './pages/admin/PromotionsPage.jsx';
import ServiceStaffPage from './pages/admin/ServiceStaffPage.jsx';
import BannerManagementPage from './pages/admin/BannerManagementPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import AnalyticsPage from './pages/admin/AnalyticsPage.jsx';
import ServiceStaffLayout from './pages/service-staff/ServiceStaffLayout.jsx';
import ServiceStaffDashboardPage from './pages/service-staff/ServiceStaffDashboardPage.jsx';
import ServiceStaffBookingsPage from './pages/service-staff/ServiceStaffBookingsPage.jsx';
import ServiceStaffCatalogPage from './pages/service-staff/ServiceStaffCatalogPage.jsx';
import ServiceStaffPetProfilesPage from './pages/service-staff/ServiceStaffPetProfilesPage.jsx';
import ServiceStaffCustomerSupportPage from './pages/service-staff/ServiceStaffCustomerSupportPage.jsx';
import StaffLayout from './pages/staff/StaffLayout.jsx';
import StaffDashboardPage from './pages/staff/StaffDashboardPage.jsx';
import StaffPOSPage from './pages/staff/StaffPOSPage.jsx';
import StaffOrdersPage from './pages/staff/StaffOrdersPage.jsx';
import StaffInventoryPage from './pages/staff/StaffInventoryPage.jsx';
import StaffCustomersPage from './pages/staff/StaffCustomersPage.jsx';
import StaffChatPage from './pages/staff/StaffChatPage.jsx';
import StaffProductsPage from './pages/staff/StaffProductsPage.jsx';
import StaffReportsPage from './pages/staff/StaffReportsPage.jsx';
import StaffServicePaymentsPage from './pages/staff/StaffServicePaymentsPage.jsx';
import StaffWalkInBookingPage from './pages/staff/StaffWalkInBookingPage.jsx';
import StaffServiceReportsPage from './pages/staff/StaffServiceReportsPage.jsx';
import PaymentDemoPage from './pages/PaymentDemoPage.jsx';
import PaymentCallbackPage from './pages/PaymentCallbackPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function AppContent() {
    const { isServiceStaff, isSaleStaff, isAdmin } = useAuth();
    const location = useLocation();
    
    // Kiểm tra xem có phải admin/staff route không
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isStaffRoute = location.pathname.startsWith('/staff');
    const isServiceStaffRoute = location.pathname.startsWith('/service-staff');
    const isManagementRoute = isAdminRoute || isStaffRoute || isServiceStaffRoute;

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans">
            {!isManagementRoute && <Header />}
            <main className={isManagementRoute ? "flex-grow" : "flex-grow container mx-auto px-4 py-8"}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/pages" element={<PageListPage />} />
                    <Route path="/page/:slug" element={<PageDetailPage />} />
                    <Route path="/pages/:slug" element={<PageDetailPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/products" element={<ProductListPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/payment-demo" element={<PaymentDemoPage />} />
                    <Route path="/payment/momo/callback" element={<PaymentCallbackPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/account/profile" element={<ProfilePage />} />
                    <Route path="/account/orders" element={<OrderHistoryPage />} />
                    <Route path="/account/wishlist" element={<WishlistPage />} />
                    <Route path="/account/reviews" element={<MyReviewsPage />} />
                    <Route path="/account/bookings" element={<MyBookingsPage />} />
                    <Route path="/account/bookings/:id" element={<BookingDetailPage />} />
                    <Route path="/services" element={<ServiceListPage />} />
                    <Route path="/services/:id" element={<ServiceDetailPage />} />
                    <Route path="/service-booking" element={<ServiceBookingPage />} />
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<DashboardPage />} />
                        {/* Quản lý bán hàng */}
                        <Route path="products" element={<ManageProductsPage />} />
                        <Route path="categories" element={<ManageCategoriesPage />} />
                        <Route path="brands" element={<ManageBrandsPage />} />
                        <Route path="orders" element={<ManageOrdersPage />} />
                        <Route path="order-returns" element={<ManageOrderReturnsPage />} />
                        <Route path="order-cancellations" element={<ManageOrderCancellationsPage />} />
                        <Route path="reviews" element={<ManageReviewsPage />} />
                        <Route path="promotions" element={<PromotionsPage />} />
                        {/* Quản lý dịch vụ */}
                        <Route path="services" element={<ManageServicesPage />} />
                        <Route path="bookings" element={<ManageBookingsPage />} />
                        <Route path="service-staff" element={<ServiceStaffPage />} />
                        {/* Quản lý người dùng */}
                        <Route path="users" element={<ManageUsersPage />} />
                        {/* Báo cáo & Tài chính */}
                        <Route path="revenue" element={<RevenuePage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        {/* Quản lý nội dung */}
                        <Route path="pages" element={<ManagePagesPage />} />
                        <Route path="banners" element={<BannerManagementPage />} />
                        {/* Cài đặt hệ thống */}
                        <Route path="settings" element={<SettingsPage />} />
                        {/* Phân tích & Gợi ý */}
                        <Route path="analytics" element={<AnalyticsPage />} />
                    </Route>
                    {(isServiceStaff || isAdmin) && (
                        <Route path="/service-staff" element={<ServiceStaffLayout />}>
                            <Route index element={<ServiceStaffDashboardPage />} />
                            {/* Lịch hẹn */}
                            <Route path="bookings" element={<ServiceStaffBookingsPage />} />
                            {/* Dịch vụ */}
                            <Route path="catalog" element={<ServiceStaffCatalogPage />} />
                            {/* Hồ sơ thú cưng */}
                            <Route path="pets" element={<ServiceStaffPetProfilesPage />} />
                            {/* Hỗ trợ khách hàng */}
                            <Route path="customer-support" element={<ServiceStaffCustomerSupportPage />} />
                            {/* Thông tin cá nhân */}
                            <Route path="profile" element={<ProfilePage />} />
                        </Route>
                    )}
                    {(isSaleStaff || isAdmin) && (
                        <Route path="/staff" element={<StaffLayout />}>
                            <Route index element={<StaffDashboardPage />} />
                            {/* Bán hàng tại cửa hàng */}
                            <Route path="pos" element={<StaffPOSPage />} />
                            <Route path="walk-in-booking" element={<StaffWalkInBookingPage />} />
                            <Route path="service-payments" element={<StaffServicePaymentsPage />} />
                            {/* Quản lý đơn hàng */}
                            <Route path="orders" element={<StaffOrdersPage />} />
                            <Route path="order-returns" element={<StaffOrderReturnsPage />} />
                            {/* Sản phẩm & Tồn kho */}
                            <Route path="products" element={<StaffProductsPage />} />
                            <Route path="inventory" element={<StaffInventoryPage />} />
                            {/* Khách hàng */}
                            <Route path="customers" element={<StaffCustomersPage />} />
                            <Route path="chat" element={<StaffChatPage />} />
                            {/* Báo cáo */}
                            <Route path="reports" element={<StaffReportsPage />} />
                            <Route path="service-reports" element={<StaffServiceReportsPage />} />
                            {/* Thông tin cá nhân */}
                            <Route path="profile" element={<ProfilePage />} />
                        </Route>
                    )}
                    {/* Thêm các route khác ở đây */}
                </Routes>
            </main>
            {!isManagementRoute && <Footer />}
            {!isManagementRoute && <Chatbot />}
        </div>
    );
}

function App() {
    return <AppContent />;
}

export default App;