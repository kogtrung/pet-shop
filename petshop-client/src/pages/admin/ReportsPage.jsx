import React, { useState } from 'react';
import { fetchAllOrders } from '../../api/orderApi';
import { getAllServiceBookings } from '../../api/serviceBookingApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { DocumentArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('orders');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
        endDate: new Date().toISOString().split('T')[0] // Today
    });

    const handleExport = async (format) => {
        setLoading(true);
        try {
            let data = [];
            let filename = '';

            if (reportType === 'orders') {
                const response = await fetchAllOrders();
                data = response.data?.items || response.data || [];
                filename = `BaoCaoDonHang_${dateRange.startDate}_${dateRange.endDate}`;
            } else if (reportType === 'bookings') {
                const response = await getAllServiceBookings();
                data = response.data || [];
                filename = `BaoCaoLichHen_${dateRange.startDate}_${dateRange.endDate}`;
            }

            // Filter by date range
            const filteredData = data.filter(item => {
                const itemDate = new Date(item.createdAt || item.bookingDateTime);
                const start = new Date(dateRange.startDate);
                const end = new Date(dateRange.endDate);
                end.setHours(23, 59, 59, 999);
                return itemDate >= start && itemDate <= end;
            });

            if (format === 'csv') {
                exportToCSV(filteredData, filename);
            } else if (format === 'json') {
                exportToJSON(filteredData, filename);
            }

            toast.success('Xuất báo cáo thành công!');
        } catch (error) {
            console.error('Error exporting report:', error);
            toast.error('Không thể xuất báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = (data, filename) => {
        if (data.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
    };

    const exportToJSON = (data, filename) => {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.json`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Báo cáo & Tài chính</h1>
                <p className="text-gray-600 dark:text-gray-400">Xuất báo cáo chi tiết ra file Excel/CSV/JSON</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
                {/* Report Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Loại báo cáo
                    </label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="orders">Báo cáo đơn hàng</option>
                        <option value="bookings">Báo cáo lịch hẹn dịch vụ</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Từ ngày
                        </label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Đến ngày
                        </label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button
                        onClick={() => handleExport('csv')}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                        <DocumentArrowDownIcon className="w-5 h-5 inline mr-2" />
                        {loading ? 'Đang xuất...' : 'Xuất CSV'}
                    </Button>
                    <Button
                        onClick={() => handleExport('json')}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                        <DocumentArrowDownIcon className="w-5 h-5 inline mr-2" />
                        {loading ? 'Đang xuất...' : 'Xuất JSON'}
                    </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Lưu ý:</strong> Báo cáo sẽ bao gồm tất cả dữ liệu trong khoảng thời gian đã chọn. 
                        File CSV có thể mở bằng Excel, Google Sheets hoặc bất kỳ phần mềm bảng tính nào.
                    </p>
                </div>
            </div>
        </div>
    );
}
