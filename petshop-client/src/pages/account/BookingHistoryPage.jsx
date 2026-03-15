import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyBookings, cancelBooking } from '../../api/serviceBookingApi';
import toast from 'react-hot-toast';
import {
    CalendarDaysIcon,
    ClockIcon,
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    MagnifyingGlassIcon,
    EyeIcon
} from '@heroicons/react/24/outline';

export default function BookingHistoryPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem lịch hẹn');
            navigate('/');
            return;
        }
        loadBookings();
    }, [user, navigate]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const response = await fetchMyBookings();
            setBookings(response.data || []);
        } catch (error) {
            console.error('Error loading bookings:', error);
            toast.error('Không thể tải lịch hẹn');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang hủy lịch hẹn...');
        try {
            await cancelBooking(bookingId);
            toast.success('Đã hủy lịch hẹn thành công', { id: loadingToast });
            loadBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error('Không thể hủy lịch hẹn', { id: loadingToast });
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', icon: ClockIcon },
            ASSIGNED: { label: 'Đã phân công', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300', icon: ClockIcon },
            CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', icon: CheckCircleIcon },
            INPROGRESS: { label: 'Đang làm', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', icon: ClockIcon },
            COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: CheckCircleIcon },
            CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: XCircleIcon },
            REJECTED: { label: 'Bị từ chối', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: XCircleIcon }
        };
        return configs[status?.toUpperCase()] || configs.PENDING;
    };

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

    const filteredBookings = bookings.filter(booking => {
        const matchesStatus = statusFilter === 'all' || booking.status?.toUpperCase() === statusFilter;
        const matchesSearch = !searchQuery || 
            booking.bookingCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.petName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            // Search in BookingItems
            booking.bookingItems?.some(item => 
                item.serviceName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        return matchesStatus && matchesSearch;
    });

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                        <CalendarDaysIcon className="w-8 h-8 mr-3 text-indigo-600" />
                        Lịch hẹn dịch vụ
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Quản lý tất cả lịch hẹn dịch vụ của bạn</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm dịch vụ, tên thú cưng..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ xác nhận</option>
                            <option value="ASSIGNED">Đã phân công</option>
                            <option value="CONFIRMED">Đã xác nhận</option>
                            <option value="INPROGRESS">Đang làm</option>
                            <option value="COMPLETED">Hoàn thành</option>
                            <option value="CANCELLED">Đã hủy</option>
                            <option value="REJECTED">Bị từ chối</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
                                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                        <CalendarDaysIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Chưa có lịch hẹn</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {searchQuery || statusFilter !== 'all' ? 'Không tìm thấy lịch hẹn phù hợp' : 'Bạn chưa đặt lịch dịch vụ nào'}
                        </p>
                        <button
                            onClick={() => navigate('/services')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Đặt dịch vụ ngay
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => {
                            const statusConfig = getStatusConfig(booking.status);
                            const StatusIcon = statusConfig.icon;
                            const canCancel = ['PENDING', 'ASSIGNED', 'CONFIRMED'].includes(booking.status?.toUpperCase());

                            return (
                                <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                                            <div className="flex items-center gap-3 mb-2 md:mb-0">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {booking.bookingCode || `Lịch hẹn #${booking.id}`}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                                                    <StatusIcon className="w-4 h-4" />
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedBooking(booking);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Chi tiết</span>
                                                </button>
                                                {canCancel && (
                                                    <button
                                                        onClick={() => handleCancelBooking(booking.id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Hủy</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-2">Dịch vụ</p>
                                                {booking.bookingItems && booking.bookingItems.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {booking.bookingItems.map((item, idx) => (
                                                            <div key={item.id || idx} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                                    {idx + 1}. {item.serviceName || '—'}
                                                                </p>
                                                                {item.servicePackageName && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        {item.servicePackageName}
                                                                    </p>
                                                                )}
                                                                {item.priceAtBooking && (
                                                                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                                                                        {item.priceAtBooking.toLocaleString('vi-VN')} ₫
                                                                    </p>
                                                                )}
                                                                {item.assignedStaffName && (
                                                                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                                                                        NV: {item.assignedStaffName}
                                                                    </p>
                                                                )}
                                                                {item.status && (
                                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                                        item.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                                                        item.status === 'InProgress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                                                        item.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                                                        item.status === 'Rejected' || item.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                                                    }`}>
                                                                        {item.status === 'Completed' ? 'Hoàn thành' :
                                                                         item.status === 'InProgress' ? 'Đang làm' :
                                                                         item.status === 'Confirmed' ? 'Đã xác nhận' :
                                                                         item.status === 'Assigned' ? 'Đã phân công' :
                                                                         item.status === 'Rejected' ? 'Từ chối' :
                                                                         item.status === 'Cancelled' ? 'Đã hủy' :
                                                                         'Chờ xác nhận'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {booking.serviceName || '—'}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-2">Thú cưng</p>
                                                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                    <p className="font-medium text-gray-900 dark:text-white">{booking.petName || '—'}</p>
                                                    {booking.petType && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {booking.petType}
                                                            {booking.petBreed && ` - ${booking.petBreed}`}
                                                        </p>
                                                    )}
                                                    {(booking.petAge || booking.petWeight) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {booking.petAge && `${booking.petAge} tháng`}
                                                            {booking.petAge && booking.petWeight && ' • '}
                                                            {booking.petWeight && `${booking.petWeight}kg`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-2">Thời gian</p>
                                                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                        Bắt đầu: {formatDate(booking.startTime || booking.scheduledDate)}
                                                    </p>
                                                    {booking.endTime && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Kết thúc: {formatDate(booking.endTime)}
                                                        </p>
                                                    )}
                                                    {booking.totalDurationMinutes && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Tổng: {Math.floor(booking.totalDurationMinutes / 60)}h {booking.totalDurationMinutes % 60}p
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-2">Thông tin</p>
                                                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                    <p className="font-bold text-indigo-600 text-lg">{booking.totalPrice?.toLocaleString('vi-VN') || '—'} ₫</p>
                                                    {booking.createdAt && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                            Tạo: {formatDate(booking.createdAt)}
                                                        </p>
                                                    )}
                                                    {booking.updatedAt && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Cập nhật: {formatDate(booking.updatedAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Details Modal */}
                {showDetailsModal && selectedBooking && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết lịch hẹn {selectedBooking.bookingCode || `#${selectedBooking.id}`}
                                </h2>
                                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500">Trạng thái</label>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedBooking.status).color}`}>
                                                {React.createElement(getStatusConfig(selectedBooking.status).icon, { className: 'w-4 h-4' })}
                                                {getStatusConfig(selectedBooking.status).label}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Thời gian</label>
                                        <p className="mt-1 font-medium">
                                            Bắt đầu: {formatDate(selectedBooking.startTime || selectedBooking.scheduledDate)}
                                        </p>
                                        {selectedBooking.endTime && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                Kết thúc: {formatDate(selectedBooking.endTime)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-500">Dịch vụ</label>
                                    {selectedBooking.bookingItems && selectedBooking.bookingItems.length > 0 ? (
                                        <div className="mt-2 space-y-3">
                                            {selectedBooking.bookingItems.map((item, idx) => (
                                                <div key={item.id || idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {idx + 1}. {item.serviceName || '—'}
                                                        </p>
                                                        {item.serviceId && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Mã: DV-{item.serviceId}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {item.servicePackageName && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            Gói: {item.servicePackageName}
                                                        </p>
                                                    )}
                                                    {item.priceAtBooking && (
                                                        <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                                                            Giá: {item.priceAtBooking.toLocaleString('vi-VN')} ₫
                                                        </p>
                                                    )}
                                                    {item.durationMinutes && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Thời lượng: {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}p
                                                        </p>
                                                    )}
                                                    {item.assignedStaffName && (
                                                        <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                                                            Nhân viên: {item.assignedStaffName}
                                                        </p>
                                                    )}
                                                    {item.status && (
                                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                            item.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                                            item.status === 'InProgress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                                            item.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                                            item.status === 'Assigned' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                                                            item.status === 'Rejected' || item.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                                        }`}>
                                                            {item.status === 'Completed' ? 'Hoàn thành' :
                                                             item.status === 'InProgress' ? 'Đang làm' :
                                                             item.status === 'Confirmed' ? 'Đã xác nhận' :
                                                             item.status === 'Assigned' ? 'Đã phân công' :
                                                             item.status === 'Rejected' ? 'Từ chối' :
                                                             item.status === 'Cancelled' ? 'Đã hủy' :
                                                             'Chờ xác nhận'}
                                                        </span>
                                                    )}
                                                    {item.note && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                                            Ghi chú: {item.note}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    Tổng: {selectedBooking.totalPrice?.toLocaleString('vi-VN') || '—'} ₫
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Tổng thời lượng: {selectedBooking.totalDurationMinutes ? 
                                                        `${Math.floor(selectedBooking.totalDurationMinutes / 60)}h ${selectedBooking.totalDurationMinutes % 60}p` : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{selectedBooking.serviceName || '—'}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500">Tên thú cưng</label>
                                        <p className="mt-1 font-medium">{selectedBooking.petName || '—'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Loại</label>
                                        <p className="mt-1 font-medium">
                                            {selectedBooking.petType || '—'}
                                            {selectedBooking.petBreed && ` - ${selectedBooking.petBreed}`}
                                        </p>
                                    </div>
                                    {(selectedBooking.petAge || selectedBooking.petWeight) && (
                                        <>
                                            {selectedBooking.petAge && (
                                                <div>
                                                    <label className="text-sm text-gray-500">Tuổi</label>
                                                    <p className="mt-1 font-medium">{selectedBooking.petAge} tháng</p>
                                                </div>
                                            )}
                                            {selectedBooking.petWeight && (
                                                <div>
                                                    <label className="text-sm text-gray-500">Cân nặng</label>
                                                    <p className="mt-1 font-medium">{selectedBooking.petWeight}kg</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm text-gray-500">Thông tin liên hệ</label>
                                    <p className="mt-1 font-medium">{selectedBooking.customerName || '—'}</p>
                                    <p className="text-sm text-gray-600">{selectedBooking.customerPhone || '—'}</p>
                                    {selectedBooking.customerEmail && (
                                        <p className="text-sm text-gray-600">{selectedBooking.customerEmail}</p>
                                    )}
                                </div>

                                {selectedBooking.note && (
                                    <div>
                                        <label className="text-sm text-gray-500">Ghi chú khách hàng</label>
                                        <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{selectedBooking.note}</p>
                                    </div>
                                )}

                                {selectedBooking.internalNote && (
                                    <div>
                                        <label className="text-sm text-gray-500">Ghi chú nội bộ</label>
                                        <p className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">{selectedBooking.internalNote}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Tổng chi phí:</span>
                                            <span className="text-2xl font-bold text-indigo-600">
                                                {selectedBooking.totalPrice?.toLocaleString('vi-VN') || '—'} ₫
                                            </span>
                                        </div>
                                        {selectedBooking.totalDurationMinutes && (
                                            <div className="flex justify-between items-center text-sm text-gray-600">
                                                <span>Tổng thời lượng:</span>
                                                <span>
                                                    {Math.floor(selectedBooking.totalDurationMinutes / 60)}h {selectedBooking.totalDurationMinutes % 60}p
                                                </span>
                                            </div>
                                        )}
                                        {selectedBooking.createdAt && (
                                            <div className="flex justify-between items-center text-sm text-gray-600">
                                                <span>Ngày tạo:</span>
                                                <span>{formatDate(selectedBooking.createdAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                                {['PENDING', 'CONFIRMED'].includes(selectedBooking.status?.toUpperCase()) && (
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleCancelBooking(selectedBooking.id);
                                        }}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Hủy lịch hẹn
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
