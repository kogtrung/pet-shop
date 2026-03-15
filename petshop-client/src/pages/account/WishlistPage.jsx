import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchWishlist, removeFromWishlist } from '../../api/wishlistApi';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import ProductCard from '../../components/product/ProductCard';
import {
    HeartIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

export default function WishlistPage() {
    const { user } = useAuth();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để xem danh sách yêu thích');
            navigate('/');
            return;
        }
        loadWishlist();
    }, [user, navigate]);

    const loadWishlist = async () => {
        setLoading(true);
        try {
            const response = await fetchWishlist();
            setWishlist(response.data || []);
        } catch (error) {
            console.error('Error loading wishlist:', error);
            toast.error('Không thể tải danh sách yêu thích');
            setWishlist([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (productId) => {
        const loadingToast = toast.loading('Đang xóa...');
        try {
            await removeFromWishlist(productId);
            toast.success('Đã xóa khỏi danh sách yêu thích', { id: loadingToast });
            loadWishlist();
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            toast.error('Không thể xóa sản phẩm', { id: loadingToast });
        }
    };

    const handleAddToCart = (product) => {
        try {
            addToCart(product, 1);
            toast.success('Đã thêm vào giỏ hàng');
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Không thể thêm vào giỏ hàng');
        }
    };

    const filteredWishlist = wishlist.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return item.product?.name?.toLowerCase().includes(query);
    });

    // Custom toggle wishlist function for the ProductCard components
    const toggleWishlist = async (productId) => {
        await handleRemove(productId);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-heading font-bold text-textDark mb-2 flex items-center">
                        <HeartSolidIcon className="w-8 h-8 mr-3 text-primary" />
                        Danh sách yêu thích
                    </h1>
                    <p className="text-textDark/70">
                        Quản lý các sản phẩm bạn yêu thích
                    </p>
                </div>

                <div className="bg-softGray rounded-card shadow-soft p-4 mb-6">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textDark/50" strokeWidth={2} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-card shadow-soft p-4 animate-pulse">
                                <div className="h-48 bg-softGray rounded-image mb-4"></div>
                                <div className="h-4 bg-softGray rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-softGray rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredWishlist.length === 0 ? (
                    <div className="bg-white rounded-card shadow-soft p-12 text-center">
                        <HeartIcon className="w-20 h-20 text-textDark/30 mx-auto mb-4" strokeWidth={2} />
                        <h3 className="text-xl font-heading font-semibold text-textDark mb-2">
                            {searchQuery ? 'Không tìm thấy sản phẩm' : 'Danh sách yêu thích trống'}
                        </h3>
                        <p className="text-textDark/70 mb-6">
                            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Thêm sản phẩm yêu thích để xem tại đây'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => navigate('/products')}
                                className="px-6 py-3 bg-primary text-white rounded-button hover:bg-primary-600 transition-colors font-heading font-semibold shadow-soft"
                            >
                                Khám phá sản phẩm
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-sm text-textDark/70">
                            {filteredWishlist.length} sản phẩm
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredWishlist.map((item) => (
                                <ProductCard
                                    key={item.id}
                                    product={item.product}
                                    onAddToCart={handleAddToCart}
                                    onToggleWishlist={toggleWishlist}
                                    isInWishlist={true}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}