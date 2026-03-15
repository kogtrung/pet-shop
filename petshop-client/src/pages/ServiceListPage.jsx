import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getServices } from '../api/serviceApi.js';
import toast from 'react-hot-toast';
import {
    MagnifyingGlassIcon,
    CurrencyDollarIcon,
    SparklesIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline';

export default function ServiceListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalServices, setTotalServices] = useState(0);
    
    // Filters from URL or defaults
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        sortBy: searchParams.get('sortBy') || 'name',
        sortOrder: searchParams.get('sortOrder') || 'asc',
        page: parseInt(searchParams.get('page')) || 1,
        pageSize: 12
    });
    
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadServices();
    }, [filters]);

    const loadServices = async () => {
        setLoading(true);
        try {
            const response = await getServices();
            let data = response.data || [];

            data = data.filter((service) => service.isActive !== false);

            if (filters.search) {
                const keyword = filters.search.toLowerCase();
                data = data.filter(
                    (service) =>
                        service.name?.toLowerCase().includes(keyword) ||
                        service.description?.toLowerCase().includes(keyword)
                );
            }

            data.sort((a, b) => {
                const direction = filters.sortOrder === 'desc' ? -1 : 1;
                if (filters.sortBy === 'name') {
                    return a.name.localeCompare(b.name) * direction;
                }

                const priceA = (a.packages?.[0]?.price) ?? 0;
                const priceB = (b.packages?.[0]?.price) ?? 0;
                return (priceA - priceB) * direction;
            });

            setTotalServices(data.length);

            const startIndex = (filters.page - 1) * filters.pageSize;
            const pagedData = data.slice(startIndex, startIndex + filters.pageSize);

            setServices(pagedData);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error('Không thể tải danh sách dịch vụ');
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    const updateFilters = (newFilters) => {
        const updated = { ...filters, ...newFilters, page: newFilters.page ?? 1 };
        setFilters(updated);

        const params = new URLSearchParams();
        if (updated.search) params.set('search', updated.search);
        if (updated.sortBy) params.set('sortBy', updated.sortBy);
        if (updated.sortOrder) params.set('sortOrder', updated.sortOrder);
        if (updated.page !== 1) params.set('page', String(updated.page));
        setSearchParams(params);
    };

    const handleServiceClick = (serviceId) => {
        navigate(`/services/${serviceId}`);
    };

    const handleBookService = (serviceId, event) => {
        event.stopPropagation();
        navigate('/service-booking', { state: { serviceId } });
    };

    const clearFilters = () => {
        updateFilters({
            search: '',
            sortBy: 'name',
            sortOrder: 'asc',
            page: 1
        });
    };

    // Pagination
    const totalPages = Math.ceil(totalServices / filters.pageSize);
    const canGoPrevious = filters.page > 1;
    const canGoNext = filters.page < totalPages;

    const getDisplayPrice = (service) => {
        const basePrice = service.packages?.[0]?.price;
        if (!basePrice) return 'Liên hệ';
        return `${basePrice.toLocaleString('vi-VN')} ₫`;
    };

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                        <SparklesIcon className="w-10 h-10 mr-3 text-indigo-600" />
                        Dịch vụ chăm sóc thú cưng
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Khám phá các dịch vụ chăm sóc chuyên nghiệp cho thú cưng của bạn
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilters({ search: e.target.value })}
                            placeholder="Tìm kiếm dịch vụ..."
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Filter Toggle Button (Mobile) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                Sắp xếp
                            </label>
                            <select
                                value={`${filters.sortBy}-${filters.sortOrder}`}
                                onChange={(e) => {
                                    const [sortBy, sortOrder] = e.target.value.split('-');
                                    updateFilters({ sortBy, sortOrder });
                                }}
                                className="w-full px-4 py-2 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="name-asc">Tên: A-Z</option>
                                <option value="name-desc">Tên: Z-A</option>
                                <option value="price-asc">Giá: Thấp đến cao</option>
                                <option value="price-desc">Giá: Cao đến thấp</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-6 text-sm text-textDark/70 font-heading">
                    Tìm thấy {totalServices} dịch vụ
                </div>

                {/* Services Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-card shadow-soft p-6 animate-pulse">
                                <div className="h-48 bg-softGray rounded-image mb-4"></div>
                                <div className="h-6 bg-softGray rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-softGray rounded w-1/2 mb-4"></div>
                                <div className="h-4 bg-softGray rounded w-full mb-2"></div>
                                <div className="h-4 bg-softGray rounded w-5/6"></div>
                            </div>
                        ))}
                    </div>
                ) : services.length === 0 ? (
                    <div className="bg-white rounded-card shadow-soft p-12 text-center">
                        <SparklesIcon className="w-20 h-20 text-textDark/30 mx-auto mb-4" strokeWidth={2} />
                        <h3 className="text-xl font-heading font-semibold text-textDark mb-2">
                            Không tìm thấy dịch vụ
                        </h3>
                        <p className="text-textDark/70 mb-6">
                            Không có dịch vụ nào phù hợp với bộ lọc của bạn
                        </p>
                        <button
                            onClick={clearFilters}
                            className="px-6 py-2 border border-black bg-black text-white rounded-none hover:bg-white hover:text-black transition-all duration-300 font-heading font-semibold"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group flex flex-col h-full"
                                >
                                    {/* Service Header - Compact */}
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {service.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                            {service.description || 'Dịch vụ chăm sóc thú cưng chuyên nghiệp'}
                                        </p>
                                    </div>

                                    {/* Service Packages - Compact List */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        {service.packages && service.packages.length > 0 ? (
                                            <div className="space-y-2 mb-4">
                                                {service.packages.map((pkg) => (
                                                    <div key={pkg.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {pkg.name}
                                                            </p>
                                                            {pkg.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {pkg.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="ml-2 text-sm font-bold text-black dark:text-white whitespace-nowrap">
                                                            {pkg.price?.toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mb-4 text-sm text-gray-400 text-center py-2">
                                                Chưa có gói dịch vụ
                                            </div>
                                        )}

                                        {/* Action Buttons - Always at card bottom */}
                                        <div className="flex gap-2 mt-auto">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleServiceClick(service.id);
                                                }}
                                                className="flex-1 py-2 px-3 text-sm border border-black text-black rounded-none hover:bg-white transition-colors font-medium"
                                            >
                                                Chi tiết
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleBookService(service.id, event);
                                                }}
                                                className="flex-1 py-2 px-3 text-sm border border-black bg-black text-white rounded-none hover:bg-white hover:text-black transition-all duration-300 font-medium"
                                            >
                                                Đặt lịch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-1.5 text-sm">
                                <button
                                    onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
                                    disabled={!canGoPrevious}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Trước
                                </button>

                                <div className="flex gap-2">
                                    {filters.page > 2 && (
                                        <>
                                            <button
                                                onClick={() => updateFilters({ page: 1 })}
                                                className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                1
                                            </button>
                                            {filters.page > 3 && <span className="px-2 py-2">...</span>}
                                        </>
                                    )}

                                    {filters.page > 1 && (
                                        <button
                                            onClick={() => updateFilters({ page: filters.page - 1 })}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            {filters.page - 1}
                                        </button>
                                    )}

                                    <button className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white">
                                        {filters.page}
                                    </button>

                                    {filters.page < totalPages && (
                                        <button
                                            onClick={() => updateFilters({ page: filters.page + 1 })}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            {filters.page + 1}
                                        </button>
                                    )}

                                    {filters.page < totalPages - 1 && (
                                        <>
                                            {filters.page < totalPages - 2 && <span className="px-2 py-2">...</span>}
                                            <button
                                                onClick={() => updateFilters({ page: totalPages })}
                                                className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => updateFilters({ page: Math.min(totalPages, filters.page + 1) })}
                                    disabled={!canGoNext}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}