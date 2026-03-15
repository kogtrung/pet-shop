import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getServiceById } from '../api/serviceApi.js';
import toast from 'react-hot-toast';
import {
    CurrencyDollarIcon,
    SparklesIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../components/common/Button.jsx';

export default function ServiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPackageId, setSelectedPackageId] = useState(null);

    useEffect(() => {
        loadService();
    }, [id]);

    const loadService = async () => {
        setLoading(true);
        try {
            const response = await getServiceById(id);
            const serviceData = response.data;
            setService(serviceData);
            setSelectedPackageId(serviceData.packages?.[0]?.id ?? null);
        } catch (error) {
            console.error('Error loading service:', error);
            toast.error('Không thể tải thông tin dịch vụ');
            navigate('/services');
        } finally {
            setLoading(false);
        }
    };

    const handleBookService = () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để đặt lịch');
            navigate('/');
            return;
        }
        if (!selectedPackageId) {
            toast.error('Vui lòng chọn gói dịch vụ trước khi đặt lịch');
            return;
        }

        navigate('/service-booking', { state: { serviceId: service.id, packageId: selectedPackageId } });
    };

    const getPackagePrice = (pkg) => {
        if (!pkg) return 'Liên hệ';
        return `${pkg.price.toLocaleString('vi-VN')} ₫`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 animate-pulse">
                        <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg mb-6"></div>
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                        <InformationCircleIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Không tìm thấy dịch vụ
                        </h3>
                        <button
                            onClick={() => navigate('/services')}
                            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Quay lại danh sách dịch vụ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const selectedPackage = service.packages?.find((pkg) => pkg.id === selectedPackageId) ?? null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    {service.name}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    {service.description || 'Dịch vụ chăm sóc thú cưng chuyên nghiệp với đội ngũ giàu kinh nghiệm.'}
                                </p>

                                {service.packages?.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                            Các gói dịch vụ
                                        </h3>
                                        <div className="space-y-2">
                                            {service.packages.map((pkg) => (
                                                <label
                                                    key={pkg.id}
                                                    className={`block border rounded-lg p-3 cursor-pointer transition-all ${
                                                        selectedPackageId === pkg.id
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-2'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                {pkg.name}
                                                            </p>
                                                            {pkg.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    {pkg.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-black dark:text-white text-base whitespace-nowrap">
                                                                {getPackagePrice(pkg)}
                                                            </p>
                                                            <input
                                                                type="radio"
                                                                name="selectedPackage"
                                                                checked={selectedPackageId === pkg.id}
                                                                onChange={() => setSelectedPackageId(pkg.id)}
                                                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" strokeWidth={2} />
                                        <div>
                                            <p className="text-xs font-medium text-gray-900 dark:text-white">Chuyên nghiệp</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Đội ngũ giàu kinh nghiệm</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <CheckCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" strokeWidth={2} />
                                        <div>
                                            <p className="text-xs font-medium text-gray-900 dark:text-white">Tiện lợi</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Đặt lịch linh hoạt</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 sticky top-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <CalendarDaysIcon className="w-5 h-5 mr-2 text-indigo-600" strokeWidth={2} />
                                Đặt lịch dịch vụ
                            </h2>

                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gói đã chọn</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {selectedPackage
                                        ? `${selectedPackage.name} - ${getPackagePrice(selectedPackage)}`
                                        : 'Chưa chọn gói'}
                                </p>
                            </div>

                            <button
                                onClick={handleBookService}
                                disabled={!selectedPackageId}
                                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                                <CalendarDaysIcon className="w-4 h-4" strokeWidth={2} />
                                Đặt lịch ngay
                            </button>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                Chúng tôi sẽ liên hệ xác nhận lịch hẹn trong vòng 24h
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}