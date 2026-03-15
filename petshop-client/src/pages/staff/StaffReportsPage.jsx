import React, { useEffect, useState } from 'react';
import { fetchAllOrders } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    CurrencyDollarIcon, 
    ShoppingBagIcon, 
    UsersIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    EyeIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function StaffReportsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayShippingFee: 0,
        todayOrders: 0,
        todayCustomers: 0,
        weekRevenue: 0,
        weekShippingFee: 0,
        weekOrders: 0,
        monthRevenue: 0,
        monthShippingFee: 0,
        monthOrders: 0,
        totalProductsSold: 0
    });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today'); // today, week, month, custom
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    useEffect(() => {
        loadReports();
    }, [dateRange, customDateFrom, customDateTo]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const response = await fetchAllOrders();
            const allOrders = response.data?.items || response.data || [];
            
            // Lọc đơn hàng của nhân viên hiện tại (nếu có thông tin staff trong order)
            // Hoặc lấy tất cả đơn hàng nếu không có thông tin staff
            const staffOrders = allOrders; // Có thể filter theo staffId nếu có
            
            setOrders(staffOrders);

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            // Filter by date range
            let filteredOrders = staffOrders;
            
            if (dateRange === 'today') {
                filteredOrders = staffOrders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= today && o.status !== 'Cancelled';
                });
            } else if (dateRange === 'week') {
                filteredOrders = staffOrders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= weekAgo && o.status !== 'Cancelled';
                });
            } else if (dateRange === 'month') {
                filteredOrders = staffOrders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= monthAgo && o.status !== 'Cancelled';
                });
            } else if (dateRange === 'custom' && customDateFrom && customDateTo) {
                const from = new Date(customDateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                filteredOrders = staffOrders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= from && orderDate <= to && o.status !== 'Cancelled';
                });
            }

            // Tính toán thống kê
            const todayOrders = staffOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= today && o.status !== 'Cancelled';
            });

            const weekOrders = staffOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= weekAgo && o.status !== 'Cancelled';
            });

            const monthOrders = staffOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= monthAgo && o.status !== 'Cancelled';
            });

            // Tính doanh thu (chỉ tiền hàng, không bao gồm phí ship)
            // Chỉ tính doanh thu khi đơn hàng đã hoàn thành VÀ đã thanh toán
            const todayRevenue = todayOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const todayShippingFee = todayOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
            
            const weekRevenue = weekOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const weekShippingFee = weekOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
            
            const monthRevenue = monthOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return status === 'COMPLETED' && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const monthShippingFee = monthOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);

            const todayCustomers = new Set(todayOrders.map(o => o.customerId).filter(Boolean)).size;
            
            const totalProductsSold = staffOrders
                .filter(o => o.status !== 'Cancelled')
                .reduce((sum, o) => {
                    const itemsCount = o.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0;
                    return sum + itemsCount;
                }, 0);

            setStats({
                todayRevenue,
                todayShippingFee,
                todayOrders: todayOrders.length,
                todayCustomers,
                weekRevenue,
                weekShippingFee,
                weekOrders: weekOrders.length,
                monthRevenue,
                monthShippingFee,
                monthOrders: monthOrders.length,
                totalProductsSold
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Không thể tải báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredOrders = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        return orders.filter(o => {
            if (o.status === 'Cancelled') return false;
            const orderDate = new Date(o.createdAt);
            
            if (dateRange === 'today') return orderDate >= today;
            if (dateRange === 'week') return orderDate >= weekAgo;
            if (dateRange === 'month') return orderDate >= monthAgo;
            if (dateRange === 'custom' && customDateFrom && customDateTo) {
                const from = new Date(customDateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                return orderDate >= from && orderDate <= to;
            }
            return true;
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    };

    const getStatusLabel = (status) => {
        const statusMap = {
            'Pending': 'Chờ xử lý',
            'Processing': 'Đang xử lý',
            'Shipped': 'Đã giao hàng',
            'Delivered': 'Đã nhận',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    const filteredOrders = getFilteredOrders();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Báo cáo bán hàng</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Xem báo cáo doanh thu và sản phẩm đã bán của bạn
                </p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Khoảng thời gian:</label>
                    <div className="flex flex-wrap gap-2">
                        {['today', 'week', 'month', 'custom'].map(range => (
                            <button
                                key={range}
                                onClick={() => {
                                    setDateRange(range);
                                    if (range !== 'custom') {
                                        setCustomDateFrom('');
                                        setCustomDateTo('');
                                    }
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateRange === range
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {range === 'today' ? 'Hôm nay' : range === 'week' ? '7 ngày' : range === 'month' ? 'Tháng này' : 'Tùy chọn'}
                            </button>
                        ))}
                    </div>
                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <span className="text-gray-500 dark:text-gray-400">đến</span>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Doanh thu {dateRange === 'today' ? 'hôm nay' : dateRange === 'week' ? '7 ngày' : dateRange === 'month' ? 'tháng này' : 'khoảng thời gian'}
                            </p>
                            <div className="mt-1 space-y-1">
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(() => {
                                        if (dateRange === 'today') return stats.todayRevenue.toLocaleString('vi-VN');
                                        if (dateRange === 'week') return stats.weekRevenue.toLocaleString('vi-VN');
                                        if (dateRange === 'month') return stats.monthRevenue.toLocaleString('vi-VN');
                                        if (dateRange === 'custom') {
                                            const revenue = filteredOrders.reduce((sum, o) => {
                                                const orderTotal = o.total || 0;
                                                const shippingFee = o.shippingFee || 0;
                                                return sum + (orderTotal - shippingFee);
                                            }, 0);
                                            return revenue.toLocaleString('vi-VN');
                                        }
                                        return '0';
                                    })()} ₫
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    + Phí ship: {(() => {
                                        if (dateRange === 'today') return stats.todayShippingFee.toLocaleString('vi-VN');
                                        if (dateRange === 'week') return stats.weekShippingFee.toLocaleString('vi-VN');
                                        if (dateRange === 'month') return stats.monthShippingFee.toLocaleString('vi-VN');
                                        if (dateRange === 'custom') {
                                            const shippingFee = filteredOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
                                            return shippingFee.toLocaleString('vi-VN');
                                        }
                                        return '0';
                                    })()} ₫
                                </p>
                            </div>
                        </div>
                        <CurrencyDollarIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Số đơn hàng</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {(() => {
                                    if (dateRange === 'today') return stats.todayOrders;
                                    if (dateRange === 'week') return stats.weekOrders;
                                    if (dateRange === 'month') return stats.monthOrders;
                                    if (dateRange === 'custom') return filteredOrders.length;
                                    return 0;
                                })()}
                            </p>
                        </div>
                        <ShoppingBagIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Khách hàng hôm nay</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {stats.todayCustomers}
                            </p>
                        </div>
                        <UsersIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng sản phẩm đã bán</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {stats.totalProductsSold}
                            </p>
                        </div>
                        <ChartBarIcon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Danh sách đơn hàng ({filteredOrders.length})
                    </h2>
                </div>
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        Không có đơn hàng nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mã đơn</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Khách hàng</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ngày tạo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trạng thái</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tổng tiền</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {order.orderCode || order.posCode || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {order.customerName || order.customer?.profile?.fullName || order.customer?.username || 'Khách vãng lai'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                order.status === 'Completed' || order.status === 'Delivered'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : order.status === 'Cancelled'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {(order.total || 0).toLocaleString('vi-VN')} ₫
                                            </div>
                                            {order.shippingFee > 0 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    + Phí ship: {(order.shippingFee || 0).toLocaleString('vi-VN')} ₫
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowOrderModal(true);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {showOrderModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Chi tiết đơn hàng {selectedOrder.orderCode || selectedOrder.posCode || 'Chưa có mã'}
                            </h2>
                            <button
                                onClick={() => setShowOrderModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Mã đơn</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">
                                        {selectedOrder.orderCode || selectedOrder.posCode || 'Chưa có mã'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Khách hàng</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">
                                        {selectedOrder.customerName || selectedOrder.customer?.profile?.fullName || selectedOrder.customer?.username || 'Khách vãng lai'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Ngày tạo</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Trạng thái</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{getStatusLabel(selectedOrder.status)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Tổng tiền</label>
                                    <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                                        {(selectedOrder.total || 0).toLocaleString('vi-VN')} ₫
                                    </p>
                                </div>
                            </div>
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sản phẩm</label>
                                    <div className="space-y-2">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                <span className="text-gray-900 dark:text-white">
                                                    {item.productName} x {item.quantity}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
