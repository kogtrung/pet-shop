import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    HomeIcon,
    CalendarDaysIcon,
    WrenchScrewdriverIcon,
    UserGroupIcon,
    PhoneIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    UserIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

// Menu structure with groups
const menuGroups = [
    {
        id: 'overview',
        label: 'Tổng quan',
        icon: HomeIcon,
        items: [
            { to: '/service-staff', label: 'Bảng điều khiển', icon: '📊' }
        ]
    },
    {
        id: 'bookings',
        label: 'Lịch hẹn',
        icon: CalendarDaysIcon,
        items: [
            { to: '/service-staff/bookings', label: 'Quản lý lịch hẹn', icon: '📅' }
        ]
    },
    {
        id: 'services',
        label: 'Dịch vụ',
        icon: WrenchScrewdriverIcon,
        items: [
            { to: '/service-staff/catalog', label: 'Xem dịch vụ', icon: '🔧' }
        ]
    },
    {
        id: 'pets',
        label: 'Hồ sơ thú cưng',
        icon: UserGroupIcon,
        items: [
            { to: '/service-staff/pets', label: 'Quản lý hồ sơ', icon: '🐾', comingSoon: true }
        ]
    },
    {
        id: 'support',
        label: 'Hỗ trợ khách hàng',
        icon: PhoneIcon,
        items: [
            { to: '/service-staff/customer-support', label: 'Liên hệ khách hàng', icon: '📞', comingSoon: true }
        ]
    }
];

export default function ServiceStaffLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isServiceStaff, isAdmin, loading, logout } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState(['overview', 'bookings', 'services']);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!(isServiceStaff || isAdmin)) {
        return <Navigate to="/" replace />;
    }

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const isGroupActive = (group) => {
        return group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6">
                <aside className="lg:col-span-3 xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-fit lg:sticky lg:top-4">
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">🐾</span>
                            <span>Dịch vụ</span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nhân viên dịch vụ</p>
                    </div>
                    <nav className="space-y-2 text-sm">
                        {menuGroups.map((group) => {
                            const GroupIcon = group.icon;
                            const isExpanded = expandedGroups.includes(group.id);
                            const isActive = isGroupActive(group);
                            
                            return (
                                <div key={group.id}>
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                                            isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <GroupIcon className="w-5 h-5" />
                                            <span className="font-medium">{group.label}</span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDownIcon className="w-4 h-4" />
                                        ) : (
                                            <ChevronRightIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="ml-4 space-y-1 mb-2">
                                            {group.items.map((item) => {
                                                const isItemActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                                return (
                                                    <Link
                                                        key={item.to}
                                                        to={item.to}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                            isItemActive
                                                                ? 'bg-indigo-600 text-white shadow-md'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                        } ${item.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                        onClick={(e) => {
                                                            if (item.comingSoon) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    >
                                                        <span className="text-base">{item.icon}</span>
                                                        <span className="flex-1">{item.label}</span>
                                                        {item.comingSoon && (
                                                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                                                                Sắp ra mắt
                                                            </span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                    
                    {/* User Info & Logout */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <Link
                            to="/service-staff/profile"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            <UserIcon className="w-5 h-5" />
                            <span className="text-sm font-medium">Thông tin cá nhân</span>
                        </Link>
                        <button
                            onClick={async () => {
                                await logout();
                                navigate('/');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                            <span className="text-sm font-medium">Đăng xuất</span>
                        </button>
                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                            <p className="font-medium">{user?.profile?.fullName || user?.username || user?.email}</p>
                            <p className="text-gray-400">{user?.email || user?.username}</p>
                        </div>
                    </div>
                </aside>
                <section className="lg:col-span-9 xl:col-span-10 w-full">
                    <Outlet />
                </section>
            </div>
        </div>
    );
}
