import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    CalendarDaysIcon, 
    ClockIcon, 
    UserIcon, 
    PhoneIcon, 
    ChatBubbleLeftRightIcon,
    CreditCardIcon,
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createServiceBooking, getAvailableServiceSlots } from '../api/serviceBookingApi.js';
import { getServices, getServiceById } from '../api/serviceApi.js';
import { getProfile } from '../api/profileApi.js';
import toast from 'react-hot-toast';

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_SLOT_CAPACITY = 2;
const WEEKEND_SLOT_CAPACITY = 3;

const getSlotCapacityForDate = (dateString) => {
    if (!dateString) return DEFAULT_SLOT_CAPACITY;
    const date = new Date(`${dateString}T00:00:00`);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    return isWeekend ? WEEKEND_SLOT_CAPACITY : DEFAULT_SLOT_CAPACITY;
};

export default function ServiceBookingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const serviceIdFromState = location.state?.serviceId || location.state?.service?.id;
    
    const [allServices, setAllServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    
    // Danh sách các dịch vụ đã chọn (có thể nhiều dịch vụ)
    const [selectedItems, setSelectedItems] = useState([]);
    
    // Dịch vụ đầu tiên được chọn (không thể thay đổi)
    
    const [formData, setFormData] = useState({
        selectedDate: '',
        selectedTime: '',
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
    const [slotAvailability, setSlotAvailability] = useState([]);
    const [requestedSlotCapacity, setRequestedSlotCapacity] = useState(DEFAULT_SLOT_CAPACITY);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    
    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để đặt lịch dịch vụ');
            navigate('/');
        }
    }, [user, navigate, location.pathname, serviceIdFromState]);

    useEffect(() => {
        if (!user) return;
        
        // Load profile để lấy thông tin đầy đủ
        const loadProfile = async () => {
            try {
                const profileRes = await getProfile();
                const profile = profileRes.data;
                
                setFormData((prev) => ({
                    ...prev,
                    customerName: profile?.fullName || user.username || prev.customerName,
                    customerEmail: profile?.email || user.email || prev.customerEmail,
                    customerPhone: profile?.phone || prev.customerPhone || ''
                }));
            } catch (error) {
                console.error('Error loading profile:', error);
                setFormData((prev) => ({
                    ...prev,
                    customerName: user.username || prev.customerName,
                    customerEmail: user.email || prev.customerEmail,
                    customerPhone: prev.customerPhone || ''
                }));
            }
        };
        
        loadProfile();
    }, [user]);

    useEffect(() => {
        loadAllServices();
    }, []);

    // Chỉ thêm dịch vụ khi có serviceId từ state và chưa có item nào
    useEffect(() => {
        if (serviceIdFromState && selectedItems.length === 0) {
            addServiceItem(serviceIdFromState);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceIdFromState]);

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

    const addServiceItem = async (serviceId = null) => {
        // Tạo ID unique bằng timestamp + random
        const newId = Date.now() + Math.random();
        
        if (!serviceId) {
            // Nếu không có serviceId, thêm item trống để user chọn
            setSelectedItems(prev => [...prev, {
                id: newId,
                serviceId: null,
                service: null,
                packageIds: [], // Thay packageId bằng packageIds (array)
                note: ''
            }]);
            return;
        }

        // Kiểm tra xem dịch vụ này đã được thêm chưa
        setSelectedItems(prev => {
            const exists = prev.some(item => item.serviceId === serviceId);
            if (exists) {
                toast.info('Dịch vụ này đã được thêm vào danh sách');
                return prev;
            }
            return prev;
        });

        try {
            const serviceResponse = await getServiceById(serviceId);
            const service = serviceResponse.data;
            
            setSelectedItems(prev => {
                // Kiểm tra lại để tránh duplicate
                const exists = prev.some(item => item.serviceId === serviceId);
                if (exists) {
                    return prev;
                }
                
                // Nếu đây là dịch vụ đầu tiên, khóa lại
                const isFirstService = prev.length === 0;
                return [...prev, {
                    id: newId,
                    serviceId: service.id,
                    service: service,
                    packageIds: [], // Thay packageId bằng packageIds (array)
                    note: '',
                    isLocked: isFirstService // Đánh dấu là không thể thay đổi nếu là dịch vụ đầu tiên
                }];
            });
        } catch (error) {
            console.error('Error loading service:', error);
            toast.error('Không thể tải thông tin dịch vụ');
        }
    };

    const removeServiceItem = (itemId) => {
        setSelectedItems(prev => {
            const itemToRemove = prev.find(item => item.id === itemId);
            // Không cho phép xóa dịch vụ đầu tiên
            if (itemToRemove?.isLocked) {
                toast.error('Không thể xóa dịch vụ đầu tiên');
                return prev;
            }
            return prev.filter(item => item.id !== itemId);
        });
    };

    const updateServiceItem = (itemId, updates) => {
        setSelectedItems(prev => prev.map(item => {
            // Sử dụng strict comparison để đảm bảo đúng item
            if (item.id === itemId) {
                // Tạo object mới để tránh mutation
                return { ...item, ...updates };
            }
            return item; // Trả về item gốc, không mutate
        }));
    };

    const handleServiceChange = async (itemId, serviceId) => {
        const item = selectedItems.find(item => item.id === itemId);
        // Không cho phép thay đổi dịch vụ đầu tiên
        if (item?.isLocked) {
            toast.error('Không thể thay đổi dịch vụ đầu tiên');
            return;
        }
        
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
                packageIds: [] // Reset packageIds khi thay đổi service
            });
        } catch (error) {
            console.error('Error loading service:', error);
            toast.error('Không thể tải thông tin dịch vụ');
        }
    };

    // Hàm xử lý khi chọn/deselect package
    const handlePackageToggle = (itemId, packageId) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const currentPackageIds = item.packageIds || [];
                let newPackageIds;
                
                // Nếu package đã được chọn thì bỏ chọn, ngược lại thì thêm vào
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

    const timeOptions = useMemo(() => {
        const options = [];
        for (let hour = 8; hour <= 18; hour++) {
            for (const minute of [0, 30]) {
                if (hour === 18 && minute === 30) continue;
                options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }
        }
        return options;
    }, []);

    const formatTimeKey = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };


    const fetchSlotAvailability = async (dateString, duration, capacityOverride) => {
        if (!dateString) {
            setSlotAvailability([]);
            setRequestedSlotCapacity(DEFAULT_SLOT_CAPACITY);
            return;
        }
        setAvailabilityLoading(true);
        try {
            const targetCapacity = capacityOverride ?? getSlotCapacityForDate(dateString);
            const response = await getAvailableServiceSlots({
                date: dateString,
                durationMinutes: Math.max(duration, SLOT_INTERVAL_MINUTES),
                maxSlots: targetCapacity
            });
            setSlotAvailability(response.data || []);
            setRequestedSlotCapacity(targetCapacity);
        } catch (error) {
            console.error('Error loading available slots:', error);
            toast.error('Không thể tải lịch trống cho ngày đã chọn');
            setSlotAvailability([]);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    // Tính tổng thời lượng và giá
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
                // Nếu không có package được chọn, dùng mặc định 60 phút
                duration += 60;
            }
        });
        
        return { totalDuration: duration, totalPrice: price };
    }, [selectedItems]);

    const bookingDurationMinutes = useMemo(
        () => (totalDuration > 0 ? totalDuration : 60),
        [totalDuration]
    );

    useEffect(() => {
        if (!formData.selectedDate) {
            setSlotAvailability([]);
            return;
        }
        fetchSlotAvailability(formData.selectedDate, bookingDurationMinutes);
    }, [formData.selectedDate, bookingDurationMinutes]);

    const slotAvailabilityMap = useMemo(() => {
        const map = new Map();
        (slotAvailability || []).forEach((slot) => {
            const key = formatTimeKey(new Date(slot.startTime));
            map.set(key, {
                ...slot,
                availableCount:
                    typeof slot?.availableCount === 'number'
                        ? slot.availableCount
                        : requestedSlotCapacity,
                capacity: slot?.capacity || requestedSlotCapacity
            });
        });
        return map;
    }, [slotAvailability, requestedSlotCapacity]);

    const getSlotInfoForTime = (slotStart) => {
        return slotAvailabilityMap.get(formatTimeKey(slotStart));
    };

    const getVisibleTimeSlotsForGrid = () => {
        if (!formData.selectedDate) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        return timeOptions
            .map((time) => {
                const slotStart = new Date(`${formData.selectedDate}T${time}`);
                const slotEnd = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);
                const isPast = formData.selectedDate === todayStr && slotEnd.getTime() <= now.getTime();
                const slotInfo = slotAvailabilityMap.get(time) ?? getSlotInfoForTime(slotStart);
                const fullyBooked = slotInfo ? !slotInfo.isAvailable : false;
                return { label: time, slotStart, slotEnd, isPast, slotInfo, fullyBooked };
            })
            .filter((slot) => !slot.isPast);
    };

    const timeSlots = useMemo(() => {
        if (!formData.selectedDate) return [];
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];

        return timeOptions.map((time) => {
            const slotStart = new Date(`${formData.selectedDate}T${time}`);
            const slotEnd = new Date(slotStart.getTime() + bookingDurationMinutes * 60 * 1000);
            const isPast = formData.selectedDate === todayKey && slotStart <= today;
            const slotInfo = getSlotInfoForTime(slotStart);
            const fullyBooked = slotInfo ? !slotInfo.isAvailable : false;

            return {
                time,
                start: slotStart,
                end: slotEnd,
                isFullyBooked: fullyBooked,
                isPast,
                slotInfo
            };
        });
    }, [formData.selectedDate, timeOptions, slotAvailabilityMap, bookingDurationMinutes]);

    const availableTimeOptions = useMemo(() => {
        if (!formData.selectedDate || timeSlots.length === 0) {
            return [];
        }

        return timeSlots
            .filter((slot) => !slot.isPast && !slot.isFullyBooked)
            .map((slot) => ({
                value: slot.time,
                label: slot.time
            }));
    }, [timeSlots, formData.selectedDate]);

    useEffect(() => {
        if (
            formData.selectedTime &&
            !availableTimeOptions.some((option) => option.value === formData.selectedTime)
        ) {
            setFormData((prev) => ({ ...prev, selectedTime: '' }));
        }
    }, [availableTimeOptions, formData.selectedTime]);

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
        
        if (!formData.selectedDate) newErrors.selectedDate = 'Vui lòng chọn ngày đặt lịch';
        if (!formData.selectedTime) newErrors.selectedTime = 'Vui lòng chọn giờ đặt lịch';
        if (formData.selectedDate && formData.selectedTime) {
            const selectedDateTime = new Date(`${formData.selectedDate}T${formData.selectedTime}`);
            if (isNaN(selectedDateTime.getTime()) || selectedDateTime <= new Date()) {
                newErrors.selectedTime = 'Thời gian đặt lịch phải nằm trong tương lai';
            }
        } else if (formData.selectedDate && availableTimeOptions.length === 0) {
            newErrors.selectedTime = 'Ngày này đã kín lịch, vui lòng chọn ngày khác';
        }
        if (!formData.customerName.trim()) newErrors.customerName = 'Vui lòng nhập họ tên';
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
    
    const convertLocalToUtcIso = (dateStr, timeStr) => {
        const [hour, minute] = timeStr.split(':').map(Number);
        const [year, month, day] = dateStr.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
        return utcDate.toISOString();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin đặt lịch');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const isoStartTime = convertLocalToUtcIso(formData.selectedDate, formData.selectedTime);
            const startTime = new Date(isoStartTime);

            if (startTime <= new Date()) {
                toast.error('Không thể đặt lịch trong quá khứ');
                setIsSubmitting(false);
                return;
            }

            const matchedSlot = timeSlots.find((slot) => slot.time === formData.selectedTime);
            if (!matchedSlot || matchedSlot.isFullyBooked) {
                toast.error('Khung giờ này đã kín, vui lòng chọn thời gian khác');
                setIsSubmitting(false);
                return;
            }
            
            // Tạo payload với Items array
            const items = selectedItems.map(item => ({
                serviceId: item.serviceId,
                servicePackageIds: (item.packageIds && item.packageIds.length > 0) ? item.packageIds : [],
                note: item.note?.trim() || null
            }));
            
            const payload = {
                startTime: isoStartTime,
                customerName: formData.customerName.trim(),
                customerPhone: formData.customerPhone.trim(),
                customerEmail: formData.customerEmail.trim(),
                petName: formData.petName.trim(),
                petType: formData.petType || null,
                petBreed: formData.petBreed?.trim() || null,
                petAge: formData.petAge ? parseInt(formData.petAge, 10) : null,
                petWeight: formData.petWeight ? parseFloat(formData.petWeight) : null,
                note: formData.notes?.trim() || null,
                items: items
            };

            console.log('Sending booking payload:', payload);

            const response = await createServiceBooking(payload);
            if (response.data) {
                toast.success('Đặt lịch dịch vụ thành công!');
                setTimeout(() => {
                    navigate('/account/bookings');
                }, 1000);
            }
        } catch (error) {
            console.error('Error creating service booking:', error);
            console.error('Error response:', error.response?.data);
            
            let message = 'Có lỗi xảy ra khi đặt lịch. Vui lòng thử lại.';
            
            if (error.response?.data) {
                const errorData = error.response.data;
                message = errorData.error || errorData.message || message;
            }
            
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleBack = () => navigate(-1);

    if (loadingServices && allServices.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-500 dark:text-gray-400">
                Đang tải thông tin dịch vụ...
            </div>
        );
    }
    
    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <button
                    onClick={handleBack}
                    className="flex items-center text-primary-600 hover:text-primary-700 mb-4"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Quay lại
                </button>
                
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Đặt lịch dịch vụ</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Bạn có thể chọn nhiều dịch vụ trong một lần đặt lịch
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar - Tổng kết */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 sticky top-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tổng kết</h2>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Số dịch vụ</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {(() => {
                                        const totalPackages = selectedItems.reduce((sum, item) => {
                                            return sum + (item.packageIds?.length || (item.service && (!item.service.packages || item.service.packages.length === 0) ? 1 : 0));
                                        }, 0);
                                        return totalPackages > 0 ? `${totalPackages} dịch vụ` : '0 dịch vụ';
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng thời lượng</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}p
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng giá</p>
                                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                    {totalPrice.toLocaleString('vi-VN')} ₫
                                </p>
                            </div>
                        </div>
                        
                        {selectedItems.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    Danh sách dịch vụ:
                                </h3>
                                <ul className="space-y-2">
                                    {selectedItems.map((item) => (
                                        <li key={item.id} className="text-sm text-gray-600 dark:text-gray-400">
                                            • {item.service?.name || 'Chưa chọn dịch vụ'}
                                            {item.service && item.packageIds && item.packageIds.length > 0 && (
                                                <span className="ml-2 text-primary-600">
                                                    ({item.service.packages?.filter(p => item.packageIds.includes(p.id)).map(p => p.name).join(', ')})
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                        <form onSubmit={handleSubmit}>
                            {/* Chọn dịch vụ */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Chọn dịch vụ {(() => {
                                            const totalPackages = selectedItems.reduce((sum, item) => {
                                                return sum + (item.packageIds?.length || (item.service && (!item.service.packages || item.service.packages.length === 0) ? 1 : 0));
                                            }, 0);
                                            return totalPackages > 0 ? `(${totalPackages} dịch vụ)` : '';
                                        })()}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => addServiceItem()}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md hover:shadow-lg"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        Thêm dịch vụ
                                    </button>
                                </div>
                                
                                {errors.items && (
                                    <p className="mb-4 text-sm text-red-500">{errors.items}</p>
                                )}
                                
                                <div className="space-y-4">
                                    {selectedItems.map((item, index) => (
                                        <div key={item.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                                                        {index + 1}
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        Dịch vụ {index + 1}
                                                        {item.isLocked && (
                                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                Khóa
                                                            </span>
                                                        )}
                                                    </h3>
                                                </div>
                                                {!item.isLocked && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeServiceItem(item.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                        title="Xóa dịch vụ này"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Chọn Service */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Dịch vụ <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={item.serviceId || ''}
                                                    onChange={(e) => handleServiceChange(item.id, e.target.value ? parseInt(e.target.value) : null)}
                                                    className={`w-full px-4 py-3 rounded-lg border ${
                                                        errors[`item_${index}_service`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                                    disabled={item.isLocked} // Khóa dropdown nếu là dịch vụ đầu tiên
                                                >
                                                    <option value="">Chọn dịch vụ</option>
                                                    {allServices.map((service) => (
                                                        <option key={service.id} value={service.id}>
                                                            {service.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`item_${index}_service`] && (
                                                    <p className="mt-1 text-sm text-red-500">{errors[`item_${index}_service`]}</p>
                                                )}
                                            </div>
                                            
                                            {/* Chọn Package (nếu service có packages) - Sử dụng checkbox thay vì radio */}
                                            {item.service?.packages && item.service.packages.length > 0 && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Gói dịch vụ <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="space-y-2">
                                                        {item.service.packages.map((pkg) => (
                                                            <label
                                                                key={pkg.id}
                                                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                                                                    item.packageIds?.includes(pkg.id)
                                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                                                                }`}
                                                            >
                                                                <div className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.packageIds?.includes(pkg.id) || false}
                                                                        onChange={() => handlePackageToggle(item.id, pkg.id)}
                                                                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                                    />
                                                                    <div className="ml-3">
                                                                        <p className="font-semibold text-gray-900 dark:text-white">{pkg.name}</p>
                                                                        {pkg.description && (
                                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pkg.description}</p>
                                                                        )}
                                                                        {pkg.durationMinutes && (
                                                                            <p className="text-xs text-gray-400 mt-1">
                                                                                Thời lượng: {Math.floor(pkg.durationMinutes / 60)}h {pkg.durationMinutes % 60}p
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-primary-600">{pkg.price.toLocaleString('vi-VN')} ₫</p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {errors[`item_${index}_package`] && (
                                                        <p className="mt-1 text-sm text-red-500">{errors[`item_${index}_package`]}</p>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Ghi chú cho dịch vụ này */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Ghi chú cho dịch vụ này (tùy chọn)
                                                </label>
                                                <textarea
                                                    value={item.note || ''}
                                                    onChange={(e) => updateServiceItem(item.id, { note: e.target.value })}
                                                    rows={2}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Nhập ghi chú nếu có yêu cầu đặc biệt cho dịch vụ này"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {selectedItems.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">Chưa có dịch vụ nào được chọn</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                                                Nhấn nút "Thêm dịch vụ" ở trên để bắt đầu
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => addServiceItem()}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md hover:shadow-lg font-medium"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                                Thêm dịch vụ đầu tiên
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lịch trống theo khung giờ */}
                            <div className="mb-8">
                                <div className="flex items-start justify-between mb-4 gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lịch trống trong ngày</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Mỗi khung 30 phút nhận tối đa 2 lịch. Lịch khả dụng được xác định dựa trên các lịch đã đặt trước đó.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>Còn chỗ
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-red-500"></span>Kín chỗ
                                        </span>
                                    </div>
                                </div>
                                {!formData.selectedDate ? (
                                    <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                                        Chọn ngày để xem các khung giờ trống.
                                    </div>
                                ) : availabilityLoading ? (
                                    <div className="p-6 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(() => {
                                            const slots = getVisibleTimeSlotsForGrid();
                                            if (slots.length === 0) {
                                                return (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Hôm nay đã qua toàn bộ khung giờ. Vui lòng chọn ngày khác.
                                                    </p>
                                                );
                                            }
                                            return (
                                                <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2 text-center text-xs">
                                                    {slots.map((slot) => {
                                                        const fullyBusy = slot.fullyBooked;
                                                        return (
                                                            <div
                                                                key={slot.label}
                                                                className={`p-2 rounded-lg border font-semibold ${fullyBusy
                                                                    ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-900 dark:text-red-300'
                                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-300'}`}
                                                                aria-label={
                                                                    fullyBusy
                                                                        ? `${slot.label} đã kín`
                                                                        : `${slot.label} còn trống`
                                                                }
                                                            >
                                                                {slot.label}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Chọn ngày giờ */}
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Chọn ngày giờ</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <CalendarDaysIcon className="w-4 h-4 inline mr-1" />Chọn ngày
                                        </label>
                                        <input
                                            type="date"
                                            name="selectedDate"
                                            value={formData.selectedDate}
                                            onChange={handleChange}
                                            min={new Date().toISOString().split('T')[0]}
                                            className={`w-full px-4 py-3 rounded-lg border ${
                                                errors.selectedDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                        />
                                        {errors.selectedDate && <p className="mt-1 text-sm text-red-500">{errors.selectedDate}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <ClockIcon className="w-4 h-4 inline mr-1" />Chọn giờ bắt đầu
                                        </label>
                                        <select
                                            name="selectedTime"
                                            value={formData.selectedTime}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${
                                                errors.selectedTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                            disabled={!formData.selectedDate || availableTimeOptions.length === 0}
                                        >
                                            <option value="">{!formData.selectedDate ? 'Chọn ngày trước' : availableTimeOptions.length === 0 ? 'Không còn khung giờ trống' : 'Chọn giờ'}</option>
                                            {availableTimeOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label || option.value}
                                                </option>
                                            ))}
                                        </select>
                                        {formData.selectedDate && availableTimeOptions.length === 0 && (
                                            <p className="mt-1 text-sm text-red-500">Không còn khung giờ trống trong ngày này.</p>
                                        )}
                                        {errors.selectedTime && <p className="mt-1 text-sm text-red-500">{errors.selectedTime}</p>}
                                        {formData.selectedTime && totalDuration > 0 && (
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Kết thúc dự kiến: {(() => {
                                                    const [hour, minute] = formData.selectedTime.split(':').map(Number);
                                                    const endTime = new Date(`${formData.selectedDate}T${formData.selectedTime}`);
                                                    endTime.setMinutes(endTime.getMinutes() + totalDuration);
                                                    return endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Thông tin khách hàng */}
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Thông tin khách hàng</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <UserIcon className="w-4 h-4 inline mr-1" />Họ tên
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={formData.customerName}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${
                                                errors.customerName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                            placeholder="Nhập họ tên"
                                        />
                                        {errors.customerName && <p className="mt-1 text-sm text-red-500">{errors.customerName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <PhoneIcon className="w-4 h-4 inline mr-1" />Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            name="customerPhone"
                                            value={formData.customerPhone}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${
                                                errors.customerPhone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                            placeholder="Nhập số điện thoại"
                                        />
                                        {errors.customerPhone && <p className="mt-1 text-sm text-red-500">{errors.customerPhone}</p>}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <CreditCardIcon className="w-4 h-4 inline mr-1" />Email
                                    </label>
                                    <input
                                        type="email"
                                        name="customerEmail"
                                        value={formData.customerEmail}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        placeholder="Nhập email"
                                        required
                                    />
                                    {errors.customerEmail && <p className="mt-1 text-sm text-red-500">{errors.customerEmail}</p>}
                                </div>
                            </div>

                            {/* Thông tin thú cưng */}
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Thông tin thú cưng</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tên thú cưng <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="petName"
                                            value={formData.petName}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${
                                                errors.petName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                                            placeholder="Nhập tên thú cưng"
                                        />
                                        {errors.petName && <p className="mt-1 text-sm text-red-500">{errors.petName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Loại thú cưng
                                        </label>
                                        <select
                                            name="petType"
                                            value={formData.petType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="">Chọn loại</option>
                                            <option value="Chó">Chó</option>
                                            <option value="Mèo">Mèo</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Giống
                                        </label>
                                        <input
                                            type="text"
                                            name="petBreed"
                                            value={formData.petBreed}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                            placeholder="VD: Golden Retriever, Persian..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Tuổi (tháng)
                                            </label>
                                            <input
                                                type="number"
                                                name="petAge"
                                                value={formData.petAge}
                                                onChange={handleChange}
                                                min="0"
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                                placeholder="VD: 12"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Cân nặng (kg)
                                            </label>
                                            <input
                                                type="number"
                                                name="petWeight"
                                                value={formData.petWeight}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.1"
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                                placeholder="VD: 5.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Ghi chú chung */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ghi chú chung (nếu có)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    placeholder="Nhập ghi chú nếu có yêu cầu đặc biệt"
                                />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    type="submit"
                                    isLoading={isSubmitting}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
                                    disabled={
                                        selectedItems.length === 0 ||
                                        !formData.selectedDate ||
                                        !formData.selectedTime ||
                                        (formData.selectedDate && availableTimeOptions.length === 0)
                                    }
                                >
                                    Xác nhận đặt lịch ({selectedItems.length} dịch vụ)
                                </Button>
                                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                                    Hủy bỏ
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}