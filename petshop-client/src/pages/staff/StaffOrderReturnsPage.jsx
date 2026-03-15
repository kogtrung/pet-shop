import React, { useEffect, useState, useMemo } from 'react';
import { getAllOrderReturns, getOrderReturnById, updateOrderReturnStatus } from '../../api/orderReturnApi';
import { fetchOrderById } from '../../api/orderApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MagnifyingGlassIcon, PrinterIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function StaffOrderReturnsPage() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [returnTypeFilter, setReturnTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        loadReturns();
    }, []);

    const loadReturns = async () => {
        setLoading(true);
        try {
            const response = await getAllOrderReturns();
            setReturns(response.data || []);
        } catch (error) {
            console.error('Error loading returns:', error);
            toast.error('Không thể tải danh sách đổi trả');
        } finally {
            setLoading(false);
        }
    };

    const filteredReturns = useMemo(() => {
        let filtered = [...returns];

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        // Filter by return type
        if (returnTypeFilter !== 'all') {
            filtered = filtered.filter(r => r.returnType === returnTypeFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                r.id.toString().includes(query) ||
                r.orderId.toString().includes(query) ||
                (r.orderCode || '').toLowerCase().includes(query) ||
                r.reason?.toLowerCase().includes(query) ||
                r.items?.some(item => item.productName?.toLowerCase().includes(query))
            );
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (dateFilter === 'today') {
                filtered = filtered.filter(r => {
                    const returnDate = new Date(r.createdAt);
                    returnDate.setHours(0, 0, 0, 0);
                    return returnDate.getTime() === today.getTime();
                });
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(r => {
                    const returnDate = new Date(r.createdAt);
                    return returnDate >= weekAgo;
                });
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(r => {
                    const returnDate = new Date(r.createdAt);
                    return returnDate >= monthAgo;
                });
            } else if (dateFilter === 'custom' && dateFrom && dateTo) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                filtered = filtered.filter(r => {
                    const returnDate = new Date(r.createdAt);
                    return returnDate >= from && returnDate <= to;
                });
            }
        }

        return filtered;
    }, [returns, statusFilter, returnTypeFilter, searchQuery, dateFilter, dateFrom, dateTo]);

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Pending': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ClockIcon, label: 'Chờ xử lý' },
            'Approved': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircleIcon, label: 'Đã duyệt' },
            'Processing': { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: ClockIcon, label: 'Đang xử lý' },
            'Completed': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon, label: 'Hoàn tất' },
            'Rejected': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircleIcon, label: 'Từ chối' }
        };

        const config = statusConfig[status] || statusConfig['Pending'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    const handleViewDetails = async (returnId) => {
        try {
            const response = await getOrderReturnById(returnId);
            const returnData = response.data;
            
            // Load order details to get customer information
            try {
                const orderResponse = await fetchOrderById(returnData.orderId);
                returnData.order = orderResponse.data;
            } catch (error) {
                console.error('Error loading order details:', error);
                // Continue without order details
            }
            
            setSelectedReturn(returnData);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching return details:', error);
            toast.error('Không thể tải chi tiết đổi trả');
        }
    };

    const handleUpdateStatus = async (returnId, newStatus, staffNotes = '', refundAmount = null, refundMethod = null) => {
        try {
            await updateOrderReturnStatus(returnId, {
                status: newStatus,
                staffNotes,
                refundAmount,
                refundMethod
            });
            toast.success('Cập nhật trạng thái thành công');
            setShowDetailsModal(false);
            await loadReturns();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.response?.data?.error || 'Không thể cập nhật trạng thái');
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                        <span className="text-2xl mr-3">🔄</span>
                        Quản lý đổi trả hàng
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Xem và xử lý các yêu cầu đổi trả hàng
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo mã, lý do, sản phẩm..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Pending">Chờ xử lý</option>
                            <option value="Approved">Đã duyệt</option>
                            <option value="Processing">Đang xử lý</option>
                            <option value="Completed">Hoàn tất</option>
                            <option value="Rejected">Từ chối</option>
                        </select>

                        {/* Return Type Filter */}
                        <select
                            value={returnTypeFilter}
                            onChange={(e) => setReturnTypeFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả loại</option>
                            <option value="Return">Trả hàng</option>
                            <option value="Exchange">Đổi hàng</option>
                        </select>

                        {/* Date Filter */}
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
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

                        {/* Reset Button */}
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setReturnTypeFilter('all');
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

                {/* Returns List */}
                {loading ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                        <p className="text-gray-600 dark:text-gray-400">Không có yêu cầu đổi trả nào</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Đơn hàng</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Loại</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Lý do</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày tạo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredReturns.map((returnItem) => (
                                        <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                #{returnItem.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {returnItem.orderCode || `Đơn #${returnItem.orderId}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {returnItem.returnType === 'Return' ? 'Trả hàng' : 'Đổi hàng'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {returnItem.reason}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(returnItem.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(returnItem.createdAt).toLocaleString('vi-VN', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZone: 'Asia/Ho_Chi_Minh'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => handleViewDetails(returnItem.id)}
                                                    className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    Xem
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {showDetailsModal && selectedReturn && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết đổi trả #{selectedReturn.id}
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
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Mã đơn: {selectedReturn.orderCode || `#${selectedReturn.orderId}`}
                                        </p>
                                    </div>
                                    <div>
                                        {getStatusBadge(selectedReturn.status)}
                                    </div>
                                </div>

                                {/* Customer Information */}
                                {selectedReturn.order && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Thông tin khách hàng</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Tên khách hàng</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {selectedReturn.order.customerName || selectedReturn.order.customer?.profile?.fullName || selectedReturn.order.customer?.username || 'Khách vãng lai'}
                                                </p>
                                            </div>
                                            {selectedReturn.order.customerEmail && (
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReturn.order.customerEmail}</p>
                                                </div>
                                            )}
                                            {selectedReturn.order.shippingAddress && (
                                                <div className="md:col-span-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Địa chỉ</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReturn.order.shippingAddress}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Loại đổi trả</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedReturn.returnType === 'Return' ? 'Trả hàng' : 'Đổi hàng'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Người yêu cầu</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedReturn.requestedBy === 'Customer' ? 'Khách hàng' : 'Nhân viên'}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Lý do đổi trả</label>
                                    <p className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-900 dark:text-white">
                                        {selectedReturn.reason || '—'}
                                    </p>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        Sản phẩm đổi trả ({(selectedReturn.items || []).length})
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedReturn.items?.map((item, index) => (
                                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 dark:text-white mb-2">{item.productName || `Sản phẩm #${item.productId}`}</p>
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-gray-600 dark:text-gray-400">Số lượng:</span>
                                                                <span className="font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                                                            </div>
                                                            {item.unitPrice && (
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-gray-600 dark:text-gray-400">Đơn giá:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">{item.unitPrice.toLocaleString('vi-VN')} ₫</span>
                                                                </div>
                                                            )}
                                                            {item.reason && (
                                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                                    <span className="text-gray-600 dark:text-gray-400">Lý do:</span>
                                                                    <p className="text-gray-900 dark:text-white mt-1">{item.reason}</p>
                                                                </div>
                                                            )}
                                                            {item.condition && (
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-gray-600 dark:text-gray-400">Tình trạng:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {item.condition === 'New' ? 'Mới' :
                                                                         item.condition === 'Damaged' ? 'Hỏng' :
                                                                         item.condition === 'Expired' ? 'Hết hạn' :
                                                                         item.condition === 'WrongItem' ? 'Sai hàng' :
                                                                         'Lỗi'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.unitPrice && (
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Thành tiền</p>
                                                            <p className="font-bold text-gray-900 dark:text-white">
                                                                {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Exchange Items */}
                                {selectedReturn.exchangeItems && selectedReturn.exchangeItems.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Sản phẩm đổi
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedReturn.exchangeItems.map((item, index) => (
                                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                Số lượng: {item.quantity} | Giá: {item.unitPrice?.toLocaleString('vi-VN')} ₫
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Staff Notes */}
                                {selectedReturn.staffNotes && (
                                    <div>
                                        <label className="text-sm text-gray-500 dark:text-gray-400">Ghi chú nhân viên</label>
                                        <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white">
                                            {selectedReturn.staffNotes}
                                        </p>
                                    </div>
                                )}

                                {/* Refund Info */}
                                {selectedReturn.refundAmount && (
                                    <div>
                                        <label className="text-sm text-gray-500 dark:text-gray-400">Số tiền hoàn</label>
                                        <p className="mt-1 font-medium text-lg text-gray-900 dark:text-white">
                                            {selectedReturn.refundAmount.toLocaleString('vi-VN')} ₫
                                        </p>
                                        {selectedReturn.refundMethod && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                Phương thức: {selectedReturn.refundMethod}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                                {selectedReturn.status === 'Pending' && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'Rejected', 'Yêu cầu không hợp lệ')}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 shadow-md"
                                        >
                                            Từ chối
                                        </Button>
                                        <Button
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'Approved', 'Đã duyệt yêu cầu')}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:text-white font-semibold shadow-md"
                                        >
                                            Duyệt
                                        </Button>
                                    </>
                                )}
                                {selectedReturn.status === 'Approved' && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedReturn.id, 'Processing', 'Đang xử lý')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-semibold shadow-md"
                                    >
                                        Bắt đầu xử lý
                                    </Button>
                                )}
                                {selectedReturn.status === 'Processing' && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedReturn.id, 'Completed', 'Đã hoàn tất', selectedReturn.refundAmount || 0, 'Cash')}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:text-white font-semibold shadow-md"
                                    >
                                        Hoàn tất
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 shadow-md"
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

