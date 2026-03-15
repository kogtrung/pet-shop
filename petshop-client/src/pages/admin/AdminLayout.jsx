import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    HomeIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    UsersIcon,
    ChartBarIcon,
    DocumentTextIcon,
    Cog6ToothIcon,
    LightBulbIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

// Menu structure with groups
const menuGroups = [
    {
        id: 'overview',
        label: 'Tổng quan',
        icon: HomeIcon,
        items: [
            { to: '/admin', label: 'Bảng điều khiển', icon: '📊' }
        ]
    },
    {
        id: 'sales',
        label: 'Quản lý bán hàng',
        icon: ShoppingBagIcon,
        items: [
            { to: '/admin/products', label: 'Sản phẩm', icon: '🛍️' },
            { to: '/admin/categories', label: 'Danh mục', icon: '📂' },
            { to: '/admin/brands', label: 'Thương hiệu', icon: '🏷️' },
            { to: '/admin/orders', label: 'Đơn hàng', icon: '📦' },
            { to: '/admin/order-returns', label: 'Đổi trả hàng', icon: '🔄' },
            { to: '/admin/order-cancellations', label: 'Yêu cầu hủy đơn', icon: '❌' },
            { to: '/admin/promotions', label: 'Khuyến mãi', icon: '🎁' },
            { to: '/admin/reviews', label: 'Đánh giá', icon: '⭐' }
        ]
    },
    {
        id: 'services',
        label: 'Quản lý dịch vụ',
        icon: WrenchScrewdriverIcon,
        items: [
            { to: '/admin/services', label: 'Dịch vụ', icon: '🔧' },
            { to: '/admin/bookings', label: 'Lịch hẹn', icon: '📅' },
            { to: '/admin/service-staff', label: 'Nhân viên dịch vụ', icon: '👨‍💼' }
        ]
    },
    {
        id: 'users',
        label: 'Quản lý người dùng',
        icon: UsersIcon,
        items: [
            { to: '/admin/users', label: 'Người dùng', icon: '👥' }
        ]
    },
    {
        id: 'reports',
        label: 'Báo cáo & Tài chính',
        icon: ChartBarIcon,
        items: [
            { to: '/admin/revenue', label: 'Doanh thu', icon: '💰' },
            { to: '/admin/reports', label: 'Báo cáo', icon: '📊' }
        ]
    },
    {
        id: 'cms',
        label: 'Quản lý nội dung',
        icon: DocumentTextIcon,
        items: [
            { to: '/admin/pages', label: 'Trang & Bài viết', icon: '📄' },
            { to: '/admin/banners', label: 'Banner trang chủ', icon: '🖼️' }
        ]
    },
    {
        id: 'settings',
        label: 'Cài đặt hệ thống',
        icon: Cog6ToothIcon,
        items: [
            { to: '/admin/settings', label: 'Cài đặt', icon: '⚙️' }
        ]
    },
    {
        id: 'analytics',
        label: 'Phân tích & Gợi ý',
        icon: LightBulbIcon,
        items: [
            { to: '/admin/analytics', label: 'Phân tích nâng cao', icon: '📈', comingSoon: true }
        ]
    }
];

export default function AdminLayout() {
    const location = useLocation();
    const { user, isAdmin, loading } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState(['overview', 'sales', 'services', 'users']);

    // Show loading state
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

    // Redirect if not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect if not admin
    if (!isAdmin) {
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
        <div className="w-full">
            <div className="grid grid-cols-12 gap-6">
                <aside className="col-span-3 lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-fit sticky top-4">
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">🐾</span>
                            <span>PetShop</span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quản trị hệ thống</p>
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
                </aside>
                <section className="col-span-9 lg:col-span-10">
                    <Outlet />
                </section>
            </div>
        </div>
    );
}
