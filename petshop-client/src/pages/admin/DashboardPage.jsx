import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    ShoppingBagIcon, 
    UsersIcon, 
    CurrencyDollarIcon, 
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChartBarIcon,
    CubeIcon,
    TagIcon
} from '@heroicons/react/24/outline';
import { getAllServiceBookings } from '../../api/serviceBookingApi.js';
import { getServices } from '../../api/serviceApi.js';
import { fetchAllOrders } from '../../api/orderApi.js';
import { getProducts } from '../../api/productApi.js';
import { getAllUsers } from '../../api/userApi.js';
import { getProductImage } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

// Stat card component
const StatCard = ({ title, value, change, icon: Icon, color, link, trend }) => {
    const content = (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    {change && (
                        <div className="flex items-center gap-2 mt-2">
                            {trend && (
                                trend > 0 ? (
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                                ) : trend < 0 ? (
                                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                                ) : null
                            )}
                            <p className={`text-sm ${
                                change.startsWith('+') || trend > 0 ? 'text-green-600' : 
                                change.startsWith('-') || trend < 0 ? 'text-red-600' : 
                                'text-gray-600 dark:text-gray-400'
                            }`}>
                                {change}
                            </p>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color.replace('text', 'bg').replace('600', '100')} dark:opacity-20`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                </div>
            </div>
        </div>
    );

    if (link) {
        return <Link to={link}>{content}</Link>;
    }
    return content;
};

// Alert card component
const AlertCard = ({ type, title, message, count, link, icon: Icon }) => {
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
};

// Revenue Chart Component with updated line rendering
const RevenueChart = ({ revenueData = [], previousWeekData = [], selectedDate, isToday }) => {
    const [hoverPoint, setHoverPoint] = useState(null);
    const chartWidth = 960;
    const chartHeight = 280;
    const padding = 60;
    const hourLimit = isToday ? Math.min(new Date().getHours() + 2, 24) : 24;

    const currentSeries = (revenueData.length ? revenueData : Array.from({ length: 24 }, (_, hour) => ({
        label: `${hour.toString().padStart(2, '0')}:00`,
        revenue: 0
    }))).slice(0, hourLimit);
    const previousSeries = (previousWeekData || []).slice(0, hourLimit);

    const maxRevenue = Math.max(
        ...currentSeries.map(d => d.revenue),
        ...(previousSeries.length ? previousSeries.map(d => d.revenue) : [0]),
        1
    );
    
    const mapPoints = (series) => series.map((item, index) => {
        const x = padding + (index / Math.max(series.length - 1, 1)) * (chartWidth - padding * 2);
        const y = chartHeight - padding - ((item.revenue / maxRevenue) * (chartHeight - padding * 2));
        return { ...item, x, y };
    });

    const currentPoints = mapPoints(currentSeries);
    const previousPoints = mapPoints(previousSeries);

    const buildPath = (points) => {
        if (!points.length) return '';
        return points.reduce(
            (acc, point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`),
            ''
        );
    };

    const currentPath = buildPath(currentPoints);
    const previousPath = buildPath(previousPoints);

    const areaPath = currentPoints.length
        ? `${currentPath} L ${currentPoints[currentPoints.length - 1].x} ${chartHeight - padding} L ${currentPoints[0].x} ${chartHeight - padding} Z`
        : '';

    const yAxisSteps = 4;
    const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, idx) => {
        const value = (maxRevenue / yAxisSteps) * idx;
        return {
            value,
            y: chartHeight - padding - ((value / maxRevenue) * (chartHeight - padding * 2))
        };
    });

    const formatCurrency = (value) => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k ₫`;
        return `${value.toLocaleString('vi-VN')} ₫`;
    };

    const handlePointHover = (point, seriesLabel) => {
        if (!point) {
            setHoverPoint(null);
            return;
        }
        setHoverPoint({
            ...point,
            seriesLabel
        });
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Doanh thu {isToday ? 'hôm nay' : `ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}`} theo giờ
                </h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="inline-block w-3 h-3 rounded-full bg-indigo-600" />
                        Hôm nay
                    </div>
                    {previousPoints.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="inline-block w-3 h-3 rounded-full bg-slate-400" />
                            Hôm qua
                    </div>
                    )}
                </div>
            </div>

            <div className="relative">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-72"
                    role="img"
                >
                    <defs>
                        <linearGradient id="lineArea" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Axes */}
                    <line
                        x1={padding}
                        y1={chartHeight - padding}
                        x2={chartWidth - padding}
                        y2={chartHeight - padding}
                        stroke="#d1d5db"
                        strokeWidth="1"
                    />
                    <line
                        x1={padding}
                        y1={padding / 2}
                        x2={padding}
                        y2={chartHeight - padding}
                        stroke="#d1d5db"
                        strokeWidth="1"
                    />

                    {/* Horizontal grid */}
                    {yLabels.map((label, idx) => (
                        <g key={`y-grid-${idx}`}>
                            <line
                                x1={padding}
                                y1={label.y}
                                x2={chartWidth - padding}
                                y2={label.y}
                                stroke="#e5e7eb"
                                strokeWidth="0.8"
                                strokeDasharray="6 6"
                            />
                            <text
                                x={padding - 12}
                                y={label.y + 4}
                                textAnchor="end"
                                fontSize="12"
                                fill="#6b7280"
                            >
                                {formatCurrency(label.value)}
                            </text>
                        </g>
                    ))}

                    {/* Area under current line */}
                    {areaPath && (
                        <path d={areaPath} fill="url(#lineArea)" stroke="none" />
                    )}

                    {/* Previous day line */}
                    {previousPath && (
                        <path
                            d={previousPath}
                            fill="none"
                            stroke="#cbd5f5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Current day line */}
                    {currentPath && (
                        <path
                            d={currentPath}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Points */}
                    {previousPoints.map((point, index) => (
                        <circle
                            key={`prev-point-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#cbd5f5"
                        />
                    ))}
                    {currentPoints.map((point, index) => (
                        <circle
                            key={`curr-point-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="#4f46e5"
                            className="cursor-pointer"
                            onMouseEnter={() => handlePointHover(point, 'Hôm nay')}
                            onMouseLeave={() => handlePointHover(null)}
                        />
                    ))}

                    {/* X-axis labels */}
                    {[0, 6, 12, 18, 23].map((hour) => {
                        const x = padding + (hour / 23) * (chartWidth - padding * 2);
                    return (
                            <text
                                key={`x-label-${hour}`}
                                x={x}
                                y={chartHeight - padding + 24}
                                textAnchor="middle"
                                fontSize="12"
                                fill="#6b7280"
                            >
                                {hour.toString().padStart(2, '0')}:00
                            </text>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoverPoint && (
                                <div 
                        className="absolute bg-white dark:bg-gray-900 shadow-lg rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700"
                        style={{
                            left: `${(hoverPoint.x / chartWidth) * 100}%`,
                            top: `${(hoverPoint.y / chartHeight) * 100}%`,
                            transform: 'translate(-50%, -120%)'
                        }}
                    >
                        <p className="font-semibold text-gray-900 dark:text-white">{hoverPoint.seriesLabel}</p>
                        <p className="text-gray-600 dark:text-gray-300">{hoverPoint.label}</p>
                        <p className="text-indigo-600 font-semibold">
                            {hoverPoint.revenue.toLocaleString('vi-VN')} ₫
                            </p>
                        </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-200">Tổng doanh thu</p>
                    <p>{currentSeries.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('vi-VN')} ₫</p>
                </div>
                {previousSeries.length > 0 && (
                    <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-gray-200">So với hôm qua</p>
                        <p>{previousSeries.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('vi-VN')} ₫</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Pie Chart Component for status distribution
const StatusPieChart = ({ title, data, colors }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chưa có dữ liệu</p>
            </div>
        );
    }

    let currentAngle = -90;
    const segments = data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        const endAngle = currentAngle;

        const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
        const largeArc = angle > 180 ? 1 : 0;

        return {
            ...item,
            percentage: percentage.toFixed(1),
            path: `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`,
            color: colors[index % colors.length]
        };
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
            <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        {segments.map((segment, index) => (
                            <path
                                key={index}
                                d={segment.path}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="2"
                                className="hover:opacity-80 transition-opacity"
                            />
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng cộng</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 space-y-2">
                {segments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: segment.color }}
                            ></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{segment.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {segment.value}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({segment.percentage}%)
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Top Products Component with bar chart
const TopProducts = ({ products }) => {
    const topProducts = (products || [])
        .filter(p => p.soldCount > 0)
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, 5);
    
    const maxSold = Math.max(...topProducts.map(p => p.soldCount || 0), 1);
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top 5 sản phẩm bán chạy</h3>
            {topProducts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chưa có sản phẩm nào được bán</p>
            ) : (
                <div className="space-y-4">
                    {topProducts.map((product, index) => {
                        const percentage = ((product.soldCount || 0) / maxSold) * 100;
                        return (
                            <div key={product.id}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300 dark:border-gray-600">
                                            <img 
                                            src={getProductImage(product)} 
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center" style={{ display: 'none' }}>
                                            <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Đã bán: {product.soldCount || 0} • 
                                            {((product.salePrice || product.price || 0) * (product.soldCount || 0)).toLocaleString('vi-VN')}₫
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Top Services Component with bookingItems support
const TopServices = ({ bookings, services }) => {
    // Count bookings per service using bookingItems
    const serviceCounts = {};
    (bookings || []).forEach(booking => {
        if (booking.bookingItems && booking.bookingItems.length > 0) {
            booking.bookingItems.forEach(item => {
                const serviceId = item.serviceId;
                serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
            });
        } else if (booking.serviceId) {
            // Fallback for old booking structure
            const serviceId = booking.serviceId;
            serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
        }
    });

    const topServices = Object.entries(serviceCounts)
        .map(([serviceId, count]) => {
            const service = (services || []).find(s => s.id === parseInt(serviceId));
            return { service, count };
        })
        .filter(item => item.service)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const maxCount = Math.max(...topServices.map(s => s.count), 1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top 5 dịch vụ được đặt</h3>
            {topServices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chưa có dịch vụ nào được đặt</p>
            ) : (
                <div className="space-y-4">
                    {topServices.map((item, index) => {
                        const percentage = (item.count / maxCount) * 100;
                        return (
                            <div key={item.service.id}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{item.service.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Số lượt đặt: {item.count}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Recent Orders Component
const RecentOrders = ({ orders }) => {
    const recentOrders = (orders || []).slice(0, 5);
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Đơn gần nhất</h3>
                <Link to="/admin/orders" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Xem tất cả
                </Link>
            </div>
            {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chưa có đơn hàng nào</p>
            ) : (
                <div className="space-y-3">
                    {recentOrders.map((order) => (
                        <Link 
                            key={order.id} 
                            to={`/admin/orders`}
                            className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {order.orderCode || order.posCode || 'Chưa có mã'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(order.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {(order.total || 0).toLocaleString('vi-VN')}₫
                                </p>
                                <p className={`text-xs ${
                                    order.status === 'Completed' || order.status === 'Delivered' ? 'text-green-600' :
                                    order.status === 'Cancelled' ? 'text-red-600' :
                                    'text-yellow-600'
                                }`}>
                                    {order.status === 'Completed' ? 'Hoàn thành' :
                                     order.status === 'Delivered' ? 'Đã giao' :
                                     order.status === 'Cancelled' ? 'Đã hủy' :
                                     order.status === 'Pending' ? 'Chờ xử lý' :
                                     order.status}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

// Recent Bookings Component
const RecentBookings = ({ bookings }) => {
    const recentBookings = (bookings || []).slice(0, 5);
    
    const getStatusBadge = (status) => {
        const badges = {
            'Pending': 'text-yellow-600',
            'Assigned': 'text-blue-600',
            'InProgress': 'text-purple-600',
            'Completed': 'text-green-600',
            'Cancelled': 'text-red-600'
        };
        return badges[status] || 'text-gray-600';
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
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lịch hẹn gần nhất</h3>
                <Link to="/admin/bookings" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Xem tất cả
                </Link>
            </div>
            {recentBookings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Chưa có lịch hẹn nào</p>
            ) : (
                <div className="space-y-3">
                    {recentBookings.map((booking) => (
                        <Link 
                            key={booking.id} 
                            to={`/admin/bookings`}
                            className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {booking.bookingCode || `#${booking.id}`}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {booking.customerName} • {booking.petName}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {new Date(booking.startTime || booking.bookingDateTime || booking.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {(booking.totalPrice || 0).toLocaleString('vi-VN')}₫
                                </p>
                                <p className={`text-xs ${getStatusBadge(booking.status)}`}>
                                    {getStatusLabel(booking.status)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        assignedBookings: 0,
        inProgressBookings: 0,
        todayBookings: 0,
        serviceCount: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalCustomers: 0,
        newCustomers: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        revenueData: [],
        previousWeekData: [],
        orderStatusData: [],
        bookingStatusData: [],
        alertPendingOrders: 0,
        alertPendingBookings: 0
    });
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    // Get today's date in local timezone
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [selectedDate, setSelectedDate] = useState(getTodayDateString()); // Today by default

    useEffect(() => {
        loadDashboardData();
    }, [selectedDate]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [bookingRes, serviceRes, orderRes, productRes, userRes] = await Promise.all([
                getAllServiceBookings().catch(err => {
                    console.error('Error loading bookings:', err);
                    return { data: [] };
                }),
                getServices().catch(err => {
                    console.error('Error loading services:', err);
                    return { data: [] };
                }),
                fetchAllOrders().catch(err => {
                    console.error('Error loading orders:', err);
                    return { data: { items: [] } };
                }),
                getProducts({ pageSize: 100 }).catch(err => {
                    console.error('Error loading products:', err);
                    return { data: { items: [] } };
                }),
                getAllUsers().catch(err => {
                    console.error('Error loading users:', err);
                    return { data: [] };
                })
            ]);

            const bookingsList = bookingRes.data || [];
            const servicesList = serviceRes.data || [];
            const ordersList = orderRes.data?.items || orderRes.data || [];
            const productsList = productRes.data?.items || productRes.data || [];
            const users = userRes.data || [];

            // Calculate booking stats with bookingItems support
            const selectedDateObj = new Date(selectedDate);
            selectedDateObj.setHours(0, 0, 0, 0);
            const selectedDateStr = selectedDateObj.toDateString();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toDateString();
            
            const totalBookings = bookingsList.length;
            const pendingBookingsList = bookingsList.filter((b) => 
                b.status?.toUpperCase() === 'PENDING'
            );
            const pendingBookings = pendingBookingsList.length;
            const assignedBookings = bookingsList.filter((b) => 
                b.status?.toUpperCase() === 'ASSIGNED'
            ).length;
            const inProgressBookings = bookingsList.filter((b) => 
                b.status?.toUpperCase() === 'INPROGRESS'
            ).length;
            const selectedDateBookings = bookingsList.filter((b) => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.toDateString() === selectedDateStr;
            });
            
            const todayBookings = bookingsList.filter((b) => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.toDateString() === todayStr;
            }).length;

            // Calculate order stats
            const completedOrders = ordersList.filter(
                (o) => o.status === 'Completed' || o.status === 'Delivered'
            );
            const pendingOrders = ordersList.filter(
                (o) => o.status === 'Pending'
            );
            const cancelledOrders = ordersList.filter(
                (o) => o.status === 'Cancelled'
            );
            
            // Calculate revenue excluding shipping fee - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const totalRevenue = completedOrders
                .filter(o => {
                    const status = (o.status || '').toUpperCase();
                    const paymentStatus = (o.paymentStatus || '').toUpperCase();
                    return (status === 'COMPLETED' || status === 'DELIVERED') && paymentStatus === 'PAID';
                })
                .reduce((sum, o) => {
                    const orderTotal = o.total || 0;
                    const shippingFee = o.shippingFee || 0;
                    return sum + (orderTotal - shippingFee);
                }, 0);
            const totalOrders = ordersList.length;

            // Calculate selected date revenue (orders + services) - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const selectedDateOrders = completedOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                const status = (o.status || '').toUpperCase();
                const paymentStatus = (o.paymentStatus || '').toUpperCase();
                return orderDate.toDateString() === selectedDateStr && 
                       (status === 'COMPLETED' || status === 'DELIVERED') && 
                       paymentStatus === 'PAID';
            });
            const selectedDateOrderRevenue = selectedDateOrders.reduce((sum, o) => {
                const orderTotal = o.total || 0;
                const shippingFee = o.shippingFee || 0;
                return sum + (orderTotal - shippingFee);
            }, 0);
            
            // Calculate selected date service revenue (only paid bookings, filter by payment date)
            const selectedDateServiceRevenue = bookingsList
                .filter(b => {
                    const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                    if (!paymentDate) return false;
                    const paymentDateObj = new Date(paymentDate);
                    paymentDateObj.setHours(0, 0, 0, 0);
                    return paymentDateObj.toDateString() === selectedDateStr &&
                           (b.paymentStatus || '').toLowerCase() === 'paid';
                })
                .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
            
            const selectedDateRevenue = selectedDateOrderRevenue + selectedDateServiceRevenue;
            
            // Calculate today revenue for comparison - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const todayOrders = completedOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                const status = (o.status || '').toUpperCase();
                const paymentStatus = (o.paymentStatus || '').toUpperCase();
                return orderDate.toDateString() === todayStr && 
                       (status === 'COMPLETED' || status === 'DELIVERED') && 
                       paymentStatus === 'PAID';
            });
            const todayOrderRevenue = todayOrders.reduce((sum, o) => {
                const orderTotal = o.total || 0;
                const shippingFee = o.shippingFee || 0;
                return sum + (orderTotal - shippingFee);
            }, 0);
            
            const todayBookingsList = bookingsList.filter(b => {
                const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                if (!paymentDate) return false;
                const paymentDateObj = new Date(paymentDate);
                paymentDateObj.setHours(0, 0, 0, 0);
                return paymentDateObj.toDateString() === todayStr &&
                       (b.paymentStatus || '').toLowerCase() === 'paid';
            });
            const todayServiceRevenue = todayBookingsList
                .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
            
            const todayRevenue = todayOrderRevenue + todayServiceRevenue;

            // Calculate monthly revenue - chỉ tính khi Status = Completed và PaymentStatus = Paid
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            const thisMonthOrders = completedOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                const status = (o.status || '').toUpperCase();
                const paymentStatus = (o.paymentStatus || '').toUpperCase();
                return orderDate >= thisMonth && 
                       (status === 'COMPLETED' || status === 'DELIVERED') && 
                       paymentStatus === 'PAID';
            });
            const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => {
                const orderTotal = o.total || 0;
                const shippingFee = o.shippingFee || 0;
                return sum + (orderTotal - shippingFee);
            }, 0);

            const lastMonth = new Date(thisMonth);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthOrders = completedOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                const status = (o.status || '').toUpperCase();
                const paymentStatus = (o.paymentStatus || '').toUpperCase();
                return orderDate >= lastMonth && orderDate < thisMonth && 
                       (status === 'COMPLETED' || status === 'DELIVERED') && 
                       paymentStatus === 'PAID';
            });
            const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => {
                const orderTotal = o.total || 0;
                const shippingFee = o.shippingFee || 0;
                return sum + (orderTotal - shippingFee);
            }, 0);

            // Calculate customer stats
            const customers = users.filter(u => u.role === 'User' || !u.role);
            const totalCustomers = customers.length;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const newCustomers = customers.filter(u => {
                if (u.createdAt) {
                    return new Date(u.createdAt) >= sevenDaysAgo;
                }
                return false;
            }).length;

            // Calculate low stock products (quantity < 10)
            const lowStockProducts = productsList.filter(p => {
                // Check both p.quantity (from ProductDto) and p.inventory?.quantity (nested)
                const quantity = p.quantity !== undefined ? p.quantity : (p.inventory?.quantity || 0);
                return quantity < 10 && quantity >= 0; // Only count if quantity exists and is less than 10
            }).length;

            // Calculate revenue data for selected date by hour
            const calculateRevenueByHour = () => {
                const revenueData = [];
                const previousWeekData = [];
                const selectedDateForCalc = new Date(selectedDate);
                selectedDateForCalc.setHours(0, 0, 0, 0);
                
                // Calculate revenue for each hour on selected date (0-23)
                for (let hour = 0; hour < 24; hour++) {
                    const hourStart = new Date(selectedDateForCalc);
                    hourStart.setHours(hour, 0, 0, 0);
                    const hourEnd = new Date(selectedDateForCalc);
                    hourEnd.setHours(hour, 59, 59, 999);
                    
                    // Order revenue for this hour (excluding shipping fee) - chỉ tính khi Status = Completed và PaymentStatus = Paid
                    const hourOrderRevenue = completedOrders
                            .filter(o => {
                                const orderDate = new Date(o.createdAt);
                                const status = (o.status || '').toUpperCase();
                                const paymentStatus = (o.paymentStatus || '').toUpperCase();
                                return orderDate >= hourStart && orderDate <= hourEnd &&
                                       (status === 'COMPLETED' || status === 'DELIVERED') && 
                                       paymentStatus === 'PAID';
                            })
                            .reduce((sum, o) => {
                                const orderTotal = o.total || 0;
                                const shippingFee = o.shippingFee || 0;
                                return sum + (orderTotal - shippingFee);
                            }, 0);
                        
                    // Service revenue for this hour (paid bookings, filter by payment date)
                    const hourServiceRevenue = bookingsList
                        .filter(b => {
                            const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                            if (!paymentDate) return false;
                            const paymentDateObj = new Date(paymentDate);
                            return paymentDateObj >= hourStart && paymentDateObj <= hourEnd &&
                                   (b.paymentStatus || '').toLowerCase() === 'paid';
                        })
                        .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
                    
                    const hourRevenue = hourOrderRevenue + hourServiceRevenue;
                    
                    revenueData.push({
                        label: `${hour.toString().padStart(2, '0')}:00`,
                        revenue: hourRevenue,
                        hour: hour
                    });
                }
                
                // Calculate revenue for previous day (same hours) for comparison
                const previousDay = new Date(selectedDateForCalc);
                previousDay.setDate(previousDay.getDate() - 1);
                
                for (let hour = 0; hour < 24; hour++) {
                    const hourStart = new Date(previousDay);
                    hourStart.setHours(hour, 0, 0, 0);
                    const hourEnd = new Date(previousDay);
                    hourEnd.setHours(hour, 59, 59, 999);
                    
                    // Order revenue for this hour (excluding shipping fee)
                    const hourOrderRevenue = completedOrders
                        .filter(o => {
                            const orderDate = new Date(o.createdAt);
                            return orderDate >= hourStart && orderDate <= hourEnd;
                        })
                        .reduce((sum, o) => {
                            const orderTotal = o.total || 0;
                            const shippingFee = o.shippingFee || 0;
                            return sum + (orderTotal - shippingFee);
                        }, 0);
                    
                    const hourServiceRevenue = bookingsList
                        .filter(b => {
                            const paymentDate = b.updatedAt || b.paidAt || b.createdAt;
                            if (!paymentDate) return false;
                            const paymentDateObj = new Date(paymentDate);
                            return paymentDateObj >= hourStart && paymentDateObj <= hourEnd &&
                                   (b.paymentStatus || '').toLowerCase() === 'paid';
                        })
                        .reduce((sum, b) => sum + (b.totalPrice || b.priceAtBooking || 0), 0);
                    
                    previousWeekData.push({
                        label: `${hour.toString().padStart(2, '0')}:00`,
                        revenue: hourOrderRevenue + hourServiceRevenue,
                        hour: hour
                    });
                }
                
                return { revenueData, previousWeekData };
            };
            
            const { revenueData, previousWeekData } = calculateRevenueByHour();

            // Order status distribution
            const orderStatusCounts = {
                'Pending': ordersList.filter(o => o.status === 'Pending').length,
                'Completed': completedOrders.length,
                'Cancelled': cancelledOrders.length,
                'Processing': ordersList.filter(o => o.status === 'Processing' || o.status === 'Shipped').length
            };
            const orderStatusData = [
                { label: 'Chờ xử lý', value: orderStatusCounts.Pending, color: '#fbbf24' },
                { label: 'Hoàn thành', value: orderStatusCounts.Completed, color: '#10b981' },
                { label: 'Đã hủy', value: orderStatusCounts.Cancelled, color: '#ef4444' },
                { label: 'Đang xử lý', value: orderStatusCounts.Processing, color: '#3b82f6' }
            ];

            // Booking status distribution
            const bookingStatusCounts = {
                'Pending': pendingBookings,
                'Assigned': assignedBookings,
                'InProgress': inProgressBookings,
                'Completed': bookingsList.filter(b => b.status?.toUpperCase() === 'COMPLETED').length,
                'Cancelled': bookingsList.filter(b => b.status?.toUpperCase() === 'CANCELLED').length
            };
            const bookingStatusData = [
                { label: 'Chờ xác nhận', value: bookingStatusCounts.Pending, color: '#fbbf24' },
                { label: 'Đã phân công', value: bookingStatusCounts.Assigned, color: '#a855f7' },
                { label: 'Đang làm', value: bookingStatusCounts.InProgress, color: '#f97316' },
                { label: 'Hoàn thành', value: bookingStatusCounts.Completed, color: '#10b981' },
                { label: 'Đã hủy', value: bookingStatusCounts.Cancelled, color: '#ef4444' }
            ];

            // Calculate selected date's stats
            const selectedDateCompletedOrders = selectedDateOrders.length;
            const selectedDatePendingOrders = ordersList.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === selectedDateStr && (o.status === 'Pending' || o.status === 'Processing');
            }).length;
            
            const selectedDateCompletedBookings = selectedDateBookings.filter(b => 
                (b.status || '').toUpperCase() === 'COMPLETED'
            ).length;
            const selectedDatePendingBookings = selectedDateBookings.filter(b => 
                (b.status || '').toUpperCase() === 'PENDING'
            ).length;
            
            // Calculate today's stats for comparison
            const todayCompletedOrders = todayOrders.length;
            const todayPendingOrders = ordersList.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === todayStr && (o.status === 'Pending' || o.status === 'Processing');
            }).length;
            
            const todayCompletedBookings = todayBookingsList.filter(b => 
                (b.status || '').toUpperCase() === 'COMPLETED'
            ).length;
            const todayPendingBookings = todayBookingsList.filter(b => 
                (b.status || '').toUpperCase() === 'PENDING'
            ).length;

            const alertPendingOrders = pendingOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === todayStr;
            }).length;

            const alertPendingBookings = pendingBookingsList.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.toDateString() === todayStr;
            }).length;
            
            // Count unique customers for selected date
            const selectedDateCustomerIds = new Set();
            selectedDateOrders.forEach(o => {
                if (o.customerId) selectedDateCustomerIds.add(o.customerId);
            });
            selectedDateBookings.forEach(b => {
                if (b.customerId) selectedDateCustomerIds.add(b.customerId);
            });
            const selectedDateCustomers = selectedDateCustomerIds.size;

            setStats({
                totalBookings,
                pendingBookings,
                assignedBookings,
                inProgressBookings,
                todayBookings: selectedDateBookings.length,
                todayCompletedBookings: selectedDateCompletedBookings,
                todayPendingBookings: selectedDatePendingBookings,
                serviceCount: servicesList.length,
                totalRevenue,
                todayRevenue: selectedDateRevenue,
                todayOrderRevenue: selectedDateOrderRevenue,
                todayServiceRevenue: selectedDateServiceRevenue,
                thisMonthRevenue,
                lastMonthRevenue,
                totalOrders,
                todayOrders: selectedDateOrders.length,
                todayCompletedOrders: selectedDateCompletedOrders,
                todayPendingOrders: selectedDatePendingOrders,
                pendingOrders: pendingOrders.length,
                completedOrders: completedOrders.length,
                cancelledOrders: cancelledOrders.length,
                totalCustomers,
                newCustomers,
                todayCustomers: selectedDateCustomers,
                totalProducts: productsList.length,
                lowStockProducts,
                revenueData,
                previousWeekData,
                orderStatusData,
                bookingStatusData,
                revenueTrend: 0,
                alertPendingOrders,
                alertPendingBookings
            });

            // Filter orders for selected date and sort by createdAt descending
            const selectedDateOrdersForRecent = ordersList.filter(o => {
                const orderDate = new Date(o.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.toDateString() === selectedDateStr;
            }).sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA; // Descending order (newest first)
            });
            setOrders(selectedDateOrdersForRecent.slice(0, 10));
            
            // Filter bookings for selected date for recent bookings display
            const selectedDateBookingsForRecent = bookingsList.filter(b => {
                const bookingDate = new Date(b.startTime || b.bookingDateTime || b.createdAt);
                bookingDate.setHours(0, 0, 0, 0);
                return bookingDate.toDateString() === selectedDateStr;
            }).sort((a, b) => {
                const dateA = new Date(a.startTime || a.bookingDateTime || a.createdAt || 0);
                const dateB = new Date(b.startTime || b.bookingDateTime || b.createdAt || 0);
                return dateB - dateA; // Descending order (newest first)
            });
            
            setProducts(productsList);
            setBookings(selectedDateBookingsForRecent);
            setServices(servicesList);
        } catch (error) {
            console.error('Failed to load dashboard data', error);
            toast.error('Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    const viewingToday = selectedDate === getTodayDateString();

    const conversionRate = stats.totalCustomers > 0 
        ? ((stats.totalOrders / stats.totalCustomers) * 100).toFixed(2)
        : '0.00';

    const revenueChange = stats.lastMonthRevenue > 0
        ? `${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend}%`
        : 'Mới bắt đầu';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bảng điều khiển</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tổng quan về hiệu suất cửa hàng
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn ngày:</label>
                            <input
                                type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={getTodayDateString()}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Alerts Section */}
                    {(viewingToday && (stats.alertPendingOrders > 0 || stats.alertPendingBookings > 0 || stats.lowStockProducts > 0 || stats.todayBookings > 0)) && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                                Cảnh báo & Thông báo
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {stats.alertPendingOrders > 0 && (
                                    <AlertCard
                                        type="warning"
                                        title="Đơn hàng chờ xử lý"
                                        message={`Có ${stats.alertPendingOrders} đơn hàng tạo trong ngày chưa xử lý`}
                                        count={stats.alertPendingOrders}
                                        link="/admin/orders?status=Pending"
                                        icon={ClockIcon}
                                    />
                                )}
                                {stats.alertPendingBookings > 0 && (
                                    <AlertCard
                                        type="warning"
                                        title="Lịch hẹn chờ xác nhận"
                                        message={`Có ${stats.alertPendingBookings} lịch hẹn tạo hôm nay cần xác nhận`}
                                        count={stats.alertPendingBookings}
                                        link="/admin/bookings?status=Pending"
                                        icon={CalendarDaysIcon}
                                    />
                                )}
                                {stats.lowStockProducts > 0 && (
                                    <AlertCard
                                        type="danger"
                                        title="Sản phẩm sắp hết hàng"
                                        message={`Có ${stats.lowStockProducts} sản phẩm cần nhập thêm`}
                                        count={stats.lowStockProducts}
                                        link="/admin/products"
                                        icon={ExclamationTriangleIcon}
                                    />
                                )}
                                {stats.todayBookings > 0 && (
                                    <AlertCard
                                        type="info"
                                        title="Lịch hẹn hôm nay"
                                        message={`Có ${stats.todayBookings} lịch hẹn cần xử lý hôm nay`}
                                        count={stats.todayBookings}
                                        link="/admin/bookings"
                                        icon={CalendarDaysIcon}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main Statistics - Selected Date */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Doanh thu & hoạt động {viewingToday ? 'hôm nay' : `ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}`}
                        </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                                title={`Doanh thu ${viewingToday ? 'hôm nay' : ''}`}
                                value={`${(stats.todayRevenue / 1000).toFixed(0)}k ₫`}
                                change={`Đơn hàng: ${(stats.todayOrderRevenue || 0).toLocaleString('vi-VN')} ₫ • Dịch vụ: ${(stats.todayServiceRevenue || 0).toLocaleString('vi-VN')} ₫`}
                            icon={CurrencyDollarIcon}
                            color="text-green-600"
                            link="/admin/revenue"
                        />
                        <StatCard
                                title={`Đơn hàng ${viewingToday ? 'hôm nay' : ''}`}
                                value={stats.todayOrders || 0}
                                change={`${stats.todayCompletedOrders || 0} hoàn thành • ${stats.todayPendingOrders || 0} chờ xử lý`}
                            icon={ShoppingBagIcon}
                            color="text-blue-600"
                            link="/admin/orders"
                        />
                        <StatCard
                                title={`Lịch hẹn ${viewingToday ? 'hôm nay' : ''}`}
                                value={stats.todayBookings}
                                change={`${stats.todayCompletedBookings || 0} hoàn thành • ${stats.todayPendingBookings || 0} chờ xử lý`}
                            icon={CalendarDaysIcon}
                            color="text-indigo-600"
                            link="/admin/bookings"
                        />
                        <StatCard
                            title="Tổng sản phẩm"
                            value={stats.totalProducts}
                            change={`${stats.lowStockProducts} sắp hết hàng`}
                            icon={CubeIcon}
                            color="text-indigo-600"
                            link="/admin/products"
                        />
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueChart 
                                revenueData={stats.revenueData} 
                                previousWeekData={stats.previousWeekData} 
                                selectedDate={selectedDate}
                                isToday={viewingToday}
                            />
                        </div>
                        <div className="space-y-6">
                            <RecentOrders orders={orders} />
                            <RecentBookings bookings={bookings} />
                        </div>
                    </div>

                    {/* Status Distribution Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StatusPieChart 
                            title="Phân bố trạng thái đơn hàng"
                            data={stats.orderStatusData}
                            colors={['#fbbf24', '#10b981', '#ef4444', '#3b82f6']}
                        />
                        <StatusPieChart 
                            title="Phân bố trạng thái lịch hẹn"
                            data={stats.bookingStatusData}
                            colors={['#fbbf24', '#a855f7', '#f97316', '#10b981', '#ef4444']}
                        />
                    </div>

                    {/* Top Products and Services */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TopProducts products={products} />
                        <TopServices bookings={bookings} services={services} />
                    </div>
                </>
            )}
        </div>
    );
}
