import React, { useEffect, useState, useMemo } from 'react';
import { getAllOrderReturns, getOrderReturnById, updateOrderReturnStatus, deleteOrderReturn } from '../../api/orderReturnApi';
import { fetchOrderById } from '../../api/orderApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MagnifyingGlassIcon, PrinterIcon, XMarkIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ManageOrderReturnsPage() {
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
            // Sort by ID descending (newest first)
            const sortedReturns = (response.data || []).sort((a, b) => b.id - a.id);
            setReturns(sortedReturns);
        } catch (error) {
            console.error('Error loading returns:', error);
            toast.error('Không thể tải danh sách đổi trả');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (returnId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đơn đổi trả này?')) {
            return;
        }

        try {
            await deleteOrderReturn(returnId);
            toast.success('Xóa đơn đổi trả thành công');
            await loadReturns();
            if (selectedReturn && selectedReturn.id === returnId) {
                setShowDetailsModal(false);
                setSelectedReturn(null);
            }
        } catch (error) {
            console.error('Error deleting return:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xóa đơn đổi trả';
            toast.error(errorMessage);
        }
    };

    const viewReturnDetails = async (returnId) => {
        try {
            const response = await getOrderReturnById(returnId);
            const returnData = response.data;
            
            // Load order details
            const orderResponse = await fetchOrderById(returnData.orderId);
            returnData.order = orderResponse.data;
            
            setSelectedReturn(returnData);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching return details:', error);
            toast.error('Không thể tải chi tiết đổi trả');
        }
    };

    const handleStatusChange = async (returnId, newStatus, refundAmount = null, refundMethod = null, staffNotes = null) => {
        try {
            await updateOrderReturnStatus(returnId, {
                status: newStatus,
                refundAmount: refundAmount,
                refundMethod: refundMethod,
                staffNotes: staffNotes
            });
            toast.success('Cập nhật trạng thái thành công');
            await loadReturns();
            if (selectedReturn && selectedReturn.id === returnId) {
                setSelectedReturn({ ...selectedReturn, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating return status:', error);
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'Approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'Processing': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    };

    const getReturnTypeBadge = (type) => {
        const typeMap = {
            'Return': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'Exchange': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'SupplierReturn': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        };
        return typeMap[type] || 'bg-gray-100 text-gray-800';
    };

    const getRequestedByBadge = (requestedBy) => {
        const badgeMap = {
            'Customer': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
            'Staff': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Warehouse': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        };
        return badgeMap[requestedBy] || 'bg-gray-100 text-gray-800';
    };

    // Filter returns
    const filteredReturns = useMemo(() => {
        let filtered = returns;

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đổi trả</h1>
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
                            placeholder="Tìm kiếm theo mã đổi trả, mã đơn, lý do, sản phẩm..."
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
                        <option value="Pending">Chờ xử lý</option>
                        <option value="Approved">Đã duyệt</option>
                        <option value="Rejected">Từ chối</option>
                        <option value="Processing">Đang xử lý</option>
                        <option value="Completed">Hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                    </select>
                    {/* Return Type Filter */}
                    <select
                        value={returnTypeFilter}
                        onChange={(e) => setReturnTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả loại</option>
                        <option value="Return">Trả hàng</option>
                        <option value="Exchange">Đổi hàng</option>
                        <option value="SupplierReturn">Trả nhà cung cấp</option>
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter !== 'all' || returnTypeFilter !== 'all'
                            ? 'Không tìm thấy yêu cầu đổi trả nào phù hợp với bộ lọc.' 
                            : 'Chưa có yêu cầu đổi trả nào.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã đổi trả</th>
                                    <th className="px-4 py-3 text-left">Mã đơn</th>
                                    <th className="px-4 py-3 text-left">Loại</th>
                                    <th className="px-4 py-3 text-left">Người yêu cầu</th>
                                    <th className="px-4 py-3 text-left">Lý do</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredReturns.map((returnItem) => (
                                    <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium">
                                            #{returnItem.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                                {returnItem.orderCode || `#${returnItem.orderId}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReturnTypeBadge(returnItem.returnType)}`}>
                                                {returnItem.returnType === 'Return' ? 'Trả hàng' : 
                                                 returnItem.returnType === 'Exchange' ? 'Đổi hàng' : 
                                                 'Trả NCC'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRequestedByBadge(returnItem.requestedBy)}`}>
                                                {returnItem.requestedBy === 'Customer' ? 'Khách hàng' : 
                                                 returnItem.requestedBy === 'Staff' ? 'Nhân viên' : 
                                                 'Kho hàng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="max-w-xs truncate" title={returnItem.reason}>
                                                {returnItem.reason}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(returnItem.status)}`}>
                                                {returnItem.status === 'Pending' ? 'Chờ xử lý' :
                                                 returnItem.status === 'Approved' ? 'Đã duyệt' :
                                                 returnItem.status === 'Rejected' ? 'Từ chối' :
                                                 returnItem.status === 'Processing' ? 'Đang xử lý' :
                                                 returnItem.status === 'Completed' ? 'Hoàn thành' :
                                                 'Đã hủy'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {new Date(returnItem.createdAt).toLocaleString('vi-VN', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Ho_Chi_Minh'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewReturnDetails(returnItem.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(returnItem.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Xóa"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Return Details Modal */}
            {showDetailsModal && selectedReturn && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết đổi trả #{selectedReturn.id}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedReturn(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Order Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thông tin đơn hàng</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Mã đơn: {selectedReturn.orderCode || `#${selectedReturn.orderId}`}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedReturn.status)}`}>
                                        {selectedReturn.status === 'Pending' ? 'Chờ xử lý' :
                                         selectedReturn.status === 'Approved' ? 'Đã duyệt' :
                                         selectedReturn.status === 'Rejected' ? 'Từ chối' :
                                         selectedReturn.status === 'Processing' ? 'Đang xử lý' :
                                         selectedReturn.status === 'Completed' ? 'Hoàn thành' :
                                         'Đã hủy'}
                                    </span>
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
                                            {selectedReturn.returnType === 'Return' ? 'Trả hàng' : 
                                             selectedReturn.returnType === 'Exchange' ? 'Đổi hàng' : 
                                             'Trả nhà cung cấp'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Người yêu cầu</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedReturn.requestedBy === 'Customer' ? 'Khách hàng' : 
                                             selectedReturn.requestedBy === 'Staff' ? 'Nhân viên' : 
                                             'Kho hàng'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nơi trả hàng</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedReturn.returnLocation === 'Store' ? 'Tại cửa hàng' :
                                             selectedReturn.returnLocation === 'Online' ? 'Trực tuyến' :
                                             'Kho hàng'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tình trạng hàng</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedReturn.condition === 'New' ? 'Mới, nguyên vẹn' :
                                             selectedReturn.condition === 'Damaged' ? 'Hỏng' :
                                             selectedReturn.condition === 'Expired' ? 'Hết hạn' :
                                             selectedReturn.condition === 'WrongItem' ? 'Sai hàng' :
                                             'Lỗi sản phẩm'}
                                        </p>
                                    </div>
                                </div>

                                {/* Lý do đổi trả */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Lý do đổi trả
                                    </label>
                                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        {selectedReturn.reason}
                                    </p>
                                </div>

                                {/* Sản phẩm đổi trả */}
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

                                {/* Sản phẩm đổi (nếu là Exchange) */}
                                {selectedReturn.returnType === 'Exchange' && selectedReturn.exchangeItems && selectedReturn.exchangeItems.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Sản phẩm đổi
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedReturn.exchangeItems.map((item, index) => (
                                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Số lượng: {item.quantity} × {item.unitPrice.toLocaleString('vi-VN')} ₫
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {(item.quantity * item.unitPrice).toLocaleString('vi-VN')} ₫
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Thông tin hoàn tiền */}
                                {selectedReturn.refundAmount && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Thông tin hoàn tiền
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-700 dark:text-gray-300">Số tiền hoàn:</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                                    {selectedReturn.refundAmount.toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                            {selectedReturn.refundMethod && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-700 dark:text-gray-300">Phương thức:</span>
                                                    <span className="text-gray-900 dark:text-white">{selectedReturn.refundMethod}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Ghi chú nhân viên */}
                                {selectedReturn.staffNotes && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ghi chú nhân viên
                                        </label>
                                        <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                            {selectedReturn.staffNotes}
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {selectedReturn.status === 'Pending' && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            onClick={() => handleStatusChange(selectedReturn.id, 'Approved')}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white dark:text-white font-semibold shadow-md"
                                        >
                                            <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                                            Duyệt
                                        </Button>
                                        <Button
                                            onClick={() => handleStatusChange(selectedReturn.id, 'Rejected')}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white dark:text-white font-semibold shadow-md"
                                        >
                                            <XCircleIcon className="w-5 h-5 inline mr-2" />
                                            Từ chối
                                        </Button>
                                    </div>
                                )}

                                {selectedReturn.status === 'Approved' && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            onClick={() => handleStatusChange(selectedReturn.id, 'Processing')}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-semibold shadow-md"
                                        >
                                            <ClockIcon className="w-5 h-5 inline mr-2" />
                                            Bắt đầu xử lý
                                        </Button>
                                    </div>
                                )}

                                {selectedReturn.status === 'Processing' && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            onClick={() => handleStatusChange(selectedReturn.id, 'Completed')}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white dark:text-white font-semibold shadow-md"
                                        >
                                            <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                                            Hoàn thành
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

