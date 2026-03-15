import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    HomeIcon,
    ShoppingCartIcon,
    ShoppingBagIcon,
    ChartBarIcon,
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
            { to: '/staff', label: 'Bảng điều khiển', icon: '📊' }
        ]
    },
    {
        id: 'pos',
        label: 'Bán hàng tại cửa hàng',
        icon: ShoppingCartIcon,
        items: [
            { to: '/staff/pos', label: 'Bán hàng sản phẩm', icon: '🧾' },
            { to: '/staff/walk-in-booking', label: 'Đặt lịch Walk-in', icon: '🚶' },
            { to: '/staff/service-payments', label: 'Thanh toán dịch vụ', icon: '💳' }
        ]
    },
    {
        id: 'orders',
        label: 'Quản lý đơn hàng',
        icon: ShoppingBagIcon,
        items: [
            { to: '/staff/orders', label: 'Danh sách đơn hàng', icon: '📋' },
            { to: '/staff/order-returns', label: 'Đổi trả hàng', icon: '🔄' }
        ]
    },
    {
        id: 'products',
        label: 'Sản phẩm & Tồn kho',
        icon: ShoppingBagIcon,
        items: [
            { to: '/staff/products', label: 'Xem sản phẩm', icon: '🛍️' },
            { to: '/staff/inventory', label: 'Tồn kho', icon: '📋' }
        ]
    },
    {
        id: 'customers',
        label: 'Khách hàng',
        icon: ChartBarIcon,
        items: [
            { to: '/staff/customers', label: 'Danh sách khách hàng', icon: '👤' },
            { to: '/staff/chat', label: 'Tư vấn khách hàng', icon: '💬' }
        ]
    },
    {
        id: 'reports',
        label: 'Báo cáo',
        icon: ChartBarIcon,
        items: [
            { to: '/staff/reports', label: 'Báo cáo bán hàng', icon: '📊' },
            { to: '/staff/service-reports', label: 'Báo cáo dịch vụ', icon: '📈' }
        ]
    }
];

export default function StaffLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isSaleStaff, isAdmin, loading, logout } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState(['overview', 'pos', 'orders']);

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

    if (!(isSaleStaff || isAdmin)) {
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
        return group.items.some(item => 
            location.pathname === item.to || 
            location.pathname.startsWith(item.to + '/') ||
            (item.subItems && item.subItems.some(sub => location.pathname === sub.to || location.pathname.startsWith(sub.to + '/')))
        );
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-12 gap-6">
                <aside className="col-span-3 lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-fit sticky top-4">
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">🛒</span>
                            <span>Bán hàng</span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nhân viên bán hàng</p>
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
                                                const isItemActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/') || 
                                                                    (item.subItems && item.subItems.some(sub => location.pathname === sub.to || location.pathname.startsWith(sub.to + '/')));
                                                
                                                // Nếu có subItems, render submenu
                                                if (item.subItems && item.subItems.length > 0) {
                                                    return (
                                                        <div key={item.to} className="space-y-1">
                                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                                isItemActive
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                                    : 'text-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                <span className="text-base">{item.icon}</span>
                                                                <span className="flex-1 font-medium">{item.label}</span>
                                                            </div>
                                                            <div className="ml-6 space-y-1">
                                                                {item.subItems.map((subItem) => {
                                                                    const isSubActive = location.pathname === subItem.to || location.pathname.startsWith(subItem.to + '/');
                                                                    return (
                                                                        <Link
                                                                            key={subItem.to}
                                                                            to={subItem.to}
                                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                                                isSubActive
                                                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                                            } ${subItem.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                                            onClick={(e) => {
                                                                                if (subItem.comingSoon) {
                                                                                    e.preventDefault();
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span className="text-sm">{subItem.icon}</span>
                                                                            <span className="flex-1 text-sm">{subItem.label}</span>
                                                                            {subItem.comingSoon && (
                                                                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                                                                                    Sắp ra mắt
                                                                                </span>
                                                                            )}
                                                                        </Link>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                // Render item bình thường nếu không có subItems
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
                            to="/staff/profile"
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
                <section className="col-span-9 lg:col-span-10">
                    <Outlet />
                </section>
            </div>
        </div>
    );
}
