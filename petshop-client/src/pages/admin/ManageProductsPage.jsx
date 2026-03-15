import React, { useEffect, useState } from 'react';
import { fetchAllProductsForAdmin, createProduct, updateProduct, deleteProduct, toggleProductActive } from '../../api/productApi';
import { fetchBrands } from '../../api/brandApi';
import { fetchCategories } from '../../api/categoryApi';
import { addProductImage, deleteProductImage, setPrimaryImage, uploadProductImage } from '../../api/productImageApi';
import Button from '../../components/common/Button';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, PhotoIcon, StarIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function ManageProductsPage() {
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        brandId: '',
        categoryId: '',
        quantity: '',
        imageFiles: [] // Changed from imageUrls to imageFiles for local file uploads
    });
    const [imageUrl, setImageUrl] = useState('');
    const [isAddingImage, setIsAddingImage] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // Add state for filtering
    const [filters, setFilters] = useState({
        search: '',
        categoryId: '',
        brandId: ''
    });

    // Add function to handle filter changes
    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Add function to apply filters
    const applyFilters = () => {
        loadData();
    };

    // Add function to clear filters
    const clearFilters = () => {
        setFilters({
            search: '',
            categoryId: '',
            brandId: ''
        });
    };

    // Update useEffect to reload data when filters change
    useEffect(() => {
        loadData();
    }, [filters]); // Add filters as dependency

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsRes, brandsRes, categoriesRes] = await Promise.all([
                fetchAllProductsForAdmin(filters), // Use admin endpoint to get all products including inactive
                fetchBrands(),
                fetchCategories()
            ]);
            // Sort products by ID in descending order (newest first)
            const sortedProducts = (productsRes.data || []).sort((a, b) => b.id - a.id);
            setProducts(sortedProducts);
            setBrands(brandsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (err) {
            console.error(err);
            setError('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryName = (categoryIds) => {
        if (!categoryIds || categoryIds.length === 0) return '—';
        
        // Find category names from the categories array
        const categoryNames = categoryIds
            .map(id => {
                const category = categories.find(c => c.id === id);
                return category ? category.name : null;
            })
            .filter(name => name !== null);
            
        return categoryNames.length > 0 ? categoryNames.join(', ') : '—';
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name || '',
                description: product.description || '',
                price: product.price || '',
                brandId: product.brandId || '',
                categoryId: product.categoryId || product.categoryIds?.[0] || '', // Handle both formats
                quantity: product.quantity || '',
                imageFiles: [] // Not used for editing
            });
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                description: '',
                price: '',
                brandId: '',
                categoryId: '',
                quantity: '',
                imageFiles: []
            });
        }
        setShowModal(true);
        setError('');
        setSuccess('');
        setImageUrl(''); // Reset image URL when opening modal
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setError('');
        setSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProductForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!productForm.name || productForm.name.trim() === '') {
            const errorMsg = 'Vui lòng nhập tên sản phẩm';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        if (!productForm.brandId) {
            const errorMsg = 'Vui lòng chọn thương hiệu';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        if (!productForm.categoryId) {
            const errorMsg = 'Vui lòng chọn danh mục';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        const payload = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price) || 0,
            quantity: parseInt(productForm.quantity) || 0,
            brandId: parseInt(productForm.brandId),
            // Backend expects an array `categoryIds`
            categoryIds: productForm.categoryId ? [parseInt(productForm.categoryId)] : [],
        };

        // For editing, also include quantity and reorderLevel if they exist
        if (editingProduct) {
            if (productForm.quantity !== undefined && productForm.quantity !== '') {
                payload.quantity = parseInt(productForm.quantity) || 0;
            }
        }

        const loadingToast = toast.loading(editingProduct ? 'Đang cập nhật...' : 'Đang thêm sản phẩm...');

        try {
            let productId;
            if (editingProduct) {
                await updateProduct(editingProduct.id, payload);
                productId = editingProduct.id;
                const successMsg = 'Cập nhật sản phẩm thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            } else {
                const createResponse = await createProduct(payload);
                productId = createResponse.data?.id;
                const successMsg = 'Thêm sản phẩm thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            }

            // Upload images for new products or when editing
            if (productId && productForm.imageFiles.length > 0) {
                toast.loading('Đang upload ảnh...', { id: loadingToast });
                const existingImagesCount = editingProduct?.images?.length || 0;
                for (let i = 0; i < productForm.imageFiles.length; i++) {
                    const file = productForm.imageFiles[i];
                    try {
                        await uploadProductImage(productId, file, existingImagesCount === 0 && i === 0, existingImagesCount + i);
                    } catch (err) {
                        console.error(`Error uploading image ${i + 1}:`, err);
                        toast.error(`Không thể upload ảnh ${i + 1}`);
                    }
                }
            }

            await loadData();
            setTimeout(closeModal, 1500);
        } catch (err) {
            console.error('Product save error:', err);
            
            // Extract detailed validation errors
            let errorMsg = 'Không thể lưu sản phẩm. Vui lòng thử lại.';
            
            if (err.response?.data?.errors) {
                console.error('🔴 VALIDATION ERRORS:', err.response.data.errors);
                // Format validation errors into readable message
                const validationErrors = Object.entries(err.response.data.errors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join(' | ');
                errorMsg = `Lỗi xác thực: ${validationErrors}`;
                console.error('Formatted error message:', errorMsg);
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.response?.data?.title) {
                errorMsg = err.response.data.title;
            } else if (err.message) {
                errorMsg = err.message;
            }
            
            setError(errorMsg);
            toast.error(errorMsg, { id: loadingToast, duration: 5000 });
        }
    };

    const handleAddImage = async () => {
        if (!imageUrl.trim()) {
            toast.error('Vui lòng nhập URL hình ảnh');
            return;
        }

        if (!editingProduct) {
            toast.error('Vui lòng lưu sản phẩm trước khi thêm ảnh');
            return;
        }

        setIsAddingImage(true);
        try {
            await addProductImage(editingProduct.id, {
                url: imageUrl,
                mediaType: 'image',
                sortOrder: editingProduct.images?.length || 0,
                isPrimary: editingProduct.images?.length === 0
            });
            toast.success('Thêm ảnh thành công!');
            setImageUrl('');
            await loadData();
            // Refresh editing product
            const updatedProduct = products.find(p => p.id === editingProduct.id);
            if (updatedProduct) {
                setEditingProduct(updatedProduct);
            }
        } catch (err) {
            console.error('Add image error:', err);
            toast.error('Không thể thêm ảnh. Vui lòng thử lại.');
        } finally {
            setIsAddingImage(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        
        // Validate files
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                toast.error(`File ${file.name} không phải là ảnh`);
                return false;
        }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`File ${file.name} vượt quá 5MB`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Add files to form state
            setProductForm(prev => ({
                ...prev,
            imageFiles: [...prev.imageFiles, ...validFiles]
            }));

        toast.success(`Đã thêm ${validFiles.length} ảnh`);
        e.target.value = ''; // Reset file input
    };

    const handleRemoveImageFile = (index) => {
        setProductForm(prev => {
            const newFiles = [...prev.imageFiles];
            newFiles.splice(index, 1);
            return {
                ...prev,
                imageFiles: newFiles
            };
        });
    };

    const handleDeleteImage = async (imageId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
            return;
        }

        try {
            await deleteProductImage(editingProduct.id, imageId);
            toast.success('Xóa ảnh thành công!');
            await loadData();
            // Refresh editing product
            const updatedProduct = products.find(p => p.id === editingProduct.id);
            if (updatedProduct) {
                setEditingProduct(updatedProduct);
            }
        } catch (err) {
            console.error('Delete image error:', err);
            toast.error('Không thể xóa ảnh. Vui lòng thử lại.');
        }
    };

    const handleSetPrimaryImage = async (imageId) => {
        try {
            await setPrimaryImage(editingProduct.id, imageId);
            toast.success('Đã đặt làm ảnh chính!');
            await loadData();
            // Refresh editing product
            const updatedProduct = products.find(p => p.id === editingProduct.id);
            if (updatedProduct) {
                setEditingProduct(updatedProduct);
            }
        } catch (err) {
            console.error('Set primary image error:', err);
            toast.error('Không thể đặt ảnh chính. Vui lòng thử lại.');
        }
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang xóa...');

        try {
            await deleteProduct(productId);
            const successMsg = 'Xóa sản phẩm thành công!';
            setSuccess(successMsg);
            toast.success(successMsg, { id: loadingToast });
            await loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Product delete error:', err);
            const errorMsg = err.response?.data?.message || 
                            err.response?.data?.title ||
                            err.message || 
                            'Không thể xóa sản phẩm. Vui lòng thử lại.';
            setError(errorMsg);
            toast.error(errorMsg, { id: loadingToast });
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleToggleActive = async (productId) => {
        const loadingToast = toast.loading('Đang cập nhật...');
        try {
            const response = await toggleProductActive(productId);
            const message = response.data?.message || 'Cập nhật trạng thái thành công';
            toast.success(message, { id: loadingToast });
            await loadData();
        } catch (err) {
            console.error('Toggle active error:', err);
            const errorMsg = err.response?.data?.error || 'Không thể cập nhật trạng thái';
            toast.error(errorMsg, { id: loadingToast });
        }
    };

    if (loading) return <div className="text-center p-8">Đang tải...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý sản phẩm</h1>
                <Button onClick={() => openModal()} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Thêm sản phẩm
                </Button>
            </div>

            {/* Add filter section */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tìm kiếm
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Tên sản phẩm..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Thương hiệu
                        </label>
                        <select
                            value={filters.brandId}
                            onChange={(e) => handleFilterChange('brandId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Tất cả thương hiệu</option>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Danh mục
                        </label>
                        <select
                            value={filters.categoryId}
                            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex items-end gap-2">
                        <Button 
                            onClick={applyFilters}
                            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
                        >
                            Áp dụng
                        </Button>
                        <Button 
                            onClick={clearFilters}
                            variant="secondary"
                            className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white font-semibold shadow-md hover:shadow-lg"
                        >
                            Xóa
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300">
                    {success}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                            <th className="p-3">Mã</th>
                            <th className="p-3">Tên</th>
                            <th className="p-3">Thương hiệu</th>
                            <th className="p-3">Danh mục</th>
                            <th className="p-3">Giá</th>
                            <th className="p-3">Kho</th>
                            <th className="p-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="p-3">#{p.id}</td>
                                <td className="p-3 font-medium">{p.name}</td>
                                <td className="p-3">{p.brandName || '—'}</td>
                                <td className="p-3">{getCategoryName(p.categoryIds)}</td>
                                <td className="p-3">{p.price?.toLocaleString('vi-VN')} ₫</td>
                                <td className="p-3">{p.quantity ?? '—'}</td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleToggleActive(p.id)}
                                            className={`p-2 rounded transition-colors ${
                                                p.isActive 
                                                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                                                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20'
                                            }`}
                                            title={p.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                                        >
                                            {p.isActive ? (
                                                <EyeIcon className="h-4 w-4" />
                                            ) : (
                                                <EyeSlashIcon className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openModal(p)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            title="Xóa"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Product Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tên sản phẩm *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={productForm.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        name="description"
                                        value={productForm.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Giá *
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={productForm.price}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            step="1000"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Số lượng *
                                        </label>
                                        <input
                                            type="number"
                                            name="quantity"
                                            value={productForm.quantity}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Thương hiệu *
                                        </label>
                                        <select
                                            name="brandId"
                                            value={productForm.brandId}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Chọn thương hiệu</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Danh mục *
                                        </label>
                                        <select
                                            name="categoryId"
                                            value={productForm.categoryId}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>


                                {/* Image Management Section */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quản lý hình ảnh</h3>
                                    
                                    {/* Add Image - Support both file upload and URL for editing */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {editingProduct ? 'Thêm hình ảnh mới' : 'Chọn ảnh từ máy tính'}
                                        </label>
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            {editingProduct && (
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                        placeholder="Hoặc dán URL hình ảnh tại đây"
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <Button
                                                type="button"
                                                        onClick={handleAddImage}
                                                isLoading={isAddingImage}
                                                disabled={!imageUrl.trim()}
                                                className="whitespace-nowrap bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
                                            >
                                                <PhotoIcon className="h-5 w-5 mr-2" />
                                                        Thêm URL
                                            </Button>
                                        </div>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Chọn một hoặc nhiều ảnh từ máy tính (JPG, PNG, GIF, WEBP - tối đa 5MB mỗi ảnh)
                                            {editingProduct && ' hoặc thêm qua URL'}
                                        </p>
                                    </div>

                                    {/* Image List */}
                                    {(productForm.imageFiles && productForm.imageFiles.length > 0) || (editingProduct && editingProduct.images && editingProduct.images.length > 0) ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {/* Show new files being added (for both new and editing) */}
                                            {productForm.imageFiles && productForm.imageFiles.map((file, index) => (
                                                <div key={`new-${index}`} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-40 object-cover"
                                                    />
                                                    
                                                    {/* Primary Badge for first image if no existing images */}
                                                    {editingProduct && (!editingProduct.images || editingProduct.images.length === 0) && index === 0 && (
                                                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                                                            <StarIconSolid className="h-4 w-4" />
                                                            Chính
                                                        </div>
                                                    )}
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                            <button
                                                                type="button"
                                                            onClick={() => handleRemoveImageFile(index)}
                                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                            title="Xóa ảnh"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Show existing images (only when editing) */}
                                            {editingProduct && editingProduct.images && editingProduct.images.map((image) => (
                                                <div key={image.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <img
                                                        src={image.url}
                                                        alt="Product"
                                                        className="w-full h-40 object-cover"
                                                    />
                                                    
                                                    {/* Primary Badge */}
                                                    {image.isPrimary && (
                                                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                                                            <StarIconSolid className="h-4 w-4" />
                                                            Chính
                                                        </div>
                                                    )}
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                        {!image.isPrimary && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetPrimaryImage(image.id)}
                                                                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                                title="Đặt làm ảnh chính"
                                                            >
                                                                <StarIcon className="h-4 w-4" />
                                                                Đặt chính
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteImage(image.id)}
                                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                            title="Xóa ảnh"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // No images
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                            <PhotoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>Chưa có hình ảnh. Thêm hình ảnh để hiển thị sản phẩm tốt hơn.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                                        {editingProduct ? 'Cập nhật' : 'Thêm sản phẩm'}
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={closeModal} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                                        Hủy
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );

}
