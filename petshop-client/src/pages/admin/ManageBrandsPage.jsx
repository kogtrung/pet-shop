import React, { useEffect, useState } from 'react';
import { fetchBrands, createBrand, updateBrand, deleteBrand } from '../../api/brandApi';
import Button from '../../components/common/Button';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ManageBrandsPage() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [brandForm, setBrandForm] = useState({
        name: '',
        logoUrl: '',
        description: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        setLoading(true);
        try {
            const response = await fetchBrands();
            setBrands(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Không thể tải danh sách thương hiệu');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (brand = null) => {
        if (brand) {
            setEditingBrand(brand);
            setBrandForm({
                name: brand.name || '',
                logoUrl: brand.logoUrl || '',
                description: brand.description || ''
            });
        } else {
            setEditingBrand(null);
            setBrandForm({
                name: '',
                logoUrl: '',
                description: ''
            });
        }
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBrand(null);
        setError('');
        setSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBrandForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!brandForm.name || brandForm.name.trim() === '') {
            const errorMsg = 'Vui lòng nhập tên thương hiệu';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        console.log('=== BRAND FORM SUBMISSION ===');
        console.log('Form data:', brandForm);
        console.log('Editing mode:', !!editingBrand);
        console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001');

        const loadingToast = toast.loading(editingBrand ? 'Đang cập nhật...' : 'Đang thêm thương hiệu...');
        const payload = {
            name: brandForm.name,
            logoUrl: brandForm.logoUrl,
            description: brandForm.description
        };

        try {
            let response;
            if (editingBrand) {
                console.log('Updating brand with ID:', editingBrand.id);
                response = await updateBrand(editingBrand.id, payload);
                console.log('Update response:', response);
                const successMsg = 'Cập nhật thương hiệu thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            } else {
                console.log('Creating new brand...');
                response = await createBrand(payload);
                console.log('Create response:', response);
                const successMsg = 'Thêm thương hiệu thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            }
            console.log('Reloading brands list...');
            await loadBrands();
            console.log('Brands reloaded successfully');
            setTimeout(closeModal, 1500);
        } catch (err) {
            console.error('=== BRAND SAVE ERROR ===');
            console.error('Full error object:', err);
            console.error('Error response:', err.response);
            console.error('Error data:', err.response?.data);
            console.error('Error status:', err.response?.status);
            console.error('Error headers:', err.response?.headers);
            
            // Extract detailed validation errors
            let errorMsg = 'Không thể lưu thương hiệu. Vui lòng thử lại.';
            
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

    const handleDelete = async (brandId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thương hiệu này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang xóa...');

        try {
            await deleteBrand(brandId);
            const successMsg = 'Xóa thương hiệu thành công!';
            setSuccess(successMsg);
            toast.success(successMsg, { id: loadingToast });
            await loadBrands();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Brand delete error:', err);
            const errorMsg = err.response?.data?.message || 
                            err.response?.data?.title ||
                            err.message || 
                            'Không thể xóa thương hiệu. Vui lòng thử lại.';
            setError(errorMsg);
            toast.error(errorMsg, { id: loadingToast });
            setTimeout(() => setError(''), 3000);
        }
    };

    if (loading) return <div className="text-center p-8">Đang tải...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý thương hiệu</h1>
                <Button onClick={() => openModal()}  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Thêm thương hiệu
                </Button>
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
                            <th className="p-3">Tên thương hiệu</th>
                            <th className="p-3">Mô tả</th>
                            <th className="p-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brands.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-500">
                                    Chưa có thương hiệu nào
                                </td>
                            </tr>
                        ) : (
                            brands.map(b => (
                                <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-3">#{b.id}</td>
                                    <td className="p-3 font-medium">{b.name}</td>
                                    <td className="p-3">{b.description || '—'}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openModal(b)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Chỉnh sửa"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(b.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title="Xóa"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Brand Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingBrand ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới'}
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
                                        Tên thương hiệu *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={brandForm.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Logo URL *
                                    </label>
                                    <input
                                        type="url"
                                        name="logoUrl"
                                        value={brandForm.logoUrl}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="https://example.com/logo.png"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        name="description"
                                        value={brandForm.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                                        {editingBrand ? 'Cập nhật' : 'Thêm thương hiệu'}
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={closeModal}  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
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
