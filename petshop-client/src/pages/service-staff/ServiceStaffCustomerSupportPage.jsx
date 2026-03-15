import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function ServiceStaffCustomerSupportPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hỗ trợ khách hàng</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Liên hệ và gửi thông báo cho khách hàng về lịch hẹn dịch vụ
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                <ExclamationCircleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Tính năng đang phát triển
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Chức năng hỗ trợ khách hàng sẽ sớm được ra mắt
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-2xl mx-auto">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Dự kiến bao gồm:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 text-left list-disc list-inside space-y-1">
                        <li>Xem thông tin liên hệ khách hàng (SĐT, email)</li>
                        <li>Gọi điện xác nhận giờ đến trước lịch hẹn</li>
                        <li>Gửi thông báo SMS/Email khi hoàn tất dịch vụ</li>
                        <li>Gửi thông báo nhắc nhở lịch hẹn</li>
                        <li>Gửi ảnh "sau dịch vụ" cho khách hàng</li>
                        <li>Ghi chú về yêu cầu đặc biệt của khách hàng</li>
                        <li>Lịch sử liên hệ với khách hàng</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

