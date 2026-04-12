import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserIcon,
    PhoneIcon,
    ChatBubbleLeftRightIcon,
    CreditCardIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { createWalkInBooking, getStaffAvailability } from '../../api/serviceBookingApi.js';
import { getServices, getServiceById } from '../../api/serviceApi.js';
import { searchCustomers } from '../../api/userApi.js';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const WORKING_START_HOUR = 8;
const WORKING_END_HOUR = 19;

const checkWorkingHours = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return currentHour >= WORKING_START_HOUR && currentHour < WORKING_END_HOUR;
};

export default function StaffWalkInBookingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [allServices, setAllServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        petName: '',
        petType: '',
        petBreed: '',
        petAge: '',
        petWeight: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWithinWorkingHours, setIsWithinWorkingHours] = useState(checkWorkingHours());

    // Customer search
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    
    // Staff availability
    const [serviceStaff, setServiceStaff] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const workingHoursLabel = `${WORKING_START_HOUR.toString().padStart(2, '0')}:00 - ${WORKING_END_HOUR
        .toString()
        .padStart(2, '0')}:00`;

    useEffect(() => {
        loadAllServices();
        loadServiceStaff();
    }, []);

    const isStaffInitialLoad = useRef(true);

    useEffect(() => {
        // Refresh staff status every 30 seconds
        const interval = setInterval(() => {
            loadServiceStaff(true); // silent refresh
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsWithinWorkingHours(checkWorkingHours());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleCustomerSearch = async (query) => {
        setCustomerSearchQuery(query);
        if (!query || query.trim().length < 2) {
            setCustomerSearchResults([]);
            setShowCustomerResults(false);
            return;
        }

        setIsSearchingCustomers(true);
        try {
            const response = await searchCustomers(query.trim());
            const customers = response.data || [];
            setCustomerSearchResults(customers);
            setShowCustomerResults(customers.length > 0);
        } catch (error) {
            console.error('Error searching customers:', error);
            setCustomerSearchResults([]);
            setShowCustomerResults(false);
        } finally {
            setIsSearchingCustomers(false);
        }
    };

    const handleSelectCustomer = (customer) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer.profile?.fullName || customer.fullName || customer.username || customer.email || '',
            customerEmail: customer.email || '',
            customerPhone: customer.profile?.phone || customer.phone || ''
        }));
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerResults(false);
        toast.success('Đã tải thông tin khách hàng');
    };

    const loadAllServices = async () => {
        setLoadingServices(true);
        try {
            const response = await getServices();
            const services = (response.data || []).filter(s => s.isActive !== false);
            setAllServices(services);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error('Không thể tải danh sách dịch vụ');
        } finally {
            setLoadingServices(false);
        }
    };

    const loadServiceStaff = async (silent = false) => {
        if (!silent && isStaffInitialLoad.current) {
            setLoadingStaff(true);
        }
        try {
            const today = new Date();
            const start = new Date(today);
            start.setHours(WORKING_START_HOUR, 0, 0, 0);
            const end = new Date(today);
            end.setHours(WORKING_END_HOUR, 0, 0, 0);

            const response = await getStaffAvailability({
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                onlyOnDuty: false
            });
            const staffList = response.data || [];
            setServiceStaff(staffList);
        } catch (error) {
            console.error('Error loading service staff:', error);
        } finally {
            setLoadingStaff(false);
            isStaffInitialLoad.current = false;
        }
    };

    const addServiceItem = async (serviceId = null) => {
        const newId = Date.now() + Math.random();

        if (!serviceId) {
            setSelectedItems(prev => [...prev, {
                id: newId,
                serviceId: null,
                service: null,
                packageIds: [],
                note: ''
            }]);
            return;
        }

        try {
            const serviceResponse = await getServiceById(serviceId);
            const service = serviceResponse.data;

            setSelectedItems(prev => {
                const exists = prev.some(item => item.serviceId === serviceId);
                if (exists) {
                    toast.info('Dịch vụ này đã được thêm');
                    return prev;
                }

                return [...prev, {
                    id: newId,
                    serviceId: service.id,
                    service: service,
                    packageIds: [],
                    note: ''
                }];
            });
        } catch (error) {
            console.error('Error loading service:', error);
            toast.error('Không thể tải thông tin dịch vụ');
        }
    };

    const removeServiceItem = (itemId) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    };

    const updateServiceItem = (itemId, updates) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, ...updates };
            }
            return item;
        }));
    };

    const handleServiceChange = async (itemId, serviceId) => {
        if (!serviceId) {
            updateServiceItem(itemId, {
                serviceId: null,
                service: null,
                packageIds: []
            });
            return;
        }

        try {
            const serviceResponse = await getServiceById(serviceId);
            const service = serviceResponse.data;

            updateServiceItem(itemId, {
                serviceId: service.id,
                service: service,
                packageIds: []
            });
        } catch (error) {
            console.error('Error loading service:', error);
            toast.error('Không thể tải thông tin dịch vụ');
        }
    };

    const handlePackageToggle = (itemId, packageId) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const currentPackageIds = item.packageIds || [];
                let newPackageIds;

                if (currentPackageIds.includes(packageId)) {
                    newPackageIds = currentPackageIds.filter(id => id !== packageId);
                } else {
                    newPackageIds = [...currentPackageIds, packageId];
                }

                return { ...item, packageIds: newPackageIds };
            }
            return item;
        }));
    };

    const { totalDuration, totalPrice } = useMemo(() => {
        let duration = 0;
        let price = 0;

        selectedItems.forEach(item => {
            if (item.service && item.packageIds && item.packageIds.length > 0) {
                item.packageIds.forEach(packageId => {
                    const package_ = item.service.packages?.find(p => p.id === packageId);
                    if (package_) {
                        duration += package_.durationMinutes || 60;
                        price += package_.price || 0;
                    }
                });
            } else if (item.service) {
                duration += 60;
            }
        });

        return { totalDuration: duration, totalPrice: price };
    }, [selectedItems]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (selectedItems.length === 0) {
            newErrors.items = 'Vui lòng chọn ít nhất 1 dịch vụ';
        }

        selectedItems.forEach((item, index) => {
            if (!item.serviceId) {
                newErrors[`item_${index}_service`] = 'Vui lòng chọn dịch vụ';
            }
            if (item.service?.packages && item.service.packages.length > 0 && (!item.packageIds || item.packageIds.length === 0)) {
                newErrors[`item_${index}_package`] = 'Vui lòng chọn ít nhất 1 gói dịch vụ';
            }
        });

        if (!formData.customerName.trim()) newErrors.customerName = 'Vui lòng nhập họ tên khách hàng';
        if (!formData.customerPhone.trim()) {
            newErrors.customerPhone = 'Vui lòng nhập số điện thoại';
        } else if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(formData.customerPhone)) {
            newErrors.customerPhone = 'Số điện thoại không hợp lệ';
        }
        if (!formData.customerEmail.trim()) {
            newErrors.customerEmail = 'Vui lòng nhập email';
        }
        if (!formData.petName.trim()) {
            newErrors.petName = 'Vui lòng nhập tên thú cưng';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isWithinWorkingHours) {
            toast.error(`Ngoài giờ làm việc (${workingHoursLabel}). Vui lòng quay lại trong ca trực.`);
            return;
        }
        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        setIsSubmitting(true);
        try {
            const serviceItems = selectedItems.map(item => {
                if (item.packageIds && item.packageIds.length > 0) {
                    return item.packageIds.map(packageId => ({
                        serviceId: item.serviceId,
                        servicePackageId: packageId,
                        note: item.note || null
                    }));
                } else {
                    return [{
                        serviceId: item.serviceId,
                        servicePackageId: null,
                        note: item.note || null
                    }];
                }
            }).flat();

            const walkInData = {
                customerName: formData.customerName.trim(),
                customerPhone: formData.customerPhone.trim(),
                customerEmail: formData.customerEmail.trim(),
                petName: formData.petName.trim(),
                petType: formData.petType.trim() || null,
                petBreed: formData.petBreed.trim() || null,
                petAge: formData.petAge ? parseInt(formData.petAge) : null,
                petWeight: formData.petWeight ? parseFloat(formData.petWeight) : null,
                note: formData.notes.trim() || null,
                serviceItems: serviceItems
            };

            const response = await createWalkInBooking(walkInData);

            toast.success('Đã tạo booking walk-in thành công! Hệ thống đã tự động phân công nhân viên.');

            // Redirect to service payments page
            setTimeout(() => {
                navigate('/staff/service-payments');
            }, 1500);

        } catch (error) {
            console.error('Error creating walk-in booking:', error);
            const errorMsg = error.response?.data?.error || 'Không thể tạo booking walk-in';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Đặt lịch Walk-in</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tạo booking cho khách hàng đến trực tiếp cửa hàng</p>
                </div>
                <Button
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Quay lại
                </Button>
            </header>

            <div
                className={`mb-4 rounded-lg border-l-4 p-4 ${
                    isWithinWorkingHours
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
                }`}
            >
                <p className="font-semibold">
                    {isWithinWorkingHours ? 'Trong giờ làm việc' : 'Ngoài giờ làm việc'}
                </p>
                <p className="text-sm">
                    Ca làm việc của sale staff: {workingHoursLabel}.{' '}
                    {isWithinWorkingHours
                        ? 'Bạn có thể tiếp nhận và tạo lịch cho khách walk-in.'
                        : 'Vui lòng đợi đến khi ca làm bắt đầu để tiếp tục tạo lịch mới.'}
                </p>
            </div>

            {/* Service Staff Status */}
            {isWithinWorkingHours && (
                <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Trạng thái nhân viên dịch vụ
                    </h3>
                    {loadingStaff ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : serviceStaff.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Không có nhân viên dịch vụ nào</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {serviceStaff.map((staff) => (
                                <div
                                    key={staff.staffId}
                                    className={`p-3 rounded-lg border ${
                                        staff.isOnDuty
                                            ? staff.isBusyInRange
                                                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                                : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                            : 'border-gray-300 bg-gray-50 dark:bg-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {staff.fullName || staff.email}
                                        </p>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                staff.isOnDuty
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            {staff.isOnDuty ? 'Đang trực' : 'Ngoài ca'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        {staff.isOnDuty ? (
                                            <>
                                                <p>
                                                    {staff.isBusyInRange ? (
                                                        <span className="text-yellow-700 dark:text-yellow-300">
                                                            ⚠️ Đang bận
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-700 dark:text-green-300">
                                                            ✓ Đang rảnh
                                                        </span>
                                                    )}
                                                </p>
                                                {staff.nextAvailableTime && (
                                                    <p>Rảnh lúc: {new Date(staff.nextAvailableTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                                )}
                                            </>
                                        ) : (
                                            <p>Không trong ca làm việc</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
                    {/* Left: Service Selection */}
                    <div className="flex flex-col min-h-0">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Chọn dịch vụ
                                </h2>
                                <Button
                                    type="button"
                                    onClick={() => addServiceItem()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                                    disabled={!isWithinWorkingHours}
                                    title={!isWithinWorkingHours ? 'Ngoài giờ làm việc' : undefined}
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Thêm dịch vụ
                                </Button>
                            </div>

                            {errors.items && (
                                <p className="mb-3 text-sm text-red-500">{errors.items}</p>
                            )}

                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
                                {selectedItems.map((item, index) => (
                                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                                Dịch vụ {index + 1}
                                            </h3>
                                            {selectedItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeServiceItem(item.id)}
                                                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Chọn dịch vụ
                                                </label>
                                                <select
                                                    value={item.serviceId || ''}
                                                    onChange={(e) => handleServiceChange(item.id, e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                >
                                                    <option value="">-- Chọn dịch vụ --</option>
                                                    {allServices.map(service => (
                                                        <option key={service.id} value={service.id}>
                                                            {service.name} - {service.basePrice?.toLocaleString('vi-VN')} ₫
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`item_${index}_service`] && (
                                                    <p className="mt-1 text-sm text-red-500">{errors[`item_${index}_service`]}</p>
                                                )}
                                            </div>

                                            {item.service?.packages && item.service.packages.length > 0 && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                        Chọn gói dịch vụ
                                                    </label>
                                                    <div className="space-y-1.5">
                                                        {item.service.packages.map(pkg => (
                                                            <label
                                                                key={pkg.id}
                                                                className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.packageIds?.includes(pkg.id)}
                                                                        onChange={() => handlePackageToggle(item.id, pkg.id)}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                                            {pkg.name}
                                                                        </p>
                                                                        {pkg.description && (
                                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                                {pkg.description}
                                                                            </p>
                                                                        )}
                                                                        {pkg.durationMinutes && (
                                                                            <p className="text-xs text-gray-400">
                                                                                Thời lượng: {pkg.durationMinutes} phút
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-primary-600">
                                                                        {pkg.price.toLocaleString('vi-VN')} ₫
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {errors[`item_${index}_package`] && (
                                                        <p className="mt-1 text-sm text-red-500">{errors[`item_${index}_package`]}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Ghi chú (tùy chọn)
                                                </label>
                                                <textarea
                                                    value={item.note || ''}
                                                    onChange={(e) => updateServiceItem(item.id, { note: e.target.value })}
                                                    rows={2}
                                                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    placeholder="Nhập ghi chú nếu có"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {selectedItems.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            Chưa có dịch vụ nào được chọn
                                        </p>
                                        <Button
                                            type="button"
                                            onClick={() => addServiceItem()}
                                        >
                                            <PlusIcon className="h-5 w-5 inline mr-2" />
                                            Thêm dịch vụ đầu tiên
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Customer & Pet Information */}
                    <div className="flex flex-col space-y-3 min-h-0 overflow-y-auto">
                        {/* Customer Information */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex-shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Thông tin khách hàng
                                </h2>
                            </div>

                            {/* Customer Search */}
                            <div className="mb-4 relative">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Tìm khách hàng cũ
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={customerSearchQuery}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                        className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Tìm kiếm khách hàng..."
                                    />
                                    {customerSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomerSearchQuery('');
                                                setCustomerSearchResults([]);
                                                setShowCustomerResults(false);
                                            }}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    )}
                                </div>

                                {/* Search Results */}
                                {showCustomerResults && customerSearchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {customerSearchResults.map((customer) => (
                                            <button
                                                key={customer.id}
                                                type="button"
                                                onClick={() => handleSelectCustomer(customer)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {customer.profile?.fullName || customer.fullName || customer.username || 'Khách hàng'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {customer.email}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {customer.profile?.phone || customer.phone || 'Chưa có SĐT'}
                                                        </p>
                                                    </div>
                                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isSearchingCustomers && (
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Đang tìm kiếm...
                                    </p>
                                )}

                                {showCustomerResults && customerSearchResults.length === 0 && customerSearchQuery.length >= 2 && (
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Không tìm thấy khách hàng
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <UserIcon className="w-3.5 h-3.5 inline mr-1" />Họ tên
                                    </label>
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.customerName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                        placeholder="Nhập họ tên"
                                    />
                                    {errors.customerName && <p className="mt-0.5 text-xs text-red-500">{errors.customerName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <PhoneIcon className="w-3.5 h-3.5 inline mr-1" />Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        name="customerPhone"
                                        value={formData.customerPhone}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.customerPhone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                        placeholder="Nhập SĐT"
                                    />
                                    {errors.customerPhone && <p className="mt-0.5 text-xs text-red-500">{errors.customerPhone}</p>}
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <CreditCardIcon className="w-3.5 h-3.5 inline mr-1" />Email
                                </label>
                                <input
                                    type="email"
                                    name="customerEmail"
                                    value={formData.customerEmail}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.customerEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                    placeholder="Nhập email"
                                />
                                {errors.customerEmail && <p className="mt-0.5 text-xs text-red-500">{errors.customerEmail}</p>}
                            </div>
                        </div>



                        {/* Pet Information */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                Thông tin thú cưng
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tên thú cưng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="petName"
                                        value={formData.petName}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.petName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                        placeholder="Nhập tên thú cưng"
                                    />
                                    {errors.petName && <p className="mt-0.5 text-xs text-red-500">{errors.petName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Loại thú cưng
                                    </label>
                                    <select
                                        name="petType"
                                        value={formData.petType}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Chọn loại</option>
                                        <option value="Chó">Chó</option>
                                        <option value="Mèo">Mèo</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Giống
                                    </label>
                                    <input
                                        type="text"
                                        name="petBreed"
                                        value={formData.petBreed}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Nhập giống (tùy chọn)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tuổi (tháng)
                                    </label>
                                    <input
                                        type="number"
                                        name="petAge"
                                        value={formData.petAge}
                                        onChange={handleChange}
                                        min="0"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Nhập tuổi (tùy chọn)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Cân nặng (kg)
                                    </label>
                                    <input
                                        type="number"
                                        name="petWeight"
                                        value={formData.petWeight}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.1"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Nhập cân nặng (tùy chọn)"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ghi chú chung (tùy chọn)
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Nhập ghi chú chung nếu có"
                                />
                            </div>

                        </div>
                        {/* Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                Tổng kết
                            </h2>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Số dịch vụ:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {(() => {
                                            const totalPackages = selectedItems.reduce((sum, item) => {
                                                if (!item.serviceId) return sum;
                                                return sum + (item.packageIds?.length || (item.service && (!item.service.packages || item.service.packages.length === 0) ? 1 : 0));
                                            }, 0);
                                            return totalPackages;
                                        })()} dịch vụ
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Thời gian dự kiến:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {totalDuration > 0 ? `${totalDuration} phút` : '--'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-base pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-900 dark:text-white font-bold">Tổng tiền:</span>
                                    <span className="font-bold text-primary-600">
                                        {totalPrice.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button - Always visible at bottom */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                                className="px-4 py-2"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || selectedItems.length === 0 || !isWithinWorkingHours}
                                className="px-6 py-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4 inline mr-2" />
                                        Tạo lịch
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                
            </form>
        </div>
    );
}

