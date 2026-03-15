import React, { useEffect, useState } from 'react';
import { getAllPromotions, createPromotion, updatePromotion, deletePromotion } from '../../api/promotionApi';
import { fetchProducts } from '../../api/productApi';
import { fetchCategories } from '../../api/categoryApi';
import { fetchBrands } from '../../api/brandApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discountType: 'Percentage',
        discountValue: 0,
        maxDiscountAmount: null,
        minOrderAmount: null,
        maxUsageCount: null,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
    });

    useEffect(() => {
        loadPromotions();
        loadSelectOptions();
    }, []);

    const loadSelectOptions = async () => {
        try {
            const [productsRes, categoriesRes, brandsRes] = await Promise.all([
                fetchProducts({ pageSize: 1000 }),
                fetchCategories(),
                fetchBrands()
            ]);
            setProducts(productsRes.data?.items || productsRes.data || []);
            setCategories(categoriesRes.data || []);
            setBrands(brandsRes.data || []);
        } catch (error) {
            console.error('Error loading select options:', error);
        }
    };

    const loadPromotions = async () => {
        setLoading(true);
        try {
            const response = await getAllPromotions();
            setPromotions(response.data || []);
        } catch (error) {
            console.error('Error loading promotions:', error);
            toast.error('Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPromotion) {
                await updatePromotion(editingPromotion.id, formData);
                toast.success('Cập nhật mã giảm giá thành công');
            } else {
                await createPromotion(formData);
                toast.success('Tạo mã giảm giá thành công');
            }
            setShowModal(false);
            setEditingPromotion(null);
            setFormData({
                code: '',
                description: '',
                discountType: 'Percentage',
                discountValue: 0,
                maxDiscountAmount: null,
                minOrderAmount: null,
                maxUsageCount: null,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
            });
            await loadPromotions();
        } catch (error) {
            console.error('Error saving promotion:', error);
            toast.error(error.response?.data?.error || 'Không thể lưu mã giảm giá');
        }
    };

    const handleEdit = (promotion) => {
        setEditingPromotion(promotion);
        setFormData({
            code: promotion.code,
            description: promotion.description || '',
            discountType: promotion.discountType,
            discountValue: promotion.discountValue,
            maxDiscountAmount: promotion.maxDiscountAmount,
            minOrderAmount: promotion.minOrderAmount,
            maxUsageCount: promotion.maxUsageCount,
            startDate: new Date(promotion.startDate).toISOString().split('T')[0],
            endDate: new Date(promotion.endDate).toISOString().split('T')[0],
            isActive: promotion.isActive,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) {
            return;
        }
        try {
            await deletePromotion(id);
            toast.success('Xóa mã giảm giá thành công');
            await loadPromotions();
        } catch (error) {
            console.error('Error deleting promotion:', error);
            toast.error('Không thể xóa mã giảm giá');
        }
    };

    const getStatusBadge = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        
        if (!promotion.isActive) {
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
        if (now < startDate) {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        }
        if (now > endDate) {
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        }
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    };

    const getStatusText = (promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        
        if (!promotion.isActive) {
            return 'Vô hiệu hóa';
        }
        if (now < startDate) {
            return 'Sắp bắt đầu';
        }
        if (now > endDate) {
            return 'Đã hết hạn';
        }
        return 'Đang hoạt động';
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý khuyến mãi</h1>
                    <p className="text-gray-600 dark:text-gray-400">Quản lý mã giảm giá và chương trình ưu đãi</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingPromotion(null);
                        setFormData({
                            code: '',
                            description: '',
                            discountType: 'Percentage',
                            discountValue: 0,
                            maxDiscountAmount: null,
                            minOrderAmount: null,
                            maxUsageCount: null,
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            isActive: true
                        });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                    <PlusIcon className="w-5 h-5 inline mr-2" />
                    Tạo mã giảm giá
                </Button>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Chưa có mã giảm giá nào. Tạo mã giảm giá đầu tiên!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã</th>
                                    <th className="px-4 py-3 text-left">Mô tả</th>
                                    <th className="px-4 py-3 text-left">Loại giảm</th>
                                    <th className="px-4 py-3 text-left">Giá trị</th>
                                    <th className="px-4 py-3 text-left">Đã dùng</th>
                                    <th className="px-4 py-3 text-left">Thời hạn</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {promotions.map((promotion) => (
                                    <tr key={promotion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium">
                                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 rounded font-mono">
                                                {promotion.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{promotion.description || '-'}</td>
                                        <td className="px-4 py-3">{promotion.discountType === 'Percentage' ? 'Phần trăm' : 'Số tiền'}</td>
                                        <td className="px-4 py-3">
                                            {promotion.discountType === 'Percentage' 
                                                ? `${promotion.discountValue}%`
                                                : `${promotion.discountValue.toLocaleString('vi-VN')} ₫`}
                                            {promotion.maxDiscountAmount && (
                                                <span className="text-xs text-gray-500"> (tối đa {promotion.maxDiscountAmount.toLocaleString('vi-VN')} ₫)</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {promotion.usedCount} / {promotion.maxUsageCount || '∞'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs">
                                                <div>{new Date(promotion.startDate).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-gray-500">→ {new Date(promotion.endDate).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(promotion)}`}>
                                                {getStatusText(promotion)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(promotion)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(promotion.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Xóa"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {editingPromotion ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingPromotion(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mã giảm giá *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Ví dụ: SALE10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Mô tả về mã giảm giá"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Loại giảm giá *
                                        </label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="Percentage">Phần trăm (%)</option>
                                            <option value="FixedAmount">Số tiền cố định</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Giá trị giảm *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                {formData.discountType === 'Percentage' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Giảm tối đa (₫)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.maxDiscountAmount || ''}
                                            onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null })}
                                            min="0"
                                            step="1000"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Đơn hàng tối thiểu (₫)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.minOrderAmount || ''}
                                            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value ? parseFloat(e.target.value) : null })}
                                            min="0"
                                            step="1000"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Số lần sử dụng tối đa
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.maxUsageCount || ''}
                                            onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value ? parseInt(e.target.value) : null })}
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ngày bắt đầu *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ngày kết thúc *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Kích hoạt mã giảm giá
                                    </label>
                                </div>
                                
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                    >
                                        {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingPromotion(null);
                                        }}
                                        variant="secondary"
                                        className="px-4 py-2 text-gray-900 dark:text-white"
                                    >
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
