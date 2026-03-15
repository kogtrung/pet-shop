import React, { useEffect, useState } from 'react';
import { getProducts } from '../../api/productApi';
import { getInventory, getLowStockProducts } from '../../api/inventoryApi';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, BellIcon } from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';

export default function StaffInventoryPage() {
    const [products, setProducts] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const [productsRes, lowStockRes] = await Promise.all([
                getProducts({ pageSize: 100 }),
                getLowStockProducts()
            ]);
            
            const productsList = productsRes.data?.items || productsRes.data || [];
            
            // Load inventory for each product
            const productsWithInventory = await Promise.all(
                productsList.map(async (product) => {
                    try {
                        const invRes = await getInventory(product.id);
                        return {
                            ...product,
                            inventory: invRes.data
                        };
                    } catch (error) {
                        return {
                            ...product,
                            inventory: { quantity: 0, needsReorder: false }
                        };
                    }
                })
            );
            
            setProducts(productsWithInventory);
            setLowStockProducts(lowStockRes.data || []);
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Không thể tải thông tin tồn kho');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = product.name?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        
        // Stock filter
        const inventory = product.inventory || {};
        const quantity = inventory.quantity || product.quantity || 0;
        const reorderLevel = inventory.reorderLevel || 0;
        
        if (stockFilter === 'low') {
            // Sắp hết hàng: quantity > 0 và quantity <= reorderLevel, hoặc quantity = 0
            if (quantity > reorderLevel || (reorderLevel === 0 && quantity > 0)) return false;
        } else if (stockFilter === 'out') {
            if (quantity > 0) return false;
        }
        
        return true;
    });

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý tồn kho</h1>
                    <p className="text-gray-600 dark:text-gray-400">Kiểm tra tồn kho và báo nhập hàng</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm sản phẩm..."
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="low">Sắp hết hàng</option>
                        <option value="out">Hết hàng</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStockFilter('all');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                    >
                        Đặt lại
                    </button>
                </div>
            </header>

            {lowStockProducts.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                            Cảnh báo: {lowStockProducts.length} sản phẩm sắp hết hàng
                        </h3>
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        Vui lòng báo nhập hàng cho các sản phẩm này.
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Không tìm thấy sản phẩm nào.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                                    <th className="px-4 py-3 text-left">Tồn kho</th>
                                    <th className="px-4 py-3 text-left">Mức cảnh báo</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredProducts.map((product) => {
                                    const inventory = product.inventory || {};
                                    const quantity = inventory.quantity || product.quantity || 0;
                                    const reorderLevel = inventory.reorderLevel || 0;
                                    // Cần nhập hàng nếu quantity <= reorderLevel và quantity > 0, hoặc quantity = 0
                                    const needsReorder = (reorderLevel > 0 && quantity <= reorderLevel) || quantity === 0;
                                    const isLowStock = reorderLevel > 0 && quantity > 0 && quantity <= reorderLevel;
                                    
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-medium">{product.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-semibold ${
                                                    quantity === 0 
                                                        ? 'text-red-600 dark:text-red-400' 
                                                        : isLowStock
                                                        ? 'text-yellow-600 dark:text-yellow-400' 
                                                        : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                    {quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-900 dark:text-white">
                                                    {reorderLevel > 0 ? reorderLevel : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {quantity === 0 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                        Hết hàng
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                        Sắp hết hàng
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        Còn hàng
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {needsReorder && (
                                                    <Button
                                                        onClick={() => {
                                                            toast.success(`Đã báo nhập hàng cho sản phẩm: ${product.name}`);
                                                            // TODO: Gửi thông báo đến admin
                                                        }}
                                                        className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                                                    >
                                                        <BellIcon className="w-4 h-4 inline mr-1" />
                                                        Báo nhập hàng
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

