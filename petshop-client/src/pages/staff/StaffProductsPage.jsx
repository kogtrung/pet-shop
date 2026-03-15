import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../../api/productApi';
import { fetchCategories } from '../../api/categoryApi';
import { fetchBrands } from '../../api/brandApi';
import { getProductImage } from '../../utils/imageUtils';
import { 
    MagnifyingGlassIcon, 
    FunnelIcon,
    XMarkIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function StaffProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [productSalesToday, setProductSalesToday] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsRes, categoriesRes, brandsRes] = await Promise.all([
                fetchProducts({ pageSize: 100, isService: false }),
                fetchCategories(),
                fetchBrands()
            ]);
            
            setProducts(productsRes.data?.items || productsRes.data || []);
            setCategories(categoriesRes.data || []);
            setBrands(brandsRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = !searchQuery || 
            product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || 
            product.categoryIds?.includes(parseInt(selectedCategory));
        const matchesBrand = !selectedBrand || 
            product.brandId === parseInt(selectedBrand);
        
        return matchesSearch && matchesCategory && matchesBrand;
    });

    const getCategoryName = (categoryIds) => {
        if (!categoryIds || categoryIds.length === 0) return '—';
        return categoryIds.map(id => {
            const category = categories.find(c => c.id === id);
            return category ? category.name : null;
        }).filter(Boolean).join(', ') || '—';
    };

    const getBrandName = (brandId) => {
        if (!brandId) return '—';
        const brand = brands.find(b => b.id === brandId);
        return brand ? brand.name : '—';
    };

    const handleViewDetails = async (product) => {
        setSelectedProduct(product);
        setShowDetailModal(true);
        // Load sales today for this product
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/Product/${product.id}/sales-today`);
            if (response.ok) {
                const data = await response.json();
                setProductSalesToday(data);
            } else {
                setProductSalesToday(null);
            }
        } catch (error) {
            console.error('Error loading product sales today:', error);
            setProductSalesToday(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Xem sản phẩm</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Xem danh sách sản phẩm, giá và tồn kho (chỉ xem, không được sửa)
                </p>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo tên, SKU..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <FunnelIcon className="w-5 h-5" />
                        <span>Bộ lọc</span>
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Danh mục
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Tất cả danh mục</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Thương hiệu
                            </label>
                            <select
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Tất cả thương hiệu</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        {(selectedCategory || selectedBrand) && (
                            <div className="md:col-span-2">
                                <button
                                    onClick={() => {
                                        setSelectedCategory('');
                                        setSelectedBrand('');
                                    }}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Products Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        Không tìm thấy sản phẩm nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hình ảnh</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tên sản phẩm</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Danh mục</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Thương hiệu</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Giá</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tồn kho</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredProducts.map((product) => {
                                    const imageUrl = getProductImage(product);
                                    const inventory = product.inventory || {};
                                    const needsReorder = inventory.quantity <= (inventory.reorderLevel || 0);
                                    
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3">
                                                {imageUrl && !imageUrl.includes('placehold.co') ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.name}
                                                        className="w-16 h-16 object-cover rounded"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                                        <span className="text-xs text-gray-400">No image</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {product.name || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {getCategoryName(product.categoryIds)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {getBrandName(product.brandId)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    {product.salePrice ? (
                                                        <>
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                                                {(product.salePrice || 0).toLocaleString('vi-VN')} ₫
                                                            </span>
                                                            <span className="text-xs text-gray-400 line-through">
                                                                {(product.price || 0).toLocaleString('vi-VN')} ₫
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-900 dark:text-white">
                                                            {(product.price || 0).toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-medium ${
                                                    inventory.quantity === 0 
                                                        ? 'text-red-600 dark:text-red-400' 
                                                        : needsReorder 
                                                        ? 'text-yellow-600 dark:text-yellow-400' 
                                                        : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                    {inventory.quantity || 0}
                                                </span>
                                                {needsReorder && inventory.quantity > 0 && (
                                                    <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                                                        (Cần nhập)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleViewDetails(product)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            {showDetailModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết sản phẩm</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Product Image */}
                            {(() => {
                                const imageUrl = getProductImage(selectedProduct);
                                const images = selectedProduct.images || [];
                                
                                if (images.length > 0) {
                                    return (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Hình ảnh</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {images.slice(0, 6).map((img, idx) => {
                                                    const imgSrc = img.url || img || imageUrl;
                                                    if (!imgSrc || imgSrc.includes('placehold.co')) return null;
                                                    return (
                                                        <img
                                                            key={idx}
                                                            src={imgSrc}
                                                            alt={selectedProduct.name}
                                                            className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                } else if (imageUrl && !imageUrl.includes('placehold.co')) {
                                    return (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Hình ảnh</label>
                                            <img
                                                src={imageUrl}
                                                alt={selectedProduct.name}
                                                className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tên sản phẩm</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{selectedProduct.name || '—'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Danh mục</label>
                                    <p className="text-gray-900 dark:text-white">{getCategoryName(selectedProduct.categoryIds)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Thương hiệu</label>
                                    <p className="text-gray-900 dark:text-white">{getBrandName(selectedProduct.brandId)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Giá</label>
                                    <div className="flex flex-col">
                                        {selectedProduct.salePrice ? (
                                            <>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                                                    {(selectedProduct.salePrice || 0).toLocaleString('vi-VN')} ₫
                                                </span>
                                                <span className="text-xs text-gray-400 line-through">
                                                    {(selectedProduct.price || 0).toLocaleString('vi-VN')} ₫
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-gray-900 dark:text-white font-semibold text-lg">
                                                {(selectedProduct.price || 0).toLocaleString('vi-VN')} ₫
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tồn kho</label>
                                    <p className={`font-medium ${
                                        (selectedProduct.inventory?.quantity || 0) === 0 
                                            ? 'text-red-600 dark:text-red-400' 
                                            : (selectedProduct.inventory?.reorderLevel && (selectedProduct.inventory?.quantity || 0) <= selectedProduct.inventory.reorderLevel)
                                            ? 'text-yellow-600 dark:text-yellow-400' 
                                            : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {(selectedProduct.inventory?.quantity || 0)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mức cảnh báo</label>
                                    <p className="text-gray-900 dark:text-white">
                                        {selectedProduct.inventory?.reorderLevel || '—'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Đã bán hôm nay</label>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                        {productSalesToday?.quantitySold || 0} sản phẩm
                                    </p>
                                    {productSalesToday?.totalRevenue > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Doanh thu: {(productSalesToday.totalRevenue || 0).toLocaleString('vi-VN')} ₫
                                        </p>
                                    )}
                                </div>
                            </div>
                            {selectedProduct.description && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Mô tả</label>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedProduct.description}</p>
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
