import React, { useEffect, useState } from 'react';
import { fetchAllOrders } from '../../api/orderApi';
import { getAllServiceBookings } from '../../api/serviceBookingApi';
import toast from 'react-hot-toast';
import { CurrencyDollarIcon, ShoppingBagIcon, CalendarDaysIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

export default function RevenuePage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        orderRevenue: 0,
        serviceRevenue: 0,
        totalOrders: 0,
        totalBookings: 0,
        todayRevenue: 0,
        thisMonthRevenue: 0
    });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('all'); // all, today, week, month, year, custom
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    useEffect(() => {
        loadRevenueData();
    }, [dateRange, customDateFrom, customDateTo]);

    const loadRevenueData = async () => {
        setLoading(true);
        try {
            const [ordersRes, bookingsRes] = await Promise.all([
                fetchAllOrders().catch(err => {
                    console.error('Error loading orders:', err);
                    return { data: { items: [] } };
                }),
                getAllServiceBookings().catch(err => {
                    console.error('Error loading bookings:', err);
                    return { data: [] };
                })
            ]);

            const orders = ordersRes.data?.items || ordersRes.data || [];
            const bookings = bookingsRes.data || [];

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Filter by date range
            let filteredOrders = orders;
            let filteredBookings = bookings;

            if (dateRange === 'today') {
                filteredOrders = orders.filter(o => new Date(o.createdAt) >= today);
                filteredBookings = bookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() === today.getTime();
                });
            } else if (dateRange === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filteredOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo);
                filteredBookings = bookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= weekAgo;
                });
            } else if (dateRange === 'month') {
                filteredOrders = orders.filter(o => new Date(o.createdAt) >= thisMonth);
                filteredBookings = bookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= thisMonth;
                });
            } else if (dateRange === 'custom' && customDateFrom && customDateTo) {
                const from = new Date(customDateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                filteredOrders = orders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= from && orderDate <= to;
                });
                filteredBookings = bookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= from && bookingDate <= to;
                });
            }

            // Calculate order revenue excluding shipping fee - only count Completed orders that are Paid
            const orderRevenue = filteredOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    // Chỉ tính doanh thu khi đơn hàng đã hoàn thành VÀ đã thanh toán
                    return status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);

            // Service revenue - only count paid bookings
            const serviceRevenue = filteredBookings
                .filter(b => (b.paymentStatus || '').toLowerCase() === 'paid')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            // Calculate today order revenue excluding shipping fee - only count Completed orders that are Paid
            const todayOrderRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    // Chỉ tính doanh thu khi đơn hàng đã hoàn thành VÀ đã thanh toán
                    return orderDate >= today && status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            
            const todayServiceRevenue = bookings
                .filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() === today.getTime() && 
                           (b.paymentStatus || '').toLowerCase() === 'paid';
                })
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            // Calculate this month order revenue excluding shipping fee - only count Completed orders that are Paid
            const thisMonthOrderRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    // Chỉ tính doanh thu khi đơn hàng đã hoàn thành VÀ đã thanh toán
                    return orderDate >= thisMonth && status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            
            const thisMonthServiceRevenue = bookings
                .filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= thisMonth && 
                           (b.paymentStatus || '').toLowerCase() === 'paid';
                })
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            setStats({
                totalRevenue: orderRevenue + serviceRevenue,
                orderRevenue,
                serviceRevenue,
                totalOrders: filteredOrders.length,
                totalBookings: filteredBookings.length,
                todayRevenue: todayOrderRevenue + todayServiceRevenue,
                thisMonthRevenue: thisMonthOrderRevenue + thisMonthServiceRevenue
            });
        } catch (error) {
            console.error('Failed to load revenue data', error);
            toast.error('Không thể tải dữ liệu doanh thu');
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, change }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value} 
                        {typeof value === 'number' && title.includes('doanh thu') && ' ₫'}
                    </p>
                    {change && (
                        <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change > 0 ? <ArrowTrendingUpIcon className="w-4 h-4 inline" /> : <ArrowTrendingDownIcon className="w-4 h-4 inline" />}
                            {Math.abs(change)}%
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Thống kê doanh thu</h1>
                    <p className="text-gray-600 dark:text-gray-400">Theo dõi doanh thu từ đơn hàng và dịch vụ</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => {
                            setDateRange(e.target.value);
                            if (e.target.value !== 'custom') {
                                setCustomDateFrom('');
                                setCustomDateTo('');
                            }
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="all">Tất cả thời gian</option>
                        <option value="today">Hôm nay</option>
                        <option value="week">7 ngày qua</option>
                        <option value="month">Tháng này</option>
                        <option value="custom">Tùy chọn ngày</option>
                    </select>
                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <span className="text-gray-500 dark:text-gray-400">đến</span>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Tổng doanh thu"
                            value={stats.totalRevenue}
                            icon={CurrencyDollarIcon}
                            color="text-indigo-600"
                        />
                        <StatCard
                            title="Doanh thu đơn hàng"
                            value={stats.orderRevenue}
                            icon={ShoppingBagIcon}
                            color="text-green-600"
                        />
                        <StatCard
                            title="Doanh thu dịch vụ"
                            value={stats.serviceRevenue}
                            icon={CalendarDaysIcon}
                            color="text-blue-600"
                        />
                        <StatCard
                            title="Tổng đơn hàng"
                            value={stats.totalOrders}
                            icon={ShoppingBagIcon}
                            color="text-purple-600"
                        />
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Doanh thu hôm nay"
                            value={stats.todayRevenue}
                            icon={CurrencyDollarIcon}
                            color="text-emerald-600"
                        />
                        <StatCard
                            title="Doanh thu tháng này"
                            value={stats.thisMonthRevenue}
                            icon={CurrencyDollarIcon}
                            color="text-orange-600"
                        />
                        <StatCard
                            title="Tổng lịch đặt"
                            value={stats.totalBookings}
                            icon={CalendarDaysIcon}
                            color="text-cyan-600"
                        />
                    </div>

                    {/* Revenue Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Phân tích doanh thu</h2>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Đơn hàng</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {stats.orderRevenue.toLocaleString('vi-VN')} ₫
                                        ({stats.totalRevenue > 0 ? ((stats.orderRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-green-600 h-2 rounded-full" 
                                        style={{ width: `${stats.totalRevenue > 0 ? (stats.orderRevenue / stats.totalRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Dịch vụ</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {stats.serviceRevenue.toLocaleString('vi-VN')} ₫
                                        ({stats.totalRevenue > 0 ? ((stats.serviceRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${stats.totalRevenue > 0 ? (stats.serviceRevenue / stats.totalRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

