import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrderHistory, fetchMyOrderById, cancelOrder } from '../../api/orderApi';
import { createOrderReturn, getAllOrderReturns, getOrderReturnsByOrderId } from '../../api/orderReturnApi';
import { requestOrderCancellation, getMyCancellationRequests } from '../../api/orderCancellationApi';
import { createMoMoPayment } from '../../api/paymentGatewayApi';
import toast from 'react-hot-toast';
import { 
    EyeIcon, 
    TruckIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    ClockIcon,
    CalendarIcon,
    ShoppingBagIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    XMarkIcon,
    ArrowPathIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';

export default function OrderHistoryPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnForm, setReturnForm] = useState({
        reason: '',
        returnType: 'Return',
        items: []
    });
    const [orderReturns, setOrderReturns] = useState([]);
    const [cancellationRequests, setCancellationRequests] = useState([]);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [cancellationForm, setCancellationForm] = useState({
        reason: ''
    });
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const pageSize = 10;

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem lịch sử đơn hàng');
            navigate('/');
        }
    }, [user, navigate]);

    const isInitialLoad = useRef(true);

    // Fetch orders and order returns
    useEffect(() => {
        if (user) {
            loadOrders();
            // Auto-refresh every 30 seconds to sync with admin/staff updates
            const interval = setInterval(() => {
                loadOrders(true); // silent refresh
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user, currentPage, statusFilter]);

    const loadOrders = async (silent = false) => {
        if (!silent && isInitialLoad.current) {
            setLoading(true);
        }
        try {
            const params = {
                page: currentPage,
                pageSize: pageSize
            };
            
            // Add status filter if not 'all'
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const response = await fetchMyOrderHistory(params);
            
            // Handle response structure
            let loadedOrders = [];
            if (response.data.items) {
                loadedOrders = response.data.items;
                setTotalOrders(response.data.total || response.data.items.length);
            } else {
                loadedOrders = response.data || [];
                setTotalOrders(response.data.length || 0);
            }
            setOrders(loadedOrders);
            
            // Reload order returns after orders are loaded
            if (user) {
                try {
                    // Load returns for each order individually
                    const returnPromises = loadedOrders.map(async (order) => {
                        try {
                            const returnsResponse = await getOrderReturnsByOrderId(order.id);
                            return returnsResponse.data || [];
                        } catch (error) {
                            return [];
                        }
                    });
                    
                    const returnsArrays = await Promise.all(returnPromises);
                    const allReturns = returnsArrays.flat();
                    setOrderReturns(allReturns);
                } catch (error) {
                    console.error('Error loading order returns:', error);
                }
                
                // Load cancellation requests
                try {
                    const cancellationsResponse = await getMyCancellationRequests();
                    setCancellationRequests(cancellationsResponse.data || []);
                } catch (error) {
                    console.error('Error loading cancellation requests:', error);
                }
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            if (!silent) toast.error('Không thể tải lịch sử đơn hàng');
            if (!silent) setOrders([]);
        } finally {
            setLoading(false);
            isInitialLoad.current = false;
        }
    };

    // View order details
    const handleViewDetails = async (orderId) => {
        try {
            const response = await fetchMyOrderById(orderId);
            setSelectedOrder(response.data);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching order details:', error);
            toast.error('Không thể tải chi tiết đơn hàng');
        }
    };

    // Cancel order
    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang hủy đơn hàng...');

        try {
            await cancelOrder(orderId);
            toast.success('Đã hủy đơn hàng thành công', { id: loadingToast });
            loadOrders(); // Reload orders
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast.error(
                error.response?.data?.message || 'Không thể hủy đơn hàng',
                { id: loadingToast }
            );
        }
    };

    // Thanh toán lại cho đơn AwaitingPayment hoặc PaymentFailed
    const handleRetryPayment = async (orderId) => {
        const loadingToast = toast.loading('Đang tạo yêu cầu thanh toán...');
        try {
            const result = await createMoMoPayment(orderId);
            if (result.paymentUrl) {
                toast.dismiss(loadingToast);
                window.location.href = result.paymentUrl;
            } else {
                toast.error('Không nhận được URL thanh toán từ MoMo', { id: loadingToast });
            }
        } catch (error) {
            console.error('Error retrying payment:', error);
            toast.error(
                error.response?.data?.message || 'Không thể tạo yêu cầu thanh toán',
                { id: loadingToast }
            );
        }
    };

    // Get status configuration
    const getStatusConfig = (status) => {
        const configs = {
            AWAITINGPAYMENT: {
                label: 'Chờ thanh toán',
                color: 'bg-orange-50 text-orange-700 border border-orange-200',
                icon: ClockIcon
            },
            PAYMENTFAILED: {
                label: 'Thanh toán thất bại',
                color: 'bg-red-50 text-red-700 border border-red-200',
                icon: XCircleIcon
            },
            PENDING: {
                label: 'Chờ xử lý',
                color: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                icon: ClockIcon
            },
            CONFIRMED: {
                label: 'Đã xác nhận',
                color: 'bg-blue-50 text-blue-700 border border-blue-200',
                icon: CheckCircleIcon
            },
            PROCESSING: {
                label: 'Đang xử lý',
                color: 'bg-gray-100 text-indigo-800',
                icon: ClockIcon
            },
            SHIPPING: {
                label: 'Đang giao',
                color: 'bg-gray-100 text-gray-800 border border-gray-300',
                icon: TruckIcon
            },
            SHIPPED: {
                label: 'Đã giao hàng',
                color: 'bg-gray-100 text-gray-800 border border-gray-300',
                icon: TruckIcon
            },
            DELIVERED: {
                label: 'Đã giao',
                color: 'bg-green-50 text-green-700 border border-green-200',
                icon: CheckCircleIcon
            },
            CANCELLED: {
                label: 'Đã hủy',
                color: 'bg-red-50 text-red-700 border border-red-200',
                icon: XCircleIcon
            },
            COMPLETED: {
                label: 'Hoàn thành',
                color: 'bg-green-50 text-green-700 border border-green-200',
                icon: CheckCircleIcon
            }
        };

        return configs[status?.toUpperCase()] || configs.PENDING;
    };

    // Kiểm tra đơn đã có yêu cầu đổi trả chưa
    const getOrderReturn = (orderId) => {
        return orderReturns.find(r => r.orderId === orderId);
    };

    // Kiểm tra đơn có thể yêu cầu đổi trả không
    const canRequestReturn = (order) => {
        // Chỉ cho phép với đơn đã hoàn thành
        if (order.status !== 'Delivered' && order.status !== 'Completed') {
            return false;
        }
        // Kiểm tra đã có return request chưa
        const existingReturn = getOrderReturn(order.id);
        return !existingReturn; // Chỉ cho phép nếu chưa có return request
    };

    // Kiểm tra đơn có thể yêu cầu hủy không
    const canRequestCancellation = (order) => {
        const statusUpper = order.status?.toUpperCase();
        // Chỉ cho phép với đơn "Chờ xử lý" hoặc "Đang xử lý"
        if (!['PENDING', 'PROCESSING'].includes(statusUpper)) {
            return false;
        }
        // Kiểm tra đã có cancellation request chưa
        const existingCancellation = cancellationRequests.find(c => c.orderId === order.id && c.status === 'Pending');
        return !existingCancellation;
    };

    const getOrderCancellation = (orderId) => {
        return cancellationRequests.find(c => c.orderId === orderId);
    };

    const handleRequestCancellation = async () => {
        if (!cancellationForm.reason.trim()) {
            toast.error('Vui lòng nhập lý do hủy đơn');
            return;
        }

        try {
            await requestOrderCancellation({
                orderId: selectedOrder.id,
                reason: cancellationForm.reason
            });
            toast.success('Yêu cầu hủy đơn đã được gửi!');
            setShowCancellationModal(false);
            setCancellationForm({ reason: '' });
            setSelectedOrder(null);
            await loadOrders();
        } catch (error) {
            console.error('Error requesting cancellation:', error);
            const errorMessage = error.response?.data?.error || 'Không thể gửi yêu cầu hủy đơn';
            toast.error(errorMessage);
        }
    };

    // Format date
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

    // Filter orders by search query
    const filteredOrders = orders.filter(order => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (order.orderCode || order.posCode || '').toLowerCase().includes(query) ||
            order.shippingAddress?.toLowerCase().includes(query) ||
            order.status?.toLowerCase().includes(query)
        );
    });

    // Pagination
    const totalPages = Math.ceil(totalOrders / pageSize);
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    // Status options for filter
    const statusOptions = [
        { value: 'all', label: 'Tất cả' },
        { value: 'AWAITINGPAYMENT', label: '⏳ Chờ thanh toán' },
        { value: 'PAYMENTFAILED', label: '❌ TT thất bại' },
        { value: 'PENDING', label: 'Chờ xử lý' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'PROCESSING', label: 'Đang xử lý' },
        { value: 'SHIPPING', label: 'Đang giao' },
        { value: 'DELIVERED', label: 'Đã giao' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' }
    ];

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <ShoppingBagIcon className="w-8 h-8 mr-3" />
                        Lịch sử đơn hàng
                    </h1>
                    <p className="text-gray-600">
                        Quản lý và theo dõi tất cả đơn hàng của bạn
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-none shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo mã đơn, địa chỉ..."
                                className="w-full pl-10 pr-4 py-2 rounded-none border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 rounded-none border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                <FunnelIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Lọc</span>
                            </button>
                            
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2 rounded-none border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-none shadow-sm p-6 animate-pulse">
                                <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
                                <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-none shadow-sm p-12 text-center">
                        <ShoppingBagIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Chưa có đơn hàng nào
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery || statusFilter !== 'all' 
                                ? 'Không tìm thấy đơn hàng phù hợp với bộ lọc'
                                : 'Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm!'}
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                            <button
                                onClick={() => navigate('/products')}
                                className="px-6 py-3 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors"
                            >
                                Mua sắm ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {filteredOrders.map((order) => {
                                const statusConfig = getStatusConfig(order.status);
                                const StatusIcon = statusConfig.icon;
                                const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status?.toUpperCase());

                                return (
                                    <div 
                                        key={order.id} 
                                        className="bg-white rounded-none shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                    >
                                        <div className="p-6">
                                            {/* Order Header */}
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                                                <div className="flex items-center gap-3 mb-2 md:mb-0">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Đơn hàng {order.orderCode || order.posCode || 'Chưa có mã'}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-none text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                                                        <StatusIcon className="w-4 h-4" />
                                                        {statusConfig.label}
                                                    </span>
                                                    {/* Badge thanh toán cho đơn online */}
                                                    {order.paymentStatus && (
                                                        <span className={`px-2 py-0.5 rounded-none text-xs font-medium ${
                                                            order.paymentStatus === 'Paid' 
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : order.paymentStatus === 'Expired'
                                                                    ? 'bg-gray-100 text-gray-600'
                                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                        }`}>
                                                            {order.paymentStatus === 'Paid' ? '💳 Đã thanh toán' 
                                                                : order.paymentStatus === 'Expired' ? '⏰ Hết hạn'
                                                                : '💳 Chưa thanh toán'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* Nút thanh toán lại cho đơn chờ thanh toán */}
                                                    {['AwaitingPayment', 'PaymentFailed'].includes(order.status) && order.paymentMethod === 'MOMO' && (
                                                        <button
                                                            onClick={() => handleRetryPayment(order.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-none hover:bg-pink-600 transition-colors animate-pulse"
                                                        >
                                                            <BanknotesIcon className="w-4 h-4" />
                                                            <span>Thanh toán ngay</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleViewDetails(order.id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-black rounded-none hover:bg-gray-200 transition-colors"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Chi tiết</span>
                                                    </button>
                                                    {(() => {
                                                        const existingCancellation = getOrderCancellation(order.id);
                                                        const canCancel = canRequestCancellation(order);
                                                        
                                                        if (existingCancellation && existingCancellation.status === 'Pending') {
                                                            return (
                                                                <span className="px-3 py-1 rounded-none text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                                    Đã yêu cầu hủy (Chờ xử lý)
                                                                </span>
                                                            );
                                                        } else if (existingCancellation && existingCancellation.status === 'Approved') {
                                                            return (
                                                                <span className="px-3 py-1 rounded-none text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                                    Đã hủy
                                                                </span>
                                                            );
                                                        } else if (existingCancellation && existingCancellation.status === 'Rejected') {
                                                            return (
                                                                <span className="px-3 py-1 rounded-none text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                                    Yêu cầu hủy bị từ chối
                                                                </span>
                                                            );
                                                        } else if (canCancel) {
                                                            return (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedOrder(order);
                                                                        setCancellationForm({ reason: '' });
                                                                        setShowCancellationModal(true);
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-none hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">Yêu cầu hủy</span>
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    {(() => {
                                                        const existingReturn = getOrderReturn(order.id);
                                                        const canReturn = canRequestReturn(order);
                                                        
                                                        // Nếu đã có return request (bất kỳ status nào), không hiện nút, chỉ hiện tag
                                                        if (existingReturn) {
                                                            const returnStatusMap = {
                                                                'Pending': 'Chờ xử lý',
                                                                'Approved': 'Đã duyệt',
                                                                'Processing': 'Đang xử lý',
                                                                'Completed': 'Đã hoàn thành',
                                                                'Rejected': 'Từ chối',
                                                                'Cancelled': 'Đã hủy'
                                                            };
                                                            return (
                                                                <span className="px-3 py-1 rounded-none text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                    Đã yêu cầu ({returnStatusMap[existingReturn.status] || existingReturn.status})
                                                                </span>
                                                            );
                                                        } else if (canReturn) {
                                                            // Chỉ hiện nút nếu chưa có return request
                                                            return (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const response = await fetchMyOrderById(order.id);
                                                                            const orderData = response.data;
                                                                            setSelectedOrder(orderData);
                                                                            setReturnForm({
                                                                                reason: '',
                                                                                returnType: 'Return',
                                                                                items: orderData.items.map(item => ({
                                                                                    orderItemId: item.id,
                                                                                    quantity: 0,
                                                                                    maxQuantity: item.quantity,
                                                                                    productName: item.productName,
                                                                                    unitPrice: item.unitPrice
                                                                                }))
                                                                            });
                                                                            setShowReturnModal(true);
                                                                        } catch (error) {
                                                                            console.error('Error fetching order:', error);
                                                                            toast.error('Không thể tải chi tiết đơn hàng');
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-none hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                                                                >
                                                                    <ArrowPathIcon className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">Yêu cầu đổi/trả</span>
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Order Info */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-start gap-2">
                                                    <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-gray-500">Ngày đặt</p>
                                                        <p className="font-medium text-gray-900">
                                                            {formatDate(order.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <ShoppingBagIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-gray-500">Số sản phẩm</p>
                                                        <p className="font-bold text-lg text-black">
                                                            {order.items?.length || 0} sản phẩm
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <TruckIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-gray-500">Thanh toán</p>
                                                        <p className="font-medium text-gray-900">
                                                            {order.paymentMethod || 'COD'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <div className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5">💰</div>
                                                    <div>
                                                        <p className="text-gray-500">Tổng tiền</p>
                                                        <p className="font-bold text-lg text-black">
                                                            {order.total?.toLocaleString('vi-VN')} ₫
                                                        </p>
                                                        {order.promotionCode && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                Mã: {order.promotionCode}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shipping Address */}
                                            {order.shippingAddress && (
                                                <div className="mt-4 p-3 bg-gray-50 rounded-none">
                                                    <p className="text-xs text-gray-500 mb-1">
                                                        Địa chỉ giao hàng:
                                                    </p>
                                                    <p className="text-sm text-gray-900">
                                                        {order.shippingAddress}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={!canGoPrevious}
                                    className="px-4 py-2 rounded-none border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    Trước
                                </button>

                                <div className="flex gap-2">
                                    {currentPage > 2 && (
                                        <>
                                            <button
                                                onClick={() => setCurrentPage(1)}
                                                className="px-3 py-2 rounded-none border border-gray-300 hover:bg-gray-50"
                                            >
                                                1
                                            </button>
                                            {currentPage > 3 && <span className="px-2 py-2">...</span>}
                                        </>
                                    )}

                                    {currentPage > 1 && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            className="px-3 py-2 rounded-none border border-gray-300 hover:bg-gray-50"
                                        >
                                            {currentPage - 1}
                                        </button>
                                    )}

                                    <button className="px-3 py-2 bg-black text-white">
                                        {currentPage}
                                    </button>

                                    {currentPage < totalPages && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            className="px-3 py-2 rounded-none border border-gray-300 hover:bg-gray-50"
                                        >
                                            {currentPage + 1}
                                        </button>
                                    )}

                                    {currentPage < totalPages - 1 && (
                                        <>
                                            {currentPage < totalPages - 2 && <span className="px-2 py-2">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="px-3 py-2 rounded-none border border-gray-300 hover:bg-gray-50"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={!canGoNext}
                                    className="px-4 py-2 rounded-none border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Order Details Modal */}
                {showDetailsModal && selectedOrder && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-none shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Chi tiết đơn hàng {selectedOrder.orderCode || selectedOrder.posCode || 'Chưa có mã'}
                                </h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status & Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500">Trạng thái</label>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-none text-sm font-medium ${getStatusConfig(selectedOrder.status).color}`}>
                                                {React.createElement(getStatusConfig(selectedOrder.status).icon, { className: 'w-4 h-4' })}
                                                {getStatusConfig(selectedOrder.status).label}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Ngày đặt</label>
                                        <p className="mt-1 font-medium">{formatDate(selectedOrder.createdAt)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Phương thức thanh toán</label>
                                        <p className="mt-1 font-medium">{selectedOrder.paymentMethod || 'COD'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Tạm tính</label>
                                        <p className="mt-1 font-medium text-gray-900">
                                            {selectedOrder.subTotal?.toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>
                                    {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 && (
                                        <div>
                                            <label className="text-sm text-gray-500">
                                                Giảm giá {selectedOrder.promotionCode ? `(${selectedOrder.promotionCode})` : ''}
                                            </label>
                                            <p className="mt-1 font-medium text-red-600">
                                                -{selectedOrder.discountAmount.toLocaleString('vi-VN')} ₫
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm text-gray-500">Tổng tiền</label>
                                        <p className="mt-1 text-xl font-bold text-black">
                                            {selectedOrder.total?.toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                {selectedOrder.shippingAddress && (
                                    <div>
                                        <label className="text-sm text-gray-500">Địa chỉ giao hàng</label>
                                        <p className="mt-1 p-3 bg-gray-50 rounded-none">
                                            {selectedOrder.shippingAddress}
                                        </p>
                                    </div>
                                )}

                                {/* Order Items */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">
                                        Sản phẩm ({selectedOrder.items?.length || 0})
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item, index) => (
                                            <div 
                                                key={index} 
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-none"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">
                                                        {item.productName || `Sản phẩm #${item.productId}`}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Đơn giá: {item.unitPrice?.toLocaleString('vi-VN')} ₫ × {item.quantity}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">
                                                        {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.notes && (
                                    <div>
                                        <label className="text-sm text-gray-500">Ghi chú</label>
                                        <p className="mt-1 p-3 bg-gray-50 rounded-none">
                                            {selectedOrder.notes}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
                                {['PENDING', 'CONFIRMED'].includes(selectedOrder.status?.toUpperCase()) && (
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleCancelOrder(selectedOrder.id);
                                        }}
                                        className="px-6 py-2 bg-red-600 text-white rounded-none hover:bg-red-700 transition-colors"
                                    >
                                        Hủy đơn hàng
                                    </button>
                                )}
                                {(() => {
                                    const existingReturn = getOrderReturn(selectedOrder.id);
                                    const canReturn = canRequestReturn(selectedOrder);
                                    
                                    // Nếu đã có return request, không hiện nút
                                    if (existingReturn) {
                                        const returnStatusMap = {
                                            'Pending': 'Chờ xử lý',
                                            'Approved': 'Đã duyệt',
                                            'Processing': 'Đang xử lý',
                                            'Completed': 'Đã hoàn thành',
                                            'Rejected': 'Từ chối',
                                            'Cancelled': 'Đã hủy'
                                        };
                                        return (
                                            <span className="px-3 py-1 rounded-none text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                Đã yêu cầu ({returnStatusMap[existingReturn.status] || existingReturn.status})
                                            </span>
                                        );
                                    } else if (canReturn && (selectedOrder.status === 'Delivered' || selectedOrder.status === 'Completed')) {
                                        return (
                                            <button
                                                onClick={async () => {
                                                    setShowDetailsModal(false);
                                                    try {
                                                        const response = await fetchMyOrderById(selectedOrder.id);
                                                        const orderData = response.data;
                                                        setSelectedOrder(orderData);
                                                        setReturnForm({
                                                            reason: '',
                                                            returnType: 'Return',
                                                            items: orderData.items.map(item => ({
                                                                orderItemId: item.id,
                                                                quantity: 0,
                                                                maxQuantity: item.quantity,
                                                                productName: item.productName,
                                                                unitPrice: item.unitPrice
                                                            }))
                                                        });
                                                        setShowReturnModal(true);
                                                    } catch (error) {
                                                        console.error('Error fetching order:', error);
                                                        toast.error('Không thể tải chi tiết đơn hàng');
                                                    }
                                                }}
                                                className="px-6 py-2 bg-orange-600 text-white rounded-none hover:bg-orange-700 transition-colors"
                                            >
                                                <ArrowPathIcon className="w-5 h-5 inline mr-2" />
                                                Yêu cầu đổi trả
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300 transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Return Request Modal for User */}
                {showReturnModal && selectedOrder && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-none shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Yêu cầu đổi trả - Đơn hàng {selectedOrder.orderCode || selectedOrder.posCode || 'Chưa có mã'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowReturnModal(false);
                                        setReturnForm({
                                            reason: '',
                                            returnType: 'Return',
                                            items: []
                                        });
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Loại đổi trả */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Loại yêu cầu *
                                    </label>
                                    <select
                                        value={returnForm.returnType}
                                        onChange={(e) => setReturnForm({ ...returnForm, returnType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-none bg-white text-gray-900"
                                    >
                                        <option value="Return">Trả hàng</option>
                                        <option value="Exchange">Đổi hàng</option>
                                    </select>
                                </div>

                                {/* Lý do đổi trả */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Lý do đổi trả *
                                    </label>
                                    <textarea
                                        value={returnForm.reason}
                                        onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                        placeholder="Vui lòng mô tả chi tiết lý do đổi trả (ví dụ: sản phẩm bị lỗi, giao sai hàng, không đúng mô tả...)"
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-none bg-white text-gray-900"
                                    />
                                </div>

                                {/* Danh sách sản phẩm */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        Sản phẩm cần đổi trả
                                    </h3>
                                    <div className="space-y-3">
                                        {returnForm.items.map((item, index) => (
                                            <div key={index} className="border border-gray-200 rounded-none p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{item.productName}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Số lượng đã mua: {item.maxQuantity}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Số lượng muốn trả
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.maxQuantity}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...returnForm.items];
                                                            newItems[index].quantity = Math.max(0, Math.min(parseInt(e.target.value) || 0, item.maxQuantity));
                                                            setReturnForm({ ...returnForm, items: newItems });
                                                        }}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Thông báo */}
                                <div className="bg-blue-50 border border-blue-200 dark:border-blue-800 rounded-none p-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Lưu ý:</strong> Yêu cầu đổi trả của bạn sẽ được xem xét bởi nhân viên. 
                                        Vui lòng giữ nguyên bao bì và sản phẩm để đảm bảo quy trình đổi trả diễn ra thuận lợi.
                                    </p>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowReturnModal(false);
                                        setReturnForm({
                                            reason: '',
                                            returnType: 'Return',
                                            items: []
                                        });
                                    }}
                                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={async () => {
                                        // Validate
                                        if (!returnForm.reason.trim()) {
                                            toast.error('Vui lòng nhập lý do đổi trả');
                                            return;
                                        }
                                        if (returnForm.items.every(item => item.quantity === 0)) {
                                            toast.error('Vui lòng chọn ít nhất một sản phẩm để đổi trả');
                                            return;
                                        }

                                        try {
                                            const returnData = {
                                                orderId: selectedOrder.id,
                                                reason: returnForm.reason,
                                                returnType: returnForm.returnType,
                                                requestedBy: 'Customer',
                                                returnLocation: 'Online',
                                                condition: 'New',
                                                returnToSupplier: false,
                                                supplierId: null,
                                                items: returnForm.items
                                                    .filter(item => item.quantity > 0)
                                                    .map(item => ({
                                                        orderItemId: item.orderItemId,
                                                        quantity: item.quantity,
                                                        reason: null,
                                                        condition: 'New'
                                                    }))
                                            };

                                            await createOrderReturn(returnData);
                                            toast.success('Gửi yêu cầu đổi trả thành công! Chúng tôi sẽ xem xét và phản hồi sớm nhất.');
                                            
                                            // Reload orders để cập nhật UI (sẽ reload order returns trong loadOrders)
                                            await loadOrders();
                                            
                                            setShowReturnModal(false);
                                            setReturnForm({
                                                reason: '',
                                                returnType: 'Return',
                                                items: []
                                            });
                                        } catch (error) {
                                            console.error('Error creating return:', error);
                                            toast.error(error.response?.data?.error || 'Không thể gửi yêu cầu đổi trả');
                                        }
                                    }}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-none hover:bg-orange-700 transition-colors"
                                >
                                    Gửi yêu cầu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancellation Request Modal */}
                {showCancellationModal && selectedOrder && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-none shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Yêu cầu hủy đơn - Đơn hàng {selectedOrder.orderCode || selectedOrder.posCode || 'Chưa có mã'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCancellationModal(false);
                                        setCancellationForm({ reason: '' });
                                        setSelectedOrder(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Order Info */}
                                <div className="bg-gray-50 rounded-none p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        Thông tin đơn hàng
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <span className="font-medium text-gray-700">Mã đơn:</span>{' '}
                                            <span className="text-gray-900">{selectedOrder.orderCode || selectedOrder.posCode || `#${selectedOrder.id}`}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-gray-700">Tổng tiền:</span>{' '}
                                            <span className="text-gray-900">{selectedOrder.total?.toLocaleString('vi-VN')} ₫</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-gray-700">Trạng thái:</span>{' '}
                                            <span className="text-gray-900">{selectedOrder.status}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Cancellation Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Lý do hủy đơn <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={cancellationForm.reason}
                                        onChange={(e) => setCancellationForm({ ...cancellationForm, reason: e.target.value })}
                                        placeholder="Vui lòng mô tả lý do bạn muốn hủy đơn hàng này..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-none bg-white text-gray-900"
                                    />
                                </div>

                                {/* Notice */}
                                <div className="bg-yellow-50 border border-yellow-200 dark:border-yellow-800 rounded-none p-4">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Lưu ý:</strong> Yêu cầu hủy đơn của bạn sẽ được xem xét bởi nhân viên. 
                                        Chỉ có thể yêu cầu hủy đơn khi trạng thái đơn hàng là "Chờ xử lý" hoặc "Đang xử lý".
                                    </p>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowCancellationModal(false);
                                        setCancellationForm({ reason: '' });
                                        setSelectedOrder(null);
                                    }}
                                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleRequestCancellation}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-none hover:bg-orange-700 transition-colors"
                                >
                                    Gửi yêu cầu hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
