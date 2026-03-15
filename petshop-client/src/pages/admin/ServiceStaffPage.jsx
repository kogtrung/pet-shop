import React, { useEffect, useMemo, useState } from 'react';
import { getStaffAvailability, updateServiceStaffDutyStatus, getAllServiceBookings } from '../../api/serviceBookingApi';
import toast from 'react-hot-toast';
import { UserIcon, PhoneIcon, EnvelopeIcon, CalendarIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function ServiceStaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingStaffId, setUpdatingStaffId] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffActivities, setStaffActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        to: new Date().toISOString().split('T')[0] // today
    });

    const SHIFT_START_HOUR = 8;
    const SHIFT_END_HOUR = 19;

    useEffect(() => {
        loadStaff();
    }, []);

    useEffect(() => {
        if (selectedStaff) {
            loadStaffActivities(selectedStaff.staffId);
        }
    }, [selectedStaff, dateRange]);

    const loadStaff = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const start = new Date(today);
            start.setHours(SHIFT_START_HOUR, 0, 0, 0);
            const end = new Date(today);
            end.setHours(SHIFT_END_HOUR, 0, 0, 0);

            const response = await getStaffAvailability({
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                onlyOnDuty: false
            });
            const staffList = (response.data || []).sort((a, b) => {
                if (a.isOnDuty === b.isOnDuty) {
                    return (a.busySlots?.length || 0) - (b.busySlots?.length || 0);
                }
                return a.isOnDuty ? -1 : 1;
            });
            setStaff(staffList);
        } catch (error) {
            console.error('Error loading service staff:', error);
            toast.error('Không thể tải danh sách nhân viên dịch vụ');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDuty = async (member, nextState) => {
        if (!member?.staffId) return;
        setUpdatingStaffId(member.staffId);
        try {
            await updateServiceStaffDutyStatus(member.staffId, { isOnDuty: nextState });
            toast.success(nextState ? `${member.fullName || 'Nhân viên'} đã được đưa vào ca` : `${member.fullName || 'Nhân viên'} đã tạm nghỉ`);
            await loadStaff();
        } catch (error) {
            console.error('Error updating duty status:', error);
            const message = error.response?.data?.error || 'Không thể cập nhật trạng thái';
            toast.error(message);
        } finally {
            setUpdatingStaffId(null);
        }
    };

    const filteredStaff = staff.filter(s => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            s.fullName?.toLowerCase().includes(query) ||
            s.email?.toLowerCase().includes(query) ||
            s.phone?.toLowerCase().includes(query)
        );
    });

    const formatDateTime = (value) => {
        if (!value) return '—';
        return new Date(value).toLocaleString('vi-VN');
    };

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const loadStaffActivities = async (staffId) => {
        setLoadingActivities(true);
        try {
            // Get all bookings for this staff member in date range
            const bookingsRes = await getAllServiceBookings();
            const allBookings = bookingsRes.data || [];

            // Filter bookings assigned to this staff member within date range
            const staffBookings = allBookings.filter(booking => {
                const bookingDate = new Date(booking.startTime || booking.bookingDateTime || booking.createdAt);
                const fromDate = new Date(dateRange.from);
                const toDate = new Date(dateRange.to);
                toDate.setHours(23, 59, 59, 999);

                const isInDateRange = bookingDate >= fromDate && bookingDate <= toDate;
                const isAssignedToStaff = booking.bookingItems?.some(item => item.assignedStaffId === staffId);

                return isInDateRange && isAssignedToStaff;
            }).map(booking => {
                // Filter booking items assigned to this staff
                const assignedItems = booking.bookingItems?.filter(item => item.assignedStaffId === staffId) || [];
                
                // Group services by parent service
                const groupedServices = assignedItems.reduce((groups, item) => {
                    const parentService = item.serviceName || 'Dịch vụ khác';
                    if (!groups[parentService]) {
                        groups[parentService] = [];
                    }
                    groups[parentService].push({
                        packageName: item.servicePackageName || item.packageName || 'Gói cơ bản',
                        status: item.status,
                        note: item.note,
                        price: item.priceAtBooking || item.packagePrice || 0
                    });
                    return groups;
                }, {});

                return {
                    id: booking.id,
                    bookingCode: booking.bookingCode || `#${booking.id}`,
                    timestamp: new Date(booking.startTime || booking.bookingDateTime || booking.createdAt),
                    customerName: booking.customerName,
                    petName: booking.petName,
                    status: booking.status,
                    totalPrice: booking.totalPrice || 0,
                    groupedServices: groupedServices,
                    assignedItems: assignedItems
                };
            });

            // Sort by timestamp descending (newest first)
            staffBookings.sort((a, b) => b.timestamp - a.timestamp);
            setStaffActivities(staffBookings);

        } catch (error) {
            console.error('Error loading staff activities:', error);
            toast.error('Không thể tải hoạt động của nhân viên');
        } finally {
            setLoadingActivities(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Assigned': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'InProgress': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'Pending': 'Chờ xác nhận',
            'Assigned': 'Đã phân công',
            'InProgress': 'Đang thực hiện',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };
        return labels[status] || status;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed':
                return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
            case 'Cancelled':
                return <XCircleIcon className="w-5 h-5 text-red-600" />;
            case 'InProgress':
                return <ClockIcon className="w-5 h-5 text-purple-600" />;
            default:
                return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
        }
    };

    const shiftLabel = useMemo(() => {
        const start = `${SHIFT_START_HOUR.toString().padStart(2, '0')}:00`;
        const end = `${SHIFT_END_HOUR.toString().padStart(2, '0')}:00`;
        return `${start} - ${end}`;
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý nhân viên dịch vụ</h1>
                <p className="text-gray-600 dark:text-gray-400">Xem thông tin và quản lý nhân viên dịch vụ</p>
            </header>

            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo tên, email, SĐT..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Chỉ tối đa 2 nhân viên được bật trạng thái <span className="font-semibold text-gray-700 dark:text-gray-200">Đang trực</span> trong cùng một ca.{' '}
                Tắt/bật để phân bổ ca làm từ {shiftLabel}.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'Không tìm thấy nhân viên nào phù hợp.' : 'Chưa có nhân viên dịch vụ nào.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {filteredStaff.map((member) => {
                            const busyCount = member.busySlots?.length || 0;
                            const nextFreeText = member.isBusyInRange
                                ? `Rảnh lúc ${formatDateTime(member.nextAvailableTime || member.rangeEnd)}`
                                : 'Rảnh ngay';
                            return (
                            <div
                                key={member.staffId || member.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {member.fullName || member.email || 'Chưa có tên'}
                                        </h3>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            {member.email && (
                                                <div className="flex items-center gap-2">
                                                    <EnvelopeIcon className="w-4 h-4" />
                                                    <span>{member.email}</span>
                                                </div>
                                            )}
                                            {member.phone && (
                                                <div className="flex items-center gap-2">
                                                    <PhoneIcon className="w-4 h-4" />
                                                    <span>{member.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${member.isOnDuty
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                {member.isOnDuty ? 'Đang trực' : 'Tạm nghỉ'}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${member.isBusyInRange
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                                {member.isBusyInRange ? 'Đang bận' : 'Đang rảnh'}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {nextFreeText}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700/40">
                                                Ca làm: {shiftLabel}
                                            </span>
                                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700/40">
                                                Lịch đã phân công: {busyCount}
                                            </span>
                                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700/40">
                                                Theo dõi: {formatDateTime(member.rangeStart)} - {formatDateTime(member.rangeEnd)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDuty(member, !member.isOnDuty)}
                                                disabled={updatingStaffId === member.staffId}
                                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                                    member.isOnDuty
                                                        ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30'
                                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-900/20'
                                                } ${updatingStaffId === member.staffId ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {member.isOnDuty ? 'Tạm cho nghỉ' : 'Cho vào ca'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStaff(member)}
                                                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
                                            >
                                                Chi tiết hoạt động
                                            </button>
                                        </div>
                                        {member.busySlots && member.busySlots.length > 0 && (
                                            <div className="mt-4 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                                <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                    <ClockIcon className="w-4 h-4" />
                                                    Lịch sử làm việc gần nhất
                                                </p>
                                                {member.busySlots.slice(0, 3).map(slot => (
                                                    <p key={slot.bookingItemId} className="flex items-center gap-2">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        <span>
                                                            {slot.serviceName || 'Dịch vụ'} • {formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}
                                                        </span>
                                                    </p>
                                                ))}
                                                {member.busySlots.length > 3 && (
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                                        ... và {member.busySlots.length - 3} lịch khác
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>

            {selectedStaff && (
                <div
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center px-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSelectedStaff(null);
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Chi tiết hoạt động - {selectedStaff.fullName || selectedStaff.email}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Lịch sử hoạt động và thống kê chi tiết
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái hiện tại</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedStaff.isOnDuty ? 'Đang trong ca' : 'Tạm nghỉ'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        {selectedStaff.isBusyInRange
                                            ? 'Đang có lịch trong khung giờ theo dõi'
                                            : 'Chưa có lịch trong khung giờ theo dõi'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Thời gian rảnh gần nhất</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedStaff.nextAvailableTime
                                            ? formatDateTime(selectedStaff.nextAvailableTime)
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                {/* Date Range Filter */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Từ ngày:
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.from}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        />
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Đến ngày:
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.to}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng lịch hẹn</p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{staffActivities.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Đã hoàn thành</p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                    {staffActivities.filter(a => a.status === 'Completed').length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Lịch sử hoạt động chi tiết
                                </h4>
                                
                                {loadingActivities ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : staffActivities.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400">
                                            Không có hoạt động nào trong khoảng thời gian đã chọn
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {/* Group bookings by date */}
                                        {Object.entries(
                                            staffActivities.reduce((groups, booking) => {
                                                const dateKey = formatDate(booking.timestamp);
                                                if (!groups[dateKey]) {
                                                    groups[dateKey] = [];
                                                }
                                                groups[dateKey].push(booking);
                                                return groups;
                                            }, {})
                                        ).map(([date, dayBookings]) => (
                                            <div key={date}>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h5 className="font-medium text-gray-900 dark:text-white">{date}</h5>
                                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                                        {dayBookings.length} lịch hẹn
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-3 ml-4">
                                                    {dayBookings.map((booking) => (
                                                        <div 
                                                            key={booking.id}
                                                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <h6 className="font-medium text-gray-900 dark:text-white">
                                                                        {booking.bookingCode}
                                                                    </h6>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                        {formatDateTime(booking.timestamp)}
                                                                    </p>
                                                                </div>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                                                                    {getStatusLabel(booking.status)}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                                                <p><span className="font-medium">Khách hàng:</span> {booking.customerName}</p>
                                                                <p><span className="font-medium">Thú cưng:</span> {booking.petName || '—'}</p>
                                                            </div>
                                                            
                                                            {/* Grouped Services */}
                                                            <div className="space-y-2">
                                                                {Object.entries(booking.groupedServices).map(([parentService, packages]) => (
                                                                    <div key={parentService} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                                                        <h6 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                                            {parentService}
                                                                        </h6>
                                                                        <div className="ml-4 space-y-1">
                                                                            {packages.map((pkg, idx) => (
                                                                                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                                                                    <span className="font-medium">• {pkg.packageName}</span>
                                                                                    {pkg.note && (
                                                                                        <p className="ml-4 text-xs text-gray-500 dark:text-gray-500 italic">
                                                                                            {pkg.note}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
