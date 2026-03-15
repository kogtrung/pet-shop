import React, { useEffect, useMemo, useState } from 'react';
import { getAllServiceBookings, updateServiceBookingStatus } from '../../api/serviceBookingApi.js';
import { getServices } from '../../api/serviceApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button.jsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const STATUS_OPTIONS = ['Pending', 'Assigned', 'Confirmed', 'InProgress', 'Completed', 'Cancelled', 'Rejected'];

// Mapping status to Vietnamese and colors
const STATUS_CONFIG = {
    'Pending': {
        label: 'Chờ xác nhận',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        borderColor: 'border-yellow-300 dark:border-yellow-700'
    },
    'Assigned': {
        label: 'Đã phân công',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20',
        textColor: 'text-purple-800 dark:text-purple-200',
        borderColor: 'border-purple-300 dark:border-purple-700'
    },
    'Confirmed': {
        label: 'Đã xác nhận',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        textColor: 'text-blue-800 dark:text-blue-200',
        borderColor: 'border-blue-300 dark:border-blue-700'
    },
    'InProgress': {
        label: 'Đang làm',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
        textColor: 'text-orange-800 dark:text-orange-200',
        borderColor: 'border-orange-300 dark:border-orange-700'
    },
    'Completed': {
        label: 'Hoàn thành',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        textColor: 'text-green-800 dark:text-green-200',
        borderColor: 'border-green-300 dark:border-green-700'
    },
    'Cancelled': {
        label: 'Đã hủy',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-800 dark:text-gray-200',
        borderColor: 'border-gray-300 dark:border-gray-600'
    },
    'Rejected': {
        label: 'Bị từ chối',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        textColor: 'text-red-800 dark:text-red-200',
        borderColor: 'border-red-300 dark:border-red-700'
    }
};

const groupBookingItemsByService = (items = []) => {
    const groups = {};
    items.forEach((item) => {
        const key = item.serviceId || `service-${item.id}`;
        if (!groups[key]) {
            groups[key] = {
                key,
                serviceName: item.serviceName || 'Dịch vụ',
                items: []
            };
        }
        groups[key].items.push(item);
    });
    return Object.values(groups);
};

const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || {
        label: status,
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-800 dark:text-gray-200',
        borderColor: 'border-gray-300 dark:border-gray-600'
    };
};

export default function ServiceStaffBookingsPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        serviceId: '',
        servicePackageId: '',
        dateFilter: 'all',
        dateFrom: '',
        dateTo: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingBookingIds, setUpdatingBookingIds] = useState(new Set());
    const [services, setServices] = useState([]);
    const [packageOptions, setPackageOptions] = useState([]);

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await getServices();
                setServices(response.data || []);
            } catch (error) {
                console.error('Failed to load services for filters', error);
            }
        };
        loadServices();
    }, []);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const response = await getAllServiceBookings({
                status: filters.status || undefined,
                serviceId: filters.serviceId || undefined,
                servicePackageId: filters.servicePackageId || undefined
            });
            const data = response.data || [];
            setBookings(data);
        } catch (error) {
            console.error('Failed to load bookings', error);
            toast.error('Không thể tải danh sách đặt lịch');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status, filters.serviceId, filters.servicePackageId]);

    useEffect(() => {
        if (!filters.serviceId) {
            setPackageOptions([]);
            setFilters((prev) => ({ ...prev, servicePackageId: '' }));
            return;
        }
        const service = services.find((s) => s.id === Number(filters.serviceId));
        if (service) {
            setPackageOptions(service.packages || []);
        } else {
            setPackageOptions([]);
        }
    }, [filters.serviceId, services]);

    const filteredBookings = useMemo(() => {
        let filtered = [...bookings];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(booking => {
                const matchesSearch = (
                    booking.id?.toString().includes(query) ||
                    booking.bookingCode?.toLowerCase().includes(query) ||
                    booking.customerName?.toLowerCase().includes(query) ||
                    booking.customerEmail?.toLowerCase().includes(query) ||
                    booking.customerPhone?.includes(query) ||
                    booking.petName?.toLowerCase().includes(query) ||
                    booking.petType?.toLowerCase().includes(query) ||
                    booking.petBreed?.toLowerCase().includes(query) ||
                    booking.bookingItems?.some(item => 
                        item.serviceName?.toLowerCase().includes(query) ||
                        item.servicePackageName?.toLowerCase().includes(query)
                    )
                );
                return matchesSearch;
            });
        }

        // Filter by date
        if (filters.dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.startTime || booking.createdAt || booking.bookingDateTime);
                
                if (filters.dateFilter === 'today') {
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() === today.getTime();
                } else if (filters.dateFilter === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return bookingDate >= weekAgo;
                } else if (filters.dateFilter === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return bookingDate >= monthAgo;
                } else if (filters.dateFilter === 'custom' && filters.dateFrom && filters.dateTo) {
                    const from = new Date(filters.dateFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(filters.dateTo);
                    to.setHours(23, 59, 59, 999);
                    return bookingDate >= from && bookingDate <= to;
                }
                return true;
            });
        }

        return filtered;
    }, [bookings, searchQuery, filters.dateFilter, filters.dateFrom, filters.dateTo]);

    const orderedBookings = useMemo(() => {
        if (!filteredBookings || filteredBookings.length === 0) return [];
        return [...filteredBookings].sort((a, b) => {
            const aDate = new Date(a.startTime || a.bookingDateTime || 0).getTime();
            const bDate = new Date(b.startTime || b.bookingDateTime || 0).getTime();
            return bDate - aDate;
        });
    }, [filteredBookings]);

    const upcomingCount = useMemo(() => {
        const now = new Date();
        return filteredBookings.filter(
            (booking) => {
                const startTime = booking.startTime || booking.bookingDateTime;
                return startTime && new Date(startTime) >= now && booking.status !== 'Cancelled';
            }
        ).length;
    }, [filteredBookings]);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh'
            });
        } catch (e) {
            return '—';
        }
    };

    const updateBookingStatus = async (bookingId, newStatus) => {
        setUpdatingBookingIds(prev => new Set(prev).add(bookingId));
        const toastId = toast.loading('Đang cập nhật trạng thái lịch hẹn...');
        try {
            await updateServiceBookingStatus(bookingId, { status: newStatus });
            toast.success('Đã cập nhật trạng thái lịch hẹn', { id: toastId });
            await loadBookings();
        } catch (error) {
            console.error('Error updating booking status:', error);
            const message = error.response?.data?.error || 'Không thể cập nhật lịch hẹn';
            toast.error(message, { id: toastId });
        } finally {
            setUpdatingBookingIds(prev => {
                const next = new Set(prev);
                next.delete(bookingId);
                return next;
            });
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đặt lịch</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Theo dõi và xử lý yêu cầu đặt dịch vụ. Lịch sắp diễn ra: <strong>{upcomingCount}</strong>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px] relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo mã, khách hàng, thú cưng..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {getStatusConfig(status).label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.serviceId}
                        onChange={(e) =>
                            setFilters((prev) => ({ ...prev, serviceId: e.target.value, servicePackageId: '' }))
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Tất cả dịch vụ</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.servicePackageId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, servicePackageId: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                        disabled={!filters.serviceId || packageOptions.length === 0}
                    >
                        <option value="">Tất cả gói</option>
                        {packageOptions.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                                {pkg.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.dateFilter}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dateFilter: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="all">Tất cả ngày</option>
                        <option value="today">Hôm nay</option>
                        <option value="week">7 ngày qua</option>
                        <option value="month">30 ngày qua</option>
                        <option value="custom">Tùy chọn</option>
                    </select>
                    {filters.dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                            <span className="text-gray-500 dark:text-gray-400 text-sm">đến</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                        </div>
                    )}
                    <Button variant="secondary" onClick={() => {
                        setFilters({ status: '', serviceId: '', servicePackageId: '', dateFilter: 'all', dateFrom: '', dateTo: '' });
                        setSearchQuery('');
                    }}>
                        Đặt lại
                    </Button>
                </div>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orderedBookings.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                            {filters.status || filters.serviceId ? (
                                <p>Chưa có lịch đặt nào phù hợp bộ lọc.</p>
                            ) : (
                                <>
                                    <p className="text-lg font-medium mb-2">Chưa có lịch hẹn nào</p>
                                    <p className="text-sm mb-2">
                                        Bạn chỉ thấy lịch hẹn của các dịch vụ mà Admin đã phân công cho bạn.
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Nếu bạn chưa được phân công dịch vụ nào, vui lòng liên hệ Admin.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã</th>
                                    <th className="px-4 py-3 text-left">Khách hàng</th>
                                    <th className="px-4 py-3 text-left">Dịch vụ</th>
                                    <th className="px-4 py-3 text-left">Thú cưng</th>
                                    <th className="px-4 py-3 text-left">Thời gian</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Ghi chú</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {orderedBookings.map((booking) => {
                                    // Lọc chỉ các BookingItems được phân công cho staff này
                                    const myItems = booking.bookingItems?.filter(item => 
                                        item.assignedStaffId === user?.id
                                    ) || [];
                                    
                                    // Nếu không có item nào được phân công, không hiển thị booking này
                                    if (myItems.length === 0) return null;
                                    
                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                                    {booking.bookingCode || `#${booking.id}`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{booking.customerName}</div>
                                                <div className="text-xs text-gray-500">{booking.customerEmail}</div>
                                                <div className="text-xs text-gray-500">{booking.customerPhone}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {myItems.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {groupBookingItemsByService(myItems).map((group) => (
                                                            <div
                                                                key={group.key}
                                                                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                    {group.serviceName}
                                                                </p>
                                                                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                                                    {group.items.map((item, idx) => (
                                                                        <li
                                                                            key={item.id || `${group.key}-${idx}`}
                                                                            className="flex items-center justify-between bg-white/80 dark:bg-gray-800/50 rounded-md px-2 py-1"
                                                                        >
                                                                            <span className="font-medium">
                                                                                {item.servicePackageName || 'Gói dịch vụ'}
                                                                            </span>
                                                                            {item.durationMinutes && (
                                                                                <span className="text-gray-400 dark:text-gray-500">
                                                                                    {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}p
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm">
                                                        <p className="font-medium text-gray-900 dark:text-white">—</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {booking.petName ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{booking.petName}</div>
                                                        {booking.petType && (
                                                            <div className="text-xs text-gray-500">
                                                                {booking.petType}
                                                                {booking.petBreed && ` - ${booking.petBreed}`}
                                                            </div>
                                                        )}
                                                        {(booking.petAge || booking.petWeight) && (
                                                            <div className="text-xs text-gray-400 dark:text-gray-500">
                                                                {booking.petAge && `${booking.petAge} tháng`}
                                                                {booking.petAge && booking.petWeight && ' • '}
                                                                {booking.petWeight && `${booking.petWeight}kg`}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {formatDate(booking.startTime || booking.bookingDateTime)}
                                                    </p>
                                                    {booking.endTime && (
                                                        <p className="text-xs text-gray-500">
                                                            Đến: {formatDate(booking.endTime)}
                                                        </p>
                                                    )}
                                                    {booking.totalDurationMinutes && (
                                                        <p className="text-xs text-gray-500">
                                                            {Math.floor(booking.totalDurationMinutes / 60)}h {booking.totalDurationMinutes % 60}p
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    getStatusConfig(booking.status).bgColor
                                                } ${getStatusConfig(booking.status).textColor}`}>
                                                    {getStatusConfig(booking.status).label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {booking.note && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                                                        Ghi chú khách: {booking.note}
                                                    </div>
                                                )}
                                                {booking.internalNote && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-300 whitespace-pre-wrap">
                                                        Ghi chú nội bộ: {booking.internalNote}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    {(() => {
                                                        const upper = (booking.status || '').toString().toUpperCase();
                                                        const isUpdating = updatingBookingIds.has(booking.id);
                                                        const canStart = upper === 'CONFIRMED' || upper === 'ASSIGNED';
                                                        const canComplete = upper === 'INPROGRESS';

                                                        return (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    disabled={!canStart || isUpdating}
                                                                    onClick={() => updateBookingStatus(booking.id, 'InProgress')}
                                                                    className="!px-3 !py-1.5 text-xs"
                                                                >
                                                                    Bắt đầu
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    disabled={!canComplete || isUpdating}
                                                                    onClick={() => updateBookingStatus(booking.id, 'Completed')}
                                                                    className="!px-3 !py-1.5 text-xs"
                                                                >
                                                                    Hoàn thành
                                                                </Button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

