import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllOrders, fetchOrderById, updateOrderStatus } from '../../api/orderApi';
import { getAllOrderReturns, getOrderReturnsByOrderId, createOrderReturn, updateOrderReturnStatus } from '../../api/orderReturnApi';
import { fetchProducts } from '../../api/productApi';
import { getAllCancellationRequests, getCancellationRequestById, processCancellationRequest } from '../../api/orderCancellationApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { EyeIcon, CheckCircleIcon, XCircleIcon, TruckIcon, PrinterIcon, MagnifyingGlassIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function StaffOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeTab, setActiveTab] = useState('online'); // 'online' or 'offline'
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnOrderId, setReturnOrderId] = useState(null);
    const [returnForm, setReturnForm] = useState({
        reason: '',
        returnType: 'Return',
        requestedBy: 'Staff',
        returnLocation: 'Store',
        condition: 'New',
        returnToSupplier: false,
        supplierId: null,
        items: [],
        exchangeItems: []
    });
    const [orderReturns, setOrderReturns] = useState([]);
    const [cancellationRequests, setCancellationRequests] = useState([]);
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [orderSearchResults, setOrderSearchResults] = useState([]);
    const [showOrderSearch, setShowOrderSearch] = useState(false);
    const [exchangeProducts, setExchangeProducts] = useState([]);
    const [selectedExchangeProducts, setSelectedExchangeProducts] = useState([]);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [selectedCancellation, setSelectedCancellation] = useState(null);
    const [processForm, setProcessForm] = useState({
        status: 'Approved',
        adminNote: ''
    });

    useEffect(() => {
        loadOrders();
        loadOrderReturns();
        loadCancellationRequests();
        // Auto-refresh every 30 seconds to sync with admin and user updates
        const interval = setInterval(() => {
            loadOrders();
            loadOrderReturns();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadOrderReturns = async () => {
        try {
            const response = await getAllOrderReturns();
            setOrderReturns(response.data || []);
        } catch (error) {
            console.error('Error loading order returns:', error);
        }
    };

    const loadCancellationRequests = async () => {
        try {
            const response = await getAllCancellationRequests('Pending');
            setCancellationRequests(response.data || []);
        } catch (error) {
            console.error('Error loading cancellation requests:', error);
        }
    };

    const handleProcessCancellation = async (cancellationId) => {
        if (!processForm.status) {
            toast.error('Vui lòng chọn trạng thái xử lý');
            return;
        }

        try {
            await processCancellationRequest(cancellationId, {
                status: processForm.status,
                adminNote: processForm.adminNote || null
            });
            toast.success(`Đã ${processForm.status === 'Approved' ? 'duyệt' : 'từ chối'} yêu cầu hủy đơn`);
            await loadCancellationRequests();
            await loadOrders();
            setShowCancellationModal(false);
            setSelectedCancellation(null);
            setProcessForm({ status: 'Approved', adminNote: '' });
        } catch (error) {
            console.error('Error processing cancellation:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xử lý yêu cầu hủy đơn';
            toast.error(errorMessage);
        }
    };

    const getOrderCancellation = (orderId) => {
        return cancellationRequests.find(c => c.orderId === orderId);
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const response = await fetchAllOrders();
            const orders = response.data?.items || response.data || [];
            setOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const viewOrderDetails = async (orderId) => {
        try {
            const response = await fetchOrderById(orderId);
            setSelectedOrder(response.data);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching order details:', error);
            toast.error('Không thể tải chi tiết đơn hàng');
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, { status: newStatus });
            toast.success('Cập nhật trạng thái thành công');
            await loadOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Shipped': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getStatusLabel = (status) => {
        const statusMap = {
            'Pending': 'Chờ xử lý',
            'Processing': 'Đang xử lý',
            'Shipped': 'Đã giao hàng',
            'Delivered': 'Đã nhận',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    // Kiểm tra đơn đã có yêu cầu đổi trả chưa
    const getOrderReturn = (orderId) => {
        return orderReturns.find(r => r.orderId === orderId);
    };

    // Kiểm tra đơn có thể yêu cầu đổi trả không
    const canRequestReturn = (order) => {
        // Chỉ cho phép với đơn đã hoàn thành hoặc đơn POS
        if (order.status !== 'Delivered' && order.status !== 'Completed' && !order.shippingAddress?.includes('Tại cửa hàng')) {
            return false;
        }
        // Kiểm tra đã có return request chưa
        const existingReturn = getOrderReturn(order.id);
        return !existingReturn; // Chỉ cho phép nếu chưa có return request
    };

    // Format date with time, handling timezone correctly
    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        // Parse the date string - if it's UTC, convert to local time
        const date = new Date(dateString);
        // Check if the date string ends with 'Z' (UTC) or has timezone info
        // If it's UTC, the Date object will automatically convert to local time
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' // Vietnam timezone (UTC+7)
        });
    };

    // Tìm kiếm đơn hàng
    const handleSearchOrder = async () => {
        if (!orderSearchQuery.trim()) {
            toast.error('Vui lòng nhập mã đơn, số điện thoại hoặc tên khách hàng');
            return;
        }
        try {
            const response = await fetchAllOrders({ search: orderSearchQuery });
            const results = response.data?.items || response.data || [];
            setOrderSearchResults(results);
            setShowOrderSearch(true);
        } catch (error) {
            console.error('Error searching orders:', error);
            toast.error('Không thể tìm kiếm đơn hàng');
        }
    };

    // Chọn đơn hàng từ kết quả tìm kiếm
    const handleSelectOrder = async (order) => {
        try {
            const response = await fetchOrderById(order.id);
            const orderData = response.data;
            setReturnOrderId(order.id);
            setSelectedOrder(orderData);
            setReturnForm({
                reason: '',
                returnType: 'Return',
                requestedBy: 'Staff',
                returnLocation: order.shippingAddress?.includes('Tại cửa hàng') ? 'Store' : 'Online',
                condition: 'New',
                returnToSupplier: false,
                supplierId: null,
                items: orderData.items.map(item => ({
                    orderItemId: item.id,
                    quantity: 0,
                    maxQuantity: item.quantity,
                    productName: item.productName,
                    unitPrice: item.unitPrice,
                    condition: 'New',
                    reason: ''
                })),
                exchangeItems: []
            });
            setShowOrderSearch(false);
            setOrderSearchQuery('');
            setOrderSearchResults([]);
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('Không thể tải chi tiết đơn hàng');
        }
    };

    // Tính toán chênh lệch giá khi đổi hàng
    const calculatePriceDifference = () => {
        if (returnForm.returnType !== 'Exchange' || !selectedOrder) return 0;
        
        // Tổng tiền sản phẩm trả lại
        const returnTotal = returnForm.items
            .filter(item => item.quantity > 0)
            .reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
        
        // Tổng tiền sản phẩm đổi
        const exchangeTotal = selectedExchangeProducts.reduce((sum, item) => 
            sum + (item.quantity * item.unitPrice), 0);
        
        return exchangeTotal - returnTotal; // Dương = thu thêm, Âm = hoàn lại
    };

    // Load sản phẩm để đổi
    useEffect(() => {
        if (returnForm.returnType === 'Exchange' && showReturnModal) {
            loadExchangeProducts();
        }
    }, [returnForm.returnType, showReturnModal]);

    const loadExchangeProducts = async () => {
        try {
            const response = await fetchProducts({ isActive: true });
            const products = response.data?.items || response.data || [];
            setExchangeProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    // Hàm in biên nhận đổi trả
    const handlePrintReturnReceipt = (returnId, returnData) => {
        const printWindow = window.open('', '_blank');
        const returnTypeText = returnData.returnType === 'Return' ? 'TRẢ HÀNG' : 
                              returnData.returnType === 'Exchange' ? 'ĐỔI HÀNG' : 
                              'TRẢ NHÀ CUNG CẤP';
        
        // Lấy tên sản phẩm từ items và exchangeItems (đã được truyền từ component)
        const returnItems = returnData.items.map(item => ({
            productName: item.productName || 'Sản phẩm',
            quantity: item.quantity
        }));
        
        const exchangeItems = returnData.exchangeItems?.map(item => ({
            productName: item.productName || 'Sản phẩm',
            quantity: item.quantity
        })) || [];
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Biên nhận đổi trả #${returnId}</title>
                <style>
                    @media print {
                        @page { size: 80mm auto; margin: 0; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        padding: 10px;
                        margin: 0;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: bold;
                    }
                    .header p {
                        margin: 5px 0;
                        font-size: 11px;
                    }
                    .info {
                        margin: 10px 0;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                    }
                    .items {
                        margin: 10px 0;
                    }
                    .item {
                        border-bottom: 1px dashed #ccc;
                        padding: 5px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 10px;
                        border-top: 1px dashed #ccc;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>PET SHOP</h1>
                    <p>BIÊN NHẬN ${returnTypeText}</p>
                    <p>Mã: #${returnId}</p>
                </div>
                <div class="info">
                    <div class="info-row">
                        <span>Ngày:</span>
                        <span>${new Date().toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="info-row">
                        <span>Loại:</span>
                        <span>${returnTypeText}</span>
                    </div>
                </div>
                <div class="items">
                    <h3>Sản phẩm đổi trả:</h3>
                    ${returnItems.map(item => `
                        <div class="item">
                            <div>${item.productName}</div>
                            <div>Số lượng: ${item.quantity}</div>
                        </div>
                    `).join('')}
                </div>
                ${returnData.returnType === 'Exchange' && exchangeItems.length > 0 ? `
                <div class="items">
                    <h3>Sản phẩm đổi:</h3>
                    ${exchangeItems.map(item => `
                        <div class="item">
                            <div>${item.productName}</div>
                            <div>Số lượng: ${item.quantity}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                <div class="footer">
                    <p>Cảm ơn quý khách!</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Filter orders based on tab and search
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
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(order => {
                const customerName = (order.customerName || '').toLowerCase();
                const customerEmail = (order.customerEmail || '').toLowerCase();
                const orderId = order.id.toString();
                const orderCode = (order.orderCode || order.posCode || '').toLowerCase();
                const shippingAddress = (order.shippingAddress || '').toLowerCase();
                return customerName.includes(query) ||
                       customerEmail.includes(query) ||
                       orderId.includes(query) ||
                       orderCode.includes(query) ||
                       shippingAddress.includes(query);
            });
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

        return filtered;
    }, [orders, activeTab, statusFilter, searchQuery, dateFilter, dateFrom, dateTo]);

    const handlePrintInvoice = (order) => {
        const printWindow = window.open('', '_blank');
        const invoiceContent = `
            <html>
                <head>
                    <title>Hóa đơn ${order.orderCode || order.posCode || 'Chưa có mã'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .info { margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PET SHOP</h1>
                        <h2>HÓA ĐƠN BÁN HÀNG</h2>
                    </div>
                    <div class="info">
                        <p><strong>Mã đơn:</strong> ${order.orderCode || order.posCode || 'Chưa có mã'}</p>
                        <p><strong>Ngày:</strong> ${formatDateTime(order.createdAt)}</p>
                        <p><strong>Trạng thái:</strong> ${order.status}</p>
                        <p><strong>Phương thức thanh toán:</strong> ${order.paymentMethod === 'COD' ? 'Tiền mặt' : order.paymentMethod}</p>
                        ${order.shippingAddress ? `<p><strong>Địa chỉ:</strong> ${order.shippingAddress}</p>` : ''}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>SL</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td>${item.productName || 'N/A'}</td>
                                    <td>${item.quantity}</td>
                                    <td>${(item.unitPrice || 0).toLocaleString('vi-VN')} ₫</td>
                                    <td>${(item.lineTotal || item.unitPrice * item.quantity || 0).toLocaleString('vi-VN')} ₫</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">
                        <p>Tổng cộng: ${(order.total || 0).toLocaleString('vi-VN')} ₫</p>
                    </div>
                    <div style="text-align: center; margin-top: 40px;">
                        <p>Cảm ơn quý khách!</p>
                    </div>
                </body>
            </html>
        `;
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Xem và cập nhật trạng thái đơn hàng</p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedOrder(null);
                        setReturnOrderId(null);
                        setReturnForm({
                            reason: '',
                            returnType: 'Return',
                            requestedBy: 'Staff',
                            returnLocation: 'Store',
                            condition: 'New',
                            returnToSupplier: false,
                            supplierId: null,
                            items: [],
                            exchangeItems: []
                        });
                        setSelectedExchangeProducts([]);
                        setShowReturnModal(true);
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white dark:text-white font-semibold shadow-md"
                >
                    <ArrowPathIcon className="w-5 h-5 inline mr-2" />
                    Tạo đổi trả mới
                </Button>
            </header>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('online')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'online'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Mua online
                        </button>
                        <button
                            onClick={() => setActiveTab('offline')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'offline'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Mua tại cửa hàng
                        </button>
                    </nav>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo mã đơn, tên khách hàng, email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        {activeTab === 'online' && (
                            <>
                                <option value="Pending">Chờ xử lý</option>
                                <option value="Processing">Đang xử lý</option>
                                <option value="Shipped">Đã giao hàng</option>
                                <option value="Delivered">Đã nhận</option>
                            </>
                        )}
                        <option value="Completed">Hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                    </select>

                    {/* Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-gray-500 dark:text-gray-400">đến</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* Reset Button */}
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setDateFilter('all');
                            setDateFrom('');
                            setDateTo('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Đặt lại</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter !== 'all' 
                            ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.' 
                            : 'Chưa có đơn hàng nào.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã đơn</th>
                                    <th className="px-4 py-3 text-left">Khách hàng</th>
                                    <th className="px-4 py-3 text-left">Tổng tiền</th>
                                    <th className="px-4 py-3 text-left">Phí ship</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredOrders.map((order) => {
                                    const isPOSOrder = order.shippingAddress?.includes('Tại cửa hàng');
                                    const customerDisplayName = order.customerName || order.customerEmail || (order.customerId ? `ID: ${order.customerId.substring(0, 8)}...` : 'Khách vãng lai');
                                    
                                    return (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium">
                                            {order.orderCode || order.posCode || '—'}
                                            {isPOSOrder && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                                    Mua tại cửa hàng
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{customerDisplayName}</span>
                                                {isPOSOrder && order.shippingAddress && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {order.shippingAddress.replace('Tại cửa hàng - ', '')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {(order.total - (order.shippingFee || 0))?.toLocaleString('vi-VN')} ₫
                                        </td>
                                        <td className="px-4 py-3">
                                            {order.shippingFee > 0 ? (
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {order.shippingFee.toLocaleString('vi-VN')} ₫
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDateTime(order.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewOrderDetails(order.id)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const response = await fetchOrderById(order.id);
                                                            handlePrintInvoice(response.data);
                                                        } catch (error) {
                                                            console.error('Error fetching order for print:', error);
                                                            toast.error('Không thể tải chi tiết đơn hàng');
                                                        }
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="In hóa đơn"
                                                >
                                                    <PrinterIcon className="h-5 w-5" />
                                                </button>
                                                {/* Nút xử lý yêu cầu hủy đơn */}
                                                {(() => {
                                                    const cancellation = getOrderCancellation(order.id);
                                                    if (cancellation && cancellation.status === 'Pending') {
                                                        return (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const response = await getCancellationRequestById(cancellation.id);
                                                                        setSelectedCancellation(response.data);
                                                                        setProcessForm({ status: 'Approved', adminNote: '' });
                                                                        setShowCancellationModal(true);
                                                                    } catch (error) {
                                                                        console.error('Error fetching cancellation details:', error);
                                                                        toast.error('Không thể tải chi tiết yêu cầu hủy đơn');
                                                                    }
                                                                }}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                                                                title="Xử lý yêu cầu hủy đơn"
                                                            >
                                                                <XMarkIcon className="h-5 w-5" />
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                {!isPOSOrder && order.status === 'Pending' && (
                                                    <Button
                                                        onClick={() => handleStatusChange(order.id, 'Processing')}
                                                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-semibold shadow-md"
                                                    >
                                                        Xác nhận
                                                    </Button>
                                                )}
                                                {!isPOSOrder && order.status === 'Processing' && (
                                                    <Button
                                                        onClick={() => handleStatusChange(order.id, 'Shipped')}
                                                        className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white dark:text-white font-semibold shadow-md"
                                                    >
                                                        Giao hàng
                                                    </Button>
                                                )}
                                                {!isPOSOrder && order.status === 'Shipped' && (
                                                    <Button
                                                        onClick={async () => {
                                                            try {
                                                                // Tự động cập nhật trạng thái "Hoàn thành" khi click "Đã nhận"
                                                                // Cập nhật trực tiếp thành "Completed" (Hoàn thành) thay vì "Delivered"
                                                                await handleStatusChange(order.id, 'Completed');
                                                                toast.success('Đã cập nhật trạng thái "Hoàn thành"');
                                                            } catch (error) {
                                                                console.error('Error updating order status:', error);
                                                            }
                                                        }}
                                                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white dark:text-white font-semibold shadow-md"
                                                    >
                                                        Đã nhận
                                                    </Button>
                                                )}
                                                {/* Nút xử lý đổi trả - Hiển thị cho đơn đã hoàn thành hoặc đơn POS, chỉ khi chưa có yêu cầu đổi trả */}
                                                {(() => {
                                                    const existingReturn = getOrderReturn(order.id);
                                                    const canReturn = canRequestReturn(order);
                                                    
                                                    if (existingReturn && existingReturn.status === 'Completed') {
                                                        // Nếu đã xử lý xong, hiện tag "Đã yêu cầu đổi trả"
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                                Đã yêu cầu đổi trả
                                                            </span>
                                                        );
                                                    } else if (canReturn) {
                                                        // Chỉ hiện nút nếu chưa có return request
                                                        return (
                                                            <Button
                                                                onClick={async () => {
                                                                    try {
                                                                        const response = await fetchOrderById(order.id);
                                                                        const orderData = response.data;
                                                                        setReturnOrderId(order.id);
                                                                        setReturnForm({
                                                                            reason: '',
                                                                            returnType: 'Return',
                                                                            requestedBy: 'Staff',
                                                                            returnLocation: order.shippingAddress?.includes('Tại cửa hàng') ? 'Store' : 'Online',
                                                                            condition: 'New',
                                                                            returnToSupplier: false,
                                                                            supplierId: null,
                                                                            items: orderData.items.map(item => ({
                                                                                orderItemId: item.id,
                                                                                quantity: 0,
                                                                                maxQuantity: item.quantity,
                                                                                productName: item.productName,
                                                                                unitPrice: item.unitPrice,
                                                                                condition: 'New',
                                                                                reason: ''
                                                                            })),
                                                                            exchangeItems: []
                                                                        });
                                                                        setSelectedOrder(orderData);
                                                                        setSelectedExchangeProducts([]);
                                                                        setShowReturnModal(true);
                                                                    } catch (error) {
                                                                        console.error('Error fetching order:', error);
                                                                        toast.error('Không thể tải chi tiết đơn hàng');
                                                                    }
                                                                }}
                                                                className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white dark:text-white font-semibold shadow-md"
                                                            >
                                                                <ArrowPathIcon className="w-4 h-4 inline mr-1" />
                                                                Đổi trả
                                                            </Button>
                                                        );
                                                    } else if (existingReturn) {
                                                        // Nếu đã có return request nhưng chưa completed, hiện tag trạng thái
                                                        const returnStatusMap = {
                                                            'Pending': 'Chờ xử lý',
                                                            'Approved': 'Đã duyệt',
                                                            'Processing': 'Đang xử lý',
                                                            'Rejected': 'Từ chối',
                                                            'Cancelled': 'Đã hủy'
                                                        };
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                Đã yêu cầu ({returnStatusMap[existingReturn.status] || existingReturn.status})
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết đơn hàng {selectedOrder.orderCode || `#${selectedOrder.id}`}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedOrder.customerName || selectedOrder.customerEmail || 'Khách vãng lai'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status & Info */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedOrder.status)}`}>
                                        {getStatusLabel(selectedOrder.status)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        (selectedOrder.paymentStatus || '').toLowerCase() === 'paid'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {(selectedOrder.paymentStatus || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày đặt</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN') : '—'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Khách hàng</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.customerName || selectedOrder.customerEmail || 'Khách vãng lai'}
                                    </p>
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
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hình thức vận chuyển</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedOrder.shippingMethod && (
                                    <div className="flex justify-between items-center text-sm">
                    
                                        <span className="text-gray-900 dark:text-white">
                                            {(() => {
                                                const methods = {
                                                    'standard': 'Giao hàng tiêu chuẩn',
                                                    'express': 'Giao hàng nhanh',
                                                    'same-day': 'Giao hàng trong ngày',
                                                    'free': 'Miễn phí vận chuyển'
                                                };
                                                return methods[selectedOrder.shippingMethod] || selectedOrder.shippingMethod;
                                            })()}
                                        </span>
                                    </div>
                                )}
                                        
                                    </p>
                                </div>
                                {selectedOrder.deliveryDate && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày giao hàng</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(selectedOrder.deliveryDate).toLocaleString('vi-VN')}
                                        </p>
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Sản phẩm ({(selectedOrder.items || []).length})
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map((item) => (
                                        <div 
                                            key={item.id} 
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
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                            <Button
                                onClick={() => handlePrintInvoice(selectedOrder)}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:text-white font-semibold shadow-md"
                            >
                                <PrinterIcon className="w-5 h-5 inline mr-2" />
                                In hóa đơn
                            </Button>
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

            {/* Return/Exchange Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {selectedOrder ? `Xử lý đổi trả - Đơn hàng ${selectedOrder.orderCode || `#${selectedOrder.id}`}` : 'Tìm kiếm đơn hàng để đổi trả'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowReturnModal(false);
                                        setReturnOrderId(null);
                                        setReturnForm({
                                            reason: '',
                                            returnType: 'Return',
                                            requestedBy: 'Staff',
                                            returnLocation: 'Store',
                                            condition: 'New',
                                            returnToSupplier: false,
                                            supplierId: null,
                                            items: [],
                                            exchangeItems: []
                                        });
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Tìm kiếm đơn hàng (nếu chưa chọn) */}
                                {!selectedOrder && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Tìm kiếm đơn hàng
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={orderSearchQuery}
                                                onChange={(e) => setOrderSearchQuery(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                                                placeholder="Nhập mã đơn, số điện thoại hoặc tên khách hàng..."
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <Button
                                                onClick={handleSearchOrder}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:text-white font-semibold shadow-md"
                                            >
                                                <MagnifyingGlassIcon className="w-5 h-5 inline mr-1" />
                                                Tìm
                                            </Button>
                                        </div>
                                        {showOrderSearch && orderSearchResults.length > 0 && (
                                            <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                                                {orderSearchResults.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        onClick={() => handleSelectOrder(order)}
                                                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">
                                                                    Đơn {order.orderCode || order.posCode || 'Chưa có mã'}
                                                                </p>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {order.customerName || 'Khách vãng lai'} - {order.total?.toLocaleString('vi-VN')} ₫
                                                                </p>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                                                {getStatusLabel(order.status)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {showOrderSearch && orderSearchResults.length === 0 && (
                                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                Không tìm thấy đơn hàng nào
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Thông tin cơ bản */}
                                {selectedOrder && (
                                    <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Người yêu cầu *
                                        </label>
                                        <select
                                            value={returnForm.requestedBy}
                                            onChange={(e) => setReturnForm({ ...returnForm, requestedBy: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="Customer">Khách hàng</option>
                                            <option value="Staff">Nhân viên</option>
                                            <option value="Warehouse">Kho hàng</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Loại đổi trả *
                                        </label>
                                        <select
                                            value={returnForm.returnType}
                                            onChange={(e) => setReturnForm({ ...returnForm, returnType: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="Return">Trả hàng</option>
                                            <option value="Exchange">Đổi hàng</option>
                                            <option value="SupplierReturn">Trả nhà cung cấp</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Nơi trả hàng *
                                        </label>
                                        <select
                                            value={returnForm.returnLocation}
                                            onChange={(e) => setReturnForm({ ...returnForm, returnLocation: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="Store">Tại cửa hàng</option>
                                            <option value="Online">Trực tuyến</option>
                                            <option value="Warehouse">Kho hàng</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tình trạng hàng *
                                        </label>
                                        <select
                                            value={returnForm.condition}
                                            onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="New">Mới, nguyên vẹn</option>
                                            <option value="Damaged">Hỏng</option>
                                            <option value="Expired">Hết hạn</option>
                                            <option value="WrongItem">Sai hàng</option>
                                            <option value="Defective">Lỗi sản phẩm</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Lý do đổi trả */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Lý do đổi trả *
                                    </label>
                                    <textarea
                                        value={returnForm.reason}
                                        onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                        placeholder="Nhập lý do đổi trả chi tiết..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <p className="font-semibold mb-1">Các trường hợp phổ biến:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Khách yêu cầu đổi trả do lỗi hoặc giao sai</li>
                                            <li>Nhân viên phát hiện sản phẩm lỗi khi chuẩn bị đơn</li>
                                            <li>Khách trả hàng tại quầy (bao bì nguyên vẹn)</li>
                                            <li>Hóa đơn/ thanh toán bị ghi sai</li>
                                            <li>Hàng bị hỏng trong quá trình giao</li>
                                            <li>Kho phát hiện hàng hết date, hàng hỏng</li>
                                            <li>Trả hàng về nhà cung cấp khi hàng nhập bị lỗi</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Trả về nhà cung cấp */}
                                {returnForm.returnType === 'SupplierReturn' && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={returnForm.returnToSupplier}
                                                onChange={(e) => setReturnForm({ ...returnForm, returnToSupplier: e.target.checked })}
                                                className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Trả hàng về nhà cung cấp
                                            </span>
                                        </label>
                                        {returnForm.returnToSupplier && (
                                            <div className="mt-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    ID Nhà cung cấp
                                                </label>
                                                <input
                                                    type="number"
                                                    value={returnForm.supplierId || ''}
                                                    onChange={(e) => setReturnForm({ ...returnForm, supplierId: parseInt(e.target.value) || null })}
                                                    placeholder="Nhập ID nhà cung cấp"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Danh sách sản phẩm cần đổi trả */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        Sản phẩm cần đổi trả
                                    </h3>
                                    <div className="space-y-3">
                                        {returnForm.items.map((item, index) => (
                                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Số lượng đã mua: {item.maxQuantity}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Số lượng trả
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
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Tình trạng
                                                        </label>
                                                        <select
                                                            value={item.condition || 'New'}
                                                            onChange={(e) => {
                                                                const newItems = [...returnForm.items];
                                                                newItems[index].condition = e.target.value;
                                                                setReturnForm({ ...returnForm, items: newItems });
                                                            }}
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        >
                                                            <option value="New">Mới</option>
                                                            <option value="Damaged">Hỏng</option>
                                                            <option value="Expired">Hết hạn</option>
                                                            <option value="WrongItem">Sai hàng</option>
                                                            <option value="Defective">Lỗi</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Lý do (tùy chọn)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.reason || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...returnForm.items];
                                                                newItems[index].reason = e.target.value;
                                                                setReturnForm({ ...returnForm, items: newItems });
                                                            }}
                                                            placeholder="Lý do cụ thể..."
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sản phẩm đổi (nếu là Exchange) */}
                                {returnForm.returnType === 'Exchange' && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Sản phẩm đổi
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedExchangeProducts.map((item, index) => (
                                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {item.unitPrice?.toLocaleString('vi-VN')} ₫ × {item.quantity} = {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const newItems = selectedExchangeProducts.filter((_, i) => i !== index);
                                                                setSelectedExchangeProducts(newItems);
                                                            }}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                                                <select
                                                    onChange={(e) => {
                                                        const productId = parseInt(e.target.value);
                                                        if (productId) {
                                                            const product = exchangeProducts.find(p => p.id === productId);
                                                            if (product) {
                                                                setSelectedExchangeProducts([...selectedExchangeProducts, {
                                                                    productId: product.id,
                                                                    productName: product.name,
                                                                    unitPrice: product.salePrice || product.price,
                                                                    quantity: 1
                                                                }]);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                >
                                                    <option value="">Chọn sản phẩm đổi...</option>
                                                    {exchangeProducts.map((product) => (
                                                        <option key={product.id} value={product.id}>
                                                            {product.name} - {(product.salePrice || product.price).toLocaleString('vi-VN')} ₫
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tính toán chênh lệch giá */}
                                {returnForm.returnType === 'Exchange' && selectedOrder && (
                                    <div className={`p-4 rounded-lg border-2 ${
                                        calculatePriceDifference() > 0 
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                                            : calculatePriceDifference() < 0
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    }`}>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Tính toán chênh lệch
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-700 dark:text-gray-300">Tổng tiền sản phẩm trả lại:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {returnForm.items
                                                        .filter(item => item.quantity > 0)
                                                        .reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0)
                                                        .toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-700 dark:text-gray-300">Tổng tiền sản phẩm đổi:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {selectedExchangeProducts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t">
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {calculatePriceDifference() > 0 ? 'Khách cần thanh toán thêm:' : 
                                                     calculatePriceDifference() < 0 ? 'Hoàn lại cho khách:' : 
                                                     'Không có chênh lệch'}
                                                </span>
                                                <span className={`font-bold text-lg ${
                                                    calculatePriceDifference() > 0 
                                                        ? 'text-yellow-600 dark:text-yellow-400' 
                                                        : calculatePriceDifference() < 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {Math.abs(calculatePriceDifference()).toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Nút xác nhận */}
                                {selectedOrder && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
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

                                            if (returnForm.returnType === 'Exchange' && selectedExchangeProducts.length === 0) {
                                                toast.error('Vui lòng chọn sản phẩm đổi');
                                                return;
                                            }

                                            try {
                                                const returnData = {
                                                    orderId: returnOrderId,
                                                    reason: returnForm.reason,
                                                    returnType: returnForm.returnType,
                                                    requestedBy: returnForm.requestedBy,
                                                    returnLocation: returnForm.returnLocation,
                                                    condition: returnForm.condition,
                                                    returnToSupplier: returnForm.returnToSupplier,
                                                    supplierId: returnForm.supplierId,
                                                    items: returnForm.items
                                                        .filter(item => item.quantity > 0)
                                                        .map(item => ({
                                                            orderItemId: item.orderItemId,
                                                            quantity: item.quantity,
                                                            reason: item.reason || null,
                                                            condition: item.condition || null
                                                        })),
                                                    exchangeItems: returnForm.returnType === 'Exchange' 
                                                        ? selectedExchangeProducts.map(item => ({
                                                            productId: item.productId,
                                                            quantity: item.quantity
                                                        }))
                                                        : null
                                                };

                                                const response = await createOrderReturn(returnData);
                                                const returnId = response.data?.id;
                                                toast.success('Tạo yêu cầu đổi trả thành công');
                                                
                                                // Reload order returns để cập nhật UI
                                                await loadOrderReturns();
                                                
                                                // In biên nhận nếu có returnId
                                                if (returnId) {
                                                    setTimeout(() => {
                                                        handlePrintReturnReceipt(returnId, {
                                                            ...returnData,
                                                            items: returnData.items.map(item => {
                                                                const orderItem = selectedOrder.items.find(oi => oi.id === item.orderItemId);
                                                                return {
                                                                    ...item,
                                                                    productName: orderItem?.productName || 'Sản phẩm'
                                                                };
                                                            }),
                                                            exchangeItems: returnData.exchangeItems?.map(item => {
                                                                const product = exchangeProducts.find(p => p.id === item.productId);
                                                                return {
                                                                    ...item,
                                                                    productName: product?.name || 'Sản phẩm'
                                                                };
                                                            }) || []
                                                        });
                                                    }, 500);
                                                }
                                                
                                                setShowReturnModal(false);
                                                setReturnOrderId(null);
                                                setSelectedOrder(null);
                                                setSelectedExchangeProducts([]);
                                                setReturnForm({
                                                    reason: '',
                                                    returnType: 'Return',
                                                    requestedBy: 'Staff',
                                                    returnLocation: 'Store',
                                                    condition: 'New',
                                                    returnToSupplier: false,
                                                    supplierId: null,
                                                    items: [],
                                                    exchangeItems: []
                                                });
                                                await loadOrderReturns();
                                                await loadOrders();
                                            } catch (error) {
                                                console.error('Error creating return:', error);
                                                toast.error(error.response?.data?.error || 'Không thể tạo yêu cầu đổi trả');
                                            }
                                        }}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white dark:text-white font-semibold shadow-md"
                                    >
                                        Xác nhận đổi trả
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowReturnModal(false);
                                            setReturnOrderId(null);
                                        }}
                                        variant="secondary"
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-500"
                                    >
                                        Hủy
                                    </Button>
                                </div>
                                )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation Request Modal */}
            {showCancellationModal && selectedCancellation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Xử lý yêu cầu hủy đơn #{selectedCancellation.id}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCancellationModal(false);
                                        setSelectedCancellation(null);
                                        setProcessForm({ status: 'Approved', adminNote: '' });
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Order Info */}
                            {selectedCancellation.order && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        Thông tin đơn hàng
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Mã đơn:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{selectedCancellation.order.orderCode || `#${selectedCancellation.order.id}`}</span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Tổng tiền:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{selectedCancellation.order.total?.toLocaleString('vi-VN')} ₫</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Cancellation Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Thông tin yêu cầu hủy
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                                    <p className="text-sm">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Khách hàng:</span>{' '}
                                        <span className="text-gray-900 dark:text-white">{selectedCancellation.customerName || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Lý do:</span>{' '}
                                        <span className="text-gray-900 dark:text-white">{selectedCancellation.reason || '—'}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Process Form */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Xử lý yêu cầu
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Trạng thái xử lý
                                        </label>
                                        <select
                                            value={processForm.status}
                                            onChange={(e) => setProcessForm({ ...processForm, status: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                        >
                                            <option value="Approved">Duyệt</option>
                                            <option value="Rejected">Từ chối</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ghi chú (Tùy chọn)
                                        </label>
                                        <textarea
                                            value={processForm.adminNote}
                                            onChange={(e) => setProcessForm({ ...processForm, adminNote: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                            placeholder="Nhập ghi chú cho khách hàng..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleProcessCancellation(selectedCancellation.id)}
                                            className="flex-1"
                                        >
                                            Xử lý yêu cầu
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

