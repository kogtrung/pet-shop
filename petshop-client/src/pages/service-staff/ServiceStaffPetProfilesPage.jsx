import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function ServiceStaffPetProfilesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hồ sơ thú cưng</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Xem và cập nhật thông tin, tình trạng thú cưng trước và sau dịch vụ
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                <ExclamationCircleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Tính năng đang phát triển
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Chức năng quản lý hồ sơ thú cưng sẽ sớm được ra mắt
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-2xl mx-auto">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Dự kiến bao gồm:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 text-left list-disc list-inside space-y-1">
                        <li>Xem thông tin thú cưng (tên, loài, giống, tuổi, cân nặng)</li>
                        <li>Xem lịch sử dịch vụ đã sử dụng</li>
                        <li>Cập nhật tình trạng thú cưng trước dịch vụ</li>
                        <li>Ghi chú tình trạng sau dịch vụ (nhật ký chăm sóc)</li>
                        <li>Lưu ảnh trước và sau dịch vụ</li>
                        <li>Ghi chú đặc biệt về sức khỏe, hành vi</li>
                        <li>Lịch sử tiêm chủng, khám bệnh (nếu có)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

