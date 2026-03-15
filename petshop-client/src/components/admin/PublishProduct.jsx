import React, { useState } from 'react';
import apiClient from '../../api/apiClient';
import toast from 'react-hot-toast';

export default function PublishProduct() {
    const [productId, setProductId] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handlePublish = async (e) => {
        e.preventDefault();
        
        if (!productId) {
            toast.error('Vui lòng nhập ID sản phẩm');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await apiClient.post(`/api/Product/${productId}/publish`);
            toast.success(response.data.message);
            console.log('Product published:', response.data);
        } catch (error) {
            console.error('Error publishing product:', error);
            toast.error('Có lỗi xảy ra khi xuất bản sản phẩm');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Publish Product
            </h2>
            
            <form onSubmit={handlePublish} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product ID
                    </label>
                    <input
                        type="number"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Nhập ID sản phẩm"
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Đang xử lý...' : 'Publish Product'}
                </button>
            </form>
        </div>
    );
}