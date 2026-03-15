import React, { useEffect, useState } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../api/categoryApi';
import Button from '../../components/common/Button';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ManageCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        parentId: '',
        isActive: true,
        showInMenu: true,
        menuOrder: 0,
        icon: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await fetchCategories();
            setCategories(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: category.name || '',
                description: category.description || '',
                parentId: category.parentId || '',
                isActive: category.isActive ?? true,
                showInMenu: category.showInMenu ?? true,
                menuOrder: category.menuOrder || 0,
                icon: category.icon || ''
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({
                name: '',
                description: '',
                parentId: '',
                isActive: true,
                showInMenu: true,
                menuOrder: 0,
                icon: ''
            });
        }
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setError('');
        setSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCategoryForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!categoryForm.name || categoryForm.name.trim() === '') {
            const errorMsg = 'Vui lòng nhập tên danh mục';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        const payload = {
            name: categoryForm.name,
            description: categoryForm.description,
            parentId: categoryForm.parentId ? parseInt(categoryForm.parentId) : null,
            isActive: categoryForm.isActive,
            showInMenu: categoryForm.showInMenu,
            menuOrder: parseInt(categoryForm.menuOrder) || 0,
            icon: categoryForm.icon
        };

        console.log('=== CATEGORY FORM SUBMISSION ===');
        console.log('Form data:', categoryForm);
        console.log('Payload being sent:', payload);
        console.log('Editing mode:', !!editingCategory);
        console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001');

        const loadingToast = toast.loading(editingCategory ? 'Đang cập nhật...' : 'Đang thêm danh mục...');

        try {
            let response;
            if (editingCategory) {
                console.log('Updating category with ID:', editingCategory.id);
                response = await updateCategory(editingCategory.id, payload);
                console.log('Update response:', response);
                const successMsg = 'Cập nhật danh mục thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            } else {
                console.log('Creating new category...');
                response = await createCategory(payload);
                console.log('Create response:', response);
                const successMsg = 'Thêm danh mục thành công!';
                setSuccess(successMsg);
                toast.success(successMsg, { id: loadingToast });
            }
            console.log('Reloading categories list...');
            await loadCategories();
            console.log('Categories reloaded successfully');
            setTimeout(closeModal, 1500);
        } catch (err) {
            console.error('=== CATEGORY SAVE ERROR ===');
            console.error('Full error object:', err);
            console.error('Error response:', err.response);
            console.error('Error data:', err.response?.data);
            console.error('Error status:', err.response?.status);
            console.error('Error headers:', err.response?.headers);
            
            // Extract detailed validation errors
            let errorMsg = 'Không thể lưu danh mục. Vui lòng thử lại.';
            
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

    const handleDelete = async (categoryId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
            return;
        }

        const loadingToast = toast.loading('Đang xóa...');

        try {
            await deleteCategory(categoryId);
            const successMsg = 'Xóa danh mục thành công!';
            setSuccess(successMsg);
            toast.success(successMsg, { id: loadingToast });
            await loadCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Category delete error:', err);
            const errorMsg = err.response?.data?.message || 
                            err.response?.data?.title ||
                            err.message || 
                            'Không thể xóa danh mục. Vui lòng thử lại.';
            setError(errorMsg);
            toast.error(errorMsg, { id: loadingToast });
            setTimeout(() => setError(''), 3000);
        }
    };

    // Get parent categories (for dropdown)
    const getParentCategories = () => {
        return categories.filter(c => !c.parentId);
    };

    if (loading) return <div className="text-center p-8">Đang tải...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý danh mục</h1>
                <Button onClick={() => openModal()}  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Thêm danh mục
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
                            <th className="p-3">Tên danh mục</th>
                            <th className="p-3">Mô tả</th>
                            <th className="p-3">Danh mục cha</th>
                            <th className="p-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-500">
                                    Chưa có danh mục nào
                                </td>
                            </tr>
                        ) : (
                            categories.map(c => (
                                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-3">#{c.id}</td>
                                    <td className="p-3 font-medium">{c.name}</td>
                                    <td className="p-3">{c.description || '—'}</td>
                                    <td className="p-3">
                                        {c.parentId ? (
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {categories.find(p => p.id === c.parentId)?.name || `#${c.parentId}`}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">Gốc</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openModal(c)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Chỉnh sửa"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
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

            {/* Category Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
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
                                        Tên danh mục *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={categoryForm.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        name="description"
                                        value={categoryForm.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Danh mục cha (tùy chọn)
                                    </label>
                                    <select
                                        name="parentId"
                                        value={categoryForm.parentId}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Không có (danh mục gốc)</option>
                                        {getParentCategories().map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Để trống nếu đây là danh mục cấp cao nhất
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Icon (tùy chọn)
                                        </label>
                                        <input
                                            type="text"
                                            name="icon"
                                            value={categoryForm.icon}
                                            onChange={handleInputChange}
                                            placeholder="vd: 🐶, 🐱, 🍖"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Thứ tự menu
                                        </label>
                                        <input
                                            type="number"
                                            name="menuOrder"
                                            value={categoryForm.menuOrder}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            id="isActive"
                                            checked={categoryForm.isActive}
                                            onChange={(e) => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Kích hoạt danh mục (Active)
                                        </label>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="showInMenu"
                                            id="showInMenu"
                                            checked={categoryForm.showInMenu}
                                            onChange={(e) => setCategoryForm(prev => ({ ...prev, showInMenu: e.target.checked }))}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="showInMenu" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Hiển thị trong menu
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg">
                                        {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
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
