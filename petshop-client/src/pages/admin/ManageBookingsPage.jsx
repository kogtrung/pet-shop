import React, { useState, useEffect, useMemo } from 'react';
import { getAllServiceBookings, updateServiceBookingStatus, deleteServiceBooking, getBookingStaffAvailability, assignServiceBookingStaff, getStaffAvailability } from '../../api/serviceBookingApi';
import { getServices } from '../../api/serviceApi';
import toast from 'react-hot-toast';
import {
    CalendarDaysIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    EyeIcon,
    TrashIcon,
    XMarkIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronUpDownIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ManageBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [staffFilter, setStaffFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('startTime'); // 'startTime' or 'createdAt'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for upcoming first
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBookings, setTotalBookings] = useState(0);
    const pageSize = 15;
    
    // Data for filters
    const [services, setServices] = useState([]);
    const [serviceStaff, setServiceStaff] = useState([]);
    const [bookingStaffSelections, setBookingStaffSelections] = useState({});
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [bookingAvailability, setBookingAvailability] = useState({});
    const SHIFT_START_HOUR = 8;
    const SHIFT_END_HOUR = 19;

    const isBookingCancelled = (booking) => {
        const status = (booking.status || '').toLowerCase();
        return status === 'cancelled' || status === 'rejected';
    };

    const getStaffOptionsForBooking = (booking, availabilityOverride) => {
        const map = availabilityOverride || bookingAvailability[booking.id] || {};
        const assignedItem = booking.bookingItems?.find(item => item.assignedStaffId);
        const currentStaffId = assignedItem?.assignedStaffId || '';
        const isCancelled = isBookingCancelled(booking);
        return serviceStaff.filter(staff => {
            const info = map[staff.id];
            const isCurrent = currentStaffId === staff.id;
            const isOnDuty = staff.isOnDuty;
            if (!isOnDuty && !isCurrent) {
                return false;
            }
            if (!info) return !isCancelled && (isOnDuty || isCurrent);
            return (isOnDuty || isCurrent) && !info.isBusyInRange && !isCancelled;
        });
    };

    const isSameDay = (dateA, dateB) => {
        if (!dateA || !dateB) return false;
        return (
            dateA.getFullYear() === dateB.getFullYear() &&
            dateA.getMonth() === dateB.getMonth() &&
            dateA.getDate() === dateB.getDate()
        );
    };

    const groupBookingItemsByService = (items = []) => {
        const groups = {};
        items.forEach((item) => {
            const key = item.serviceId || `service-${item.id}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    serviceId: item.serviceId,
                    serviceName: item.serviceName || 'Dịch vụ',
                    items: []
                };
            }
            groups[key].items.push(item);
        });
        return Object.values(groups);
    };

    useEffect(() => {
        loadBookings();
        loadServices();
        loadServiceStaff();
    }, [currentPage, statusFilter, sortBy, sortOrder]);

    const loadServices = async () => {
        try {
            const response = await getServices();
            setServices(response.data || []);
        } catch (error) {
            console.error('Error loading services:', error);
        }
    };

    const loadServiceStaff = async () => {
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
            const staffList = (response.data || []).map(member => ({
                ...member,
                id: member.staffId || member.id
            }));
            setServiceStaff(staffList);
        } catch (error) {
            console.error('Error loading service staff:', error);
        }
    };

    const loadBookingAvailabilities = async (bookingList) => {
        if (!Array.isArray(bookingList) || bookingList.length === 0) {
            setBookingAvailability({});
            return;
        }

        try {
            const results = await Promise.all(
                bookingList.map(async (booking) => {
                    try {
                        const res = await getBookingStaffAvailability(booking.id);
                        return {
                            bookingId: booking.id,
                            staff: (res.data || []).reduce((acc, staffInfo) => {
                                acc[staffInfo.staffId] = staffInfo;
                                return acc;
                            }, {})
                        };
                    } catch (error) {
                        console.error('Error loading availability for booking', booking.id, error);
                        return { bookingId: booking.id, staff: {} };
                    }
                })
            );

            setBookingAvailability((prev) => {
                const next = { ...prev };
                results.forEach(result => {
                    next[result.bookingId] = result.staff;
                });
                return next;
            });
        } catch (error) {
            console.error('Error loading booking availabilities:', error);
        }
    };

    const loadBookings = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                pageSize: pageSize,
                sortBy: sortBy,
                sortOrder: sortOrder
            };
            
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const response = await getAllServiceBookings(params);
            let items = [];
            let total = 0;

            if (response.data.items) {
                items = response.data.items;
                total = response.data.total || response.data.items.length;
            } else {
                items = response.data || [];
                total = response.data.length || 0;
            }

            setBookings(items);
            setTotalBookings(total);
            setBookingStaffSelections({});
            await loadBookingAvailabilities(items);
        } catch (error) {
            console.error('Error loading bookings:', error);
            toast.error('Không thể tải danh sách lịch hẹn');
            setBookings([]);
            setBookingAvailability({});
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (bookingId, newStatus) => {
        const loadingToast = toast.loading('Đang cập nhật trạng thái...');
        try {
            await updateServiceBookingStatus(bookingId, { status: newStatus });
            toast.success('Cập nhật trạng thái thành công!', { id: loadingToast });
            loadBookings();
        } catch (error) {
            console.error('Error updating booking status:', error);
            toast.error('Không thể cập nhật trạng thái', { id: loadingToast });
        }
    };

    const handleDelete = async (bookingId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa lịch hẹn này?')) return;

        const loadingToast = toast.loading('Đang xóa...');
        try {
            await deleteServiceBooking(bookingId);
            toast.success('Xóa lịch hẹn thành công!', { id: loadingToast });
            loadBookings();
        } catch (error) {
            console.error('Error deleting booking:', error);
            const message = error.response?.data?.error || 'Không thể xóa lịch hẹn';
            toast.error(message, { id: loadingToast });
        }
    };

    const handleBookingStaffChange = (bookingId, staffId) => {
        setBookingStaffSelections((prev) => ({
            ...prev,
            [bookingId]: staffId
        }));
    };

    const handleSaveBookingStaff = async (bookingId) => {
        const selectedStaffId = bookingStaffSelections.hasOwnProperty(bookingId)
            ? bookingStaffSelections[bookingId]
            : undefined;

        setUpdatingIds((prev) => new Set(prev).add(bookingId));
        const toastId = toast.loading('Đang phân công nhân viên...');
        try {
            await assignServiceBookingStaff(bookingId, { staffId: selectedStaffId || null });
            toast.success('Đã cập nhật nhân viên phụ trách', { id: toastId });
            await loadBookings();
            setBookingStaffSelections((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });
        } catch (error) {
            console.error('Error assigning staff:', error);
            const message = error.response?.data?.error || 'Không thể phân công nhân viên';
            toast.error(message, { id: toastId });
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(bookingId);
                return next;
            });
        }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const getStatusConfig = (status) => {
        // Map trạng thái nội bộ sang nhãn dễ hiểu cho Admin
        const upper = (status || '').toString().toUpperCase();
        const configs = {
            PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', icon: ClockIcon },
            CONFIRMED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', icon: CheckCircleIcon },
            ASSIGNED: { label: 'Đã phân công', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300', icon: ClockIcon },
            INPROGRESS: { label: 'Đang thực hiện', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', icon: ClockIcon },
            COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: CheckCircleIcon },
            CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: XCircleIcon },
            REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: XCircleIcon }
        };
        return configs[upper] || configs.PENDING;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDurationText = (minutes) => {
        if (minutes == null) return '—';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}p`;
        if (hours > 0) return `${hours}h`;
        return `${mins}p`;
    };

    const formatCurrency = (value) => {
        if (value == null) return '—';
        const number = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(number)) return '—';
        return `${number.toLocaleString('vi-VN')} ₫`;
    };

    const filteredBookings = bookings.filter(booking => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (
                booking.id?.toString().includes(query) ||
                booking.bookingCode?.toLowerCase().includes(query) ||
                booking.customerName?.toLowerCase().includes(query) ||
                booking.customerEmail?.toLowerCase().includes(query) ||
                booking.customerPhone?.includes(query) ||
                booking.petName?.toLowerCase().includes(query) ||
                booking.petType?.toLowerCase().includes(query) ||
                booking.petBreed?.toLowerCase().includes(query) ||
                // Search in BookingItems
                booking.bookingItems?.some(item => 
                    item.serviceName?.toLowerCase().includes(query) ||
                    item.servicePackageName?.toLowerCase().includes(query) ||
                    item.assignedStaffName?.toLowerCase().includes(query)
                ) ||
                booking.assignedStaffName?.toLowerCase().includes(query)
            );
            if (!matchesSearch) return false;
        }
        
        // Status filter
        if (statusFilter !== 'all' && booking.status?.toUpperCase() !== statusFilter.toUpperCase()) {
            return false;
        }
        
        // Service filter - check in BookingItems
        if (serviceFilter !== 'all') {
            const hasService = booking.bookingItems?.some(item => 
                item.serviceId?.toString() === serviceFilter
            );
            if (!hasService) return false;
        }
        
        // Staff filter - check in BookingItems
        if (staffFilter !== 'all') {
            if (staffFilter === 'unassigned') {
                // Check if all items are unassigned
                const allUnassigned = booking.bookingItems?.every(item => !item.assignedStaffId);
                if (!allUnassigned) return false;
            } else {
                // Check if any item is assigned to this staff
                const hasStaff = booking.bookingItems?.some(item => 
                    item.assignedStaffId === staffFilter
                );
                if (!hasStaff) return false;
            }
        }
        
        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const bookingDate = new Date(booking.startTime || booking.createdAt || booking.bookingDateTime);
            
            if (dateFilter === 'today') {
                bookingDate.setHours(0, 0, 0, 0);
                if (bookingDate.getTime() !== today.getTime()) return false;
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                if (bookingDate < weekAgo) return false;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                if (bookingDate < monthAgo) return false;
            } else if (dateFilter === 'custom' && dateFrom && dateTo) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (bookingDate < from || bookingDate > to) return false;
            }
        }
        
        return true;
    });

    const totalPages = Math.ceil(totalBookings / pageSize);
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    const statusOptions = [
        { value: 'all', label: 'Tất cả trạng thái' },
        { value: 'PENDING', label: 'Chờ xác nhận' },
        { value: 'ASSIGNED', label: 'Đã phân công' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'INPROGRESS', label: 'Đang làm' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' },
        { value: 'REJECTED', label: 'Bị từ chối' }
    ];

    const getComparableValue = (booking, field) => {
        const lowerField = field?.toString().toLowerCase() || '';
        const value = booking?.[field];
        if (value == null) return lowerField.includes('time') || lowerField.includes('date') ? 0 : '';
        if (lowerField.includes('time') || lowerField.includes('date')) {
            return new Date(value).getTime();
        }
        if (typeof value === 'number') return value;
        const numeric = Number(value);
        if (!Number.isNaN(numeric) && value !== '' && typeof value !== 'object') {
            return numeric;
        }
        return value.toString().toLowerCase();
    };

    const todaysBookings = useMemo(() => {
        if (!bookings?.length) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookings.filter((booking) => {
            const slot = new Date(booking.startTime || booking.createdAt);
            slot.setHours(0, 0, 0, 0);
            return isSameDay(slot, today);
        });
    }, [bookings]);

    const todaysUnassignedBookings = useMemo(
        () =>
            todaysBookings.filter(
                (booking) => !(booking.bookingItems || []).some((item) => item.assignedStaffId)
            ),
        [todaysBookings]
    );

    const orderedServiceStaff = useMemo(() => {
        return [...serviceStaff].sort((a, b) => {
            if (a.isOnDuty === b.isOnDuty) {
                const nameA = a.fullName || a.username || a.email || '';
                const nameB = b.fullName || b.username || b.email || '';
                return nameA.localeCompare(nameB);
            }
            return a.isOnDuty ? -1 : 1;
        });
    }, [serviceStaff]);

    const stats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status?.toUpperCase() === 'PENDING').length,
        assigned: bookings.filter(b => b.status?.toUpperCase() === 'ASSIGNED').length,
        confirmed: bookings.filter(b => b.status?.toUpperCase() === 'CONFIRMED').length,
        inProgress: bookings.filter(b => b.status?.toUpperCase() === 'INPROGRESS').length,
        completed: bookings.filter(b => b.status?.toUpperCase() === 'COMPLETED').length,
        cancelled: bookings.filter(b => b.status?.toUpperCase() === 'CANCELLED').length,
        rejected: bookings.filter(b => b.status?.toUpperCase() === 'REJECTED').length
    };

    const sortedBookings = useMemo(() => {
        if (!filteredBookings || filteredBookings.length === 0) return [];
        
        // Separate completed/paid bookings from others
        const activeBookings = [];
        const completedBookings = [];
        
        filteredBookings.forEach(booking => {
            const isCompleted = (booking.status || '').toLowerCase() === 'completed';
            const isPaid = (booking.paymentStatus || '').toLowerCase() === 'paid';
            
            if (isCompleted || isPaid) {
                completedBookings.push(booking);
            } else {
                activeBookings.push(booking);
            }
        });
        
        // Sort each group
        const sortGroup = (group) => {
            return [...group].sort((a, b) => {
                const aVal = getComparableValue(a, sortBy);
                const bVal = getComparableValue(b, sortBy);
                let comparison;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = aVal.toString().localeCompare(bVal.toString());
                }
                return sortOrder === 'asc' ? comparison : -comparison;
        });
        };
        
        // Return active bookings first, then completed/paid bookings
        return [...sortGroup(activeBookings), ...sortGroup(completedBookings)];
    }, [filteredBookings, sortBy, sortOrder]);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                    <CalendarDaysIcon className="w-8 h-8 mr-3 text-indigo-600" />
                    Quản lý lịch hẹn
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Quản lý tất cả lịch hẹn dịch vụ</p>
            </div>

            {todaysBookings.length > 0 && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="font-semibold">
                            Hôm nay có {todaysBookings.length} lịch hẹn cần theo dõi
                        </p>
                        {todaysUnassignedBookings.length > 0 ? (
                            <p className="text-sm">
                                {todaysUnassignedBookings.length} lịch chưa phân công nhân viên. Kiểm tra và phân công sớm
                                để đảm bảo đủ nhân sự.
                            </p>
                        ) : (
                            <p className="text-sm">Tất cả lịch hôm nay đã được phân công.</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setDateFilter('today');
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
                        >
                            Lọc lịch hôm nay
                        </button>
                        {todaysUnassignedBookings.length > 0 && (
                            <button
                                onClick={() => {
                                    setDateFilter('today');
                                    setStaffFilter('unassigned');
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2 rounded-lg border border-amber-400 text-amber-800 text-sm font-medium hover:bg-white/60 transition"
                            >
                                Xem lịch chưa phân công
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng lịch hẹn</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chờ xác nhận</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đã phân công</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.assigned}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đã xác nhận</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đang làm</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hoàn thành</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đã hủy/Từ chối</p>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelled + stats.rejected}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo mã, khách hàng, thú cưng, dịch vụ..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={serviceFilter}
                        onChange={(e) => {
                            setServiceFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả dịch vụ</option>
                        {services.map(service => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={staffFilter}
                        onChange={(e) => {
                            setStaffFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả nhân viên</option>
                        <option value="unassigned">Chưa phân công</option>
                        {orderedServiceStaff.map(staff => (
                            <option key={staff.id} value={staff.id}>
                                {staff.fullName || staff.username || staff.email || staff.id}
                                {!staff.isOnDuty ? ' (ngoài ca)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <select
                        value={dateFilter}
                        onChange={(e) => {
                            setDateFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả ngày</option>
                        <option value="today">Hôm nay</option>
                        <option value="week">7 ngày qua</option>
                        <option value="month">30 ngày qua</option>
                        <option value="custom">Tùy chọn</option>
                    </select>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-gray-500 dark:text-gray-400">đến</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    <select
                        value={sortBy}
                        onChange={(e) => {
                            setSortBy(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="startTime">Sắp xếp: Thời gian hẹn</option>
                        <option value="createdAt">Sắp xếp: Thời gian đặt</option>
                    </select>
                    
                    <button
                        onClick={() => {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                        title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                    >
                        <ChevronUpDownIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}</span>
                    </button>

                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setServiceFilter('all');
                            setStaffFilter('all');
                            setDateFilter('all');
                            setDateFrom('');
                            setDateTo('');
                            setSortBy('startTime');
                            setSortOrder('asc');
                            setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Đặt lại</span>
                    </button>
                </div>
            </div>

            {/* Bookings Table */}
            {loading ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            ) : sortedBookings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                    <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Không tìm thấy lịch hẹn
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter !== 'all' ? 'Không có lịch hẹn phù hợp với bộ lọc' : 'Chưa có lịch hẹn nào'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => handleSort('id')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Mã
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Khách hàng</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Thú cưng</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Dịch vụ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Nhân viên</th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => handleSort('startTime')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Thời gian hẹn
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tổng thời lượng</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tổng giá</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Ngày tạo</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedBookings.map((booking) => {
                                    const statusConfig = getStatusConfig(booking.status);
                                    const StatusIcon = statusConfig.icon;
                                    const upperStatus = (booking.status || '').toString().toUpperCase();
                                    const isCancelled = upperStatus === 'CANCELLED';

                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900 dark:text-white">{booking.bookingCode || `#${booking.id}`}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900 dark:text-white">{booking.customerName || '—'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{booking.customerEmail || '—'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{booking.customerPhone || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900 dark:text-white">{booking.petName || '—'}</p>
                                                    {booking.petType && (
                                                        <p className="text-gray-500 dark:text-gray-400">
                                                            {booking.petType}
                                                            {booking.petBreed && ` - ${booking.petBreed}`}
                                                        </p>
                                                    )}
                                                    {booking.petAge && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                                            {booking.petAge} tháng
                                                            {booking.petWeight && ` • ${booking.petWeight}kg`}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {booking.bookingItems && booking.bookingItems.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {groupBookingItemsByService(booking.bookingItems).map((group) => (
                                                            <div key={group.key} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                                                                    {group.serviceName}
                                                                </p>
                                                                <ul className="space-y-2">
                                                                    {group.items.map((item, idx) => (
                                                                        <li key={item.id || idx} className="text-sm text-gray-700 dark:text-gray-300">
                                                                            <p className="font-medium">{item.servicePackageName || `Dịch vụ ${idx + 1}`}</p>
                                                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                                                                                {item.durationMinutes && (
                                                                                    <span>Thời lượng: {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}p</span>
                                                                                )}
                                                                                {item.priceAtBooking > 0 && (
                                                                                    <span>Giá: {item.priceAtBooking?.toLocaleString('vi-VN')} ₫</span>
                                                                                )}
                                                                            </div>
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
                                                {(() => {
                                                    const availabilityMap = bookingAvailability[booking.id] || {};
                                                    const assignedItem = booking.bookingItems?.find(item => item.assignedStaffId);
                                                    const currentStaffId = assignedItem?.assignedStaffId || '';
                                                    const currentStaffName = assignedItem?.assignedStaffName;
                                                    const pendingStaffId = bookingStaffSelections.hasOwnProperty(booking.id)
                                                        ? bookingStaffSelections[booking.id]
                                                        : undefined;
                                                    const selectValue = pendingStaffId !== undefined
                                                        ? pendingStaffId
                                                        : currentStaffId || '';
                                                    const staffOptions = getStaffOptionsForBooking(booking, availabilityMap);
                                                    const hasChanges = pendingStaffId !== undefined && (pendingStaffId || '') !== (currentStaffId || '');
                                                    const isUpdating = updatingIds.has(booking.id);

                                                    return (
                                                        <div className="space-y-2">
                                                            <select
                                                                value={selectValue}
                                                                onChange={(e) => handleBookingStaffChange(booking.id, e.target.value)}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                                                disabled={isUpdating || staffOptions.length === 0 || isCancelled}
                                                            >
                                                                <option value="">Chưa phân công</option>
                                                                {staffOptions.map(staff => (
                                                                    <option key={staff.id} value={staff.id}>
                                                                        {staff.fullName || staff.username || staff.email || staff.id}
                                                                        {!staff.isOnDuty && ' (tạm nghỉ)'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {staffOptions.length === 0 && (
                                                                <p className="text-xs text-red-500 dark:text-red-400">
                                                                    Không còn nhân viên rảnh trong khung giờ này
                                                                </p>
                                                            )}
                                                            {currentStaffName && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    Đang phụ trách: {currentStaffName}
                                                                </p>
                                                            )}
                                                            {hasChanges && (
                                                                <button
                                                                    onClick={() => handleSaveBookingStaff(booking.id)}
                                                                    disabled={isUpdating}
                                                                    className="w-full px-3 py-2 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                                                >
                                                                    {isUpdating ? 'Đang lưu...' : (selectValue ? 'Phân công' : 'Hủy phân công')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                <div>
                                                    <p className="font-medium">{formatDate(booking.startTime || booking.bookingDateTime)}</p>
                                                    {booking.endTime && (
                                                        <p className="text-xs text-gray-400">Đến: {formatDate(booking.endTime)}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {formatDurationText(booking.totalDurationMinutes)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(booking.totalPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                <p>{formatDate(booking.createdAt)}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                        {React.createElement(statusConfig.icon, { className: 'w-4 h-4' })}
                                                        {statusConfig.label}
                                                    </span>
                                                    {booking.paymentStatus === 'Paid' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                            Đã thanh toán
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                            Chưa thanh toán
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {booking.cancelReason && (
                                                    <p className="text-xs text-red-500 dark:text-red-300 mt-1">
                                                        Lý do hủy: {booking.cancelReason}
                                                    </p>
                                                )}
                                                {booking.source && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Nguồn: {booking.source}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBooking(booking);
                                                                setShowDetailsModal(true);
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <EyeIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(booking.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        <button
                                                            onClick={() => handleStatusChange(booking.id, 'Confirmed')}
                                                            className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                                            disabled={isCancelled}
                                                        >
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(booking.id, 'Rejected')}
                                                            className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                                                            disabled={isCancelled}
                                                        >
                                                            Từ chối
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(booking.id, 'Cancelled')}
                                                            className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                                                            disabled={isCancelled}
                                                        >
                                                            Hủy (Admin)
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Hiển thị {Math.min((currentPage - 1) * pageSize + 1, totalBookings)} - {Math.min(currentPage * pageSize, totalBookings)} trong tổng số {totalBookings} lịch hẹn
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={!canGoPrevious}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Trước
                                </button>

                                <div className="flex gap-2">
                                    {currentPage > 2 && (
                                        <>
                                            <button
                                                onClick={() => setCurrentPage(1)}
                                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                1
                                            </button>
                                            {currentPage > 3 && <span className="px-2 py-2">...</span>}
                                        </>
                                    )}

                                    {currentPage > 1 && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            {currentPage - 1}
                                        </button>
                                    )}

                                    <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white">
                                        {currentPage}
                                    </button>

                                    {currentPage < totalPages && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            {currentPage + 1}
                                        </button>
                                    )}

                                    {currentPage < totalPages - 1 && (
                                        <>
                                            {currentPage < totalPages - 2 && <span className="px-2 py-2">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={!canGoNext}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
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
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Trạng thái</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedBooking.status).color}`}>
                                            {React.createElement(getStatusConfig(selectedBooking.status).icon, { className: 'w-4 h-4' })}
                                            {getStatusConfig(selectedBooking.status).label}
                                        </span>
                                        {selectedBooking.cancelReason && (
                                            <p className="mt-2 text-xs text-red-500 dark:text-red-300">
                                                Lý do hủy: {selectedBooking.cancelReason}
                                            </p>
                                        )}
                                        {selectedBooking.source && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Nguồn tạo: {selectedBooking.source}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Thời gian</label>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                        Bắt đầu: {formatDate(selectedBooking.startTime || selectedBooking.bookingDateTime)}
                                    </p>
                                    {selectedBooking.endTime && (
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            Kết thúc: {formatDate(selectedBooking.endTime)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Nhân viên - hiển thị ở trên */}
                            {selectedBooking.bookingItems && selectedBooking.bookingItems.some(item => item.assignedStaffName) && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Nhân viên</label>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {Array.from(new Set(selectedBooking.bookingItems
                                            .filter(item => item.assignedStaffName)
                                            .map(item => item.assignedStaffName)
                                        )).map((staffName, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                                                {staffName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400">Dịch vụ</label>
                                {selectedBooking.bookingItems && selectedBooking.bookingItems.length > 0 ? (
                                    <div className="mt-2 space-y-3">
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
                                                        <p className="font-semibold text-gray-900 dark:text-white">{serviceName} ({items.length})</p>
                                                </div>
                                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {items.map((item, idx) => (
                                                            <div key={item.id || idx} className="px-4 py-3 bg-white dark:bg-gray-800">
                                                {item.servicePackageName && (
                                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        {item.servicePackageName}
                                                    </p>
                                                )}
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <div className="text-gray-500 dark:text-gray-400">
                                                                        Giá: {item.priceAtBooking?.toLocaleString('vi-VN') || '—'} ₫
                                                                    </div>
                                                {item.durationMinutes && (
                                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Thời lượng: {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}p
                                                                        </div>
                                                )}
                                                                </div>
                                                {item.note && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                                        Ghi chú: {item.note}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
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
                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedBooking.serviceName || '—'}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Khách hàng</label>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedBooking.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedBooking.customerPhone}</p>
                                    {selectedBooking.customerEmail && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedBooking.customerEmail}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Thú cưng</label>
                                    {selectedBooking.petName ? (
                                        <>
                                            <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedBooking.petName}</p>
                                            {selectedBooking.petType && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Loại: {selectedBooking.petType}
                                                    {selectedBooking.petBreed && ` - ${selectedBooking.petBreed}`}
                                                </p>
                                            )}
                                            {(selectedBooking.petAge || selectedBooking.petWeight) && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {selectedBooking.petAge && `Tuổi: ${selectedBooking.petAge} tháng`}
                                                    {selectedBooking.petAge && selectedBooking.petWeight && ' • '}
                                                    {selectedBooking.petWeight && `Cân nặng: ${selectedBooking.petWeight}kg`}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="mt-1 text-gray-400">—</p>
                                    )}
                                </div>
                            </div>


                            {selectedBooking.note && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Ghi chú khách hàng</label>
                                    <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white">
                                        {selectedBooking.note}
                                    </p>
                                </div>
                            )}

                            {selectedBooking.internalNote && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Ghi chú nội bộ</label>
                                    <p className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-gray-900 dark:text-white">
                                        {selectedBooking.internalNote}
                                    </p>
                                </div>
                            )}

                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end">
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
    );
}
