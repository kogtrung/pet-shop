import React, { useState, useEffect } from 'react';
import { 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    PhotoIcon,
    EyeIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import { getBanners, createBanner, updateBanner, deleteBanner, updateBannerOrder } from '../../api/bannerApi';
import toast from 'react-hot-toast';

export default function BannerManagementPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [previewBanner, setPreviewBanner] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        caption: '',
        image: '',
        link: '',
        buttonText: '',
        isActive: true
    });

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        setLoading(true);
        try {
            const apiBanners = await getBanners();
            if (Array.isArray(apiBanners) && apiBanners.length > 0) {
                // Map API banners to UI shape
                const mapped = apiBanners.map((b, index) => ({
                    id: b.id,
                    title: b.title || '',
                    caption: b.caption || '',
                    image: b.imageUrl,
                    link: b.linkUrl,
                    buttonText: b.buttonText || '',
                    isActive: b.isActive,
                    order: b.displayOrder ?? (index + 1)
                }));
                setBanners(mapped);
            } else {
                setBanners([]);
            }
        } catch (error) {
            console.error('Error loading banners:', error);
            setBanners([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.image) {
            toast.error('Vui lòng nhập tiêu đề và URL hình ảnh');
            return;
        }

        try {
            if (editingBanner) {
                // Update existing banner
                await updateBanner(editingBanner.id, { ...editingBanner, ...formData });
                setBanners(prev => prev.map(banner => 
                    banner.id === editingBanner.id 
                        ? { ...banner, ...formData }
                        : banner
                ));
                toast.success('Cập nhật banner thành công');
            } else {
                // Create new banner
                const newBannerData = {
                    ...formData,
                    order: banners.length + 1
                };
                const created = await createBanner(newBannerData);
                setBanners(prev => [...prev, {
                    id: created.id,
                    ...newBannerData
                }]);
                toast.success('Tạo banner mới thành công');
            }

            setShowModal(false);
            setEditingBanner(null);
            setFormData({
                title: '',
                caption: '',
                image: '',
                link: '',
                buttonText: '',
                isActive: true
            });
        } catch (error) {
            console.error('Error saving banner:', error);
            toast.error('Có lỗi xảy ra khi lưu banner');
        }
    };

    const handleEdit = (banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title,
            caption: banner.caption,
            image: banner.image,
            link: banner.link,
            buttonText: banner.buttonText,
            isActive: banner.isActive
        });
        setShowModal(true);
    };

    const handleDelete = async (bannerId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa banner này?')) {
            try {
                await deleteBanner(bannerId);
                setBanners(prev => prev.filter(banner => banner.id !== bannerId));
                toast.success('Xóa banner thành công');
            } catch (error) {
                console.error('Error deleting banner:', error);
                toast.error('Có lỗi xảy ra khi xóa banner');
            }
        }
    };

    const handleToggleActive = async (bannerId) => {
        try {
            const banner = banners.find(b => b.id === bannerId);
            const updatedData = { ...banner, isActive: !banner.isActive };
            await updateBanner(bannerId, updatedData);
            setBanners(prev => prev.map(banner => 
                banner.id === bannerId 
                    ? { ...banner, isActive: !banner.isActive }
                    : banner
            ));
            toast.success('Cập nhật trạng thái banner thành công');
        } catch (error) {
            console.error('Error updating banner status:', error);
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
        }
    };

    const handleMoveUp = (bannerId) => {
        setBanners(prev => {
            const bannerIndex = prev.findIndex(b => b.id === bannerId);
            if (bannerIndex <= 0) return prev;
            
            const newBanners = [...prev];
            [newBanners[bannerIndex], newBanners[bannerIndex - 1]] = 
            [newBanners[bannerIndex - 1], newBanners[bannerIndex]];
            
            // Update order values
            newBanners.forEach((banner, index) => {
                banner.order = index + 1;
            });
            
            return newBanners;
        });
    };

    const handleMoveDown = (bannerId) => {
        setBanners(prev => {
            const bannerIndex = prev.findIndex(b => b.id === bannerId);
            if (bannerIndex >= prev.length - 1) return prev;
            
            const newBanners = [...prev];
            [newBanners[bannerIndex], newBanners[bannerIndex + 1]] = 
            [newBanners[bannerIndex + 1], newBanners[bannerIndex]];
            
            // Update order values
            newBanners.forEach((banner, index) => {
                banner.order = index + 1;
            });
            
            return newBanners;
        });
    };

    const sortedBanners = [...banners].sort((a, b) => a.order - b.order);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Banner</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Quản lý banner hiển thị trên trang chủ
                    </p>
                </div>
                <Button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" />
                    Thêm Banner
                </Button>
            </div>

            {/* Banner List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {sortedBanners.length === 0 ? (
                    <div className="p-8 text-center">
                        <PhotoIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Chưa có banner nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedBanners.map((banner, index) => (
                            <div key={banner.id} className="p-6">
                                <div className="flex items-start gap-4">
                                    {/* Banner Image */}
                                    <div className="flex-shrink-0">
                                        <img
                                            src={banner.image}
                                            alt={banner.title}
                                            className="w-32 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/320x200?text=No+Image';
                                            }}
                                        />
                                    </div>

                                    {/* Banner Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {banner.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {banner.caption}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span>Thứ tự: {banner.order}</span>
                                                    <span>Link: {banner.link || 'Không có'}</span>
                                                    <span>Button: {banner.buttonText || 'Không có'}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                banner.isActive 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {banner.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {/* Move Up/Down */}
                                        <button
                                            onClick={() => handleMoveUp(banner.id)}
                                            disabled={index === 0}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Di chuyển lên"
                                        >
                                            <ArrowUpIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(banner.id)}
                                            disabled={index === sortedBanners.length - 1}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Di chuyển xuống"
                                        >
                                            <ArrowDownIcon className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Preview */}
                                        <button
                                            onClick={() => setPreviewBanner(banner)}
                                            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            title="Xem trước"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Edit */}
                                        <button
                                            onClick={() => handleEdit(banner)}
                                            className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                            title="Chỉnh sửa"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Toggle Active */}
                                        <button
                                            onClick={() => handleToggleActive(banner.id)}
                                            className={`px-3 py-1 rounded text-xs font-medium ${
                                                banner.isActive
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                                            }`}
                                        >
                                            {banner.isActive ? 'Ẩn' : 'Hiện'}
                                        </button>
                                        
                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                                            title="Xóa"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner Mới'}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tiêu đề *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mô tả
                                </label>
                                <textarea
                                    name="caption"
                                    value={formData.caption}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    URL Hình ảnh *
                                </label>
                                <input
                                    type="url"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="https://example.com/image.jpg"
                                    required
                                />
                                {formData.image && (
                                    <div className="mt-2">
                                        <img
                                            src={formData.image}
                                            alt="Preview"
                                            className="w-full h-32 object-cover rounded border"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Link đích
                                </label>
                                <input
                                    type="text"
                                    name="link"
                                    value={formData.link}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="/products, /services, ..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Văn bản nút bấm
                                </label>
                                <input
                                    type="text"
                                    name="buttonText"
                                    value={formData.buttonText}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Mua ngay, Xem thêm, ..."
                                />
                            </div>
                            
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    Hiển thị banner này
                                </label>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingBanner(null);
                                        setFormData({
                                            title: '',
                                            caption: '',
                                            image: '',
                                            link: '',
                                            buttonText: '',
                                            isActive: true
                                        });
                                    }}
                                >
                                    Hủy
                                </Button>
                                <Button type="submit">
                                    {editingBanner ? 'Cập nhật' : 'Tạo mới'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewBanner && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Xem trước Banner
                            </h2>
                            <button
                                onClick={() => setPreviewBanner(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="relative overflow-hidden bg-gray-900 rounded-lg">
                                <div className="relative h-[300px] md:h-[400px]">
                                    <img 
                                        src={previewBanner.image} 
                                        alt={previewBanner.title} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="container mx-auto px-4">
                                            <div className="max-w-2xl text-white">
                                                <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
                                                    {previewBanner.title}
                                                </h2>
                                                {previewBanner.caption && (
                                                    <p className="text-lg md:text-xl text-gray-200 mb-8">
                                                        {previewBanner.caption}
                                                    </p>
                                                )}
                                                {previewBanner.buttonText && (
                                                    <div className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-2xl">
                                                        {previewBanner.buttonText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
