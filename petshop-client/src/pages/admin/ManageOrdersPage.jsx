import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllOrders, fetchOrderById, updateOrderStatus, deleteOrder } from '../../api/orderApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { 
    EyeIcon, 
    XMarkIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
    TruckIcon,
    XCircleIcon,
    ChevronUpDownIcon,
    CalendarIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';

export default function ManageOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // Tabs
    const [activeTab, setActiveTab] = useState('online'); // 'online' or 'offline'
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const pageSize = 15;
    
    // Selection for bulk operations
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);

    useEffect(() => {
        loadOrders();
        // Auto-refresh every 30 seconds to sync with other users
        const interval = setInterval(() => {
            loadOrders();
        }, 30000);
        return () => clearInterval(interval);
    }, [currentPage, paymentFilter, dateFilter, sortBy, sortOrder]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                pageSize: pageSize,
                sortBy: sortBy,
                sortOrder: sortOrder
            };
            
            if (paymentFilter !== 'all') {
                params.paymentMethod = paymentFilter;
            }

            const response = await fetchAllOrders(params);
            
            // Handle response structure
            if (response.data.items) {
                setOrders(response.data.items);
                setTotalOrders(response.data.total || response.data.items.length);
            } else {
                setOrders(response.data || []);
                setTotalOrders(response.data.length || 0);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            toast.error('Không thể tải danh sách đơn hàng');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const viewOrderDetails = async (orderId) => {
        const loadingToast = toast.loading('Đang tải chi tiết đơn hàng...');
        try {
            const response = await fetchOrderById(orderId);
            setSelectedOrder(response.data);
            setShowDetailsModal(true);
            toast.dismiss(loadingToast);
        } catch (error) {
            console.error('Error fetching order details:', error);
            toast.error('Không thể tải chi tiết đơn hàng', { id: loadingToast });
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const loadingToast = toast.loading('Đang cập nhật trạng thái...');
        try {
            await updateOrderStatus(orderId, newStatus);
            toast.success('Cập nhật trạng thái thành công!', { id: loadingToast });
            loadOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('Không thể cập nhật trạng thái', { id: loadingToast });
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang xóa đơn hàng...');
        try {
            await deleteOrder(orderId);
            toast.success('Đã xóa đơn hàng thành công', { id: loadingToast });
            loadOrders();
        } catch (error) {
            console.error('Error deleting order:', error);
            toast.error('Không thể xóa đơn hàng', { id: loadingToast });
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedOrderIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một đơn hàng');
            return;
        }

        const loadingToast = toast.loading(`Đang cập nhật ${selectedOrderIds.length} đơn hàng...`);
        
        try {
            await Promise.all(
                selectedOrderIds.map(id => updateOrderStatus(id, newStatus))
            );
            toast.success(`Đã cập nhật ${selectedOrderIds.length} đơn hàng thành công!`, { id: loadingToast });
            setSelectedOrderIds([]);
            loadOrders();
        } catch (error) {
            console.error('Error bulk updating orders:', error);
            toast.error('Có lỗi xảy ra khi cập nhật hàng loạt', { id: loadingToast });
        }
    };

    const toggleSelectOrder = (orderId) => {
        setSelectedOrderIds(prev => 
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const toggleSelectAll = () => {
        // Get current page orders from filteredOrders
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const currentPageOrders = filteredOrders.slice(startIndex, endIndex);
        const currentPageOrderIds = currentPageOrders.map(o => o.id);
        
        if (currentPageOrderIds.every(id => selectedOrderIds.includes(id))) {
            // Unselect all on current page
            setSelectedOrderIds(prev => prev.filter(id => !currentPageOrderIds.includes(id)));
        } else {
            // Select all on current page
            setSelectedOrderIds(prev => [...new Set([...prev, ...currentPageOrderIds])]);
        }
    };

    const getStatusConfig = (status) => {
        const statusUpper = status?.toUpperCase();
        const configs = {
            PENDING: {
                label: 'Chờ xử lý',
                color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
                icon: ClockIcon
            },
            CONFIRMED: {
                label: 'Đã xác nhận',
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
                icon: CheckCircleIcon
            },
            PROCESSING: {
                label: 'Đang xử lý',
                color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
                icon: ClockIcon
            },
            SHIPPING: {
                label: 'Đang giao',
                color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
                icon: TruckIcon
            },
            SHIPPED: {
                label: 'Đã giao hàng',
                color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
                icon: TruckIcon
            },
            DELIVERED: {
                label: 'Đã giao',
                color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
                icon: CheckCircleIcon
            },
            CANCELLED: {
                label: 'Đã hủy',
                color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
                icon: XCircleIcon
            },
            COMPLETED: {
                label: 'Hoàn thành',
                color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
                icon: CheckCircleIcon
            }
        };
        return configs[statusUpper] || configs.PENDING;
    };

    const getPaymentStatusConfig = (paymentStatus) => {
        const statusUpper = paymentStatus?.toUpperCase();
        const configs = {
            PAID: {
                label: 'Đã thanh toán',
                color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
                icon: CheckCircleIcon
            },
            UNPAID: {
                label: 'Chưa thanh toán',
                color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
                icon: XCircleIcon
            },
            PENDING: {
                label: 'Đang chờ',
                color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
                icon: ClockIcon
            },
            FAILED: {
                label: 'Thanh toán thất bại',
                color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
                icon: XCircleIcon
            },
            REFUNDED: {
                label: 'Đã hoàn tiền',
                color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
                icon: ArrowPathIcon
            }
        };
        return configs[statusUpper] || configs.UNPAID;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' // Vietnam timezone (UTC+7)
        });
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Filter orders by tab, search query, and status
    const filteredOrders = useMemo(() => {
        let filtered = orders;

        // Filter by tab (online/offline)
        if (activeTab === 'online') {
            filtered = filtered.filter(order => !order.shippingAddress?.includes('Tại cửa hàng'));
        } else {
            filtered = filtered.filter(order => order.shippingAddress?.includes('Tại cửa hàng'));
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status?.toUpperCase() === statusFilter.toUpperCase());
        }

        // Filter by payment method
        if (paymentFilter !== 'all') {
            filtered = filtered.filter(order => order.paymentMethod === paymentFilter);
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (dateFilter === 'today') {
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === today.getTime();
                });
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= weekAgo;
                });
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= monthAgo;
                });
            } else if (dateFilter === 'custom' && dateFrom && dateTo) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= from && orderDate <= to;
                });
            }
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(order => {
                const customerName = (order.customerName || '').toLowerCase();
                const customerEmail = (order.customerEmail || '').toLowerCase();
                const orderId = order.id?.toString() || '';
                const orderCode = (order.orderCode || '').toLowerCase();
                const shippingAddress = (order.shippingAddress || '').toLowerCase();
                return customerName.includes(query) ||
                       customerEmail.includes(query) ||
                       orderId.includes(query) ||
                       orderCode.includes(query) ||
                       shippingAddress.includes(query);
            });
        }

        return filtered;
    }, [orders, activeTab, statusFilter, paymentFilter, searchQuery]);

    // Pagination - tính từ filteredOrders
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredOrders.slice(startIndex, endIndex);
    }, [filteredOrders, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    // Status options - chuẩn hóa theo tab
    const statusOptions = [
        { value: 'all', label: 'Tất cả trạng thái' },
        ...(activeTab === 'online' ? [
            { value: 'Pending', label: 'Chờ xử lý' },
            { value: 'Processing', label: 'Đang xử lý' },
            { value: 'Shipped', label: 'Đã giao hàng' },
            { value: 'Delivered', label: 'Đã nhận' }
        ] : []),
        { value: 'Completed', label: 'Hoàn thành' },
        { value: 'Cancelled', label: 'Đã hủy' }
    ];

    const paymentOptions = [
        { value: 'all', label: 'Tất cả thanh toán' },
        { value: 'COD', label: 'COD' },
        { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
        { value: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
        { value: 'MOMO', label: 'MoMo' },
        { value: 'VNPAY', label: 'VNPay' }
    ];

    // Statistics - tính từ filteredOrders
    const stats = {
        total: filteredOrders.length,
        pending: filteredOrders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status?.toUpperCase())).length,
        processing: filteredOrders.filter(o => ['PROCESSING', 'SHIPPING', 'SHIPPED'].includes(o.status?.toUpperCase())).length,
        completed: filteredOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase())).length,
        cancelled: filteredOrders.filter(o => o.status?.toUpperCase() === 'CANCELLED').length,
        totalRevenue: filteredOrders
            .filter(o => {
                const statusUpper = o.status?.toUpperCase();
                const paymentStatusUpper = o.paymentStatus?.toUpperCase();
                // Chỉ tính doanh thu khi đơn hàng đã hoàn thành (Completed) VÀ đã thanh toán (Paid)
                return statusUpper === 'COMPLETED' && paymentStatusUpper === 'PAID';
            })
            .reduce((sum, o) => {
                // Doanh thu = total - shippingFee (không tính shipping fee vào doanh thu)
                const orderTotal = o.total || 0;
                const shippingFee = o.shippingFee || 0;
                return sum + (orderTotal - shippingFee);
            }, 0)
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                    <ShoppingBagIcon className="w-8 h-8 mr-3 text-indigo-600" />
                    Quản lý đơn hàng
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Quản lý tất cả đơn hàng của khách hàng
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => {
                                setActiveTab('online');
                                setStatusFilter('all');
                                setCurrentPage(1);
                            }}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'online'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Bán online
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('offline');
                                setStatusFilter('all');
                                setCurrentPage(1);
                            }}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'offline'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Bán offline
                        </button>
                    </nav>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chờ xử lý</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đang xử lý</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hoàn thành</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Doanh thu</p>
                    <p className={`text-xl font-bold ${stats.totalRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.totalRevenue >= 0 ? '+' : ''}{stats.totalRevenue.toLocaleString('vi-VN')} ₫
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo mã đơn, khách hàng, địa chỉ..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
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
                            value={paymentFilter}
                            onChange={(e) => {
                                setPaymentFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            {paymentOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

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
                                <span className="text-gray-500">đến</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setPaymentFilter('all');
                                setDateFilter('all');
                                setDateFrom('');
                                setDateTo('');
                                setCurrentPage(1);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Đặt lại</span>
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedOrderIds.length > 0 && (
                    <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Đã chọn {selectedOrderIds.length} đơn hàng
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkStatusUpdate('PROCESSING')}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Đang xử lý
                            </button>
                            <button
                                onClick={() => handleBulkStatusUpdate('SHIPPING')}
                                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Đang giao
                            </button>
                            <button
                                onClick={() => handleBulkStatusUpdate('COMPLETED')}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Hoàn thành
                            </button>
                            <button
                                onClick={() => setSelectedOrderIds([])}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Hủy chọn
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</p>
                    </div>
                ) : paginatedOrders.length === 0 ? (
                    <div className="p-12 text-center">
                        <ShoppingBagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Không tìm thấy đơn hàng
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                                ? 'Không có đơn hàng phù hợp với bộ lọc'
                                : 'Chưa có đơn hàng nào'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => handleSort('id')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Mã đơn
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Khách hàng
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ngày đặt
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Thanh toán
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Mã khuyến mãi
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => handleSort('total')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Tổng tiền
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedOrders.map((order) => {
                                    const statusConfig = getStatusConfig(order.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <tr 
                                            key={order.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrderIds.includes(order.id)}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {order.orderCode || `#${order.id}`}
                                                    </span>
                                                    {order.shippingAddress?.includes('Tại cửa hàng') && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                                            Mua tại cửa hàng
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {order.customerName || order.customerEmail || (order.customerId ? `ID: ${order.customerId.substring(0, 8)}...` : 'Khách vãng lai')}
                                                    </p>
                                                    {order.shippingAddress?.includes('Tại cửa hàng') && order.shippingAddress && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {order.shippingAddress.replace('Tại cửa hàng - ', '')}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    {formatDate(order.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {!order.shippingAddress?.includes('Tại cửa hàng') ? (
                                                    <select
                                                        value={order.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border-none ${statusConfig.color}`}
                                                    >
                                                        <option value="Pending">Chờ xử lý</option>
                                                        <option value="Processing">Đang xử lý</option>
                                                        <option value="Shipped">Đã giao hàng</option>
                                                        <option value="Delivered">Đã nhận</option>
                                                        <option value="Completed">Hoàn thành</option>
                                                        <option value="Cancelled">Đã hủy</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                        {React.createElement(statusConfig.icon, { className: 'w-4 h-4' })}
                                                        {statusConfig.label}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {order.paymentMethod || 'COD'}
                                                    </span>
                                                    {order.paymentStatus && (() => {
                                                        const paymentStatusConfig = getPaymentStatusConfig(order.paymentStatus);
                                                        const PaymentStatusIcon = paymentStatusConfig.icon;
                                                        return (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${paymentStatusConfig.color}`}>
                                                                {React.createElement(PaymentStatusIcon, { className: 'w-3 h-3' })}
                                                                {paymentStatusConfig.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {order.promotionCode ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                                            {order.promotionCode}
                                                        </span>
                                                        {order.discountAmount && (
                                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                                -{order.discountAmount.toLocaleString('vi-VN')} ₫
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {(order.total - (order.shippingFee || 0))?.toLocaleString('vi-VN')} ₫
                                                    </span>
                                                    {order.shippingFee > 0 && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            + Phí ship: {order.shippingFee.toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    )}
                                                    {order.subTotal && order.subTotal !== (order.total - (order.shippingFee || 0)) && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                                            {order.subTotal.toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => viewOrderDetails(order.id)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group relative"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                            Xem chi tiết
                                                        </span>
                                                    </button>
                                                    {(order.status === 'Completed' || order.status === 'Delivered' || order.shippingAddress?.includes('Tại cửa hàng')) && (
                                                        <button
                                                            onClick={() => {
                                                                window.location.href = `/admin/order-returns?orderId=${order.id}`;
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group relative"
                                                        >
                                                            <ArrowPathIcon className="w-5 h-5" />
                                                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                                Đổi trả
                                                            </span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group relative"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                            Xóa
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Hiển thị {filteredOrders.length > 0 ? Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length) : 0} - {Math.min(currentPage * pageSize, filteredOrders.length)} trong tổng số {filteredOrders.length} đơn hàng
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

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Chi tiết đơn hàng {selectedOrder.orderCode || `#${selectedOrder.id}`}
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Order Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thông tin đơn hàng</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mã đơn: {selectedOrder.orderCode || `#${selectedOrder.id}`}</p>
                                </div>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedOrder.status).color}`}>
                                    {React.createElement(getStatusConfig(selectedOrder.status).icon, { className: 'w-4 h-4' })}
                                    {getStatusConfig(selectedOrder.status).label}
                                </span>
                            </div>

                            {/* Order Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày đặt</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Khách hàng</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.customerName || `#${selectedOrder.customerId}` || 'Khách vãng lai'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phương thức thanh toán</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' :
                                         selectedOrder.paymentMethod === 'VNPay' ? 'VNPay' :
                                         selectedOrder.paymentMethod === 'CREDIT_CARD' ? 'Thẻ tín dụng' :
                                         selectedOrder.paymentMethod === 'CASH' ? 'Tiền mặt' :
                                         selectedOrder.paymentMethod === 'QR' ? 'QR Code' :
                                         selectedOrder.paymentMethod || 'COD'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trạng thái thanh toán</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hình thức vận chuyển</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {(() => {
                                            if (selectedOrder.shippingAddress?.includes('Tại cửa hàng')) {
                                                return 'Mua tại cửa hàng';
                                            }
                                            if (selectedOrder.shippingMethod) {
                                                const methods = {
                                                    'standard': 'Giao hàng tiêu chuẩn',
                                                    'express': 'Giao hàng nhanh',
                                                    'same-day': 'Giao hàng trong ngày',
                                                    'free': 'Miễn phí vận chuyển'
                                                };
                                                return methods[selectedOrder.shippingMethod] || selectedOrder.shippingMethod;
                                            }
                                            return 'Giao hàng tận nơi';
                                        })()}
                                    </p>
                                </div>
                                {selectedOrder.deliveryDate && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày giao hàng</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedOrder.deliveryDate)}</p>
                                    </div>
                                )}
                            </div>

                            {/* Promotion Code */}
                            {(selectedOrder.promotionCode || selectedOrder.discountAmount) && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <label className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Khuyến mãi</label>
                                    <div className="mt-2 flex items-center gap-4">
                                        {selectedOrder.promotionCode && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Mã giảm giá</p>
                                                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{selectedOrder.promotionCode}</p>
                                            </div>
                                        )}
                                        {selectedOrder.discountAmount && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Giảm giá</p>
                                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">-{selectedOrder.discountAmount.toLocaleString('vi-VN')} ₫</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Shipping Address */}
                            {selectedOrder.shippingAddress && !selectedOrder.shippingAddress.includes('Tại cửa hàng') && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Địa chỉ giao hàng</label>
                                    <p className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-900 dark:text-white">
                                        {selectedOrder.shippingAddress}
                                    </p>
                                </div>
                            )}

                            {/* Order Items */}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                    Sản phẩm ({selectedOrder.items?.length || 0})
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map((item, index) => (
                                        <div 
                                            key={index} 
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {item.productName || `Sản phẩm #${item.productId}`}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Đơn giá: {item.unitPrice?.toLocaleString('vi-VN')} ₫ × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing Summary */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Tạm tính:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {selectedOrder.subTotal?.toLocaleString('vi-VN')} ₫
                                        
                                    </span>
                                </div>
                                {selectedOrder.discountAmount && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Giảm giá:</span>
                                        <span className="text-green-600 dark:text-green-400">
                                            -{selectedOrder.discountAmount.toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                )}
                                {selectedOrder.shippingFee > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Phí vận chuyển:</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {selectedOrder.shippingFee.toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Tổng cộng:</span>
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {selectedOrder.total?.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                                {selectedOrder.shippingFee > 0 && (
                                    <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">Doanh thu (trừ phí ship):</span>
                                        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                                            {(selectedOrder.total - (selectedOrder.shippingFee || 0)).toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedOrder.notes && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Ghi chú</label>
                                    <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        {selectedOrder.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {(selectedOrder.status === 'Completed' || selectedOrder.status === 'Delivered' || selectedOrder.shippingAddress?.includes('Tại cửa hàng')) && (
                                    <button
                                        onClick={() => {
                                            // Navigate to return page or open return modal
                                            window.location.href = `/admin/order-returns?orderId=${selectedOrder.id}`;
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group relative"
                                        title="Đổi trả"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            Đổi trả
                                        </span>
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
