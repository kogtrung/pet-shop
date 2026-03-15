import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    ShieldCheckIcon, 
    TruckIcon, 
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    FireIcon,
    TagIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    HeartIcon,
    ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { getProducts } from '../api/productApi';
import { getCategories } from '../api/categoryApi';
import { getBrands } from '../api/brandApi';
import { getPages } from '../api/pageApi';
import { getImageUrl } from '../utils/imageUtils'; // Added import for page API
import { getServices } from '../api/serviceApi';
import { getActiveBanners } from '../api/bannerApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { addToWishlist, removeFromWishlist, getWishlist } from '../api/wishlistApi';
import BannerSlider from '../components/common/BannerSlider';
import ProductCard from '../components/product/ProductCard';
import toast from 'react-hot-toast';

const CATEGORY_CARD_PRESETS = [
    {
        title: 'Hạt cho chó',
        categoryName: 'Thức ăn chó',
        icon: '🐕',
        description: 'Thức ăn hạt đầy đủ dinh dưỡng dành cho các boss cưng.'
    },
    {
        title: 'Hạt cho mèo',
        categoryName: 'Thức ăn mèo',
        icon: '🐱',
        description: 'Thực đơn hạt giúp mèo cưng khỏe mạnh và tiêu búi lông.'
    },
    {
        title: 'Đồ chơi mèo',
        categoryName: 'Đồ chơi mèo',
        icon: '🧶',
        description: 'Các món đồ chơi giúp mèo vận động và giải trí mỗi ngày.'
    },
    {
        title: 'Phụ kiện',
        categoryName: 'Phụ kiện',
        icon: '🎒',
        description: 'Vòng cổ, dây dắt, balo... đầy đủ phụ kiện dạo phố.'
    },
    {
        title: 'Chuồng & Lồng',
        categoryName: 'Chuồng & lồng',
        icon: '🏠',
        description: 'Không gian riêng tư an toàn cho thú cưng ở nhà.'
    },
    {
        title: 'Vệ sinh chó',
        categoryName: 'Vệ sinh chó',
        icon: '🧼',
        description: 'Dầu tắm, nước hoa giúp boss lúc nào cũng thơm tho.'
    },
    {
        title: 'Pate chó',
        categoryName: 'Pate chó',
        icon: '🥩',
        description: 'Bữa ăn mềm mịn kích thích vị giác cho cún cưng.'
    },
    {
        title: 'Pate mèo',
        categoryName: 'Pate mèo',
        icon: '🍲',
        description: 'Pate giàu dinh dưỡng phù hợp mèo mọi lứa tuổi.'
    },
    {
        title: 'Snack cho chó',
        categoryName: 'Snack chó',
        icon: '🍖',
        description: 'Snack thưởng giúp rèn luyện và làm sạch răng.'
    },
    {
        title: 'Snack cho mèo',
        categoryName: 'Snack mèo',
        icon: '🍤',
        description: 'Đồ nhâm nhi thơm ngon giúp mèo thêm vui.'
    },
    {
        title: 'Thời trang thú cưng',
        categoryName: 'Thời trang chó',
        icon: '🧥',
        description: 'Trang phục và phụ kiện thời trang cực xinh.'
    }
];

const BLOG_TAG_COLORS = [
    'bg-black text-white',
    'bg-gray-900 text-white',
    'bg-neutral-900 text-white',
    'bg-stone-900 text-white'
];

const CATEGORY_VISIBLE_COUNT = 3;
const BRAND_VISIBLE_COUNT = 4;

const HomePage = () => {
    const { addItem } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [services, setServices] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [bestSellingProducts, setBestSellingProducts] = useState([]);
    const [newProducts, setNewProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlist, setWishlist] = useState(new Set());
    const [petCareTips, setPetCareTips] = useState([]); // Added state for pet care tips
    const [bannerSlides, setBannerSlides] = useState([]);
    const [categoryCarouselIndex, setCategoryCarouselIndex] = useState(0);
    const [brandCarouselIndex, setBrandCarouselIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch all data in parallel
                const [productsRes, categoriesRes, brandsRes, pagesRes, servicesRes, bannersRes] = await Promise.all([
                    getProducts(),
                    getCategories(),
                    getBrands(),
                    getPages({ isPublished: true }), // Fetch published pages
                    getServices(), // Fetch services
                    getActiveBanners().catch(() => [])
                ]);

                const allProducts = productsRes.data;
                setProducts(allProducts);
                setCategories(categoriesRes.data || []);
                setBrands(brandsRes.data || []);
                setServices(servicesRes.data || []);
                
                // Set banner slides from API or fallback to default
                const activeBanners = Array.isArray(bannersRes) ? bannersRes : (bannersRes?.data || []);
                const formattedSlides = activeBanners
                    .filter(banner => banner.imageUrl)
                    .map((banner, idx) => ({
                        image: getImageUrl(banner.imageUrl),
                        title: banner.title || `Ưu đãi nổi bật ${idx + 1}`,
                        link: banner.linkUrl || '/products',
                        buttonText: banner.buttonText || 'Xem ngay'
                    }));
                setBannerSlides(formattedSlides);

                // Featured products (first 8)
                setFeaturedProducts(allProducts.slice(0, 8));
                
                // Best selling - sort by soldCount descending
                const bestSelling = [...allProducts]
                    .filter(p => !p.isService)
                    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
                    .slice(0, 5);
                setBestSellingProducts(bestSelling);
                
                // New products - sort by createdAt descending (newest first)
                const newProducts = [...allProducts]
                    .filter(p => !p.isService)
                    .sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                        return dateB - dateA;
                    })
                    .slice(0, 5);
                setNewProducts(newProducts);
                

                // Process pet care tips
                // Filter, sort by createdAt (newest first), and take first 3
                // Since we don't have createdAt in the PageDto, we'll just sort by ID descending as a proxy
                const sortedTips = pagesRes.data
                    .filter(page => page.isPublished) // Only published pages
                    .sort((a, b) => b.id - a.id) // Sort by ID descending (newest first as proxy)
                    .slice(0, 3); // Take only first 3
                setPetCareTips(sortedTips);

            } catch (err) {
                console.error('Error fetching data:', err);
                toast.error('Không thể tải dữ liệu trang chủ');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Load wishlist when user logs in
    useEffect(() => {
        if (user) {
            loadWishlist();
        } else {
            setWishlist(new Set());
        }
    }, [user]);

    const loadWishlist = async () => {
        try {
            const response = await getWishlist();
            const wishlistIds = new Set(response.data.map(item => item.productId));
            setWishlist(wishlistIds);
        } catch (error) {
            console.error('Error loading wishlist:', error);
            setWishlist(new Set());
        }
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

    const handleAddToCart = (product) => {
        addItem(product);
        toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    };

    const highlightCategories = CATEGORY_CARD_PRESETS;
    const maxCategoryIndex = Math.max(0, highlightCategories.length - CATEGORY_VISIBLE_COUNT);
    const categoryTranslation = 100 / CATEGORY_VISIBLE_COUNT;
    const maxBrandIndex = Math.max(0, brands.length - BRAND_VISIBLE_COUNT);
    const brandTranslation = 100 / BRAND_VISIBLE_COUNT;

    useEffect(() => {
        setBrandCarouselIndex(prev => Math.min(prev, maxBrandIndex));
    }, [maxBrandIndex]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-textDark text-lg">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            {/* 1. Header - Already handled by App.jsx */}
            
            {/* 2. Hero Banner Slider */}
            <BannerSlider slides={bannerSlides} />

            {/* 3. Feature Services Section */}
            <section className="relative py-12 bg-softGray">
                <div className="container mx-auto px-4">
                    {/* 4 Services Below Hero */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                        {[
                            { icon: TruckIcon, title: 'Free Delivery', desc: 'Miễn phí vận chuyển' },
                            { icon: ShieldCheckIcon, title: 'Secure', desc: 'Thanh toán an toàn' },
                            { icon: ChatBubbleLeftRightIcon, title: '24/7', desc: 'Hỗ trợ 24/7' },
                            { icon: SparklesIcon, title: 'Organic', desc: 'Sản phẩm tự nhiên' }
                        ].map((service, idx) => (
                            <div key={idx} className="bg-white rounded-card p-4 shadow-soft text-center">
                                <service.icon className="w-8 h-8 mx-auto mb-2 text-primary" strokeWidth={2} />
                                <h3 className="font-brand font-semibold text-textDark">{service.title}</h3>
                                <p className="text-sm text-textDark/70 font-ui">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. Category Cards Carousel */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4">
                    <div className="relative">
                        <div className="overflow-hidden">
                            <div 
                                className="flex transition-transform duration-500 ease-in-out"
                                style={{ transform: `translateX(-${categoryCarouselIndex * categoryTranslation}%)` }}
                            >
                                {highlightCategories.map((category, idx) => {
                                    const foundCategory = categories.find(cat => 
                                        cat.name.toLowerCase().includes(category.categoryName.toLowerCase()) ||
                                        category.categoryName.toLowerCase().includes(cat.name.toLowerCase())
                            );
                                    const link = foundCategory ? `/products?categoryId=${foundCategory.id}` : '/products';

                                    return (
                                        <Link key={`${category.title}-${idx}`} to={link} className="w-1/3 flex-shrink-0 px-3">
                                            <div className="bg-white border border-gray-200 px-6 py-8 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                                                <h3 className="text-xl font-semibold text-black mb-3">{category.title}</h3>
                                                <div className="text-5xl mb-3">{category.icon}</div>
                                                <p className="text-sm text-black/80 leading-relaxed">{category.description}</p>
                                    </div>
                                </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            onClick={() => setCategoryCarouselIndex(prev => Math.max(0, prev - 1))}
                            disabled={categoryCarouselIndex === 0}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Previous"
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-black" />
                        </button>
                        <button
                            onClick={() => setCategoryCarouselIndex(prev => Math.min(maxCategoryIndex, prev + 1))}
                            disabled={categoryCarouselIndex >= maxCategoryIndex}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Next"
                        >
                            <ChevronRightIcon className="w-6 h-6 text-black" />
                        </button>
                    </div>
                </div>
            </section>


            {/* 4. New Arrivals Tabs */}
            <section className="py-12 bg-softGray">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-heading font-bold text-textDark">Sản phẩm mới</h2>
                        <Link to="/products?sort=newest" className="text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                            Xem thêm <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                        </Link>
                    </div>
             
                    
                    {/* Product Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {newProducts.map((product) => (
                            <ProductCard 
                                key={product.id} 
                                product={product}
                                onAddToCart={handleAddToCart}
                                onToggleWishlist={toggleWishlist}
                                isInWishlist={wishlist.has(product.id)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Services Introduction */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-heading font-bold text-textDark mb-4">Dịch vụ chăm sóc thú cưng</h2>
                        <p className="text-lg text-textDark/70 max-w-2xl mx-auto">
                            Chúng tôi cung cấp các dịch vụ chăm sóc thú cưng chuyên nghiệp với đội ngũ giàu kinh nghiệm
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: SparklesIcon,
                                title: 'Vệ sinh',
                                description: 'Dịch vụ vệ sinh và chăm sóc sạch sẽ cho thú cưng của bạn',
                                color: 'bg-orange-100',
                                bgImage: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop'
                            },
                            {
                                icon: SparklesIcon,
                                title: 'Cắt tỉa',
                                description: 'Dịch vụ cắt tỉa lông chuyên nghiệp và tạo kiểu cho thú cưng',
                                color: 'bg-purple-100',
                                bgImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop'
                            },
                            {
                                icon: ShieldCheckIcon,
                                title: 'Khám sức khỏe',
                                description: 'Kiểm tra sức khỏe định kỳ và tư vấn chăm sóc từ bác sĩ thú y',
                                color: 'bg-blue-100',
                                bgImage: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=600&fit=crop'
                            }
                        ].map((service, idx) => (
                            <div key={idx} className={`${service.color}  p-8 shadow-soft hover:shadow-soft-lg transition-all relative overflow-hidden`}>
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity"
                                    style={{ backgroundImage: `url(${service.bgImage})` }}
                                ></div>
                                <div className="relative z-10">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <service.icon className="w-8 h-8 text-primary" strokeWidth={2} />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-textDark mb-3 text-center">{service.title}</h3>
                                <p className="text-textDark/70 text-center">{service.description}</p>
                                <div className="mt-6 text-center">
                                    <Link to="/services">
                                        <button className="px-6 py-2 bg-primary hover:bg-primary-600 text-white font-heading font-semibold  shadow-soft">
                                            Xem chi tiết
                                        </button>
                                    </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            

            {/* 7. Product Grid */}
            <section className="py-12 bg-softGray">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-heading font-bold text-textDark">Sản phẩm bán chạy</h2>
                        <Link to="/products?sort=bestselling" className="text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                            Xem thêm <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {bestSellingProducts.map((product) => (
                            <ProductCard 
                                key={product.id} 
                                product={product}
                                onAddToCart={handleAddToCart}
                                onToggleWishlist={toggleWishlist}
                                isInWishlist={wishlist.has(product.id)}
                            />
                        ))}
                    </div>
                </div>
            </section>
            
            {/* 9. Blog/News Section */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-heading font-bold text-textDark">Tin tức & Blog</h2>
                        <Link to="/pages" className="text-primary hover:text-primary-600 font-ui font-medium flex items-center gap-1">
                            Xem thêm <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {petCareTips.slice(0, 3).map((page, idx) => {
                            const decodeHtmlEntities = (text) => {
                                if (!text) return '';
                                const textarea = document.createElement('textarea');
                                textarea.innerHTML = text;
                                return textarea.value;
                            };

                            const stripHtml = (html) => {
                                if (!html) return '';
                                const decoded = decodeHtmlEntities(html);
                                return decoded.replace(/<[^>]*>/g, '');
                            };

                            // Try multiple image fields
                            const imageUrl = page.featuredImage 
                                ? getImageUrl(page.featuredImage) 
                                : page.imageUrl 
                                    ? getImageUrl(page.imageUrl) 
                                    : null;
                            const excerpt = stripHtml(page.excerpt || page.content || '').substring(0, 150);
                            
                            return (
                                <Link key={page.id} to={`/pages/${page.slug}`} className="group">
                                    <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative">
                                        {/* Tag on corner */}
                                        {page.tag && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <span className={`px-3 py-1 text-xs font-medium ${BLOG_TAG_COLORS[idx % BLOG_TAG_COLORS.length]}`}>
                                                    {page.tag}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Image */}
                                        {imageUrl ? (
                                            <div className="h-48 overflow-hidden bg-gray-100 relative">
                                                <img 
                                                    src={imageUrl} 
                                                    alt={decodeHtmlEntities(page.title || '')}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const fallback = e.target.parentElement.querySelector('.image-fallback');
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="image-fallback w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center" style={{ display: 'none' }}>
                                                    <SparklesIcon className="w-16 h-16 text-gray-400" strokeWidth={2} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                                <SparklesIcon className="w-16 h-16 text-gray-400" strokeWidth={2} />
                                    </div>
                                        )}
                                        
                                        {/* Content */}
                                    <div className="p-6">
                                            <h3 className="text-xl font-heading font-semibold text-black mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors">
                                                {decodeHtmlEntities(page.title || 'Bài viết')}
                                        </h3>
                                            {excerpt && (
                                                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                                    {excerpt}
                                                </p>
                                            )}
                                        <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                {page.createdAt ? new Date(page.createdAt).toLocaleDateString('vi-VN') : ''}
                                            </span>
                                                <span className="text-black font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                                Đọc thêm <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                                            </span>
                                </div>
                                    </div>
                                </div>
                                        </Link>
                            );
                        })}
                    </div>
                </div>
            </section>
            
            {/* Brand Carousel */}
            {brands.length > 0 && (
                <section className="py-12 bg-softGray">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-heading font-bold text-textDark">Thương hiệu</h2>
                            <Link to="/products?sort=brand" className="text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                                Xem tất cả <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="overflow-hidden">
                                <div 
                                    className="flex transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${brandCarouselIndex * brandTranslation}%)` }}
                                >
                                    {brands.map((brand) => {
                                        const logo = brand.logoUrl ? getImageUrl(brand.logoUrl) : null;
                                        return (
                                            <Link
                                                key={brand.id}
                                                to={`/products?brandId=${brand.id}`}
                                                className="w-1/4 flex-shrink-0 px-3"
                                            >
                                                <div className="h-full bg-white border border-gray-200 px-4 py-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3">
                                                    {logo ? (
                                                        <img
                                                            src={logo}
                                                            alt={brand.name}
                                                            className="h-16 object-contain"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-softGray flex items-center justify-center text-lg font-semibold text-textDark">
                                                            {brand.name?.charAt(0) || 'B'}
                                                        </div>
                                                    )}
                                                    <p className="text-base font-semibold text-black">{brand.name}</p>
                                                    <p className="text-xs text-gray-500">{brand.productCount || 0} sản phẩm</p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                onClick={() => setBrandCarouselIndex(prev => Math.max(0, prev - 1))}
                                disabled={brandCarouselIndex === 0}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Previous"
                            >
                                <ChevronLeftIcon className="w-6 h-6 text-black" />
                            </button>
                            <button
                                onClick={() => setBrandCarouselIndex(prev => Math.min(maxBrandIndex, prev + 1))}
                                disabled={brandCarouselIndex >= maxBrandIndex}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Next"
                            >
                                <ChevronRightIcon className="w-6 h-6 text-black" />
                            </button>
                        </div>
                    </div>
                </section>
            )}
            
            {/* 8. Testimonials */}
            <section className="py-16 bg-secondary text-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-heading font-bold text-center mb-12">Khách hàng nói gì về chúng tôi</h2>
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-xl italic mb-8">"Petivo đã giúp tôi tìm được những sản phẩm tốt nhất cho chú chó của mình. Dịch vụ tuyệt vời và sản phẩm chất lượng cao!"</p>
                        <div className="flex items-center justify-center gap-4">
                            <img 
                                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" 
                                alt="Customer" 
                                className="w-16 h-16 rounded-full border-2 border-white"
                            />
                            <div>
                                <div className="font-heading font-semibold">Nguyễn Văn A</div>
                                <div className="text-sm opacity-80">Khách hàng thân thiết</div>
                                    </div>
                                </div>
                    </div>
                </div>
            </section>

            

            

            {/* 11. Logo Bar */}
            {/* <section className="py-12 bg-softGray">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-8 items-center">
                        {brands.slice(0, 8).map((brand) => (
                            <div key={brand.id} className="flex items-center justify-center p-4 bg-white rounded-card shadow-soft hover:shadow-soft-lg transition-all">
                                <span className="text-xl font-heading font-bold text-textDark/50">{brand.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section> */}

            {/* 12. Footer - Already handled by App.jsx */}
        </div>
    );
};

export default HomePage;
