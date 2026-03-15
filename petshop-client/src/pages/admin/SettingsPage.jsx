import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { Cog6ToothIcon, BuildingStorefrontIcon, CreditCardIcon, TruckIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('store');
    const [storeInfo, setStoreInfo] = useState({
        name: 'PetShop',
        address: '',
        phone: '',
        email: '',
        workingHours: '8:00 - 20:00',
        description: ''
    });

    const [paymentMethods, setPaymentMethods] = useState({
        cod: true,
        vnpay: false,
        momo: false,
        creditCard: false
    });

    const handleSaveStoreInfo = () => {
        // TODO: Implement API call to save store info
        toast.success('Đã lưu thông tin cửa hàng');
    };

    const handleSavePaymentMethods = () => {
        // TODO: Implement API call to save payment methods
        toast.success('Đã lưu cấu hình thanh toán');
    };

    const tabs = [
        { id: 'store', label: 'Thông tin cửa hàng', icon: BuildingStorefrontIcon },
        { id: 'payment', label: 'Thanh toán', icon: CreditCardIcon },
        { id: 'shipping', label: 'Vận chuyển', icon: TruckIcon },
        { id: 'roles', label: 'Quyền người dùng', icon: UserGroupIcon }
    ];

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cài đặt hệ thống</h1>
                <p className="text-gray-600 dark:text-gray-400">Cấu hình thông tin cửa hàng, thanh toán và vận chuyển</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <TabIcon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'store' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Thông tin cửa hàng</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tên cửa hàng *
                                    </label>
                                    <input
                                        type="text"
                                        value={storeInfo.name}
                                        onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Địa chỉ
                                    </label>
                                    <textarea
                                        value={storeInfo.address}
                                        onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            value={storeInfo.phone}
                                            onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={storeInfo.email}
                                            onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Giờ làm việc
                                    </label>
                                    <input
                                        type="text"
                                        value={storeInfo.workingHours}
                                        onChange={(e) => setStoreInfo({ ...storeInfo, workingHours: e.target.value })}
                                        placeholder="Ví dụ: 8:00 - 20:00"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveStoreInfo}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                >
                                    Lưu thông tin
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Phương thức thanh toán</h2>
                            <div className="space-y-3">
                                {Object.entries(paymentMethods).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div>
                                            <label className="font-medium text-gray-900 dark:text-white">
                                                {key === 'cod' && 'Tiền mặt (COD)'}
                                                {key === 'vnpay' && 'VNPay'}
                                                {key === 'momo' && 'MoMo'}
                                                {key === 'creditCard' && 'Thẻ tín dụng'}
                                            </label>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={(e) => setPaymentMethods({ ...paymentMethods, [key]: e.target.checked })}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                                <Button
                                    onClick={handleSavePaymentMethods}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                >
                                    Lưu cấu hình
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shipping' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cấu hình vận chuyển</h2>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    Tính năng cấu hình vận chuyển đang được phát triển. Sẽ bao gồm:
                                </p>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                                    <li>Phí vận chuyển theo khu vực</li>
                                    <li>Khu vực giao hàng</li>
                                    <li>Thời gian giao hàng dự kiến</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quản lý quyền người dùng</h2>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    Quản lý quyền người dùng có thể thực hiện tại trang <strong>Quản lý người dùng</strong>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
