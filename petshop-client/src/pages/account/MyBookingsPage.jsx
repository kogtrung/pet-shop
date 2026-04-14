import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserServiceBookings, cancelServiceBooking } from '../../api/serviceBookingApi';
import toast from 'react-hot-toast';
import {
    CalendarDaysIcon,
    ClockIcon,
    CurrencyDollarIcon,
    InformationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function MyBookingsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const sortedBookings = useMemo(() => {
        if (!bookings || bookings.length === 0) return [];
        return [...bookings].sort((a, b) => {
            const aDate = new Date(a.startTime || a.createdAt || 0).getTime();
            const bDate = new Date(b.startTime || b.createdAt || 0).getTime();
            return bDate - aDate;
        });
    }, [bookings]);

    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem lịch sử đặt lịch');
            navigate('/');
            return;
        }
        
        loadBookings();
    }, [user, navigate]);

    const loadBookings = async () => {
        try {
            const response = await getUserServiceBookings();
            setBookings(response.data || []);
        } catch (error) {
            console.error('Error loading bookings:', error);
            toast.error('Không thể tải lịch sử đặt lịch');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const response = await getUserServiceBookings();
            setBookings(response.data || []);
            toast.success('Đã cập nhật danh sách');
        } catch (error) {
            console.error('Error refreshing bookings:', error);
            toast.error('Không thể cập nhật danh sách');
        } finally {
            setRefreshing(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh'
            });
        } catch (e) {
            return '—';
        }
    };

    const formatPrice = (price) => {
        if (price == null) return 'Liên hệ';
        if (price === 0) return '0 ₫';
        return `${price.toLocaleString('vi-VN')} ₫`;
    };

    // Trạng thái đơn giản cho khách hàng
    const getStatusBadge = (statusRaw) => {
        const status = (statusRaw || '').toString().toUpperCase();

        // Gom nhóm trạng thái nội bộ thành 5 trạng thái đơn giản
        let simpleKey = 'PENDING';
        if (status === 'COMPLETED') simpleKey = 'COMPLETED';
        else if (status === 'INPROGRESS') simpleKey = 'INPROGRESS';
        else if (status === 'CONFIRMED' || status === 'APPROVED' || status === 'ASSIGNED') simpleKey = 'CONFIRMED';
        else if (status === 'CANCELLED' || status === 'REJECTED') simpleKey = 'CANCELLED';
        else simpleKey = 'PENDING'; // Pending hoặc các trạng thái còn lại

        const statusMap = {
            PENDING: { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
            CONFIRMED: { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
            INPROGRESS: { text: 'Đang thực hiện', color: 'bg-orange-100 text-orange-800' },
            COMPLETED: { text: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
            CANCELLED: { text: 'Đã hủy', color: 'bg-red-100 text-red-800' }
        };
        
        const statusInfo = statusMap[simpleKey] || { text: status, color: 'bg-gray-100 text-gray-800' };
        return (
            <span className={`px-3 py-1 rounded-none text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.text}
            </span>
        );
    };

    const canCancelBooking = (booking) => {
        const status = (booking.status || '').toString().toUpperCase();
        if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) return false;

        // Phải hủy trước giờ hẹn ít nhất 2 giờ (giống rule backend)
        if (!booking.startTime) return false;
        const start = new Date(booking.startTime);
        const now = new Date();
        const diffMs = start.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > 2;
    };

    const handleCancel = async (booking) => {
        if (!canCancelBooking(booking)) {
            toast.error('Bạn chỉ có thể hủy lịch trước giờ hẹn ít nhất 2 giờ và khi lịch chưa hoàn thành.');
            return;
        }

        const confirm = window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?');
        if (!confirm) return;

        const reason = window.prompt('Vui lòng nhập lý do hủy (không bắt buộc):', '') || 'Khách hàng hủy lịch hẹn';

        const loadingToast = toast.loading('Đang hủy lịch hẹn...');
        try {
            await cancelServiceBooking(booking.id, { reason });
            toast.success('Đã hủy lịch hẹn thành công', { id: loadingToast });
            await handleRefresh();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            const message = error.response?.data?.error || 'Không thể hủy lịch hẹn';
            toast.error(message, { id: loadingToast });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-none shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Lịch đặt dịch vụ</h1>
                            <div className="h-10 w-10 bg-gray-300 rounded-none animate-pulse"></div>
                        </div>
                        
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="border border-gray-200 rounded-none p-4 animate-pulse">
                                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-3"></div>
                                    <div className="h-6 bg-gray-300 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-none shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <CalendarDaysIcon className="w-6 h-6 mr-2 text-black" />
                            Lịch đặt dịch vụ
                        </h1>
                        
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-none hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Đang cập nhật...' : 'Cập nhật'}
                        </button>
                    </div>

                    {sortedBookings.length === 0 ? (
                        <div className="text-center py-12">
                            <InformationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Chưa có lịch đặt nào
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Bạn chưa đặt lịch dịch vụ nào. Hãy khám phá các dịch vụ của chúng tôi!
                            </p>
                            <button
                                onClick={() => navigate('/services')}
                                className="px-6 py-3 bg-black text-white rounded-none hover:bg-gray-900 transition-colors"
                            >
                                Xem dịch vụ
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {sortedBookings.map((booking) => {
                                const firstItem = booking.bookingItems && booking.bookingItems[0];
                                const serviceName = booking.bookingItems && booking.bookingItems.length > 1
                                    ? `${firstItem?.serviceName || 'Dịch vụ'} + ${booking.bookingItems.length - 1} dịch vụ khác`
                                    : (firstItem?.serviceName || 'Dịch vụ chăm sóc thú cưng');

                                return (
                                    <div 
                                        key={booking.id} 
                                        className="border border-gray-200 rounded-none p-4 hover:shadow-md hover:bg-gray-50 transition-colors flex flex-col justify-between"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Mã lịch hẹn
                                                </p>
                                                <p className="font-mono text-sm font-semibold text-gray-900">
                                                    {booking.bookingCode || `#${booking.id}`}
                                                </p>
                                            </div>
                                            {getStatusBadge(booking.status)}
                                        </div>

                                        <div className="space-y-3 mb-4 text-sm text-gray-700">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <span className="font-semibold text-gray-900">
                                                    Thú cưng: <span className="font-bold">{booking.petName || '—'}</span>
                                                </span>
                                                <span className="flex items-center text-gray-600">
                                                    <CalendarDaysIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                                    {formatDateTime(booking.startTime)}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between flex-wrap gap-2">
                                                <span>
                                                    Dịch vụ: <span className="font-medium">{serviceName}</span>
                                                </span>
                                                <span className="flex items-center text-gray-600">
                                                    <CurrencyDollarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                                    {formatPrice(booking.totalPrice)}
                                                </span>
                                            </div>
                                            {booking.bookingItems && booking.bookingItems.length > 0 && (
                                                <div className="text-xs border border-gray-200 rounded-none px-3 py-2 bg-white space-y-1">
                                                    {booking.bookingItems.slice(0, 3).map((item, idx) => (
                                                        <div key={item.id || idx} className="flex items-center justify-between gap-2">
                                                            <span className="text-gray-600">
                                                                {idx + 1}. {item.servicePackageName || item.serviceName}
                                                            </span>
                                                            {item.durationMinutes && (
                                                                <span className="text-gray-400">
                                                                    {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}p
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {booking.bookingItems.length > 3 && (
                                                        <p className="text-gray-400">
                                                            ...và {booking.bookingItems.length - 3} dịch vụ khác
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {booking.note && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex justify-between gap-2">
                                                    <span className="font-medium">Ghi chú:</span> {booking.note}
                                                </p>
                                            )}
                                        </div>

                                            <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-200">
                                            <div className="text-xs text-gray-500">
                                                Đặt lúc {formatDateTime(booking.createdAt)}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/account/bookings/${booking.id}`)}
                                                    className="text-xs px-3 py-1.5 rounded-none border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    Xem chi tiết
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancel(booking)}
                                                    disabled={!canCancelBooking(booking)}
                                                    title={!canCancelBooking(booking) ? 'Chỉ có thể hủy trước 2 giờ và khi lịch chưa hoàn thành' : ''}
                                                    className={`text-xs px-3 py-1.5 rounded-none transition-colors ${canCancelBooking(booking)
                                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                                        : 'bg-red-200 text-red-600 cursor-not-allowed'}`}
                                                >
                                                    Hủy lịch
                                                </button>
                                                
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}