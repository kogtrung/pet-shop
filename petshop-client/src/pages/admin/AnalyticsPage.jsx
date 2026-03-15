import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Phân tích & Gợi ý</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Dự đoán nhu cầu, gợi ý nhập hàng và phân tích khách hàng
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                <ExclamationCircleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Tính năng đang phát triển
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Chức năng phân tích nâng cao sẽ sớm được ra mắt
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-2xl mx-auto">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Dự kiến bao gồm:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 text-left list-disc list-inside space-y-1">
                        <li>Dự đoán nhu cầu sản phẩm dựa trên lịch sử bán hàng</li>
                        <li>Gợi ý nhập hàng khi sản phẩm sắp hết</li>
                        <li>Phân tích hành vi khách hàng</li>
                        <li>Dự báo doanh thu theo thời gian</li>
                        <li>Phân tích xu hướng mua sắm</li>
                        <li>Gợi ý sản phẩm nên nhập thêm</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

