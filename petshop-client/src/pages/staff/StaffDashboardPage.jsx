import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllOrders } from '../../api/orderApi';
import { getAllServiceBookings } from '../../api/serviceBookingApi';
import { 
    ShoppingBagIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    CurrencyDollarIcon,
    UsersIcon,
    ExclamationTriangleIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Dashboard Card Component
function DashboardCard({ title, value, icon, badgeColor = 'bg-indigo-100 text-indigo-700', subtitle, link }) {
    const content = (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
                {subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );

    if (link) {
        return <Link to={link}>{content}</Link>;
    }
    return content;
}

// Alert Card Component
function AlertCard({ type, title, message, count, link, icon: Icon }) {
    const colors = {
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
        danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    };

    const content = (
        <div className={`rounded-xl border p-4 ${colors[type]} flex items-center justify-between hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm opacity-90">{message}</p>
                </div>
            </div>
            {count > 0 && (
                <span className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 font-bold text-lg">
                    {count}
                </span>
            )}
        </div>
    );

    if (link) {
        return <Link to={link}>{content}</Link>;
    }
    return content;
}

export default function StaffDashboardPage() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        productRevenueToday: 0,
        todayOrders: 0,
        todayCustomers: 0,
        serviceTotal: 0,
        serviceCompleted: 0,
        servicePaid: 0,
        servicePendingPayment: 0,
        serviceRevenueToday: 0,
        serviceBookingsToday: 0,
        totalRevenueToday: 0,
        overallProductRevenue: 0,
        overallServiceRevenue: 0,
        overallRevenue: 0
    });
    const [loading, setLoading] = useState(true);
    // Get today's date in local timezone
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [selectedDate, setSelectedDate] = useState(getTodayDateString()); // Today by default

    useEffect(() => {
        loadDashboard();
    }, [selectedDate]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const orderRes = await fetchAllOrders().catch(err => {
                console.error('Error loading orders:', err);
                return { data: { items: [] } };
            });
            const bookingRes = await getAllServiceBookings({ pageSize: 200 }).catch(err => {
                console.error('Error loading service bookings:', err);
                return { data: { items: [] } };
            });

            const orders = orderRes.data?.items || orderRes.data || [];
            const bookingsPayload = bookingRes.data?.items || bookingRes.data?.data || bookingRes.data || [];
            const bookings = Array.isArray(bookingsPayload?.items)
                ? bookingsPayload.items
                : Array.isArray(bookingsPayload)
                    ? bookingsPayload
                    : [];

            // Filter selected date's data
            const selectedDateObj = new Date(selectedDate);
            selectedDateObj.setHours(0, 0, 0, 0);
            const selectedDateStr = selectedDateObj.toDateString();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toDateString();

            const selectedDateOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === selectedDateStr;
            });

            const todayOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === todayStr;
            });

            const selectedDateCompletedOrders = selectedDateOrders.filter(
                o => o.status === 'Completed' || o.status === 'Delivered'
            );

            const todayCompletedOrders = todayOrders.filter(
                o => o.status === 'Completed' || o.status === 'Delivered'
            );

            // Calculate revenue excluding shipping fee - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const productRevenueSelectedDate = selectedDateCompletedOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return (status === 'COMPLETED' || status === 'DELIVERED') && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const productRevenueToday = todayCompletedOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return (status === 'COMPLETED' || status === 'DELIVERED') && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            
            const getComparableDate = (booking) => {
                const dateValue = booking?.createdAt || booking?.startTime || booking?.updatedAt;
                if (!dateValue) return null;
                const d = new Date(dateValue);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            const bookingSelectedDate = bookings.filter(b => {
                const bookingDate = getComparableDate(b);
                return bookingDate && bookingDate.toDateString() === selectedDateStr;
            });
            
            const bookingToday = bookings.filter(b => {
                const bookingDate = getComparableDate(b);
                return bookingDate && bookingDate.toDateString() === todayStr;
            });

            const paidBookings = bookings.filter(b => (b.paymentStatus || '').toLowerCase() === 'paid');
            const completedBookings = bookings.filter(b => (b.status || '').toLowerCase() === 'completed');
            const pendingPaymentBookings = bookings.filter(
                b => (b.status || '').toLowerCase() === 'completed' && (b.paymentStatus || '').toLowerCase() !== 'paid'
            );

            // Service revenue - filter by payment date (updatedAt) for selected date, not booking date
            const serviceRevenueSelectedDate = bookings
                .filter(b => {
                    // Check if payment was made on selected date
                    const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                    if (!paymentDate) return false;
                    const paymentDateObj = new Date(paymentDate);
                    paymentDateObj.setHours(0, 0, 0, 0);
                    return paymentDateObj.toDateString() === selectedDateStr &&
                           (b.paymentStatus || '').toLowerCase() === 'paid';
                })
                .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
            
            const serviceRevenueToday = bookings
                .filter(b => {
                    const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                    if (!paymentDate) return false;
                    const paymentDateObj = new Date(paymentDate);
                    paymentDateObj.setHours(0, 0, 0, 0);
                    return paymentDateObj.toDateString() === todayStr &&
                           (b.paymentStatus || '').toLowerCase() === 'paid';
                })
                .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
            
            const totalRevenueSelectedDate = productRevenueSelectedDate + serviceRevenueSelectedDate;

            // Calculate all stats
            const totalOrders = orders.length;
            const pendingOrders = orders.filter(
                o => o.status === 'Pending' || o.status === 'Processing'
            ).length;
            const completedOrdersList = orders.filter(
                o => o.status === 'Completed' || o.status === 'Delivered'
            );
            const cancelledOrders = orders.filter(
                o => o.status === 'Cancelled'
            ).length;
            const completedOrders = completedOrdersList.length;
            // Calculate overall revenue excluding shipping fee - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const productRevenueOverall = completedOrdersList
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return (status === 'COMPLETED' || status === 'DELIVERED') && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const serviceRevenueOverall = paidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
            const overallRevenue = productRevenueOverall + serviceRevenueOverall;

            setStats({
                totalOrders,
                pendingOrders,
                completedOrders,
                cancelledOrders,
                productRevenueToday: productRevenueSelectedDate,
                todayOrders: selectedDateOrders.length,
                serviceTotal: bookings.length,
                serviceCompleted: completedBookings.length,
                servicePaid: paidBookings.length,
                servicePendingPayment: pendingPaymentBookings.length,
                serviceRevenueToday: serviceRevenueSelectedDate,
                serviceBookingsToday: bookingSelectedDate.length,
                totalRevenueToday: totalRevenueSelectedDate,
                overallProductRevenue: productRevenueOverall,
                overallServiceRevenue: serviceRevenueOverall,
                overallRevenue
            });
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
            toast.error('Không thể tải tổng quan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tổng quan bán hàng</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Theo dõi nhanh tình hình đơn hàng và hoạt động bán hàng
                </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn ngày:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={getTodayDateString()}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Alerts */}
                    {(stats.pendingOrders > 0 || stats.servicePendingPayment > 0) && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                                Cảnh báo
                            </h2>
                            {stats.pendingOrders > 0 && (
                            <AlertCard
                                type="warning"
                                title="Đơn hàng chờ xử lý"
                                message={`Có ${stats.pendingOrders} đơn hàng cần xử lý`}
                                count={stats.pendingOrders}
                                link="/staff/orders?status=Pending"
                                icon={ClockIcon}
                            />
                            )}
                            {stats.servicePendingPayment > 0 && (
                                <AlertCard
                                    type="info"
                                    title="Lịch hẹn hoàn tất chưa thu tiền"
                                    message={`Có ${stats.servicePendingPayment} lịch hẹn đã hoàn thành cần thanh toán`}
                                    count={stats.servicePendingPayment}
                                    link="/staff/service-payments?filter=pending"
                                    icon={CalendarDaysIcon}
                                />
                            )}
                        </div>
                    )}

                    {/* Selected Date's Stats */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Doanh thu & hoạt động {selectedDate === getTodayDateString() ? 'hôm nay' : `ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}`}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <DashboardCard
                                title="Doanh thu sản phẩm"
                                value={`${stats.productRevenueToday.toLocaleString('vi-VN')} ₫`}
                                subtitle={`Tổng: ${stats.overallProductRevenue.toLocaleString('vi-VN')} ₫`}
                                icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500" />}
                                badgeColor="bg-green-100 text-green-700"
                            />
                            <DashboardCard
                                title="Doanh thu dịch vụ"
                                value={`${stats.serviceRevenueToday.toLocaleString('vi-VN')} ₫`}
                                subtitle={`Tổng: ${stats.overallServiceRevenue.toLocaleString('vi-VN')} ₫`}
                                icon={<CalendarDaysIcon className="w-8 h-8 text-purple-500" />}
                                badgeColor="bg-purple-100 text-purple-700"
                            />
                            <DashboardCard
                                title="Tổng doanh thu"
                                value={`${stats.totalRevenueToday.toLocaleString('vi-VN')} ₫`}
                                subtitle={`Tổng: ${stats.overallRevenue.toLocaleString('vi-VN')} ₫`}
                                icon={<CurrencyDollarIcon className="w-8 h-8 text-indigo-500" />}
                                badgeColor="bg-indigo-100 text-indigo-700"
                            />
                            <DashboardCard
                                title={`Đơn hàng ${selectedDate === getTodayDateString() ? 'hôm nay' : ''}`}
                                value={stats.todayOrders}
                                subtitle={`Lịch dịch vụ: ${stats.serviceBookingsToday}`}
                                icon={<ShoppingBagIcon className="w-8 h-8 text-blue-500" />}
                                badgeColor="bg-blue-100 text-blue-700"
                            />
                        </div>
                    </div>

                    {/* Overall Stats */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tổng quan đơn hàng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <DashboardCard
                                title="Tổng đơn hàng"
                                value={stats.totalOrders}
                                icon={<ShoppingBagIcon className="w-8 h-8 text-indigo-500" />}
                                link="/staff/orders"
                            />
                            <DashboardCard
                                title="Đang xử lý"
                                value={stats.pendingOrders}
                                icon={<ClockIcon className="w-8 h-8 text-orange-500" />}
                                badgeColor="bg-orange-100 text-orange-700"
                                link="/staff/orders?status=Pending"
                            />
                            <DashboardCard
                                title="Hoàn thành"
                                value={stats.completedOrders}
                                icon={<CheckCircleIcon className="w-8 h-8 text-emerald-500" />}
                                badgeColor="bg-emerald-100 text-emerald-700"
                                link="/staff/orders?status=Completed"
                            />
                            <DashboardCard
                                title="Đã hủy"
                                value={stats.cancelledOrders}
                                icon={<XCircleIcon className="w-8 h-8 text-red-500" />}
                                badgeColor="bg-red-100 text-red-700"
                                link="/staff/orders?status=Cancelled"
                            />
                        </div>
                    </div>

                    {/* Service Stats */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Thống kê dịch vụ & lịch hẹn</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <DashboardCard
                                title="Tổng lịch hẹn"
                                value={stats.serviceTotal}
                                icon={<CalendarDaysIcon className="w-8 h-8 text-indigo-500" />}
                                link="/staff/service-payments"
                            />
                            <DashboardCard
                                title="Đã hoàn thành"
                                value={stats.serviceCompleted}
                                icon={<CheckCircleIcon className="w-8 h-8 text-emerald-500" />}
                                badgeColor="bg-emerald-100 text-emerald-700"
                                link="/staff/service-payments?filter=completed"
                            />
                            <DashboardCard
                                title="Đã thanh toán"
                                value={stats.servicePaid}
                                icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500" />}
                                badgeColor="bg-green-100 text-green-700"
                            />
                            <DashboardCard
                                title="Chờ thanh toán"
                                value={stats.servicePendingPayment}
                                icon={<ClockIcon className="w-8 h-8 text-orange-500" />}
                                badgeColor="bg-orange-100 text-orange-700"
                                link="/staff/service-payments?filter=pending"
                            />
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Thao tác nhanh</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Link
                                to="/staff/pos"
                                className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <ShoppingBagIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Tạo hóa đơn</p>
                                        <p className="text-sm opacity-90">Bán hàng tại quầy</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                to="/staff/orders"
                                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <ShoppingBagIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Quản lý đơn hàng</p>
                                        <p className="text-sm opacity-90">Xem và xử lý đơn</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                to="/staff/inventory"
                                className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <ShoppingBagIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Kiểm tra tồn kho</p>
                                        <p className="text-sm opacity-90">Xem số lượng sản phẩm</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                to="/staff/service-payments"
                                className="bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <CalendarDaysIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Thống kê lịch dịch vụ</p>
                                        <p className="text-sm opacity-90">Theo dõi & thu tiền dịch vụ</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
