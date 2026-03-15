import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchProductById, getProducts } from '../api/productApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import ProductCard from '../components/product/ProductCard';
import { ShoppingCartIcon, HeartIcon, TruckIcon, ArrowPathIcon, ShieldCheckIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { addToWishlist, removeFromWishlist, getWishlist } from '../api/wishlistApi';
import { getProductImages } from '../utils/imageUtils';
import { getPages } from '../api/pageApi';
import { getProductReviews, createReview } from '../api/reviewApi';

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addItem } = useCart();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [inWishlist, setInWishlist] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [wishlist, setWishlist] = useState(new Set());
    const [blogPosts, setBlogPosts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        content: ''
    });
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);

    useEffect(() => {
        loadProduct();
        if (user) {
            loadWishlist();
        }
        loadBlogPosts();
        loadReviews();
    }, [id, user]);

    const loadWishlist = async () => {
        try {
            const response = await getWishlist();
            const wishlistIds = new Set(response.data.map(item => item.productId));
            setWishlist(wishlistIds);
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    };

    const loadProduct = async () => {
        try {
            setLoading(true);
            const response = await fetchProductById(id);
            setProduct(response.data);
            
            // Load related products
            if (response.data) {
                loadRelatedProducts(response.data);
            }
        } catch (err) {
            setError('Không thể tải thông tin sản phẩm');
            console.error('Error loading product:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRelatedProducts = async (currentProduct) => {
        try {
            const allProducts = await getProducts();
            // Filter related products by same category or brand, exclude current product
            const related = allProducts.data
                .filter(p => {
                    if (p.id === currentProduct.id || p.isService) return false;
                    // Check if same brand
                    if (p.brandId === currentProduct.brandId) return true;
                    // Check if same category (using categoryIds array)
                    if (currentProduct.categoryIds && p.categoryIds) {
                        return currentProduct.categoryIds.some(catId => p.categoryIds.includes(catId));
                    }
                    return false;
                })
                .slice(0, 6);
            setRelatedProducts(related);
        } catch (err) {
            console.error('Error loading related products:', err);
        }
    };

    const loadBlogPosts = async () => {
        try {
            const response = await getPages({ isPublished: true });
            const posts = response.data
                .filter(page => page.isPublished)
                .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                })
                .slice(0, 3);
            setBlogPosts(posts);
        } catch (err) {
            console.error('Error loading blog posts:', err);
        }
    };

    const loadReviews = async () => {
        if (!id) return;
        setReviewLoading(true);
        try {
            const response = await getProductReviews(id);
            const reviewsData = response.data || [];
            setReviews(reviewsData);
            
            // Calculate average rating and total reviews
            if (reviewsData.length > 0) {
                const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
                setAverageRating(sum / reviewsData.length);
                setTotalReviews(reviewsData.length);
            } else {
                setAverageRating(0);
                setTotalReviews(0);
            }
        } catch (err) {
            console.error('Error loading reviews:', err);
        } finally {
            setReviewLoading(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vui lòng đăng nhập để đánh giá sản phẩm');
            navigate('/');
            return;
        }

        try {
            await createReview({
                productId: parseInt(id),
                rating: reviewForm.rating,
                content: reviewForm.content
            });
            toast.success('Đánh giá của bạn đã được gửi!');
            setReviewForm({ rating: 5, content: '' });
            setShowReviewForm(false);
            await loadReviews();
        } catch (err) {
            console.error('Error submitting review:', err);
            const errorCode = err.response?.data?.code;
            let errorMsg = err.response?.data?.error || 'Không thể gửi đánh giá';
            
            if (errorCode === 'NOT_PURCHASED') {
                errorMsg = 'Bạn chỉ có thể đánh giá sản phẩm đã mua. Vui lòng mua sản phẩm trước khi đánh giá.';
            } else if (errorCode === 'DUPLICATE_REVIEW') {
                errorMsg = 'Bạn đã đánh giá sản phẩm này rồi.';
            }
            
            toast.error(errorMsg);
        }
    };

    const handleAddToCart = (product) => {
        addItem(product);
        toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    };

    const toggleWishlist = async (productId) => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
            navigate('/');
            return;
        }

        const wasInWishlist = wishlist.has(productId);
        
        try {
            if (wasInWishlist) {
                await removeFromWishlist(productId);
                setWishlist(prev => {
                    const newWishlist = new Set(prev);
                    newWishlist.delete(productId);
                    return newWishlist;
                });
                toast.success('Đã xóa khỏi danh sách yêu thích');
            } else {
                await addToWishlist({ productId });
                setWishlist(prev => new Set(prev).add(productId));
                toast.success('Đã thêm vào danh sách yêu thích');
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            toast.error('Có lỗi xảy ra, vui lòng thử lại');
        }
    };

    const handleAddToCartProduct = async () => {
        try {
            if (product.isService) {
                // For services, navigate to booking page
                navigate('/service-booking', { state: { service: product } });
            } else {
                // Create product with correct price (salePrice if available, otherwise price)
                const productToAdd = {
                    ...product,
                    price: displayPrice // Use displayPrice (salePrice if discounted, otherwise price)
                };
                await addItem(productToAdd, quantity);
                toast.success('Đã thêm vào giỏ hàng!');
            }
        } catch (err) {
            toast.error('Không thể thêm vào giỏ hàng');
            console.error('Error adding to cart:', err);
        }
    };

    const handleBuyNow = async () => {
        try {
            if (product.isService) {
                // For services, navigate to booking page
                navigate('/service-booking', { state: { service: product } });
            } else {
                // Create product with correct price (salePrice if available, otherwise price)
                const productToAdd = {
                    ...product,
                    price: displayPrice // Use displayPrice (salePrice if discounted, otherwise price)
                };
                await addItem(productToAdd, quantity);
                navigate('/checkout');
            }
        } catch (err) {
            toast.error('Không thể mua ngay');
            console.error('Error buying now:', err);
        }
    };

    const handleToggleWishlist = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
            navigate('/');
            return;
        }

        try {
            if (inWishlist) {
                await removeFromWishlist(product.id);
                setInWishlist(false);
                toast.success('Đã xóa khỏi danh sách yêu thích');
            } else {
                await addToWishlist({ productId: product.id });
                setInWishlist(true);
                toast.success('Đã thêm vào danh sách yêu thích');
            }
        } catch (err) {
            toast.error('Có lỗi xảy ra');
            console.error('Error toggling wishlist:', err);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="animate-pulse">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        <div className="space-y-4">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Không tìm thấy sản phẩm
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {error || 'Sản phẩm không tồn tại'}
                </p>
                <Button onClick={() => navigate('/products')}>Quay lại danh sách sản phẩm</Button>
            </div>
        );
    }

    const images = getProductImages(product);
    
    // Calculate display price: use salePrice if available, otherwise price
    const displayPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    const originalPrice = product.salePrice && product.salePrice > 0 ? product.price : null;
    const hasDiscount = product.salePrice && product.salePrice > 0 && product.salePrice < product.price;

    return (
        <div className="w-full py-6 bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12 items-start">
                {/* Left Column: Images */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Images with vertical thumbnail list on the left */}
                    <div className="flex gap-3 lg:gap-5">
                        {images.length > 0 && (
                            <div className="flex flex-col gap-2 w-10 sm:w-14">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                        className={`aspect-square rounded-md overflow-hidden border transition-all ${
                                        selectedImage === idx 
                                                ? 'border-gray-900'
                                                : 'border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                    <img 
                                        src={img} 
                                        alt={`${product.name} ${idx + 1}`} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                                e.target.src = `https://placehold.co/100x100/E5E7EB/111827?text=${encodeURIComponent(product.name || 'Product')}`;
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                        <div className="flex-1">
                            <div className="aspect-square bg-softGray relative">
                                <img
                                    src={images[selectedImage] || images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = `https://placehold.co/500x500/E5E7EB/111827?text=${encodeURIComponent(product.name || 'Product')}`;
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Product Info + Description */}
                <div className="lg:col-span-3">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h1 className="text-2xl font-heading font-normal text-textDark mb-2">
                                {product.name || 'Sản phẩm không xác định'}
                            </h1>
                                    <p className="text-sm font-ui text-textDark/70">
                                Thương hiệu: <span className="font-medium">{product.brandName || 'Không xác định'}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleToggleWishlist}
                                    className="p-2 rounded-full hover:bg-softGray transition-colors ml-2"
                        >
                            {inWishlist ? (
                                        <HeartOutlineIcon className="h-5 w-5 text-primary fill-primary" />
                            ) : (
                                        <HeartOutlineIcon className="h-5 w-5 text-textDark/50" />
                            )}
                        </button>
                    </div>

                    {/* Price */}
                            <div className="mb-4">
                        <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-3xl font-heading font-bold text-black">
                                        {(displayPrice || 0).toLocaleString('vi-VN')} ₫
                            </span>
                                    {hasDiscount && originalPrice && (
                                        <span className="text-lg font-ui text-black/50 line-through">
                                            {(originalPrice || 0).toLocaleString('vi-VN')} ₫
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Service-specific content */}
                    {product.isService ? (
                        <div className="mb-8">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
                                    Thông tin dịch vụ
                                </h3>
                                <p className="text-blue-700 dark:text-blue-300 mb-4">
                                    Đây là một dịch vụ chăm sóc thú cưng. Vui lòng đặt lịch để sử dụng dịch vụ này.
                                </p>
                                
                                <Button 
                                    size="lg" 
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
                                    onClick={handleAddToCart}
                                >
                                    Đặt lịch ngay
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Stock Status */}
                                    <div className="mb-4">
                                        <p className="text-sm font-ui">
                                    Tình trạng: {' '}
                                    <span className={`font-medium ${(product.quantity || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(product.quantity || 0) > 0 ? 'Còn hàng' : 'Hết hàng'}
                                    </span>
                                </p>
                            </div>

                            {/* Quantity Selector */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-ui font-medium mb-1 text-textDark">Số lượng</label>
                                        <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-7 h-7 border border-gray-400 hover:bg-gray-100 transition-colors text-sm"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-14 text-center border border-gray-300 bg-white text-gray-900 px-2 py-1 text-xs focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                                    />
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-7 h-7 border border-gray-400 hover:bg-gray-100 transition-colors text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mb-6">
                                {product.isService ? (
                                    <button 
                                        onClick={handleAddToCart}
                                        className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCartIcon className="h-4 w-4" />
                                        Đặt lịch
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handleAddToCartProduct}
                                            className="w-full py-2.5 px-4 border border-black bg-black text-white text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ease-out hover:bg-white hover:text-black"
                                        >
                                            <ShoppingCartIcon className="h-4 w-4" />
                                            Thêm vào giỏ
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* Description inside info column */}
                    <div className="pt-4 border-t border-gray-200 mt-4">
                        <h3 className="text-base font-heading font-semibold mb-2 text-textDark">Mô tả sản phẩm</h3>
                        <p className="text-sm font-ui text-textDark/80 leading-relaxed whitespace-pre-line">
                            {product.description || 'Sản phẩm chất lượng cao cho thú cưng của bạn.'}
                        </p>
                </div>

                    {/* Features removed per new design */}
                </div>
            </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="w-full px-4 sm:px-6 lg:px-8 mt-12">
                    <h2 className="text-xl font-normal uppercase text-center text-black mb-6">Sản phẩm liên quan</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {relatedProducts.map((relatedProduct) => {
                            const relatedDisplayPrice = relatedProduct.salePrice && relatedProduct.salePrice > 0 ? relatedProduct.salePrice : relatedProduct.price;
                            const relatedOriginalPrice = relatedProduct.salePrice && relatedProduct.salePrice > 0 ? relatedProduct.price : null;
                            const relatedHasDiscount = relatedProduct.salePrice && relatedProduct.salePrice > 0 && relatedProduct.salePrice < relatedProduct.price;
                            const relatedImages = getProductImages(relatedProduct);
                            
                            return (
                                <Link 
                                    key={relatedProduct.id} 
                                    to={`/products/${relatedProduct.id}`}
                                    className="relative"
                                >
                                    <div className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-200 dark:border-gray-700">
                                        {/* Image */}
                                        <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                                            <img 
                                                src={relatedImages[0]} 
                                                alt={relatedProduct.name} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.src = `https://placehold.co/150x150/EAF1FF/6E85B7?text=${encodeURIComponent(relatedProduct.name || 'Product')}`;
                                                }}
                                            />
                                        </div>
                                        {/* Product Info */}
                                        <div className="p-3 relative">
                                            <h3 
                                                className="text-xs font-normal text-black line-clamp-2 mb-1 leading-snug"
                                                title={relatedProduct.name}
                                            >
                                                {relatedProduct.name}
                                            </h3>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-black">
                                                    {(relatedDisplayPrice || 0).toLocaleString('vi-VN')} ₫
                                                </span>
                                                {relatedHasDiscount && relatedOriginalPrice && (
                                                    <span className="text-xs text-black/50 line-through">
                                                        {(relatedOriginalPrice || 0).toLocaleString('vi-VN')} ₫
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <div className="w-full px-4 sm:px-6 lg:px-8 mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-heading font-normal text-textDark mb-2">Đánh giá sản phẩm</h2>
                        {totalReviews > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <StarSolidIcon
                                            key={star}
                                            className={`h-5 w-5 ${
                                                star <= Math.round(averageRating)
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-textDark/70">
                                    {averageRating.toFixed(1)} ({totalReviews} đánh giá)
                                </span>
                            </div>
                        )}
                    </div>
                    {user && (
                        <button
                            type="button"
                            onClick={() => setShowReviewForm(!showReviewForm)}
                            className="ml-4 px-6 py-2 border border-black bg-black text-white text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out hover:bg-white hover:text-black"
                        >
                            {showReviewForm ? 'Hủy' : 'Viết đánh giá'}
                        </button>
                    )}
                </div>

                {/* Review Form */}
                {showReviewForm && user && (
                    <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-lg font-semibold text-textDark mb-4">Viết đánh giá của bạn</h3>
                        <form onSubmit={handleSubmitReview}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-textDark mb-2">
                                    Đánh giá *
                                </label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                            className="focus:outline-none"
                                        >
                                            <StarSolidIcon
                                                className={`h-8 w-8 ${
                                                    star <= reviewForm.rating
                                                        ? 'text-yellow-400'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-textDark mb-2">
                                    Nội dung đánh giá
                                </label>
                                <textarea
                                    value={reviewForm.content}
                                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-textDark focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                                />
                                <p className="text-xs text-textDark/50 mt-1">
                                    {reviewForm.content.length}/1000 ký tự
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" variant="primary">
                                    Gửi đánh giá
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowReviewForm(false);
                                        setReviewForm({ rating: 5, content: '' });
                                    }}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Reviews List */}
                {reviewLoading ? (
                    <div className="text-center py-8">
                        <p className="text-textDark/70">Đang tải đánh giá...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-textDark/70">Chưa có đánh giá nào cho sản phẩm này.</p>
                        {!user && (
                            <p className="text-sm text-textDark/50 mt-2">
                                <Link to="/login" className="text-primary hover:underline">
                                    Đăng nhập
                                </Link> để viết đánh giá đầu tiên
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="text-primary font-semibold">
                                                {review.userName?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-textDark">
                                                {review.userName || 'Người dùng'}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <StarSolidIcon
                                                            key={star}
                                                            className={`h-4 w-4 ${
                                                                star <= review.rating
                                                                    ? 'text-yellow-400'
                                                                    : 'text-gray-300'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-textDark/50">
                                                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {review.content && (
                                    <p className="text-textDark/80 mt-3 whitespace-pre-wrap">
                                        {review.content}
                                    </p>
                                )}
                                {review.media && review.media.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {review.media.map((media) => (
                                            <div key={media.id} className="relative">
                                                {media.contentType?.startsWith('image/') ? (
                                                    <img
                                                        src={`${import.meta.env.VITE_API_BASE_URL || ''}${media.filePath}`}
                                                        alt={media.fileName}
                                                        className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || ''}${media.filePath}`, '_blank')}
                                                    />
                                                ) : (
                                                    <video
                                                        src={`${import.meta.env.VITE_API_BASE_URL || ''}${media.filePath}`}
                                                        className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                        controls
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

