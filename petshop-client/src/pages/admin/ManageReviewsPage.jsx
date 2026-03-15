import React, { useEffect, useState, useMemo } from 'react';
import { getAllReviews, deleteReview } from '../../api/reviewApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { EyeIcon, TrashIcon, StarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

export default function ManageReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [ratingFilter, setRatingFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const response = await getAllReviews();
            // Sort by ID descending (newest first)
            const sortedReviews = (response.data || []).sort((a, b) => b.id - a.id);
            setReviews(sortedReviews);
        } catch (error) {
            console.error('Error loading reviews:', error);
            toast.error('Không thể tải danh sách đánh giá');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
            return;
        }

        try {
            await deleteReview(reviewId);
            toast.success('Xóa đánh giá thành công');
            await loadReviews();
            if (selectedReview && selectedReview.id === reviewId) {
                setShowDetailsModal(false);
                setSelectedReview(null);
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xóa đánh giá';
            toast.error(errorMessage);
        }
    };

    const viewReviewDetails = (review) => {
        setSelectedReview(review);
        setShowDetailsModal(true);
    };

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <StarSolidIcon
                key={i}
                className={`w-5 h-5 ${
                    i < rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
            />
        ));
    };

    // Filter reviews
    const filteredReviews = useMemo(() => {
        let filtered = reviews;

        // Filter by rating
        if (ratingFilter !== 'all') {
            filtered = filtered.filter(r => r.rating === parseInt(ratingFilter));
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                r.id.toString().includes(query) ||
                (r.productName || '').toLowerCase().includes(query) ||
                (r.userName || '').toLowerCase().includes(query) ||
                (r.content || '').toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [reviews, ratingFilter, searchQuery]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-heading font-bold text-textDark">Quản lý đánh giá</h1>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-card shadow-soft p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-textDark/50" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo sản phẩm, người dùng, nội dung..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-softGray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-softGray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">Tất cả đánh giá</option>
                            <option value="5">5 sao</option>
                            <option value="4">4 sao</option>
                            <option value="3">3 sao</option>
                            <option value="2">2 sao</option>
                            <option value="1">1 sao</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reviews Table */}
            <div className="bg-white rounded-card shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sản phẩm
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Người đánh giá
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Đánh giá
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nội dung
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReviews.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                        Không có đánh giá nào
                                    </td>
                                </tr>
                            ) : (
                                filteredReviews.map((review) => (
                                    <tr key={review.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{review.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {review.productName || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {review.userName || review.userEmail || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {renderStars(review.rating)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {review.content || 'Không có nội dung'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => viewReviewDetails(review)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(review.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-heading font-bold text-textDark">
                                    Chi tiết đánh giá #{selectedReview.id}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedReview(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Sản phẩm</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedReview.productName || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700">Người đánh giá</label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {selectedReview.userName || selectedReview.userEmail || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700">Đánh giá</label>
                                    <div className="mt-1 flex items-center gap-1">
                                        {renderStars(selectedReview.rating)}
                                        <span className="ml-2 text-sm text-gray-600">
                                            {selectedReview.rating}/5
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700">Nội dung</label>
                                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                                        {selectedReview.content || 'Không có nội dung'}
                                    </p>
                                </div>

                                {selectedReview.media && selectedReview.media.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Hình ảnh/Video</label>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {selectedReview.media.map((media) => (
                                                <img
                                                    key={media.id}
                                                    src={media.filePath}
                                                    alt={media.fileName}
                                                    className="w-full h-24 object-cover rounded-lg"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {new Date(selectedReview.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedReview(null);
                                    }}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleDelete(selectedReview.id)}
                                >
                                    Xóa đánh giá
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

