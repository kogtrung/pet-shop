import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceBookingById, cancelServiceBooking } from '../../api/serviceBookingApi';
import { useAuth } from '../../context/AuthContext';
import {
    CalendarDaysIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    PENDING: { label: 'Chờ xác nhận', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-200' },
    APPROVED: { label: 'Đã duyệt', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200' },
    ASSIGNED: { label: 'Đã phân công', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200' },
    CONFIRMED: { label: 'Đã xác nhận', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-200' },
    INPROGRESS: { label: 'Đang thực hiện', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200' },
    COMPLETED: { label: 'Hoàn thành', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' },
    REJECTED: { label: 'Từ chối', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200' }
};

const getStatusConfig = (status) => {
    if (!status) {
        return { label: 'Không xác định', bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-200' };
    }
    const key = status.toString().toUpperCase();
    return STATUS_CONFIG[key] || { label: status, bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-200' };
};

export default function BookingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const groupedServices = useMemo(() => {
        if (!booking?.bookingItems || booking.bookingItems.length === 0) return [];
        const groups = booking.bookingItems.reduce((acc, item) => {
            const key = item.serviceName || 'Dịch vụ';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
        return Object.entries(groups).map(([serviceName, items]) => ({
            serviceName,
            items
        }));
    }, [booking]);

    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem chi tiết lịch hẹn');
            navigate('/');
            return;
        }
        loadBooking();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, id]);

    const loadBooking = async () => {
        setLoading(true);
        try {
            const res = await getServiceBookingById(id);
            setBooking(res.data);
        } catch (error) {
            console.error('Error loading booking detail:', error);
            toast.error('Không thể tải chi tiết lịch hẹn');
            navigate('/account/bookings');
        } finally {
            setLoading(false);
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
        } catch {
            return '—';
        }
    };

    const formatPrice = (price) => {
        if (price == null) return 'Liên hệ';
        if (price === 0) return '0 ₫';
        return `${price.toLocaleString('vi-VN')} ₫`;
    };

    const canCancelBooking = () => {
        if (!booking) return false;
        const status = (booking.status || '').toString().toUpperCase();
        if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) return false;
        if (!booking.startTime) return false;
        const start = new Date(booking.startTime);
        const now = new Date();
        const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours > 2;
    };

    const handleCancel = async () => {
        if (!canCancelBooking()) {
            toast.error('Bạn chỉ có thể hủy lịch trước giờ hẹn ít nhất 2 giờ và khi lịch chưa hoàn thành.');
            return;
        }
        const confirm = window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?');
        if (!confirm) return;

        const reason = window.prompt('Vui lòng nhập lý do hủy (không bắt buộc):', '') || 'Khách hàng hủy lịch hẹn';
        const toastId = toast.loading('Đang hủy lịch hẹn...');
        try {
            await cancelServiceBooking(booking.id, { reason });
            toast.success('Đã hủy lịch hẹn thành công', { id: toastId });
            await loadBooking();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            const message = error.response?.data?.error || 'Không thể hủy lịch hẹn';
            toast.error(message, { id: toastId });
        }
    };

    const statusConfig = getStatusConfig(booking?.status);

    if (loading || !booking) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalDurationText = booking.totalDurationMinutes
        ? `${Math.floor(booking.totalDurationMinutes / 60)}h ${booking.totalDurationMinutes % 60}p`
        : '—';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <button
                    onClick={() => navigate('/account/bookings')}
                    className="mb-4 inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Quay lại danh sách
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                Chi tiết lịch hẹn
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Mã lịch hẹn:{' '}
                                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                    {booking.bookingCode || `#${booking.id}`}
                                </span>
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Đặt lúc {formatDateTime(booking.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Thông tin lịch hẹn
                            </h2>
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                                <span>{formatDateTime(booking.startTime)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <ClockIcon className="w-5 h-5 mr-2" />
                                <span>Thời lượng dự kiến: {totalDurationText}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                                <span>Tổng giá: {formatPrice(booking.totalPrice)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Thú cưng
                            </h2>
                            <p className="text-sm text-gray-900 dark:text-white">
                                Tên: <span className="font-semibold">{booking.petName || '—'}</span>
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Loại:{' '}
                                {booking.petType || '—'}
                                {booking.petBreed && ` • ${booking.petBreed}`}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {booking.petAge && `Tuổi: ${booking.petAge} tháng`}
                                {booking.petAge && booking.petWeight && ' • '}
                                {booking.petWeight && `Cân nặng: ${booking.petWeight}kg`}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Dịch vụ
                        </h2>
                        {groupedServices.length > 0 ? (
                            <div className="space-y-3">
                                {groupedServices.map((group, groupIdx) => (
                                    <div
                                        key={group.serviceName || groupIdx}
                                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/40"
                                    >
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {group.serviceName}
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {group.items.map((item, idx) => (
                                                <div
                                                    key={item.id || `${groupIdx}-${idx}`}
                                                    className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/40 px-3 py-2 rounded-lg"
                                                >
                                                    <span className="font-medium">
                                                        {idx + 1}. {item.servicePackageName || 'Dịch vụ'}
                                                    </span>
                                                    <span className="text-gray-400 dark:text-gray-500">
                                                        {item.durationMinutes
                                                            ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}p`
                                                            : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Không có thông tin dịch vụ.</p>
                        )}
                    </div>

                    {booking.note && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Ghi chú của bạn
                            </h2>
                            <p className="text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                                {booking.note}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => navigate('/account/bookings')}
                            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Quay lại
                        </button>
                        {canCancelBooking() ? (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
                            >
                                Hủy lịch
                            </button>
                        ) : (
                            <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                Không thể hủy lịch ở trạng thái hiện tại
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


