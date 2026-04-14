import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createOrder } from '../api/orderApi.js';
import { createServiceBooking } from '../api/serviceBookingApi.js'; // Import service booking API
import { getProfile } from '../api/profileApi.js';
import { getProductImage } from '../utils/imageUtils.js';
import { createMoMoPayment } from '../api/paymentGatewayApi.js';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';
import { 
    TruckIcon, 
    CreditCardIcon, 
    MapPinIcon, 
    PhoneIcon, 
    UserIcon,
    ShoppingBagIcon,
    CheckCircleIcon,
    HomeIcon,
    EnvelopeIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CalendarDaysIcon // Import CalendarDaysIcon
} from '@heroicons/react/24/outline';

export default function CheckoutPage() {
    const { items, totals, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Shipping Information
    const [shippingInfo, setShippingInfo] = useState({
        fullName: user?.username || '',
        phone: '',
        email: user?.email || '',
        address: '',
        city: '',
        district: '',
        ward: '',
        notes: ''
    });
    
    // Shipping Method
    const [shippingMethod, setShippingMethod] = useState('standard');
    
    // Calculate products subtotal (for free shipping check)
    const getProductsSubtotal = () => {
        const products = items.filter(item => !item.product?.isService);
        return products.reduce((sum, i) => {
            const price = i.productPrice || i.product?.price || 0;
            const quantity = i.quantity || 0;
            return sum + (price * quantity);
        }, 0);
    };
    
    const productsSubtotal = getProductsSubtotal();
    const isEligibleForFreeShipping = productsSubtotal >= 1000000;
    
    // Shipping methods - all have prices, free option available for orders over 1M
    const shippingMethods = [
        { id: 'standard', name: 'Giao hàng tiêu chuẩn', time: '3-5 ngày', price: 30000, icon: '🚚' },
        { id: 'express', name: 'Giao hàng nhanh', time: '1-2 ngày', price: 50000, icon: '⚡' },
        { id: 'same-day', name: 'Giao hàng trong ngày', time: 'Trong ngày', price: 80000, icon: '🏃' },
        ...(isEligibleForFreeShipping ? [{ id: 'free', name: 'Miễn phí vận chuyển', time: '3-5 ngày', price: 0, icon: '🎁' }] : [])
    ];
    
    // Payment Method
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const paymentMethods = [
        { id: 'COD', name: 'Thanh toán khi nhận hàng (COD)', icon: '💵' },
        { id: 'BANK_TRANSFER', name: 'Chuyển khoản ngân hàng', icon: '🏦' },
        { id: 'CREDIT_CARD', name: 'Thẻ tín dụng/Ghi nợ', icon: '💳' },
        { id: 'MOMO', name: 'Ví MoMo', icon: '📱' },
        { id: 'VNPAY', name: 'VNPay', icon: '💰' }
    ];
    
    // Saved addresses from localStorage - lưu theo userId để mỗi user có địa chỉ riêng
    const [savedAddresses, setSavedAddresses] = useState(() => {
        try {
            if (!user?.id) return [];
            const saved = localStorage.getItem(`savedAddresses_${user.id}`);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    
    // Address form state
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddressIndex, setEditingAddressIndex] = useState(null);
    
    // Validation errors
    const [errors, setErrors] = useState({});

    // Redirect if cart is empty
    useEffect(() => {
        if (!items || items.length === 0) {
            toast.error('Giỏ hàng trống');
            navigate('/cart');
        }
    }, [items, navigate]);

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để tiếp tục');
            navigate('/');
        }
    }, [user, navigate]);

    // Load profile and auto-fill shipping info, reload saved addresses when user changes
    useEffect(() => {
        const loadProfileData = async () => {
            if (user?.id) {
                try {
                    const response = await getProfile();
                    const profile = response.data;
                    
                    // Split address into parts (format: "street, ward, city" - đã bỏ district)
                    const addressParts = profile.address ? profile.address.split(',').map(s => s.trim()) : ['', '', ''];
                    
                    // Auto-fill shipping info from profile (địa chỉ mặc định từ profile)
                    setShippingInfo(prev => ({
                        ...prev,
                        fullName: profile.fullName || prev.fullName,
                        phone: profile.phone || prev.phone,
                        email: profile.email || prev.email,
                        address: addressParts[0] || prev.address,
                        ward: addressParts[1] || prev.ward,
                        district: '', // Không dùng nữa
                        city: addressParts[2] || prev.city
                    }));
                    
                    // Reload saved addresses for current user
                    try {
                        const saved = localStorage.getItem(`savedAddresses_${user.id}`);
                        setSavedAddresses(saved ? JSON.parse(saved) : []);
                    } catch {
                        setSavedAddresses([]);
                    }
                    
                    toast.success('Đã tự động điền thông tin từ profile');
                } catch (error) {
                    console.log('Could not load profile, using default values');
                    // Không hiển thị lỗi vì profile có thể chưa tồn tại
                    
                    // Still reload saved addresses for current user
                    try {
                        const saved = localStorage.getItem(`savedAddresses_${user.id}`);
                        setSavedAddresses(saved ? JSON.parse(saved) : []);
                    } catch {
                        setSavedAddresses([]);
                    }
                }
            } else {
                // Clear saved addresses if no user
                setSavedAddresses([]);
            }
        };
        
        loadProfileData();
    }, [user]);

    // Calculate shipping cost - only called from step 2 onwards
    const getShippingCost = () => {
        const method = shippingMethods.find(m => m.id === shippingMethod);
        return method ? method.price : 0;
    };

    // Calculate total - only add shipping fee from step 2 onwards
    const calculateTotal = () => {
        // Only include products in total calculation, not services
        const products = items.filter(item => !item.product?.isService);
        const productsSubtotal = products.reduce((sum, i) => {
            const price = i.productPrice || i.product?.price || 0;
            const quantity = i.quantity || 0;
            return sum + (price * quantity);
        }, 0);
        
        // Only add shipping cost if we're past step 1 (shipping info)
        const shippingCost = step >= 2 ? getShippingCost() : 0;
        
        return productsSubtotal + shippingCost;
    };

    // Validate shipping info
    const validateShippingInfo = () => {
        const newErrors = {};
        
        if (!shippingInfo.fullName.trim()) {
            newErrors.fullName = 'Vui lòng nhập họ tên';
        }
        
        if (!shippingInfo.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9]{10,11}$/.test(shippingInfo.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Số điện thoại không hợp lệ';
        }
        
        if (!shippingInfo.address.trim()) {
            newErrors.address = 'Vui lòng nhập địa chỉ';
        }
        
        if (!shippingInfo.city.trim()) {
            newErrors.city = 'Vui lòng nhập tỉnh/thành phố';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle save address
    const handleSaveAddress = () => {
        if (validateShippingInfo()) {
            const newAddress = {
                fullName: shippingInfo.fullName,
                phone: shippingInfo.phone,
                address: shippingInfo.address,
                city: shippingInfo.city,
                ward: shippingInfo.ward
            };
            
            const updatedAddresses = [...savedAddresses, newAddress];
            setSavedAddresses(updatedAddresses);
            if (user?.id) {
                localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(updatedAddresses));
            }
            toast.success('Đã lưu địa chỉ');
        }
    };

    // Handle select saved address
    const handleSelectAddress = (address) => {
        setShippingInfo({
            ...shippingInfo,
            ...address
        });
        toast.success('Đã chọn địa chỉ');
    };

    // Handle set default address
    const handleSetDefaultAddress = (index) => {
        const updatedAddresses = savedAddresses.map((addr, i) => ({
            ...addr,
            isDefault: i === index
        }));
        
        setSavedAddresses(updatedAddresses);
        if (user?.id) {
            localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(updatedAddresses));
        }
        toast.success('Đã đặt làm địa chỉ mặc định');
    };

    // Handle edit address
    const handleEditAddress = (index) => {
        const addressToEdit = savedAddresses[index];
        setShippingInfo({
            ...shippingInfo,
            ...addressToEdit
        });
        setEditingAddressIndex(index);
        setShowAddressForm(true);
    };

    // Handle delete address
    const handleDeleteAddress = (index) => {
        const updatedAddresses = savedAddresses.filter((_, i) => i !== index);
        setSavedAddresses(updatedAddresses);
        if (user?.id) {
            localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(updatedAddresses));
        }
        toast.success('Đã xóa địa chỉ');
    };

    // Handle place order
    const handlePlaceOrder = async () => {
        if (!validateShippingInfo()) {
            toast.error('Vui lòng kiểm tra lại thông tin giao hàng');
            setStep(1);
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading('Đang xử lý đơn hàng...');

        try {
            // Separate products and services
            const products = items.filter(item => !item.product?.isService);
            const services = items.filter(item => item.product?.isService);

            // Create bookings for services first (services don't require payment)
            if (services.length > 0) {
                const bookingPromises = services.map((service) => {
                    const serviceId = service.service?.id || service.serviceId || service.product?.id;
                    const servicePackageId = service.packageId || service.selectedPackageId || null;
                    const bookingDateTime = service.bookingDateTime
                        ? new Date(service.bookingDateTime).toISOString()
                        : new Date().toISOString();

                    const bookingData = {
                        serviceId,
                        servicePackageId,
                        bookingDateTime,
                        customerName: shippingInfo.fullName,
                        customerPhone: shippingInfo.phone,
                        customerEmail: shippingInfo.email,
                        durationDays: 1,
                        note: shippingInfo.notes || undefined
                    };

                    console.log('Creating booking with data:', bookingData);
                    return createServiceBooking(bookingData);
                });

                await Promise.all(bookingPromises);
            }

            // Create order for products only
            if (products.length > 0) {
                const shippingFee = getShippingCost();
                const orderData = {
                    paymentMethod: paymentMethod,
                    shippingAddress: `${shippingInfo.address}, ${shippingInfo.ward}, ${shippingInfo.city}`.replace(/, ,/g, ',').trim(),
                    shippingMethod: shippingMethod, // standard, express, same-day, free
                    shippingFee: shippingFee,
                    items: products.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.productPrice || item.product?.price || 0
                    }))
                };

                // Handle online payment methods
                if (paymentMethod === 'MOMO') {
                    // Tạo đơn hàng trước, sau đó tạo yêu cầu thanh toán MoMo cho đơn đó
                    const orderResponse = await createOrder(orderData);
                    const createdOrderId = orderResponse.data?.orderId || orderResponse.data?.id || orderResponse.orderId;

                    if (!createdOrderId) {
                        throw new Error('Không thể xác định ID đơn hàng sau khi tạo.');
                    }

                    // Lưu thông tin đơn hàng đang chờ vào sessionStorage (phòng khi cần dùng ở callback)
                    const pendingOrderData = {
                        ...orderData,
                        total: calculateTotal(),
                        shippingInfo: shippingInfo,
                        orderId: createdOrderId
                    };
                    sessionStorage.setItem('pendingOrder', JSON.stringify(pendingOrderData));

                    // Gọi backend tạo yêu cầu thanh toán MoMo
                    const paymentInit = await createMoMoPayment(createdOrderId);
                    const paymentUrl = paymentInit.paymentUrl;

                    if (!paymentUrl) {
                        throw new Error('Không nhận được URL thanh toán từ MoMo.');
                    }

                    // Xóa giỏ hàng và redirect đến MoMo
                    clearCart();
                    toast.dismiss(loadingToast);
                    window.location.href = paymentUrl;
                    return;
                } else if (paymentMethod === 'VNPAY' || paymentMethod === 'CREDIT_CARD' || paymentMethod === 'BANK_TRANSFER') {
                    // Các phương thức online khác vẫn dùng trang demo
                    const pendingOrderData = {
                        ...orderData,
                        total: calculateTotal(),
                        shippingInfo: shippingInfo
                    };
                    sessionStorage.setItem('pendingOrder', JSON.stringify(pendingOrderData));
                    
                    clearCart();
                    const paymentUrl = `/payment-demo?method=${paymentMethod}&amount=${calculateTotal()}`;
                    toast.dismiss(loadingToast);
                    navigate(paymentUrl);
                    return;
                } else {
                    // COD và các phương thức còn lại: tạo đơn trực tiếp
                    console.log('Creating order with data:', orderData);
                    
                    const orderResponse = await createOrder(orderData);
                    
                    toast.success('Đặt hàng thành công! Cảm ơn bạn đã mua hàng.', { id: loadingToast });
                    
                    clearCart();
                    
                    setTimeout(() => {
                        navigate('/account/orders');
                    }, 1500);
                }
            } else {
                // Only services, no products - no payment needed
                toast.success('Đặt lịch dịch vụ thành công!', { id: loadingToast });
                clearCart();
                setTimeout(() => {
                    navigate('/account/bookings');
                }, 1500);
            }

        } catch (error) {
            console.error('Error creating order:', error);
            
            // Handle validation errors
            if (error.response?.data?.errors) {
                const apiErrors = error.response.data.errors;
                const errorMessages = Object.entries(apiErrors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                toast.error(`Lỗi: ${errorMessages}`, { id: loadingToast, duration: 5000 });
            } else {
                // Extract and display the specific error message from the API
                // Handle different possible error response formats
                let errorMessage = 'Không thể đặt hàng, vui lòng thử lại';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.title) {
                    errorMessage = error.response.data.title;
                } else if (error.response?.statusText) {
                    errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                toast.error(errorMessage, { 
                    id: loadingToast,
                    duration: 5000,
                    icon: '⚠️'
                });
                
                // If it's an inventory error, provide additional guidance
                if (errorMessage.toLowerCase().includes('insufficient stock') || 
                    errorMessage.toLowerCase().includes('stock') ||
                    errorMessage.includes('không đủ hàng') ||
                    errorMessage.includes('số lượng')) {
                    toast.error('Vui lòng giảm số lượng sản phẩm hoặc chọn sản phẩm khác.', {
                        duration: 5000,
                        icon: '📦'
                    });
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Progress steps
    const steps = [
        { number: 1, name: 'Thông tin giao hàng', icon: MapPinIcon, description: 'Nhập địa chỉ nhận hàng' },
        { number: 2, name: 'Phương thức vận chuyển', icon: TruckIcon, description: 'Chọn cách giao hàng' },
        { number: 3, name: 'Phương thức thanh toán', icon: CreditCardIcon, description: 'Chọn cách thanh toán' },
        { number: 4, name: 'Xác nhận đơn hàng', icon: CheckCircleIcon, description: 'Kiểm tra và hoàn tất' }
    ];

    if (!items || items.length === 0 || !user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
                        <ShoppingBagIcon className="w-10 h-10 text-black" />
                        Thanh toán đơn hàng
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Hoàn tất đơn hàng của bạn chỉ với vài bước đơn giản
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-10">
                    <div className="bg-white border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            {steps.map((s, index) => (
                                <React.Fragment key={s.number}>
                                    <div className="flex flex-col items-center flex-1 relative">
                                        {/* Step Circle */}
                                        <div className={`relative w-16 h-16 rounded-none flex items-center justify-center transition-all duration-300 ${
                                            step >= s.number 
                                                ? 'bg-gradient-to-br bg-black text-white shadow-sm scale-110' 
                                                : 'bg-gray-200 text-gray-400 scale-100'
                                        }`}>
                                            {step > s.number ? (
                                                <CheckCircleIcon className="w-8 h-8" />
                                            ) : (
                                                <s.icon className="w-7 h-7" />
                                            )}
                                            {step === s.number && (
                                                <div className="absolute -inset-1 bg-gray-500 rounded-none animate-ping opacity-50"></div>
                                            )}
                                        </div>
                                        
                                        {/* Step Info */}
                                        <div className="mt-3 text-center">
                                            <span className={`block text-sm font-bold ${
                                                step >= s.number 
                                                    ? 'text-black' 
                                                    : 'text-gray-400'
                                            }`}>
                                                Bước {s.number}
                                            </span>
                                            <span className={`block text-xs font-medium mt-1 ${
                                                step >= s.number 
                                                    ? 'text-gray-900' 
                                                    : 'text-gray-400'
                                            }`}>
                                                {s.name}
                                            </span>
                                            <span className="block text-xs text-gray-500 mt-0.5">
                                                {s.description}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Connector Line */}
                                    {index < steps.length - 1 && (
                                        <div className="flex-1 h-1 mx-4 mb-16 relative">
                                            <div className="absolute inset-0 bg-gray-200 rounded-none"></div>
                                            <div className={`absolute inset-0 rounded-none transition-all duration-500 ${
                                                step > s.number 
                                                    ? 'bg-black w-full' 
                                                    : 'bg-black w-0'
                                            }`}></div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Step 1: Shipping Information */}
                        {step === 1 && (
                            <div className="bg-white border border-gray-200 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <div className="p-2 bg-gray-100">
                                            <MapPinIcon className="w-7 h-7 text-black" />
                                        </div>
                                        <span className="text-gray-900">Thông tin giao hàng</span>
                                    </h2>
                                </div>

                                {/* Saved Addresses */}
                                {savedAddresses.length > 0 && !showAddressForm && (
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-base font-semibold text-gray-700">
                                                <HomeIcon className="w-5 h-5 inline mr-2 text-black" />
                                                Chọn địa chỉ đã lưu ({savedAddresses.length})
                                            </label>
                                            <button
                                                onClick={() => {
                                                    setShowAddressForm(true);
                                                    setEditingAddressIndex(null);
                                                }}
                                                className="text-sm text-black hover:underline font-medium flex items-center gap-1"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Thêm địa chỉ mới
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {savedAddresses.map((addr, index) => (
                                                <div
                                                    key={addr.id || index}
                                                    onClick={() => handleSelectAddress(addr)}
                                                    className={`relative p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                        addr.isDefault 
                                                            ? 'border-black bg-gray-50' 
                                                            : 'border-gray-200 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {addr.isDefault && (
                                                        <span className="absolute top-3 right-3 px-2 py-1 bg-black text-white text-xs font-medium">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 pr-20">
                                                            <p className="font-bold text-gray-900 text-lg mb-1">
                                                                <UserIcon className="w-4 h-4 inline mr-1" />
                                                                {addr.fullName}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mb-1">
                                                                <PhoneIcon className="w-4 h-4 inline mr-1" />
                                                                {addr.phone}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                <MapPinIcon className="w-4 h-4 inline mr-1" />
                                                                {addr.address}, {addr.ward}, {addr.city}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                                        {!addr.isDefault && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSetDefaultAddress(index);
                                                                }}
                                                                className="text-xs text-black hover:text-black font-medium"
                                                            >
                                                                Đặt làm mặc định
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditAddress(index);
                                                            }}
                                                            className="text-xs text-black hover:underline font-medium flex items-center gap-1"
                                                        >
                                                            <PencilIcon className="w-3 h-3" />
                                                            Sửa
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
                                                                    handleDeleteAddress(index);
                                                                }
                                                            }}
                                                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                                        >
                                                            <TrashIcon className="w-3 h-3" />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <p className="text-sm text-gray-500">
                                                Hoặc nhập thông tin giao hàng mới bên dưới
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Address Form */}
                                {(showAddressForm || savedAddresses.length === 0) && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {editingAddressIndex !== null ? 'Cập nhật địa chễ' : 'Thông tin người nhận'}
                                            </h3>
                                            {savedAddresses.length > 0 && showAddressForm && (
                                                <button
                                                    onClick={() => {
                                                        setShowAddressForm(false);
                                                        setEditingAddressIndex(null);
                                                    }}
                                                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-5">
                                            {/* Full Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <UserIcon className="w-4 h-4 inline mr-1 text-black" />
                                                    Họ và tên <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={shippingInfo.fullName}
                                                    onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                                                    className={`w-full px-4 py-3 border ${
                                                        errors.fullName 
                                                            ? 'border-red-500 focus:border-red-500' 
                                                            : 'border-gray-300 focus:border-black'
                                                    } bg-white text-gray-900 focus:ring-2 focus:ring-black transition-colors`}
                                                    placeholder="Nhập họ và tên đầy đủ"
                                                />
                                                {errors.fullName && (
                                                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                                        <span>⚠️</span> {errors.fullName}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Phone & Email */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        <PhoneIcon className="w-4 h-4 inline mr-1 text-black" />
                                                        Số điện thoại <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        value={shippingInfo.phone}
                                                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                                        className={`w-full px-4 py-3 border ${
                                                            errors.phone 
                                                                ? 'border-red-500 focus:border-red-500' 
                                                                : 'border-gray-300 focus:border-black'
                                                        } bg-white text-gray-900 focus:ring-2 focus:ring-black transition-colors`}
                                                        placeholder="0123 456 789"
                                                    />
                                                    {errors.phone && (
                                                        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                                            <span>⚠️</span> {errors.phone}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        <EnvelopeIcon className="w-4 h-4 inline mr-1 text-black" />
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={shippingInfo.email}
                                                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                                                        placeholder="email@example.com"
                                                    />
                                                </div>
                                            </div>

                                            {/* Address */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <HomeIcon className="w-4 h-4 inline mr-1 text-black" />
                                                    Địa chỉ cụ thể <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={shippingInfo.address}
                                                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                                    className={`w-full px-4 py-3 border ${
                                                        errors.address 
                                                            ? 'border-red-500 focus:border-red-500' 
                                                            : 'border-gray-300 focus:border-black'
                                                    } bg-white text-gray-900 focus:ring-2 focus:ring-black transition-colors`}
                                                    placeholder="Số nhà, tên đường"
                                                />
                                                {errors.address && (
                                                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                                        <span>⚠️</span> {errors.address}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Ward, District, City */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Phường/Xã
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={shippingInfo.ward}
                                                        onChange={(e) => setShippingInfo({ ...shippingInfo, ward: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                                                        placeholder="Phường/Xã"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Tỉnh/Thành phố <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={shippingInfo.city}
                                                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                                                        className={`w-full px-4 py-3 border ${
                                                            errors.city 
                                                                ? 'border-red-500 focus:border-red-500' 
                                                                : 'border-gray-300 focus:border-black'
                                                        } bg-white text-gray-900 focus:ring-2 focus:ring-black transition-colors`}
                                                        placeholder="Tỉnh/Thành phố"
                                                    />
                                                    {errors.city && (
                                                        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                                            <span>⚠️</span> {errors.city}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Ghi chú (Tùy chọn)
                                                </label>
                                                <textarea
                                                    value={shippingInfo.notes}
                                                    onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                                                    placeholder="Ghi chú cho đơn hàng (ví dụ: Giao giờ hành chính, không gửi đánh chuông...)"
                                                />
                                            </div>

                                            {/* Save Address Checkbox */}
                                            {editingAddressIndex === null && (
                                                <div className="flex items-center space-x-2 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveAddress}
                                                        className="text-sm text-black hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        💾 Lưu địa chễ này cho lần sau
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                                    <p className="text-sm text-gray-500">
                                        <span className="text-red-500">*</span> Thông tin bắt buộc
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (validateShippingInfo()) {
                                                setStep(2);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        className="px-8 py-3 text-base font-semibold border border-black bg-black text-white rounded-none transition-all duration-300 hover:bg-white hover:text-black"
                                    >
                                        Tiếp tục →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Shipping Method */}
                        {step === 2 && (
                            <div className="bg-white border border-gray-200 p-8">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-gray-100">
                                        <TruckIcon className="w-7 h-7 text-black" />
                                    </div>
                                    <span className="text-gray-900">Phương thức vận chuyển</span>
                                </h2>

                                <p className="text-gray-600 mb-6">
                                    Chọn phương thức giao hàng phù hợp với bạn
                                </p>

                                <div className="space-y-4">
                                    {shippingMethods.map((method) => (
                                        <label
                                            key={method.id}
                                            className={`group flex items-center justify-between p-6 border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                shippingMethod === method.id
                                                    ? 'border-black bg-gray-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                        >
                                            <div className="flex items-center flex-1">
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value={method.id}
                                                    checked={shippingMethod === method.id}
                                                    onChange={(e) => setShippingMethod(e.target.value)}
                                                    className="w-5 h-5 text-black focus:ring-2 focus:ring-black"
                                                />
                                                <div className="ml-4 flex items-center gap-4">
                                                    <span className="text-3xl">{method.icon}</span>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-lg">
                                                            {method.name}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            ⏱️ {method.time}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xl font-bold ${
                                                    shippingMethod === method.id 
                                                        ? 'text-black' 
                                                        : 'text-gray-900'
                                                }`}>
                                                    {method.price === 0 ? (
                                                        <span className="text-green-600 font-bold">✓ Miễn phí</span>
                                                    ) : (
                                                        `${method.price.toLocaleString('vi-VN')} ₫`
                                                    )}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {isEligibleForFreeShipping && (
                                    <div className="mt-6 p-4 bg-green-50 rounded-none border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-green-800 flex items-center gap-2">
                                            <span className="text-lg">🎉</span>
                                            <span><strong>Ưu đãi:</strong> Bạn được miễn phí vận chuyển cho đơn hàng từ 1.000.000đ</span>
                                        </p>
                                    </div>
                                )}

                                <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setStep(1);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-6 py-3 border border-black bg-white text-black text-sm font-medium rounded-none transition-all duration-300 hover:bg-black hover:text-white"
                                    >
                                        ← Quay lại
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setStep(3);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-8 py-3 text-base font-semibold border border-black bg-black text-white rounded-none transition-all duration-300 hover:bg-white hover:text-black"
                                    >
                                        Tiếp tục →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment Method */}
                        {step === 3 && (
                            <div className="bg-white border border-gray-200 p-8">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-gray-100">
                                        <CreditCardIcon className="w-7 h-7 text-black" />
                                    </div>
                                    <span className="text-gray-900">Phương thức thanh toán</span>
                                </h2>

                                <p className="text-gray-600 mb-6">
                                    Chọn phương thức thanh toán an toàn và tiện lợi
                                </p>

                                <div className="space-y-3">
                                    {paymentMethods.map((method) => (
                                        <label
                                            key={method.id}
                                            className={`group flex items-center p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                paymentMethod === method.id
                                                    ? 'border-black bg-gray-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value={method.id}
                                                checked={paymentMethod === method.id}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-5 h-5 text-black focus:ring-2 focus:ring-black"
                                            />
                                            <div className="ml-4 flex items-center gap-4 flex-1">
                                                <span className="text-3xl">{method.icon}</span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900 text-base">
                                                        {method.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Payment Info */}
                                <div className="mt-6 p-5 bg-green-50 rounded-none border border-green-200 dark:border-green-800">
                                    <p className="text-sm text-green-800 flex items-center gap-2 mb-2">
                                        <span className="text-lg">🔒</span>
                                        <strong>Thanh toán an toàn & bảo mật</strong>
                                    </p>
                                    <ul className="text-xs text-green-700 space-y-1 ml-7">
                                        <li>✓ Thông tin thanh toán được mã hóa SSL</li>
                                        <li>✓ Không lưu trữ thông tin thẻ</li>
                                        <li>✓ Hỗ trợ 24/7 cho các vấn đề thanh toán</li>
                                    </ul>
                                </div>

                                <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setStep(2);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-6 py-3 border border-black bg-white text-black text-sm font-medium rounded-none transition-all duration-300 hover:bg-black hover:text-white"
                                    >
                                        ← Quay lại
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setStep(4);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-8 py-3 text-base font-semibold border border-black bg-black text-white rounded-none transition-all duration-300 hover:bg-white hover:text-black"
                                    >
                                        Tiếp tục →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review Order */}
                        {step === 4 && (
                            <div className="bg-white border border-gray-200 p-8">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-gray-100">
                                        <CheckCircleIcon className="w-7 h-7 text-black" />
                                    </div>
                                    <span className="text-gray-900">Xác nhận đơn hàng</span>
                                </h2>

                                <p className="text-gray-600 mb-6">
                                    Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng
                                </p>

                                {/* Order Items */}
                                <div className="mb-6">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                                        <ShoppingBagIcon className="w-5 h-5 text-black" />
                                        Sản phẩm ({items.length} sản phẩm)
                                    </h3>
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {items.map((item) => (
                                            <div 
                                                key={item.id || item.productId} 
                                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-none border border-gray-200"
                                            >
                                                <img
                                                    src={getProductImage(item.product || { 
                                                        images: item.productImageUrl ? [{ url: item.productImageUrl, isPrimary: true }] : [],
                                                        imageUrl: item.productImageUrl,
                                                        name: item.productName
                                                    })} 
                                                    alt={item.productName}
                                                    className="w-20 h-20 object-cover border border-white shadow-sm"
                                                    onError={(e) => {
                                                        e.target.src = `https://placehold.co/80x80/e2e8f0/4a5568?text=${encodeURIComponent((item.productName || 'P')[0])}`;
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900">
                                                        {item.productName}
                                                    </p>
                                                    {item.product?.isService && item.bookingDateTime && (
                                                        <p className="text-sm text-blue-600 mt-1">
                                                            <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                                                            Lịch đặt: {new Date(item.bookingDateTime).toLocaleString('vi-VN')}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Số lượng: <span className="font-semibold">{item.quantity}</span>
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Đơn giá: {(item.productPrice || 0).toLocaleString('vi-VN')} ₫
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-black">
                                                        {((item.productPrice || 0) * item.quantity).toLocaleString('vi-VN')} ₫
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div className="mb-6 p-5 bg-gradient-to-r from-black to-gray-800 dark:from-black/20 dark:to-gray-800/20 rounded-none border border-gray-300 dark:border-black">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <MapPinIcon className="w-5 h-5 text-black" />
                                            Thông tin giao hàng
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setStep(1);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="text-sm text-black hover:text-black font-medium"
                                        >
                                            Chỉnh sửa
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-gray-800">
                                            <UserIcon className="w-4 h-4 inline mr-2 text-black" />
                                            <strong>Người nhận:</strong> {shippingInfo.fullName}
                                        </p>
                                        <p className="text-gray-800">
                                            <PhoneIcon className="w-4 h-4 inline mr-2 text-black" />
                                            <strong>SĐT:</strong> {shippingInfo.phone}
                                        </p>
                                        {shippingInfo.email && (
                                            <p className="text-gray-800">
                                                <EnvelopeIcon className="w-4 h-4 inline mr-2 text-black" />
                                                <strong>Email:</strong> {shippingInfo.email}
                                            </p>
                                        )}
                                        <p className="text-gray-800">
                                            <HomeIcon className="w-4 h-4 inline mr-2 text-black" />
                                            <strong>Địa chỉ:</strong> {shippingInfo.address}, {shippingInfo.ward}, {shippingInfo.city}
                                        </p>
                                        {shippingInfo.notes && (
                                            <p className="text-gray-800 mt-3 pt-3 border-t border-gray-300 dark:border-black">
                                                <strong>Ghi chú:</strong> {shippingInfo.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Payment & Shipping Method */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                                <TruckIcon className="w-5 h-5 text-black" />
                                                Vận chuyển
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    setStep(2);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="text-xs text-black hover:text-black font-medium"
                                            >
                                                Thay đổi
                                            </button>
                                        </div>
                                        <p className="text-gray-700 font-medium">
                                            {shippingMethods.find(m => m.id === shippingMethod)?.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {shippingMethods.find(m => m.id === shippingMethod)?.time}
                                        </p>
                                    </div>
                                    
                                    <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                                <CreditCardIcon className="w-5 h-5 text-black" />
                                                Thanh toán
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    setStep(3);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="text-xs text-black hover:text-black font-medium"
                                            >
                                                Thay đổi
                                            </button>
                                        </div>
                                        <p className="text-gray-700 font-medium">
                                            {paymentMethods.find(m => m.id === paymentMethod)?.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Terms & Conditions */}
                                <div className="mb-6 p-4 bg-yellow-50 rounded-none border border-yellow-200 dark:border-yellow-800">
                                    <p className="text-sm text-yellow-800">
                                        <span className="font-bold">⚠️ Lưu ý:</span> Bằng việc nhấn nút "Đặt hàng", bạn đã đồng ý với 
                                        <a href="#" className="underline ml-1 font-semibold hover:text-yellow-900">Chính sách điều khoản</a> và 
                                        <a href="#" className="underline ml-1 font-semibold hover:text-yellow-900">Chính sách bảo mật</a> của chúng tôi.
                                    </p>
                                </div>

                                <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setStep(3);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-6 py-3 border border-black bg-white text-black text-sm font-medium rounded-none transition-all duration-300 hover:bg-black hover:text-white"
                                    >
                                        ← Quay lại
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handlePlaceOrder}
                                        disabled={isSubmitting}
                                        className="px-10 py-3 text-lg font-semibold border border-black bg-black text-white rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-white hover:text-black"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Đang xử lý...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-6 h-6" />
                                                Đặt hàng ngay
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-none shadow-sm p-6 sticky top-4 border border-gray-100">
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                                <ShoppingBagIcon className="w-6 h-6 text-black" />
                                Thông tin đơn hàng
                            </h3>

                            {/* Items Count */}
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-900">{items.length}</span> sản phẩm trong giỏ hàng
                                </p>
                            </div>

                            {/* Separate Products and Services */}
                            {(() => {
                                const products = items.filter(item => !item.product?.isService);
                                const services = items.filter(item => item.product?.isService);
                                
                                return (
                                    <>
                                        {products.length > 0 && (
                                            <div className="mb-4 pb-4 border-b border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                                    Sản phẩm ({products.length})
                                                </h4>
                                                {products.map((item) => (
                                                    <div key={`product-${item.id || item.productId}`} className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">
                                                            {item.productName} × {item.quantity}
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                            {(
                                                                (item.product?.salePrice || item.productPrice || 0) * item.quantity
                                                            ).toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {services.length > 0 && (
                                            <div className="mb-4 pb-4 border-b border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                                    Dịch vụ đã đặt lịch ({services.length})
                                                </h4>
                                                {services.map((item) => (
                                                    <div key={`service-${item.id || item.productId}`} className="flex justify-between text-sm mb-1">
                                                        <div>
                                                            <span className="text-gray-600">
                                                                {item.productName} × {item.quantity}
                                                            </span>
                                                            {item.bookingDateTime && (
                                                                <p className="text-xs text-blue-600 mt-1">
                                                                    {new Date(item.bookingDateTime).toLocaleString('vi-VN')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {(
                                                                (item.product?.salePrice || item.productPrice || 0) * item.quantity
                                                            ).toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Price Breakdown */}
                            <div className="space-y-3 mb-6">
                                {step >= 2 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Phí vận chuyển:</span>
                                        <span className="font-semibold text-gray-900">
                                            {getShippingCost() === 0 ? (
                                                <span className="text-green-600 font-bold">✓ Miễn phí</span>
                                            ) : (
                                                `${getShippingCost().toLocaleString('vi-VN')} ₫`
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="pt-6 border-t-2 border-gray-300 mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-bold bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent">
                                            {calculateTotal().toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-right">
                                    (Đã bao gồm VAT nếu có)
                                </p>
                            </div>

                            {/* Benefits */}
                            <div className="bg-gradient-to-r from-black to-gray-800 dark:from-black/20 dark:to-gray-800/20 rounded-none p-4 mb-4 border border-black dark:border-black">
                                <p className="text-xs font-bold text-gray-700 mb-3">
                                    🎁 Ưu đãi khi mua hàng:
                                </p>
                                <div className="text-xs text-gray-600 space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                        <span>Miễn phí đổi trả trong 7 ngày</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                        <span>Bảo hành chính hãng</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                        <span>Giao hàng toàn quốc</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                        <span>Tích điểm thành viên</span>
                                    </p>
                                </div>
                            </div>

                            {/* Support Info */}
                            <div className="bg-gray-50 rounded-none p-4 border border-gray-200">
                                <p className="text-xs font-bold text-gray-700 mb-2">
                                    📞 Hỗ trợ khách hàng:
                                </p>
                                <p className="text-xs text-gray-600">
                                    Hotline: <a href="tel:1900xxxx" className="text-black font-bold hover:underline">1900 xxxx</a>
                                </p>
                                <p className="text-xs text-gray-600">
                                    Email: <a href="mailto:support@petshop.com" className="text-black hover:underline">support@petshop.com</a>
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Hỗ trợ 24/7
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
