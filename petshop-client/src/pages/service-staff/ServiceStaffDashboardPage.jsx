import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllServiceBookings, getStaffAvailability } from '../../api/serviceBookingApi.js';
import { getServices } from '../../api/serviceApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
    CalendarDaysIcon, 
    UserGroupIcon, 
    Cog6ToothIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    BellIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SHIFT_START_HOUR = 8;
const SHIFT_END_HOUR = 19;
const SHIFT_LABEL = `${SHIFT_START_HOUR.toString().padStart(2, '0')}:00 - ${SHIFT_END_HOUR
    .toString()
    .padStart(2, '0')}:00`;

// Dashboard Card Component
function DashboardCard({ title, value, icon, badgeColor = 'bg-indigo-100 text-indigo-700', link, change }) {
    const content = (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
                {change && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{change}</p>
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
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
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

// Today's Bookings Component
function TodaysBookings({ bookings }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = (bookings || []).filter(b => {
        const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
    }).slice(0, 5);

    const getStatusBadge = (status) => {
        const badges = {
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'InProgress': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'Pending': 'Chờ xác nhận',
            'Confirmed': 'Đã xác nhận',
            'InProgress': 'Đang thực hiện',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };
        return labels[status] || status;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lịch hẹn hôm nay</h3>
                <Link to="/service-staff/bookings" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Xem tất cả
                </Link>
            </div>
            {todayBookings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Không có lịch hẹn nào hôm nay</p>
            ) : (
                <div className="space-y-3">
                    {todayBookings.map((booking) => {
                        const bookingTime = new Date(booking.startTime || booking.bookingDateTime || booking.createdAt);
                        const timeStr = bookingTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const dateStr = bookingTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        
                        // Get service names from bookingItems
                        const serviceNames = booking.bookingItems?.map(item => item.serviceName || 'Dịch vụ').filter(Boolean) || [];
                        const displayServices = serviceNames.length > 0 
                            ? (serviceNames.length <= 2 ? serviceNames.join(', ') : `${serviceNames.slice(0, 2).join(', ')} +${serviceNames.length - 2}`)
                            : (booking.serviceName || 'Dịch vụ');
                        
                        return (
                            <Link
                                key={booking.id}
                                to="/service-staff/bookings"
                                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {timeStr} - {dateStr}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {booking.customerName || 'Khách hàng'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {displayServices}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusBadge(booking.status)}`}>
                                    {getStatusLabel(booking.status)}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ServiceStaffDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        todayBookings: 0,
        inProgressBookings: 0,
        completedBookings: 0,
        upcomingBookings: 0,
        serviceCount: 0
    });
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAssignedBookings, setNewAssignedBookings] = useState([]);
    const [lastCheckedIds, setLastCheckedIds] = useState(new Set());
    const [dutyInfo, setDutyInfo] = useState(null);

    useEffect(() => {
        loadDashboard();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadDashboard();
        }, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [bookingRes, serviceRes] = await Promise.all([
                getAllServiceBookings().catch(err => {
                    console.error('Error loading bookings:', err);
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        toast.error('Bạn không có quyền xem lịch đặt. Vui lòng đăng nhập lại.');
                    }
                    return { data: [] };
                }),
                getServices().catch(err => {
                    console.error('Error loading services:', err);
                    return { data: [] };
                })
            ]);

            const bookingsList = bookingRes.data || [];
            const services = serviceRes.data || [];

            // Filter today's bookings (based on startTime)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayBookings = bookingsList.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.getTime() === today.getTime();
            });

            // Calculate stats
            const totalBookings = bookingsList.length;
            const pendingBookings = bookingsList.filter(b => b.status === 'Pending').length;
            const inProgressBookings = bookingsList.filter(b => b.status === 'InProgress').length;
            const completedBookings = bookingsList.filter(b => b.status === 'Completed').length;
            const upcomingBookings = bookingsList.filter(b => {
                const bookingDate = new Date(b.bookingDateTime);
                return bookingDate >= new Date();
            }).length;

            setStats({
                totalBookings,
                pendingBookings,
                todayBookings: todayBookings.length,
                inProgressBookings,
                completedBookings,
                upcomingBookings,
                serviceCount: services.length
            });

            // Check for new assigned bookings (only "Assigned" status, not Completed or InProgress)
            if (user?.id) {
                const assignedToMe = bookingsList.filter(booking => {
                    const status = (booking.status || '').toLowerCase();
                    // Only count bookings with "Assigned" status
                    if (status !== 'assigned') return false;
                    return booking.bookingItems?.some(item => item.assignedStaffId === user.id);
                });
                
                const newBookings = assignedToMe.filter(booking => {
                    return !lastCheckedIds.has(booking.id);
                });
                
                if (newBookings.length > 0) {
                    setNewAssignedBookings(newBookings);
                    toast.success(`Bạn có ${newBookings.length} lịch mới được phân công!`, {
                        icon: '🔔',
                        duration: 5000
                    });
                }
                
                setLastCheckedIds(new Set(assignedToMe.map(b => b.id)));
            }

            setBookings(bookingsList);

            if (user?.id) {
                try {
                    const shiftStart = new Date();
                    shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);
                    const shiftEnd = new Date();
                    shiftEnd.setHours(SHIFT_END_HOUR, 0, 0, 0);
                    const availabilityRes = await getStaffAvailability({
                        startTime: shiftStart.toISOString(),
                        endTime: shiftEnd.toISOString(),
                        onlyOnDuty: false
                    });
                    const me = (availabilityRes.data || []).find(member => member.staffId === user.id);
                    if (me) {
                        setDutyInfo({
                            isOnDuty: me.isOnDuty,
                            isBusyInRange: me.isBusyInRange,
                            nextAvailableTime: me.nextAvailableTime,
                            rangeStart: me.rangeStart,
                            rangeEnd: me.rangeEnd
                        });
                    } else {
                        setDutyInfo({
                            isOnDuty: false
                        });
                    }
                } catch (error) {
                    console.error('Error loading duty status', error);
                    setDutyInfo({
                        isOnDuty: false,
                        error: true
                    });
                }
            } else {
                setDutyInfo(null);
            }
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
            const errorMessage = error.response?.data?.error || 'Không thể tải tổng quan dịch vụ';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatDutyTime = (value) => {
        if (!value) return null;
        return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tổng quan dịch vụ</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Theo dõi nhanh tình hình đặt lịch và hoạt động dịch vụ
                </p>
            </header>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {dutyInfo && (
                        <div
                            className={`rounded-lg border-l-4 p-4 ${
                                dutyInfo.isOnDuty
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                                    : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
                            }`}
                        >
                            <p className="font-semibold">
                                {dutyInfo.isOnDuty ? 'Bạn đang trong ca làm việc' : 'Bạn đang ngoài ca làm việc'}
                            </p>
                            <p className="text-sm">
                                Ca hôm nay: {SHIFT_LABEL}.{' '}
                                {dutyInfo.isOnDuty
                                    ? dutyInfo.isBusyInRange
                                        ? 'Bạn đang có lịch được phân công trong khung theo dõi.'
                                        : 'Hiện chưa có lịch nào, hãy sẵn sàng khi có phân công mới.'
                                    : 'Hãy liên hệ Admin để được đưa vào ca khi cần.'}
                            </p>
                            {dutyInfo.nextAvailableTime && (
                                <p className="text-xs mt-1 text-gray-600 dark:text-gray-300">
                                    Thời gian rảnh tiếp theo: {formatDutyTime(dutyInfo.nextAvailableTime)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Alerts */}
                    {(newAssignedBookings.length > 0 || stats.pendingBookings > 0 || stats.todayBookings > 0 || stats.inProgressBookings > 0) && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                                Cảnh báo & Thông báo
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {newAssignedBookings.length > 0 && (
                                    <AlertCard
                                        type="info"
                                        title="Lịch mới được phân công"
                                        message={`Bạn có ${newAssignedBookings.length} lịch mới được phân công`}
                                        count={newAssignedBookings.length}
                                        link="/service-staff/bookings"
                                        icon={BellIcon}
                                    />
                                )}
                                {stats.pendingBookings > 0 && (
                                    <AlertCard
                                        type="warning"
                                        title="Lịch hẹn chờ xác nhận"
                                        message={`Có ${stats.pendingBookings} lịch hẹn cần xác nhận`}
                                        count={stats.pendingBookings}
                                        link="/service-staff/bookings?status=Pending"
                                        icon={ClockIcon}
                                    />
                                )}
                                {stats.todayBookings > 0 && (
                                    <AlertCard
                                        type="info"
                                        title="Lịch hẹn hôm nay"
                                        message={`Có ${stats.todayBookings} lịch hẹn cần xử lý hôm nay`}
                                        count={stats.todayBookings}
                                        link="/service-staff/bookings"
                                        icon={CalendarDaysIcon}
                                    />
                                )}
                                {stats.inProgressBookings > 0 && (
                                    <AlertCard
                                        type="info"
                                        title="Đang thực hiện"
                                        message={`Có ${stats.inProgressBookings} dịch vụ đang thực hiện`}
                                        count={stats.inProgressBookings}
                                        link="/service-staff/bookings?status=InProgress"
                                        icon={Cog6ToothIcon}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DashboardCard
                            title="Tổng số lịch đặt"
                            value={stats.totalBookings}
                            icon={<CalendarDaysIcon className="w-8 h-8 text-indigo-500" />}
                            link="/service-staff/bookings"
                        />
                        <DashboardCard
                            title="Chờ xác nhận"
                            value={stats.pendingBookings}
                            icon={<ClockIcon className="w-8 h-8 text-orange-500" />}
                            badgeColor="bg-orange-100 text-orange-700"
                            link="/service-staff/bookings?status=Pending"
                        />
                        <DashboardCard
                            title="Sắp diễn ra"
                            value={stats.upcomingBookings}
                            icon={<CalendarDaysIcon className="w-8 h-8 text-emerald-500" />}
                            badgeColor="bg-emerald-100 text-emerald-700"
                            link="/service-staff/bookings"
                        />
                        <DashboardCard
                            title="Hoàn thành"
                            value={stats.completedBookings}
                            icon={<CheckCircleIcon className="w-8 h-8 text-green-500" />}
                            badgeColor="bg-green-100 text-green-700"
                            link="/service-staff/bookings?status=Completed"
                        />
                    </div>

                    {/* Today's Bookings and Service Count */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TodaysBookings bookings={bookings} />
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Thông tin dịch vụ</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Số dịch vụ đang mở</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.serviceCount}</p>
                                    </div>
                                    <UserGroupIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <Link
                                    to="/service-staff/catalog"
                                    className="block w-full text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                >
                                    Xem danh sách dịch vụ
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Thao tác nhanh</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link
                                to="/service-staff/bookings"
                                className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <CalendarDaysIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Quản lý lịch hẹn</p>
                                        <p className="text-sm opacity-90">Xem và cập nhật lịch hẹn</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                to="/service-staff/catalog"
                                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <UserGroupIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Xem dịch vụ</p>
                                        <p className="text-sm opacity-90">Danh sách dịch vụ và gói</p>
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
