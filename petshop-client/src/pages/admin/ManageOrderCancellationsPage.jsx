import React, { useEffect, useState, useMemo } from 'react';
import { getAllCancellationRequests, getCancellationRequestById, processCancellationRequest, deleteCancellationRequest } from '../../api/orderCancellationApi';
import { fetchOrderById } from '../../api/orderApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MagnifyingGlassIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ManageOrderCancellationsPage() {
    const [cancellations, setCancellations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCancellation, setSelectedCancellation] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [processForm, setProcessForm] = useState({
        status: 'Approved',
        adminNote: ''
    });

    useEffect(() => {
        loadCancellations();
    }, [statusFilter]);

    const loadCancellations = async () => {
        setLoading(true);
        try {
            const status = statusFilter === 'all' ? null : statusFilter;
            const response = await getAllCancellationRequests(status);
            // Sort by ID descending (newest first)
            const sortedCancellations = (response.data || []).sort((a, b) => b.id - a.id);
            setCancellations(sortedCancellations);
        } catch (error) {
            console.error('Error loading cancellations:', error);
            toast.error('Không thể tải danh sách yêu cầu hủy đơn');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cancellationId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu hủy đơn này?')) {
            return;
        }

        try {
            await deleteCancellationRequest(cancellationId);
            toast.success('Xóa yêu cầu hủy đơn thành công');
            await loadCancellations();
            if (selectedCancellation && selectedCancellation.id === cancellationId) {
                setShowDetailsModal(false);
                setSelectedCancellation(null);
            }
        } catch (error) {
            console.error('Error deleting cancellation:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xóa yêu cầu hủy đơn';
            toast.error(errorMessage);
        }
    };

    const viewCancellationDetails = async (cancellationId) => {
        try {
            const response = await getCancellationRequestById(cancellationId);
            const cancellationData = response.data;
            
            // Load order details if available
            if (cancellationData.orderId) {
                try {
                    const orderResponse = await fetchOrderById(cancellationData.orderId);
                    cancellationData.order = orderResponse.data;
                } catch (error) {
                    console.error('Error loading order details:', error);
                }
            }
            
            setSelectedCancellation(cancellationData);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching cancellation details:', error);
            toast.error('Không thể tải chi tiết yêu cầu hủy đơn');
        }
    };

    const handleProcess = async (cancellationId) => {
        if (!processForm.status) {
            toast.error('Vui lòng chọn trạng thái xử lý');
            return;
        }

        setProcessingId(cancellationId);
        try {
            await processCancellationRequest(cancellationId, {
                status: processForm.status,
                adminNote: processForm.adminNote || null
            });
            toast.success(`Đã ${processForm.status === 'Approved' ? 'duyệt' : 'từ chối'} yêu cầu hủy đơn`);
            await loadCancellations();
            setShowDetailsModal(false);
            setSelectedCancellation(null);
            setProcessForm({ status: 'Approved', adminNote: '' });
        } catch (error) {
            console.error('Error processing cancellation:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xử lý yêu cầu hủy đơn';
            toast.error(errorMessage);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'Approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const getStatusLabel = (status) => {
        const statusMap = {
            'Pending': 'Chờ xử lý',
            'Approved': 'Đã duyệt',
            'Rejected': 'Đã từ chối'
        };
        return statusMap[status] || status;
    };

    const filteredCancellations = useMemo(() => {
        let filtered = cancellations;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.orderCode?.toLowerCase().includes(query) ||
                c.customerName?.toLowerCase().includes(query) ||
                c.id.toString().includes(query)
            );
        }

        return filtered;
    }, [cancellations, searchQuery]);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Quản lý yêu cầu hủy đơn hàng
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Xem và xử lý các yêu cầu hủy đơn hàng từ khách hàng
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã đơn, tên khách hàng..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="md:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Pending">Chờ xử lý</option>
                            <option value="Approved">Đã duyệt</option>
                            <option value="Rejected">Đã từ chối</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Đang tải...</p>
                    </div>
                ) : filteredCancellations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Không có yêu cầu hủy đơn nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Mã yêu cầu
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Mã đơn hàng
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Khách hàng
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Lý do
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Ngày yêu cầu
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Hành động
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCancellations.map((cancellation) => (
                                    <tr key={cancellation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            #{cancellation.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {cancellation.orderCode || `Đơn #${cancellation.orderId}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {cancellation.customerName || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                            {cancellation.reason || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(cancellation.status)}`}>
                                                {getStatusLabel(cancellation.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatDate(cancellation.requestedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => viewCancellationDetails(cancellation.id)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                {cancellation.status === 'Pending' && (
                                                    <button
                                                        onClick={() => handleDelete(cancellation.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedCancellation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết yêu cầu hủy đơn #{selectedCancellation.id}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
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
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Trạng thái:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{selectedCancellation.order.status}</span>
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
                                    <p className="text-sm">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Trạng thái:</span>{' '}
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedCancellation.status)}`}>
                                            {getStatusLabel(selectedCancellation.status)}
                                        </span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Ngày yêu cầu:</span>{' '}
                                        <span className="text-gray-900 dark:text-white">{formatDate(selectedCancellation.requestedAt)}</span>
                                    </p>
                                    {selectedCancellation.processedAt && (
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Ngày xử lý:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{formatDate(selectedCancellation.processedAt)}</span>
                                        </p>
                                    )}
                                    {selectedCancellation.processorName && (
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Người xử lý:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{selectedCancellation.processorName}</span>
                                        </p>
                                    )}
                                    {selectedCancellation.adminNote && (
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Ghi chú:</span>{' '}
                                            <span className="text-gray-900 dark:text-white">{selectedCancellation.adminNote}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Process Form (only for Pending status) */}
                            {selectedCancellation.status === 'Pending' && (
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
                                                onClick={() => handleProcess(selectedCancellation.id)}
                                                disabled={processingId === selectedCancellation.id}
                                                className="flex-1"
                                            >
                                                {processingId === selectedCancellation.id ? 'Đang xử lý...' : 'Xử lý yêu cầu'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

