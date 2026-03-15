import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyReviews, deleteReview } from '../../api/reviewApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { StarIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { getProductImage } from '../../utils/imageUtils';

export default function MyReviewsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem đánh giá của bạn');
            navigate('/');
        }
    }, [user, navigate]);

    // Fetch reviews
    useEffect(() => {
        if (user) {
            loadReviews();
        }
    }, [user]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const response = await getMyReviews();
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
        } catch (error) {
            console.error('Error deleting review:', error);
            const errorMessage = error.response?.data?.error || 'Không thể xóa đánh giá';
            toast.error(errorMessage);
        }
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
    const filteredReviews = reviews.filter(review => {
        // Filter by rating
        if (ratingFilter !== 'all' && review.rating !== parseInt(ratingFilter)) {
            return false;
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                (review.productName || '').toLowerCase().includes(query) ||
                (review.content || '').toLowerCase().includes(query)
            );
        }

        return true;
    });

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
                <h1 className="text-3xl font-heading font-bold text-textDark">Đánh giá của tôi</h1>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-card shadow-soft p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-textDark/50" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên sản phẩm, nội dung..."
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

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-card shadow-soft p-12 text-center">
                    <p className="text-gray-500 mb-4">Bạn chưa có đánh giá nào</p>
                    <Link to="/products">
                        <Button variant="primary">Khám phá sản phẩm</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-white rounded-card shadow-soft p-6 hover:shadow-soft-lg transition-shadow"
                        >
                            <div className="flex gap-4">
                                {/* Product Image */}
                                <Link to={`/products/${review.productId}`} className="flex-shrink-0">
                                    <img
                                        src={getProductImage({ id: review.productId })}
                                        alt={review.productName}
                                        className="w-24 h-24 object-cover rounded-lg"
                                        onError={(e) => {
                                            e.target.src = 'https://placehold.co/100x100/EAF1FF/6E85B7?text=Product';
                                        }}
                                    />
                                </Link>

                                {/* Review Content */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <Link
                                                to={`/products/${review.productId}`}
                                                className="text-lg font-heading font-bold text-textDark hover:text-primary transition-colors"
                                            >
                                                {review.productName || 'Sản phẩm không xác định'}
                                            </Link>
                                            <div className="flex items-center gap-1 mt-1">
                                                {renderStars(review.rating)}
                                                <span className="ml-2 text-sm text-gray-600">
                                                    {review.rating}/5
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa đánh giá"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {review.content && (
                                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                                            {review.content}
                                        </p>
                                    )}

                                    {review.media && review.media.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {review.media.map((media) => (
                                                <img
                                                    key={media.id}
                                                    src={media.filePath}
                                                    alt={media.fileName}
                                                    className="w-full h-20 object-cover rounded-lg"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

