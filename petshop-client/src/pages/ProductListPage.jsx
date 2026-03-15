import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    FunnelIcon, 
    Squares2X2Icon, 
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { fetchProducts } from '../api/productApi';
import { fetchBrands } from '../api/brandApi';
import { fetchCategories } from '../api/categoryApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { addToWishlist, removeFromWishlist, getWishlist } from '../api/wishlistApi';
import ProductCard from '../components/product/ProductCard';
import { SkeletonCard } from '../components/common/Skeleton';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function ProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { addItem } = useCart();
    const navigate = useNavigate();
    
    // State
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [showFilters, setShowFilters] = useState(true);
    const [wishlist, setWishlist] = useState(new Set());
    
    // Filter state from URL params
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        categoryId: searchParams.get('categoryId') || searchParams.get('category') || '', // Handle both parameter names
        brandId: searchParams.get('brandId') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        sortBy: searchParams.get('sortBy') || 'name',
        sortOrder: searchParams.get('sortOrder') || 'asc',
        page: parseInt(searchParams.get('page')) || 1,
        pageSize: 16,
        isFeatured: searchParams.get('isFeatured') === 'true' || false,
    });

    // Add this useEffect to watch for changes in searchParams
    useEffect(() => {
        setFilters({
            search: searchParams.get('search') || '',
            categoryId: searchParams.get('categoryId') || searchParams.get('category') || '',
            brandId: searchParams.get('brandId') || '',
            minPrice: searchParams.get('minPrice') || '',
            maxPrice: searchParams.get('maxPrice') || '',
            sortBy: searchParams.get('sortBy') || 'name',
            sortOrder: searchParams.get('sortOrder') || 'asc',
            page: parseInt(searchParams.get('page')) || 1,
            pageSize: 16,
            isFeatured: searchParams.get('isFeatured') === 'true' || false,
        });
    }, [searchParams]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [filters]);

    // Load wishlist when user logs in
    useEffect(() => {
        if (user) {
            loadWishlist();
        } else {
            setWishlist(new Set());
        }
    }, [user]);

    const loadInitialData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                fetchBrands(),
                fetchCategories()
            ]);
            setBrands(brandsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Không thể tải dữ liệu danh mục và thương hiệu');
        }
    };

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

    const loadProducts = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.categoryId) params.categoryId = filters.categoryId;
            if (filters.brandId) params.brandId = filters.brandId;
            if (filters.minPrice) params.minPrice = filters.minPrice;
            if (filters.maxPrice) params.maxPrice = filters.maxPrice;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;
            if (filters.page) params.page = filters.page;
            if (filters.pageSize) params.pageSize = filters.pageSize;
            if (filters.isFeatured) params.isFeatured = filters.isFeatured;

            const response = await fetchProducts(params);
            let productsData = response.data || [];
            
            // Chuẩn hóa thành mảng để sort/paginate client-side nếu cần
            let allProducts = Array.isArray(response.data)
                ? response.data
                : (response.data.items || productsData);

            // Sort client-side theo filters (phòng trường hợp API chưa hỗ trợ đầy đủ)
            if (Array.isArray(allProducts)) {
                allProducts = [...allProducts].sort((a, b) => {
                    const direction = filters.sortOrder === 'desc' ? -1 : 1;

                    if (filters.sortBy === 'price') {
                        const priceA = (a.salePrice && a.salePrice > 0 ? a.salePrice : a.price) || 0;
                        const priceB = (b.salePrice && b.salePrice > 0 ? b.salePrice : b.price) || 0;
                        return (priceA - priceB) * direction;
                    }

                    if (filters.sortBy === 'createdAt') {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return (dateA - dateB) * direction;
                    }

                    // Mặc định sort theo tên
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    if (nameA < nameB) return -1 * direction;
                    if (nameA > nameB) return 1 * direction;
                    return 0;
                });
            }
            
            // If backend supports pagination metadata
            if (response.data.items && typeof response.data.total === 'number') {
                const safePageSize = filters.pageSize || 16;
                const startIndex = (filters.page - 1) * safePageSize;
                const pagedData = allProducts.slice(startIndex, startIndex + safePageSize);
                productsData = pagedData;
                setTotalProducts(allProducts.length || response.data.total);
            } else if (Array.isArray(allProducts)) {
                // Backend returns full list – handle pagination on client
                const safePageSize = filters.pageSize || 16;
                const startIndex = (filters.page - 1) * safePageSize;
                const pagedData = allProducts.slice(startIndex, startIndex + safePageSize);
                productsData = pagedData;
                setTotalProducts(allProducts.length);
            }
            
            setProducts(productsData);
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
            setProducts([]);
        } finally {
            setLoading(false);
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

    const handleAddToCart = (product, quantity = 1, bookingDateTime = null) => {
        try {
            addItem(product, quantity, bookingDateTime);
            toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
            console.log('Product added to cart:', { product, quantity, bookingDateTime });
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau!');
        }
    };

    const updateFilters = (newFilters) => {
        // Khi thay đổi bộ lọc (search, category, brand, price, sort...) thì reset về trang 1
        // Riêng khi chỉ thay đổi 'page' (click phân trang) thì giữ nguyên giá trị page được truyền vào
        const updated = { ...filters, ...newFilters };
        if (!Object.prototype.hasOwnProperty.call(newFilters, 'page')) {
            updated.page = 1;
        }
        setFilters(updated);
        
        // Update URL params
        const params = new URLSearchParams();
        Object.keys(updated).forEach(key => {
            if (updated[key]) params.set(key, updated[key]);
        });
        setSearchParams(params);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        updateFilters({ search: filters.search });
    };

    const resetFilters = () => {
        const defaultFilters = {
            search: '',
            categoryId: '',
            brandId: '',
            minPrice: '',
            maxPrice: '',
            sortBy: 'name',
            sortOrder: 'asc',
            page: 1,
            pageSize: 16,
            isFeatured: false
        };
        setFilters(defaultFilters);
        setSearchParams(new URLSearchParams());
    };

    const totalPages = Math.ceil(totalProducts / filters.pageSize);

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-heading font-bold text-textDark mb-4">
                    Tất cả sản phẩm
                </h1>
                
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                        <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" strokeWidth={2} />
                        Tìm kiếm
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <AdjustmentsHorizontalIcon className="h-5 w-5" strokeWidth={2} />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Filters Sidebar */}
                <aside className={`lg:col-span-3 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                                <FunnelIcon className="h-5 w-5 mr-2" strokeWidth={2} />
                                Bộ lọc
                            </h2>
                            <button
                                onClick={resetFilters}
                                className="text-xs text-bg-primary dark:text-indigo-400 hover:text-bg-primary-700 dark:hover:text-indigo-300 font-medium"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>

                        {/* Category Filter */}
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Danh mục
                            </label>
                            <select
                                value={filters.categoryId}
                                onChange={(e) => updateFilters({ categoryId: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            >
                                <option value="">Tất cả danh mục</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand Filter */}
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Thương hiệu
                            </label>
                            <select
                                value={filters.brandId}
                                onChange={(e) => updateFilters({ brandId: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            >
                                <option value="">Tất cả thương hiệu</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Price Range */}
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Khoảng giá (VND)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={filters.minPrice}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilters(prev => ({ ...prev, minPrice: value }));
                                        updateFilters({ minPrice: value });
                                    }}
                                    placeholder="Từ"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                                <span className="text-gray-500 text-sm">-</span>
                                <input
                                    type="number"
                                    value={filters.maxPrice}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilters(prev => ({ ...prev, maxPrice: value }));
                                        updateFilters({ maxPrice: value });
                                    }}
                                    placeholder="Đến"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Featured Products */}
                        <div className="mb-3">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.isFeatured}
                                    onChange={(e) => updateFilters({ isFeatured: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <span className="ml-2 text-sm text-textDark font-ui">
                                    Chỉ sản phẩm nổi bật
                                </span>
                            </label>
                        </div>


                        {/* Sort Options */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Sắp xếp theo
                            </label>
                            <select
                                value={`${filters.sortBy}-${filters.sortOrder}`}
                                onChange={(e) => {
                                    const [sortBy, sortOrder] = e.target.value.split('-');
                                    updateFilters({ sortBy, sortOrder });
                                }}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            >
                                <option value="name-asc">Tên: A-Z</option>
                                <option value="name-desc">Tên: Z-A</option>
                                <option value="price-asc">Giá: Thấp đến Cao</option>
                                <option value="price-desc">Giá: Cao đến Thấp</option>
                                <option value="createdAt-desc">Mới nhất</option>
                                <option value="createdAt-asc">Cũ nhất</option>
                            </select>
                        </div>
                    </div>
                </aside>

                {/* Products Grid */}
                <section className="lg:col-span-9">
                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center text-textDark/70">
                            <Squares2X2Icon className="h-5 w-5 mr-2" strokeWidth={2} />
                            <span className="font-heading font-medium">
                                {loading ? 'Đang tải...' : `${totalProducts} sản phẩm`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-textDark/70">
                            Trang {filters.page} / {totalPages || 1}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    )}

                    {/* Products */}
                    {!loading && products.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                                {products.map(product => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product}
                                        onAddToCart={handleAddToCart}
                                        onToggleWishlist={toggleWishlist}
                                        isInWishlist={wishlist.has(product.id)}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={filters.page === 1}
                                        onClick={() => updateFilters({ page: filters.page - 1 })}
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" strokeWidth={2} />
                                    </Button>
                                    
                                    <div className="flex gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            // Show first, last, current, and pages around current
                                            if (
                                                pageNum === 1 ||
                                                pageNum === totalPages ||
                                                (pageNum >= filters.page - 1 && pageNum <= filters.page + 1)
                                            ) {
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={filters.page === pageNum ? 'primary' : 'outline'}
                                                        size="xs"
                                                        onClick={() => updateFilters({ page: pageNum })}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            } else if (pageNum === filters.page - 2 || pageNum === filters.page + 2) {
                                                return <span key={pageNum} className="px-2 text-textDark/50">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={filters.page === totalPages}
                                        onClick={() => updateFilters({ page: filters.page + 1 })}
                                    >
                                        <ChevronRightIcon className="h-5 w-5" strokeWidth={2} />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty State */}
                    {!loading && products.length === 0 && (
                        <div className="text-center py-12">
                            <Squares2X2Icon className="h-16 w-16 mx-auto text-textDark/30 mb-4" strokeWidth={2} />
                            <h3 className="text-lg font-heading font-medium text-textDark mb-2">
                                Không tìm thấy sản phẩm
                            </h3>
                            <p className="text-textDark/70 mb-4">
                                Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác
                            </p>
                            <Button variant="outline" onClick={resetFilters}>
                                Xóa bộ lọc
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}