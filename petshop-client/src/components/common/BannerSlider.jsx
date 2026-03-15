import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const defaultSlides = [
    {
        image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=500&fit=crop',
        title: 'Khuyến mãi lớn - Giảm đến 50%',
        caption: 'Mua sắm ngay hôm nay và nhận ưu đãi hấp dẫn cho thú cưng của bạn!',
        link: '/products?sale=true',
        buttonText: 'Mua ngay'
    },
    {
        image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=1200&h=500&fit=crop',
        title: 'Sản phẩm mới về',
        caption: 'Khám phá bộ sưu tập sản phẩm mới nhất cho thú cưng',
        link: '/products?sort=newest',
        buttonText: 'Xem ngay'
    },
    {
        image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&h=500&fit=crop',
        title: 'Dịch vụ chăm sóc thú cưng',
        caption: 'Tắm rửa, cắt tỉa, khám sức khỏe - Đầy đủ dịch vụ cho bé cưng',
        link: '/services',
        buttonText: 'Đặt lịch ngay'
    },
    {
        image: 'https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=1200&h=500&fit=crop',
        title: 'Miễn phí vận chuyển',
        caption: 'Đơn hàng từ 1.000.000đ - Giao hàng toàn quốc',
        link: '/products',
        buttonText: 'Mua sắm ngay'
    }
];

export default function BannerSlider({ slides, intervalMs = 5000 }) {
    const bannerSlides = slides && slides.length > 0 ? slides : defaultSlides;
    const [index, setIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [nextIndex, setNextIndex] = useState(null);

    // Preload images
    useEffect(() => {
        bannerSlides.forEach((slide) => {
            const img = new Image();
            img.src = slide.image;
        });
    }, [bannerSlides]);

    useEffect(() => {
        if (bannerSlides.length <= 1) return;
        const id = setInterval(() => {
            const next = (index + 1) % bannerSlides.length;
            setNextIndex(next);
            setIsTransitioning(true);
            requestAnimationFrame(() => {
                setTimeout(() => {
                    setIndex(next);
                    setIsTransitioning(false);
                    setNextIndex(null);
                }, 600);
            });
        }, intervalMs);
        return () => clearInterval(id);
    }, [bannerSlides, intervalMs, index]);

    const handleSlideChange = (newIndex) => {
        if (isTransitioning || newIndex === index) return;
        setNextIndex(newIndex);
        setIsTransitioning(true);
        requestAnimationFrame(() => {
            setTimeout(() => {
                setIndex(newIndex);
                setIsTransitioning(false);
                setNextIndex(null);
            }, 600);
        });
    };

    return (
        <div className="relative overflow-hidden bg-gray-900 w-full">
            <div className="relative h-[320px] md:h-[380px] lg:h-[420px]">
                {bannerSlides.map((slide, i) => {
                    const isActive = i === index;
                    const isNext = i === nextIndex;
                    const isVisible = isActive || isNext;
                    
                    return (
                    <div
                        key={i}
                            className={`absolute inset-0 transition-all duration-700 ease-out ${
                                isActive ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'
                        }`}
                            aria-hidden={!isActive}
                            style={{
                                willChange: isVisible ? 'opacity' : 'auto'
                            }}
                    >
                        <div className="relative w-full h-full">
                                {/* Background Image with Parallax Effect */}
                            <img 
                                src={slide.image} 
                                alt={slide.title || `banner-${i}`} 
                                    className={`w-full h-full object-cover transition-transform duration-[2000ms] ease-out ${
                                        isActive ? 'scale-100' : 'scale-110'
                                    }`}
                                    loading={i === 0 || isNext ? 'eager' : 'lazy'}
                                    style={{
                                        willChange: isVisible ? 'transform' : 'auto'
                                    }}
                            />
                            
                            {/* Enhanced Overlay with Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
                            
                            {/* Content with Animation */}
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full px-4 md:px-6 lg:px-8">
                                    <div className={`max-w-7xl mx-auto text-white transition-all duration-1000 ${
                                        isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                                    }`}>
                                        {/* Main Title */}
                                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
                                            {slide.title}
                                        </h2>
                                        
                                        {/* CTA Button */}
                                        {slide.link && (
                                            <Link 
                                                to={slide.link}
                                                className="inline-flex items-center gap-2 bg-black border border-white text-white font-semibold px-6 py-2.5 text-sm md:text-base transition-all duration-300 hover:bg-white hover:text-black"
                                            >
                                                <span>{slide.buttonText || 'Xem ngay'}</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
            
            {/* Navigation Dots */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3 z-20">
                {bannerSlides.map((_, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleSlideChange(i)} 
                        disabled={isTransitioning}
                        className={`h-3 w-3 rounded-full transition-all duration-300 ${
                            i === index 
                                ? 'bg-white w-8' 
                                : 'bg-white/60 hover:bg-white/80'
                        } ${isTransitioning ? 'pointer-events-none' : ''}`} 
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
            
            {/* Navigation Arrows */}
            {bannerSlides.length > 1 && (
                <>
                    <button
                        onClick={() => handleSlideChange((index - 1 + bannerSlides.length) % bannerSlides.length)}
                        disabled={isTransitioning}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Previous slide"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleSlideChange((index + 1) % bannerSlides.length)}
                        disabled={isTransitioning}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Next slide"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}


