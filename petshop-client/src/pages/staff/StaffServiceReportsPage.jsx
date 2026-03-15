import React, { useEffect, useState } from 'react';
import { getAllServiceBookings } from '../../api/serviceBookingApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    CurrencyDollarIcon, 
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    EyeIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function StaffServiceReportsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayBookings: 0,
        todayCompleted: 0,
        todayPaid: 0,
        weekRevenue: 0,
        weekBookings: 0,
        monthRevenue: 0,
        monthBookings: 0
    });
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today'); // today, week, month, custom
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        loadReports();
    }, [dateRange, customDateFrom, customDateTo]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const response = await getAllServiceBookings({ pageSize: 200 });
            const payload = response.data?.items || response.data?.data || response.data || [];
            const allBookings = Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload)
                    ? payload
                    : [];
            
            setBookings(allBookings);

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            // Filter by date range
            let filteredBookings = allBookings;
            
            if (dateRange === 'today') {
                filteredBookings = allBookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() === today.getTime();
                });
            } else if (dateRange === 'week') {
                filteredBookings = allBookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= weekAgo;
                });
            } else if (dateRange === 'month') {
                filteredBookings = allBookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= monthAgo;
                });
            } else if (dateRange === 'custom' && customDateFrom && customDateTo) {
                const from = new Date(customDateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                filteredBookings = allBookings.filter(b => {
                    const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                    return bookingDate >= from && bookingDate <= to;
                });
            }

            // Calculate stats
            const todayBookings = allBookings.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.getTime() === today.getTime();
            });

            const weekBookings = allBookings.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                return bookingDate >= weekAgo;
            });

            const monthBookings = allBookings.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                return bookingDate >= monthAgo;
            });

            const todayRevenue = todayBookings
                .filter(b => (b.paymentStatus || '').toLowerCase() === 'paid')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
            
            const weekRevenue = weekBookings
                .filter(b => (b.paymentStatus || '').toLowerCase() === 'paid')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
            
            const monthRevenue = monthBookings
                .filter(b => (b.paymentStatus || '').toLowerCase() === 'paid')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            const todayCompleted = todayBookings.filter(b => 
                (b.status || '').toLowerCase() === 'completed'
            ).length;
            
            const todayPaid = todayBookings.filter(b => 
                (b.paymentStatus || '').toLowerCase() === 'paid'
            ).length;

            setStats({
                todayRevenue,
                todayBookings: todayBookings.length,
                todayCompleted,
                todayPaid,
                weekRevenue,
                weekBookings: weekBookings.length,
                monthRevenue,
                monthBookings: monthBookings.length
            });
        } catch (error) {
            console.error('Error loading service reports:', error);
            toast.error('Không thể tải báo cáo dịch vụ');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredBookings = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        return bookings.filter(b => {
            const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
            
            if (dateRange === 'today') {
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.getTime() === today.getTime();
            }
            if (dateRange === 'week') return bookingDate >= weekAgo;
            if (dateRange === 'month') return bookingDate >= monthAgo;
            if (dateRange === 'custom' && customDateFrom && customDateTo) {
                const from = new Date(customDateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                return bookingDate >= from && bookingDate <= to;
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
            'Pending': 'Chờ xác nhận',
            'Assigned': 'Đã phân công',
            'Confirmed': 'Đã xác nhận',
            'InProgress': 'Đang làm',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy',
            'Rejected': 'Từ chối'
        };
        return statusMap[status] || status;
    };

    const getPaymentStatusLabel = (paymentStatus) => {
        const paymentMap = {
            'Paid': 'Đã thanh toán',
            'Unpaid': 'Chưa thanh toán'
        };
        return paymentMap[paymentStatus] || paymentStatus || 'Chưa thanh toán';
    };

    const filteredBookings = getFilteredBookings();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Báo cáo dịch vụ</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Xem báo cáo doanh thu và lịch hẹn dịch vụ của bạn
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
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Doanh thu {dateRange === 'today' ? 'hôm nay' : dateRange === 'week' ? '7 ngày' : dateRange === 'month' ? 'tháng này' : 'khoảng thời gian'}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {(() => {
                                    if (dateRange === 'today') return stats.todayRevenue.toLocaleString('vi-VN');
                                    if (dateRange === 'week') return stats.weekRevenue.toLocaleString('vi-VN');
                                    if (dateRange === 'month') return stats.monthRevenue.toLocaleString('vi-VN');
                                    if (dateRange === 'custom') {
                                        const revenue = filteredBookings
                                            .filter(b => (b.paymentStatus || '').toLowerCase() === 'paid')
                                            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
                                        return revenue.toLocaleString('vi-VN');
                                    }
                                    return '0';
                                })()} ₫
                            </p>
                        </div>
                        <CurrencyDollarIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Số lịch hẹn</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {(() => {
                                    if (dateRange === 'today') return stats.todayBookings;
                                    if (dateRange === 'week') return stats.weekBookings;
                                    if (dateRange === 'month') return stats.monthBookings;
                                    if (dateRange === 'custom') return filteredBookings.length;
                                    return 0;
                                })()}
                            </p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hoàn thành</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {(() => {
                                    if (dateRange === 'today') return stats.todayCompleted;
                                    if (dateRange === 'custom') {
                                        return filteredBookings.filter(b => 
                                            (b.status || '').toLowerCase() === 'completed'
                                        ).length;
                                    }
                                    return filteredBookings.filter(b => 
                                        (b.status || '').toLowerCase() === 'completed'
                                    ).length;
                                })()}
                            </p>
                        </div>
                        <CheckCircleIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Đã thanh toán</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {(() => {
                                    if (dateRange === 'today') return stats.todayPaid;
                                    if (dateRange === 'custom') {
                                        return filteredBookings.filter(b => 
                                            (b.paymentStatus || '').toLowerCase() === 'paid'
                                        ).length;
                                    }
                                    return filteredBookings.filter(b => 
                                        (b.paymentStatus || '').toLowerCase() === 'paid'
                                    ).length;
                                })()}
                            </p>
                        </div>
                        <CurrencyDollarIcon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Danh sách lịch hẹn ({filteredBookings.length})
                    </h2>
                </div>
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        Không có lịch hẹn nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mã lịch</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Khách hàng</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ngày tạo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trạng thái</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Thanh toán</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tổng tiền</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {booking.bookingCode || `#${booking.id}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {booking.customerName || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(booking.startTime || booking.bookingDateTime || booking.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                (booking.status || '').toLowerCase() === 'completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : (booking.status || '').toLowerCase() === 'assigned'
                                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                    : (booking.status || '').toLowerCase() === 'inprogress'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : (booking.status || '').toLowerCase() === 'rejected'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    : (booking.status || '').toLowerCase() === 'cancelled'
                                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {getStatusLabel(booking.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                (booking.paymentStatus || '').toLowerCase() === 'paid'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {getPaymentStatusLabel(booking.paymentStatus)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                            {(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedBooking(booking);
                                                    setShowBookingModal(true);
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

            {/* Booking Detail Modal */}
            {showBookingModal && selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Chi tiết lịch hẹn {selectedBooking.bookingCode || `#${selectedBooking.id}`}
                            </h2>
                            <button
                                onClick={() => setShowBookingModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Mã lịch</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">
                                        {selectedBooking.bookingCode || `#${selectedBooking.id}`}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Khách hàng</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">
                                        {selectedBooking.customerName || '—'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Ngày tạo</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedBooking.createdAt)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Trạng thái</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{getStatusLabel(selectedBooking.status)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Thanh toán</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{getPaymentStatusLabel(selectedBooking.paymentStatus)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Tổng tiền</label>
                                    <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                                        {(selectedBooking.totalPrice || 0).toLocaleString('vi-VN')} ₫
                                    </p>
                                </div>
                            </div>
                            {selectedBooking.bookingItems && selectedBooking.bookingItems.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Dịch vụ</label>
                                    <div className="space-y-2">
                                        {(() => {
                                            // Group items by serviceName
                                            const grouped = (selectedBooking.bookingItems || []).reduce((acc, item) => {
                                                const serviceName = item.serviceName || 'Dịch vụ';
                                                if (!acc[serviceName]) {
                                                    acc[serviceName] = [];
                                                }
                                                acc[serviceName].push(item);
                                                return acc;
                                            }, {});
                                            
                                            return Object.entries(grouped).map(([serviceName, items]) => (
                                                <div key={serviceName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                                        <p className="font-semibold text-gray-900 dark:text-white">{serviceName}</p>
                                                    </div>
                                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {items.map((item, idx) => (
                                                            <div key={idx} className="px-4 py-3 bg-white dark:bg-gray-800">
                                                                {item.servicePackageName && (
                                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        {item.servicePackageName}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <div className="text-gray-500 dark:text-gray-400">
                                                                        Giá: {(item.priceAtBooking || item.packagePrice || item.servicePackagePrice || 0).toLocaleString('vi-VN')} ₫
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
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

