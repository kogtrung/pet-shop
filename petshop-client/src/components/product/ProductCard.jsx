import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { getProductImage, getProductImages, getImageUrl } from '../../utils/imageUtils';

export default function ProductCard({ product, onAddToCart, onToggleWishlist, isInWishlist = false }) {
    const navigate = useNavigate();
    const { id, name, price, salePrice, saleStartDate, saleEndDate, brandName, quantity, imageUrl, images, isService, averageRating, reviewCount } = product;
    const [isAdding, setIsAdding] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Price logic: use salePrice if available, otherwise price
    const displayPrice = salePrice && salePrice > 0 ? salePrice : price;
    const originalPrice = salePrice && salePrice > 0 ? price : null;
    const hasDiscount = salePrice && salePrice > 0 && salePrice < price;

    // Get all product images using utility function
    const allImages = getProductImages(product);
    const hasMultipleImages = allImages.length > 1;

    // Auto carousel for homepage (auto change image every 3 seconds)
    useEffect(() => {
        if (!hasMultipleImages) return;
        
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
        }, 3000);
        
        return () => clearInterval(interval);
    }, [hasMultipleImages, allImages.length]);

    const handleAddToCart = async () => {
        setIsAdding(true);
        try {
            // If it's a service, navigate to booking page instead of adding to cart directly
            if (isService) {
                navigate('/service-booking', { state: { service: product } });
            } else {
                await onAddToCart?.(product);
            }
        } finally {
            setTimeout(() => setIsAdding(false), 500);
        }
    };

    // Handle "Mua ngay" (Buy now) action
    const handleBuyNow = async () => {
        setIsAdding(true);
        try {
            // If it's a service, navigate to booking page
            if (isService) {
                navigate('/service-booking', { state: { service: product } });
            } else {
                // For regular products, add to cart and go to checkout
                await onAddToCart?.(product, 1);
                navigate('/checkout');
            }
        } finally {
            setTimeout(() => setIsAdding(false), 500);
        }
    };

    const isLowStock = quantity && quantity < 10;
    const isOutOfStock = quantity === 0;

    return (
        <>
            <motion.div 
                key={id}
                className="group bg-white shadow-soft-lg overflow-hidden transition-all duration-300 hover:shadow-xl h-full flex flex-col"
                variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1 }
                }}
            >
                <Link to={`/products/${id}`} className="block relative overflow-hidden">
                    {/* Product Image - Square, no inner frame */}
                    <div className="relative aspect-square bg-white overflow-hidden">
                        <img 
                            src={allImages[currentImageIndex] || allImages[0]} 
                            alt={name} 
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                            onError={(e) => {
                                e.target.src = `https://placehold.co/400x400/E5E7EB/111827?text=${encodeURIComponent(name || 'Product')}`;
                            }}
                        />
                        
                        {/* Image Indicator Dots */}
                        {hasMultipleImages && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {allImages.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${
                                            idx === currentImageIndex 
                                                ? 'w-4 bg-primary' 
                                                : 'w-1.5 bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Discount Badge - Red for Petivo */}
                        {hasDiscount && originalPrice && (
                            <div className="absolute top-3 left-3 z-10">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-heading font-bold bg-red-500 text-white shadow-soft">
                                    -{Math.round((((originalPrice || 0) - (displayPrice || 0)) / (originalPrice || 1)) * 100)}% OFF
                                </span>
                            </div>
                        )}

                        {/* Service Badge */}
                        {isService && (
                            <div className="absolute top-3 left-3">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-heading font-bold bg-secondary text-white shadow-soft">
                                    Dịch vụ
                                </span>
                            </div>
                        )}

                        {/* Stock Status Badge */}
                        {isOutOfStock ? (
                            <div className="absolute top-3 right-3">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-heading font-bold bg-textDark/70 text-white backdrop-blur-sm">
                                    Hết hàng
                                </span>
                            </div>
                        ) : isLowStock ? (
                            <div className="absolute top-3 right-3">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-heading font-bold bg-yellow-400 text-textDark shadow-soft">
                                    Sắp hết
                                </span>
                            </div>
                        ) : null}
                        
                        {/* Favorite Button */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleWishlist?.(id);
                            }}
                            className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-soft opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 z-10"
                        >
                            {isInWishlist ? (
                                <HeartSolidIcon className="h-5 w-5 text-primary" />
                            ) : (
                                <HeartIcon className="h-5 w-5 text-textDark" strokeWidth={2} />
                            )}
                        </button>

                        {/* Add to Cart Button - Show on hover, below image */}
                        {!isService && !isOutOfStock && (
                            <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleAddToCart();
                                    }}
                                    disabled={isAdding}
                                    className="px-4 py-1.5 border border-black bg-black/80 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:bg-white hover:text-black"
                                >
                                    {isAdding ? (
                                        <span>Đang thêm...</span>
                                    ) : (
                                        <>
                                            <ShoppingCartIcon className="h-4 w-4" />
                                            Thêm vào giỏ hàng
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Product Info - Compact layout */}
                <div className="p-3 space-y-1.5 flex-1 flex flex-col">
                    {/* Brand */}
                    <div className="flex items-center">
                        <span className="text-xs font-heading font-bold text-primary uppercase tracking-wide">
                            {brandName || 'Thương hiệu'}
                        </span>
                    </div>
                    
                    {/* Product Name */}
                    <Link to={`/products/${id}`} className="block">
                        <h3 className="text-sm font-heading font-bold text-textDark line-clamp-2 leading-tight">
                            {name || 'Sản phẩm không xác định'}
                        </h3>
                    </Link>
                    
                    {/* Rating and Price - Same row */}
                    <div className="flex items-center justify-between gap-2">
                        {/* Rating */}
                        <div className="flex items-center gap-1.5">
                            {averageRating !== null && averageRating !== undefined ? (
                                <>
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`w-3.5 h-3.5 ${
                                                    i < Math.round(averageRating)
                                                        ? 'text-yellow-400 fill-current'
                                                        : 'text-gray-300'
                                                }`}
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="text-xs text-textDark/70">
                                        {averageRating.toFixed(1)} ({reviewCount || 0})
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-textDark/50">
                                    Chưa có đánh giá
                                </span>
                            )}
                        </div>
                        
                        {/* Price - Smaller font */}
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-ui font-normal text-black whitespace-nowrap">
                                {(displayPrice || 0).toLocaleString('vi-VN')} ₫
                            </span>
                            {hasDiscount && originalPrice && (
                                <span className="text-xs font-ui font-normal text-black/50 line-through whitespace-nowrap">
                                    {(originalPrice || 0).toLocaleString('vi-VN')} ₫
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}